import { makeExecutableSchema } from '@graphql-tools/schema';
import fs from 'fs';
import path from 'path';
import { resolvers } from './resolvers';

const baseSchema = `#graphql
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
  type Subscription {
    _empty: String
  }
`;

function loadSchemaFile(filename: string): string {
  const primaryPath = path.join(__dirname, 'typeDefs', filename);
  try {
    return fs.readFileSync(primaryPath, 'utf8');
  } catch (err) {
    // Resilient fallback: if running compiled code in dist/, resolve from src/
    try {
      const fallbackPath = path.join(__dirname, '..', '..', 'src', 'graphql', 'typeDefs', filename);
      return fs.readFileSync(fallbackPath, 'utf8');
    } catch (fallbackErr) {
      // Inline hardcoded fallbacks in case both filesystem reads fail
      console.error(`⚠️ Schema fallback triggered for ${filename}:`, fallbackErr);
      return getHardcodedFallback(filename);
    }
  }
}

function getHardcodedFallback(filename: string): string {
  switch (filename) {
    case 'incident.graphql':
      return `
        enum Severity { CRITICAL HIGH MEDIUM LOW }
        enum IncidentStatus { OPEN INVESTIGATING RESOLVED SUPPRESSED }
        enum ActionStatus { PENDING APPROVED RUNNING SUCCESS FAILED }
        type RemediationAction {
          id: ID!
          incidentId: ID!
          workspaceId: ID!
          runbookId: ID
          actionType: String!
          actionParams: String!
          approvalRequired: Boolean!
          approvedBy: User
          approvedAt: String
          status: ActionStatus!
          resultLog: String
          executedAt: String
          durationSeconds: Float
        }
        type Incident {
          id: ID!
          workspaceId: ID!
          hostId: ID!
          title: String!
          severity: Severity!
          status: IncidentStatus!
          anomalyScore: Float!
          anomalyType: String
          metricSnapshot: String!
          llmExplanation: String
          rootCauseTags: [String!]!
          detectedAt: String!
          resolvedAt: String
          ttdSeconds: Float
          ttrSeconds: Float
          host: Host!
          remediationActions: [RemediationAction!]!
        }
        input IncidentFilter {
          severity: Severity
          status: IncidentStatus
          hostId: ID
          dateStart: String
          dateEnd: String
        }
        type IncidentPage {
          items: [Incident!]!
          total: Int!
          page: Int!
          limit: Int!
        }
        extend type Query {
          incidents(workspaceId: ID!, filter: IncidentFilter, page: Int, limit: Int): IncidentPage!
          incident(id: ID!): Incident
        }
        extend type Mutation {
          acknowledgeIncident(id: ID!): Incident!
          resolveIncident(id: ID!): Incident!
        }
        extend type Subscription {
          incidentCreated(workspaceId: ID!): Incident!
          incidentUpdated(id: ID!): Incident!
        }
      `;
    case 'host.graphql':
      return `
        type Host {
          id: ID!
          workspaceId: ID!
          hostname: String!
          ipAddress: String!
          cloudProvider: String!
          region: String
          tags: String!
          agentVersion: String!
          lastHeartbeat: String!
          status: String!
        }
        type MetricsFrame {
          hostId: ID!
          timestamp: String!
          cpuPercent: Float!
          memUsedBytes: Float!
          memTotalBytes: Float!
          diskIoRead: Float!
          diskIoWrite: Float!
          netBytesRecv: Float!
          netBytesSent: Float!
        }
        extend type Query {
          hosts(workspaceId: ID!): [Host!]!
        }
        extend type Subscription {
          metricsStream(hostId: ID!): MetricsFrame!
        }
      `;
    case 'user.graphql':
      return `
        type User {
          id: ID!
          workspaceId: ID!
          email: String!
          name: String!
          role: String!
          avatarUrl: String
          createdAt: String!
        }
        type Workspace {
          id: ID!
          name: String!
          slug: String!
          plan: String!
          hostLimit: Int!
          createdAt: String!
        }
      `;
    case 'analytics.graphql':
      return `
        type Analytics {
          totalIncidents: Int!
          avgMttdSeconds: Float!
          avgMttrSeconds: Float!
          incidentsBySeverity: String!
          incidentsByDay: String!
          topHostsByIncidents: String!
          resolvedToday: Int!
          openCritical: Int!
        }
        extend type Query {
          analyticsOverview(workspaceId: ID!, period: String!): Analytics!
        }
      `;
    case 'notification.graphql':
      return `
        type NotificationChannel {
          id: ID!
          workspaceId: ID!
          type: String!
          config: String!
          isActive: Boolean!
        }
        input NotifChannelInput {
          workspaceId: ID!
          type: String!
          config: String!
          isActive: Boolean
        }
        extend type Query {
          notificationChannels(workspaceId: ID!): [NotificationChannel!]!
        }
        extend type Mutation {
          createNotificationChannel(input: NotifChannelInput!): NotificationChannel!
          updateNotificationChannel(id: ID!, input: NotifChannelInput!): NotificationChannel!
          deleteNotificationChannel(id: ID!): Boolean!
          testNotificationChannel(id: ID!): Boolean!
        }
      `;
    default:
      return '';
  }
}

const typeDefs = [
  baseSchema,
  loadSchemaFile('incident.graphql'),
  loadSchemaFile('host.graphql'),
  loadSchemaFile('user.graphql'),
  loadSchemaFile('analytics.graphql'),
  loadSchemaFile('notification.graphql'),
];

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export default schema;
