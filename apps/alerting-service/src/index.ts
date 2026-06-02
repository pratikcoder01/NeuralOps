import { createServer } from './server';
import { config } from './config';
import { kafkaConsumer } from './kafka/consumer';
import { prisma } from './prisma/client';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

async function main() {
  logger.info('Initializing NeuralOps Alerting Service...');

  try {
    // 1. Verify PostgreSQL Database Connection Pool
    logger.info('Verifying database connection pool...');
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database successfully.');

    // 2. Initialize and Boot HTTP & WebSocket Servers
    logger.info('Booting Express HTTP and WebSocket GraphQL Gateways...');
    const { httpServer } = await createServer();

    httpServer.listen(config.PORT, () => {
      logger.info(`🚀 Alerting GraphQL Service fully operational on port ${config.PORT}`);
      logger.info(`   - GraphQL Endpoint: http://localhost:${config.PORT}/graphql`);
      logger.info(`   - Subscriptions WS: ws://localhost:${config.PORT}/graphql`);
    });

    // 3. Launch Kafka Anomaly Events Consumer Group
    logger.info('Starting Kafka Anomaly Consumer Group...');
    await kafkaConsumer.start();

    // 4. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down alerting-service gracefully...`);
      
      try {
        await kafkaConsumer.stop();
        await prisma.$disconnect();
        
        httpServer.close(() => {
          logger.info('HTTP and WebSocket servers shut down successfully.');
          process.exit(0);
        });
      } catch (err: any) {
        logger.error(`Error during graceful shutdown: ${err.message}`);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err: any) {
    logger.error('❌ Alerting Service failed to start:', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

main();
