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

// Mock the Prisma singleton to ensure unit test isolation
jest.mock('../../src/prisma/client', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    incident: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    host: {
      findUnique: jest.fn(),
    },
    remediationAction: {
      findMany: jest.fn(),
    },
  },
}));

describe('GraphQL Incident Resolver Tests', () => {
  let app: any;
  let serverInstance: any;

  beforeAll(async () => {
    // Override config test parameters
    process.env.NODE_ENV = 'test';
    const serverObj = await createServer();
    app = serverObj.app;
    serverInstance = serverObj.httpServer;

    // Start listening on a random port to satisfy the WebSocket server cleanup
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
  const mockIncidentId = '7a13e482-de1d-4066-83e8-53debc7c16e7';

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

  it('1. Query: incidents - successfully returns paginated lists for matching workspace', async () => {
    const token = generateMockToken('readonly');
    const mockIncidents = [
      {
        id: mockIncidentId,
        workspaceId: mockWorkspaceId,
        hostId: 'test-host-uuid',
        title: 'CPU spike on core database',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        anomalyScore: 0.94,
        anomalyType: 'CPU_SPIKE',
        metricSnapshot: '{}',
        detectedAt: new Date(),
        rootCauseTags: ['cpu'],
      },
    ];

    (prisma.incident.findMany as jest.Mock).mockResolvedValue(mockIncidents);
    (prisma.incident.count as jest.Mock).mockResolvedValue(1);

    const query = `
      query GetIncidents($workspaceId: ID!) {
        incidents(workspaceId: $workspaceId) {
          items {
            id
            title
            severity
            status
            anomalyScore
          }
          total
          page
          limit
        }
      }
    `;

    const response = await supertest(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query,
        variables: { workspaceId: mockWorkspaceId },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.incidents.total).toBe(1);
    expect(response.body.data.incidents.items[0].title).toBe('CPU spike on core database');
  });

  it('2. Mutation: acknowledgeIncident - succeeds if user has SRE role', async () => {
    const token = generateMockToken('sre');
    const mockIncident = {
      id: mockIncidentId,
      workspaceId: mockWorkspaceId,
      hostId: 'test-host-uuid',
      title: 'OOM Killer triggered',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      anomalyScore: 0.98,
      anomalyType: 'OOM',
      metricSnapshot: '{}',
      detectedAt: new Date(),
    };

    const mockUpdatedIncident = {
      ...mockIncident,
      status: 'INVESTIGATING',
    };

    (prisma.incident.findUnique as jest.Mock).mockResolvedValue(mockIncident);
    (prisma.incident.update as jest.Mock).mockResolvedValue(mockUpdatedIncident);

    const mutation = `
      mutation Acknowledge($id: ID!) {
        acknowledgeIncident(id: $id) {
          id
          status
        }
      }
    `;

    const response = await supertest(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: mutation,
        variables: { id: mockIncidentId },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.acknowledgeIncident.status).toBe('INVESTIGATING');
  });

  it('3. Mutation: acknowledgeIncident - fails (FORBIDDEN) if user is readonly', async () => {
    const token = generateMockToken('readonly');

    const mutation = `
      mutation Acknowledge($id: ID!) {
        acknowledgeIncident(id: $id) {
          id
          status
        }
      }
    `;

    const response = await supertest(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: mutation,
        variables: { id: mockIncidentId },
      });

    expect(response.status).toBe(200);
    expect(response.body.data?.acknowledgeIncident).toBeFalsy();
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
  });
});
