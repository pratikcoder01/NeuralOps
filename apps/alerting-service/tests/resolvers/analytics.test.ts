jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      publish: jest.fn().mockResolvedValue(1),
      subscribe: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => {
    return {
      process: jest.fn(),
      add: jest.fn().mockResolvedValue({ id: 'mock-job' }),
      close: jest.fn().mockResolvedValue(true),
    };
  });
});

import supertest from 'supertest';
import { createServer } from '../../src/server';
import { prisma } from '../../src/prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

// Mock the Prisma client singleton
jest.mock('../../src/prisma/client', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    incident: {
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    host: {
      findUnique: jest.fn(),
    },
  },
}));

describe('GraphQL Analytics Resolver Tests', () => {
  let app: any;
  let serverInstance: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const serverObj = await createServer();
    app = serverObj.app;
    serverInstance = serverObj.httpServer;

    await new Promise<void>((resolve) => {
      serverInstance.listen(0, () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      serverInstance.close(() => {
        resolve();
      });
    });
  });

  const mockWorkspaceId = 'c342adea-6a2b-46c3-9a24-4e5e4ca801f2';

  function generateMockToken(role: string): string {
    return jwt.sign(
      {
        sub: '51273c6b-2f55-4e04-b16e-025cc27e1220',
        workspace_id: mockWorkspaceId,
        role: role,
      },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  it('1. Query: analyticsOverview - returns full computed metric aggregations for period', async () => {
    const token = generateMockToken('admin');

    // Setup Prisma mock resolutions
    (prisma.incident.count as jest.Mock)
      .mockResolvedValueOnce(15) // totalIncidents
      .mockResolvedValueOnce(5)  // resolvedToday
      .mockResolvedValueOnce(2); // openCritical

    (prisma.incident.aggregate as jest.Mock).mockResolvedValue({
      _avg: {
        ttdSeconds: 45.5,
        ttrSeconds: 620.0,
      },
    });

    (prisma.incident.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        { severity: 'CRITICAL', _count: { _all: 3 } },
        { severity: 'HIGH', _count: { _all: 5 } },
        { severity: 'MEDIUM', _count: { _all: 7 } },
      ]) // severityGroups
      .mockResolvedValueOnce([
        { hostId: 'host-1', _count: { _all: 6 } },
      ]); // hostGroups

    (prisma.host.findUnique as jest.Mock).mockResolvedValue({
      hostname: 'db-master-prod',
    });

    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      { detectedAt: new Date() },
    ]);

    const query = `
      query GetAnalytics($workspaceId: ID!, $period: String!) {
        analyticsOverview(workspaceId: $workspaceId, period: $period) {
          totalIncidents
          avgMttdSeconds
          avgMttrSeconds
          resolvedToday
          openCritical
          incidentsBySeverity
          topHostsByIncidents
        }
      }
    `;

    const response = await supertest(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query,
        variables: { workspaceId: mockWorkspaceId, period: '30d' },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    
    const data = response.body.data.analyticsOverview;
    expect(data.totalIncidents).toBe(15);
    expect(data.avgMttdSeconds).toBe(45.5);
    expect(data.avgMttrSeconds).toBe(620.0);
    expect(data.resolvedToday).toBe(5);
    expect(data.openCritical).toBe(2);

    const severity = JSON.parse(data.incidentsBySeverity);
    expect(severity.CRITICAL).toBe(3);

    const hosts = JSON.parse(data.topHostsByIncidents);
    expect(hosts[0].hostname).toBe('db-master-prod');
    expect(hosts[0].count).toBe(6);
  });
});
