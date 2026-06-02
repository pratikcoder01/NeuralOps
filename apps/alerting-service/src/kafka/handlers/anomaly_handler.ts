import { prisma } from '../../prisma/client';
import { pubsub } from '../../pubsub/redis_pubsub';
import { NotificationService } from '../../notifications/notification_service';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export interface AnomalyMessage {
  incident_id: string;
  workspace_id: string;
  host_id: string;
  title?: string;
  severity: string;
  anomaly_score: number;
  anomaly_type: string;
  metric_snapshot: any;
  detected_at: string;
}

export class AnomalyHandler {
  /**
   * Processes a single anomaly message consumed from Kafka.
   */
  static async handle(message: AnomalyMessage): Promise<void> {
    logger.info(`Received anomaly event for incident ${message.incident_id}`);

    try {
      const {
        incident_id,
        workspace_id,
        host_id,
        severity,
        anomaly_score,
        anomaly_type,
        metric_snapshot,
        detected_at,
      } = message;

      // 1. Ensure the workspace and host exist in the database (to prevent foreign key constraint violations)
      // This is especially helpful during testing and async synchronization.
      const workspaceExists = await prisma.workspace.findUnique({
        where: { id: workspace_id },
      });

      if (!workspaceExists) {
        // Dynamic fallback creation for robustness
        logger.warn(`Workspace ${workspace_id} not found in DB. Creating fallback workspace...`);
        await prisma.workspace.create({
          data: {
            id: workspace_id,
            name: 'Fallback Workspace',
            slug: `fallback-${workspace_id.slice(0, 8)}`,
            plan: 'free',
            hostLimit: 10,
          },
        });
      }

      const hostExists = await prisma.host.findUnique({
        where: { id: host_id },
      });

      if (!hostExists) {
        logger.warn(`Host ${host_id} not found in DB. Creating fallback host...`);
        await prisma.host.create({
          data: {
            id: host_id,
            workspaceId: workspace_id,
            hostname: `fallback-host-${host_id.slice(0, 8)}`,
            ipAddress: '127.0.0.1',
            cloudProvider: 'on-premise',
            status: 'healthy',
          },
        });
      }

      // 2. Check if the incident already exists (idempotency guard)
      const existingIncident = await prisma.incident.findUnique({
        where: { id: incident_id },
      });

      if (existingIncident) {
        logger.info(`Incident ${incident_id} already exists in DB. Skipping creation.`);
        return;
      }

      // 3. Create the incident record in PostgreSQL via Prisma
      const title = message.title || `${anomaly_type} Anomaly Detected`;
      const incident = await prisma.incident.create({
        data: {
          id: incident_id,
          workspaceId: workspace_id,
          hostId: host_id,
          title: title,
          severity: severity.toUpperCase(),
          status: 'ACTIVE',
          anomalyScore: anomaly_score,
          anomalyType: anomaly_type,
          metricSnapshot: metric_snapshot || {},
          detectedAt: new Date(detected_at),
          rootCauseTags: [anomaly_type.toLowerCase()],
        },
        include: {
          host: true,
        },
      });

      logger.info(`Successfully saved incident ${incident.id} to the database`);

      // 4. Publish to Redis PubSub for real-time GraphQL dashboard subscriptions
      // Channel: "incidentCreated:{workspace_id}"
      await pubsub.publish(`incidentCreated:${workspace_id}`, {
        incidentCreated: incident,
      });

      // 5. Trigger multichannel async notifications (Slack, Email, PagerDuty) via Bull
      await NotificationService.dispatchNotifications({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        anomalyScore: incident.anomalyScore,
        anomalyType: incident.anomalyType || 'ML_ANOMALY',
        detectedAt: incident.detectedAt,
        workspaceId: incident.workspaceId,
        hostId: incident.hostId,
      });
    } catch (err: any) {
      logger.error(`❌ Failed to process anomaly event: ${err.message}`, {
        stack: err.stack,
        message,
      });
      throw err;
    }
  }
}

export default AnomalyHandler;
