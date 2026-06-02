import { prisma } from '../prisma/client';
import { notificationQueue, registerQueueProcessor, NotificationJobPayload } from '../queue/notification_queue';
import { sendSlackNotification } from './slack';
import { sendEmailNotification } from './email';
import { sendPagerDutyNotification } from './pagerduty';
import Redis from 'ioredis';
import { config } from '../config';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

let redisCacheClient: Redis | null = null;
if (config.NODE_ENV !== 'test') {
  try {
    redisCacheClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  } catch (err) {
    logger.warn('⚠️ Failed to connect cache Redis client in NotificationService:', err);
  }
}

export class NotificationService {
  /**
   * Fetches active workspace notification channels with a 5-minute Redis cache layer.
   */
  static async getWorkspaceChannels(workspaceId: string): Promise<any[]> {
    const cacheKey = `notif_channels:${workspaceId}`;

    if (redisCacheClient) {
      try {
        const cached = await redisCacheClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        logger.error(`❌ Cache read failure for key ${cacheKey}:`, err);
      }
    }

    // Query database if not cached
    const channels = await prisma.notificationChannel.findMany({
      where: {
        workspaceId: workspaceId,
        isActive: true,
      },
    });

    if (redisCacheClient) {
      try {
        // Cache for 5 minutes (300 seconds)
        await redisCacheClient.setex(cacheKey, 300, JSON.stringify(channels));
      } catch (err) {
        logger.error(`❌ Cache write failure for key ${cacheKey}:`, err);
      }
    }

    return channels;
  }

  /**
   * Invalidates the notification channel cache for a workspace.
   */
  static async invalidateCache(workspaceId: string): Promise<void> {
    if (redisCacheClient) {
      try {
        await redisCacheClient.del(`notif_channels:${workspaceId}`);
      } catch (err) {
        logger.error(`❌ Cache invalidation failure for workspace ${workspaceId}:`, err);
      }
    }
  }

  /**
   * Receives an incident and dispatches background notification jobs for each configured channel.
   */
  static async dispatchNotifications(incident: {
    id: string;
    title: string;
    severity: string;
    status: string;
    anomalyScore: number;
    anomalyType: string;
    detectedAt: Date | string;
    workspaceId: string;
    hostId: string;
  }): Promise<void> {
    try {
      // 1. Fetch the host hostname
      const host = await prisma.host.findUnique({
        where: { id: incident.hostId },
        select: { hostname: true },
      });
      const hostname = host?.hostname || 'unknown-host';

      // 2. Fetch configured channels
      const channels = await this.getWorkspaceChannels(incident.workspaceId);

      if (channels.length === 0) {
        logger.info(`No active notification channels found for workspace ${incident.workspaceId}`);
        return;
      }

      // 3. Enqueue a separate Bull job for each active channel
      for (const channel of channels) {
        const payload: NotificationJobPayload = {
          channelType: channel.type as any,
          channelId: channel.id,
          config: channel.config,
          incident: {
            id: incident.id,
            title: incident.title,
            severity: incident.severity,
            status: incident.status,
            anomalyScore: incident.anomalyScore,
            anomalyType: incident.anomalyType || 'ML_ANOMALY',
            detectedAt: new Date(incident.detectedAt).toISOString(),
            hostname: hostname,
          },
          workspaceId: incident.workspaceId,
        } as any;

        await notificationQueue.add(payload, {
          jobId: `notif:${incident.id}:${channel.id}`,
        });
      }

      logger.info(`Enqueued ${channels.length} notification delivery jobs for incident ${incident.id}`);
    } catch (err: any) {
      logger.error(`❌ Failed to dispatch notifications for incident ${incident.id}: ${err.message}`);
    }
  }

  /**
   * Background processor callback mapped to Bull queue consumer.
   */
  static async executeChannelDelivery(jobData: NotificationJobPayload): Promise<void> {
    const { channelType, config: channelConfig, incident, workspaceId } = jobData as any;

    logger.info(`Executing background notification delivery for channel ${channelType}`);

    switch (channelType) {
      case 'slack':
        if (!channelConfig.webhookUrl) {
          throw new Error('Missing webhookUrl config for Slack delivery');
        }
        await sendSlackNotification({
          webhookUrl: channelConfig.webhookUrl,
          incident: incident,
          workspaceId: workspaceId,
        });
        break;

      case 'email':
        if (!channelConfig.email) {
          throw new Error('Missing email config for Email delivery');
        }
        await sendEmailNotification({
          to: channelConfig.email,
          incident: incident,
          workspaceId: workspaceId,
        });
        break;

      case 'pagerduty':
        if (!channelConfig.routingKey) {
          throw new Error('Missing routingKey config for PagerDuty delivery');
        }
        await sendPagerDutyNotification({
          routingKey: channelConfig.routingKey,
          incident: incident,
          workspaceId: workspaceId,
        });
        break;

      default:
        throw new Error(`Unsupported notification channel type: ${channelType}`);
    }
  }
}

// Automatically register the worker handler inside Bull queue
registerQueueProcessor(async (job) => {
  await NotificationService.executeChannelDelivery(job.data);
});

export default NotificationService;
