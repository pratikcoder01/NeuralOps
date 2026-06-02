import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/neuralops';
const PORT = parseInt(process.env.PORT || '4000', 10);

// Connect to MongoDB
let isConnected = false;
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    isConnected = true;
  })
  .catch((err) => {
    console.error('MongoDB connection failed (running in offline fallback mode):', err.message);
  });

// Schema definition for alerts
const alertSchema = new mongoose.Schema({
  hostname: { type: String, required: true },
  severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'WARNING' },
  triggerName: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now },
});

const AlertModel = mongoose.model('Alert', alertSchema);

// In-memory fallback if MongoDB is not connected
const fallbackAlerts = [
  {
    id: 'fb-1',
    hostname: 'k8s-node-primary-01',
    severity: 'CRITICAL',
    triggerName: 'high_cpu_utilization',
    message: 'CPU usage exceeded 90% threshold',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fb-2',
    hostname: 'staging-api-gateway',
    severity: 'WARNING',
    triggerName: 'memory_leak_detected',
    message: 'Memory consumption increasing linearly',
    status: 'RESOLVED',
    createdAt: new Date().toISOString(),
  }
];

// GraphQL Type Definitions
const typeDefs = `#graphql
  enum Severity {
    INFO
    WARNING
    CRITICAL
  }

  enum Status {
    ACTIVE
    RESOLVED
  }

  type Alert {
    id: ID!
    hostname: String!
    severity: Severity!
    triggerName: String!
    message: String!
    status: Status!
    createdAt: String!
  }

  type Health {
    status: String!
    mongodb: String!
  }

  type Query {
    alerts: [Alert!]!
    alert(id: ID!): Alert
    health: Health!
  }

  type Mutation {
    createAlert(
      hostname: String!
      severity: Severity!
      triggerName: String!
      message: String!
    ): Alert!

    resolveAlert(id: ID!): Alert
  }
`;

// Resolvers
const resolvers = {
  Query: {
    alerts: async () => {
      if (isConnected) {
        try {
          const dbAlerts = await AlertModel.find().sort({ createdAt: -1 });
          return dbAlerts.map(a => ({
            id: a._id.toString(),
            hostname: a.hostname,
            severity: a.severity,
            triggerName: a.triggerName,
            message: a.message,
            status: a.status,
            createdAt: a.createdAt.toISOString(),
          }));
        } catch (e) {
          console.error('Failed to query DB, using fallback alerts:', e);
        }
      }
      return fallbackAlerts;
    },
    alert: async (_: any, { id }: { id: string }) => {
      if (isConnected && !id.startsWith('fb-')) {
        try {
          const a = await AlertModel.findById(id);
          if (a) {
            return {
              id: a._id.toString(),
              hostname: a.hostname,
              severity: a.severity,
              triggerName: a.triggerName,
              message: a.message,
              status: a.status,
              createdAt: a.createdAt.toISOString(),
            };
          }
        } catch (e) {
          console.error(`Failed to find alert with id ${id}:`, e);
        }
      }
      return fallbackAlerts.find(a => a.id === id) || null;
    },
    health: () => ({
      status: 'healthy',
      mongodb: isConnected ? 'CONNECTED' : 'OFFLINE_FALLBACK',
    })
  },
  Mutation: {
    createAlert: async (_: any, args: { hostname: string; severity: string; triggerName: string; message: string }) => {
      if (isConnected) {
        try {
          const newAlert = new AlertModel({
            hostname: args.hostname,
            severity: args.severity,
            triggerName: args.triggerName,
            message: args.message,
            status: 'ACTIVE',
          });
          const saved = await newAlert.save();
          return {
            id: saved._id.toString(),
            hostname: saved.hostname,
            severity: saved.severity,
            triggerName: saved.triggerName,
            message: saved.message,
            status: saved.status,
            createdAt: saved.createdAt.toISOString(),
          };
        } catch (e) {
          console.error('Failed to create alert in DB:', e);
        }
      }
      // Fallback behavior
      const mockNew = {
        id: `fb-${Date.now()}`,
        hostname: args.hostname,
        severity: args.severity,
        triggerName: args.triggerName,
        message: args.message,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      fallbackAlerts.push(mockNew);
      return mockNew;
    },
    resolveAlert: async (_: any, { id }: { id: string }) => {
      if (isConnected && !id.startsWith('fb-')) {
        try {
          const updated = await AlertModel.findByIdAndUpdate(
            id,
            { status: 'RESOLVED' },
            { new: true }
          );
          if (updated) {
            return {
              id: updated._id.toString(),
              hostname: updated.hostname,
              severity: updated.severity,
              triggerName: updated.triggerName,
              message: updated.message,
              status: updated.status,
              createdAt: updated.createdAt.toISOString(),
            };
          }
        } catch (e) {
          console.error(`Failed to resolve alert with id ${id}:`, e);
        }
      }
      // Fallback updates
      const idx = fallbackAlerts.findIndex(a => a.id === id);
      if (idx !== -1) {
        fallbackAlerts[idx].status = 'RESOLVED';
        return fallbackAlerts[idx];
      }
      return null;
    }
  }
};

// Start Server
async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
  });

  console.log(`🚀 Apollo Alerting GraphQL Service running at: ${url}`);
}

startServer();
