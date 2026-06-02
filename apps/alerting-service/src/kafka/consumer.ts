import { Kafka, Consumer } from 'kafkajs';
import { config } from '../config';
import AnomalyHandler, { AnomalyMessage } from './handlers/anomaly_handler';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export class AlertingKafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private isRunning: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'alerting-service',
      brokers: config.KAFKA_BROKERS,
      retry: {
        initialRetryTime: 100,
        retries: 5,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: 'alerting-service',
    });
  }

  async start(): Promise<void> {
    if (config.NODE_ENV === 'test') {
      logger.info('Skipping real Kafka consumer startup in testing environment');
      return;
    }

    try {
      logger.info('Starting Kafka consumer...');
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: 'anomaly.events',
        fromBeginning: false,
      });

      this.isRunning = true;

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const prefix = `${topic}[${partition} | ${message.offset}]`;
          logger.info(`Received Kafka message: ${prefix}`);

          if (!message.value) {
            logger.warn('Skipping Kafka message with empty value');
            return;
          }

          try {
            const rawValue = message.value.toString();
            const payload: AnomalyMessage = JSON.parse(rawValue);

            // Validate that we have the required parameters
            if (!payload.incident_id || !payload.workspace_id || !payload.host_id) {
              throw new Error('Missing required fields (incident_id, workspace_id, host_id) in Kafka payload');
            }

            await AnomalyHandler.handle(payload);
          } catch (err: any) {
            logger.error(`Error processing Kafka message: ${err.message}`);
          }
        },
      });

      logger.info('🚀 Kafka Consumer successfully subscribed and running on topic "anomaly.events"');
    } catch (err: any) {
      logger.error('❌ Failed to start Kafka consumer:', err.message);
      // Do not crash the application, allow retry or fallback operation
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    try {
      await this.consumer.disconnect();
      this.isRunning = false;
      logger.info('Kafka Consumer stopped successfully');
    } catch (err: any) {
      logger.error('Error stopping Kafka consumer:', err.message);
    }
  }
}

export const kafkaConsumer = new AlertingKafkaConsumer();
export default kafkaConsumer;
