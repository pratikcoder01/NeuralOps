import Queue from 'bull';
import { config } from '../config';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export const notificationQueue = new Queue('notification-delivery', config.REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds initial delay, then 10s, then 20s
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export interface NotificationJobPayload {
  channelType: 'slack' | 'email' | 'pagerduty';
  channelId: string;
  config: any;
  incident: {
    id: string;
    title: string;
    severity: string;
    status: string;
    anomalyScore: number;
    anomalyType: string;
    detectedAt: string;
    hostname: string;
  };
}

// Global flag to prevent registering the processor multiple times (e.g. during hot reloads or test runs)
let isProcessorRegistered = false;

export function registerQueueProcessor(processHandler: (job: Queue.Job<NotificationJobPayload>) => Promise<any>) {
  if (isProcessorRegistered) return;

  notificationQueue.process(async (job) => {
    logger.info(`Started processing notification job ${job.id} for channel ${job.data.channelType}`);
    try {
      const result = await processHandler(job);
      logger.info(`Successfully completed notification job ${job.id}`);
      return result;
    } catch (err: any) {
      logger.error(`Failed to process notification job ${job.id} on attempt ${job.attemptsMade + 1}: ${err.message}`);
      throw err;
    }
  });

  isProcessorRegistered = true;
}

export default notificationQueue;
