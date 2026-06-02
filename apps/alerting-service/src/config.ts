import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  KAFKA_BROKERS: z
    .string()
    .transform((val) => val.split(','))
    .pipe(z.array(z.string())),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  SENDGRID_API_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
  PAGERDUTY_ROUTING_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

type Config = z.infer<typeof configSchema>;

let parsedConfig: Config;

const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

try {
  parsedConfig = configSchema.parse({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL || (isTest ? 'postgresql://postgres:postgres@localhost:5432/neuralops_test' : undefined),
    REDIS_URL: process.env.REDIS_URL || (isTest ? 'redis://localhost:6379/0' : undefined),
    KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'localhost:9092',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-neuralops',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    PAGERDUTY_ROUTING_KEY: process.env.PAGERDUTY_ROUTING_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL,
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment configuration validation failed:');
    error.errors.forEach((err) => {
      console.error(`   - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('❌ Failed to parse environment configuration:', error);
  }
  process.exit(1);
}

export const config = parsedConfig;
export default config;
