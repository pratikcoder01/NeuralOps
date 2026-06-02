// 1. Mock ioredis and bull to prevent TCP socket connections during tests
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

// 2. Mock axios globally to intercept outbound Slack Webhook HTTP requests
jest.mock('axios', () => {
  const mockAxiosInstance = {
    post: () => Promise.resolve({ status: 200, data: 'ok' }),
    request: () => Promise.resolve({ status: 200, data: 'ok' }),
    defaults: { headers: { common: {} } },
    interceptors: { request: { use: () => {} }, response: { use: () => {} } },
  };

  const mockAxiosMain = {
    ...mockAxiosInstance,
    create: () => mockAxiosInstance,
  };

  return {
    __esModule: true,
    default: mockAxiosMain,
    ...mockAxiosMain,
  };
});

// 3. Now import dependencies
import { getSlackColor, sendSlackNotification } from '../../src/notifications/slack';

describe('Slack Notification Payload Tests', () => {
  it('1. getSlackColor - returns correct hex code based on severity levels', () => {
    expect(getSlackColor('CRITICAL')).toBe('#E01E5A');
    expect(getSlackColor('HIGH')).toBe('#ECB22E');
    expect(getSlackColor('MEDIUM')).toBe('#36C5F0');
    expect(getSlackColor('LOW')).toBe('#2EB67D');
    expect(getSlackColor('UNKNOWN')).toBe('#2EB67D'); // Default fallback
  });

  it('2. sendSlackNotification - constructs and sends payload successfully', async () => {
    const mockOptions = {
      webhookUrl: 'https://example.com/mock-slack-webhook',
      workspaceId: 'c342adea-6a2b-46c3-9a24-4e5e4ca801f2',
      incident: {
        id: '7a13e482-de1d-4066-83e8-53debc7c16e7',
        title: 'Out of Memory threshold hit',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        anomalyScore: 0.965,
        anomalyType: 'OUT_OF_MEMORY',
        detectedAt: new Date().toISOString(),
        hostname: 'web-prod-srv-01',
      },
    };

    // The real IncomingWebhook constructor works, and send is intercepted by our global axios mock
    await expect(sendSlackNotification(mockOptions)).resolves.not.toThrow();
  });
});
