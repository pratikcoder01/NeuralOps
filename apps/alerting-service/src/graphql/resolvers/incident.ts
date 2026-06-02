import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../context';
import { pubsub } from '../../pubsub/redis_pubsub';

export const incidentResolvers = {
  Query: {
    incidents: async (
      _: any,
      args: { workspaceId: string; filter?: any; page?: number; limit?: number },
      context: GraphQLContext
    ) => {
      // Authenticated check
      if (!context.user || context.user.workspaceId !== args.workspaceId) {
        throw new GraphQLError('Unauthorized or invalid workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      const page = args.page || 1;
      const limit = args.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {
        workspaceId: args.workspaceId,
      };

      if (args.filter) {
        const { severity, status, hostId, dateStart, dateEnd } = args.filter;
        if (severity) where.severity = severity;
        if (status) where.status = status;
        if (hostId) where.hostId = hostId;
        if (dateStart || dateEnd) {
          where.detectedAt = {};
          if (dateStart) where.detectedAt.gte = new Date(dateStart);
          if (dateEnd) where.detectedAt.lte = new Date(dateEnd);
        }
      }

      const [items, total] = await Promise.all([
        context.prisma.incident.findMany({
          where,
          orderBy: { detectedAt: 'desc' },
          skip,
          take: limit,
        }),
        context.prisma.incident.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
      };
    },

    incident: async (_: any, args: { id: string }, context: GraphQLContext) => {
      const incident = await context.prisma.incident.findUnique({
        where: { id: args.id },
      });

      if (!incident) return null;

      // Authenticated check
      if (!context.user || context.user.workspaceId !== incident.workspaceId) {
        throw new GraphQLError('Unauthorized to access this incident', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      return incident;
    },
  },

  Mutation: {
    acknowledgeIncident: async (_: any, args: { id: string }, context: GraphQLContext) => {
      // Authentication and authorization checks (Requires SRE, Admin, or Owner role)
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const allowedRoles = ['sre', 'admin', 'owner'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new GraphQLError('Forbidden: SRE role or higher required', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const incident = await context.prisma.incident.findUnique({
        where: { id: args.id },
      });

      if (!incident) {
        throw new GraphQLError('Incident not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (context.user.workspaceId !== incident.workspaceId) {
        throw new GraphQLError('Unauthorized workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      const updated = await context.prisma.incident.update({
        where: { id: args.id },
        data: { status: 'INVESTIGATING' },
      });

      // Trigger WebSocket publish to "incidentUpdated:{id}"
      await pubsub.publish(`incidentUpdated:${args.id}`, {
        incidentUpdated: updated,
      });

      return updated;
    },

    resolveIncident: async (_: any, args: { id: string }, context: GraphQLContext) => {
      // Authentication and authorization checks (Requires SRE, Admin, or Owner role)
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const allowedRoles = ['sre', 'admin', 'owner'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new GraphQLError('Forbidden: SRE role or higher required', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const incident = await context.prisma.incident.findUnique({
        where: { id: args.id },
      });

      if (!incident) {
        throw new GraphQLError('Incident not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (context.user.workspaceId !== incident.workspaceId) {
        throw new GraphQLError('Unauthorized workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      const now = new Date();
      const ttrSeconds = (now.getTime() - new Date(incident.detectedAt).getTime()) / 1000;

      const updated = await context.prisma.incident.update({
        where: { id: args.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
          ttrSeconds: ttrSeconds,
        },
      });

      // Trigger WebSocket publish to "incidentUpdated:{id}"
      await pubsub.publish(`incidentUpdated:${args.id}`, {
        incidentUpdated: updated,
      });

      return updated;
    },
  },

  Subscription: {
    incidentCreated: {
      subscribe: (_: any, args: { workspaceId: string }, context: GraphQLContext) => {
        // Authenticated check is optional on init or verified via connectionParams
        return pubsub.asyncIterator(`incidentCreated:${args.workspaceId}`);
      },
    },
    incidentUpdated: {
      subscribe: (_: any, args: { id: string }, context: GraphQLContext) => {
        return pubsub.asyncIterator(`incidentUpdated:${args.id}`);
      },
    },
  },

  Incident: {
    host: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.hostLoader.load(parent.hostId);
    },
    remediationActions: async (parent: any, _: any, context: GraphQLContext) => {
      return context.prisma.remediationAction.findMany({
        where: { incidentId: parent.id },
        orderBy: { executedAt: 'desc' },
      });
    },
    status: (parent: any) => {
      if (parent.status === 'ACTIVE') return 'OPEN';
      return parent.status;
    },
    metricSnapshot: (parent: any) => {
      return typeof parent.metricSnapshot === 'string'
        ? parent.metricSnapshot
        : JSON.stringify(parent.metricSnapshot);
    },
    detectedAt: (parent: any) => new Date(parent.detectedAt).toISOString(),
    resolvedAt: (parent: any) => (parent.resolvedAt ? new Date(parent.resolvedAt).toISOString() : null),
  },

  RemediationAction: {
    approvedBy: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.approvedBy) return null;
      return context.loaders.userLoader.load(parent.approvedBy);
    },
    actionParams: (parent: any) => {
      return typeof parent.actionParams === 'string'
        ? parent.actionParams
        : JSON.stringify(parent.actionParams);
    },
    approvedAt: (parent: any) => (parent.approvedAt ? new Date(parent.approvedAt).toISOString() : null),
    executedAt: (parent: any) => (parent.executedAt ? new Date(parent.executedAt).toISOString() : null),
  },
};
export default incidentResolvers;
