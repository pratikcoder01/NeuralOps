import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../context';
import { NotificationService } from '../../notifications/notification_service';

export const notificationResolvers = {
  Query: {
    notificationChannels: async (_: any, args: { workspaceId: string }, context: GraphQLContext) => {
      // Authenticated check
      if (!context.user || context.user.workspaceId !== args.workspaceId) {
        throw new GraphQLError('Unauthorized or invalid workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      const channels = await context.prisma.notificationChannel.findMany({
        where: { workspaceId: args.workspaceId },
        orderBy: { createdAt: 'asc' },
      });

      return channels.map((c) => ({
        id: c.id,
        workspaceId: c.workspaceId,
        type: c.type,
        config: typeof c.config === 'string' ? c.config : JSON.stringify(c.config),
        isActive: c.isActive,
      }));
    },
  },

  Mutation: {
    createNotificationChannel: async (
      _: any,
      args: { input: { workspaceId: string; type: string; config: string; isActive?: boolean } },
      context: GraphQLContext
    ) => {
      // Authenticated and Authorized check (Only Admin/Owner)
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const allowedRoles = ['admin', 'owner'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new GraphQLError('Forbidden: Admin role or higher required to edit notification configurations', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      if (context.user.workspaceId !== args.input.workspaceId) {
        throw new GraphQLError('Unauthorized workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(args.input.config);
      } catch (err) {
        throw new GraphQLError('Invalid JSON format for channel config', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const newChannel = await context.prisma.notificationChannel.create({
        data: {
          workspaceId: args.input.workspaceId,
          type: args.input.type,
          config: parsedConfig,
          isActive: args.input.isActive !== undefined ? args.input.isActive : true,
        },
      });

      // Invalidate the cache
      await NotificationService.invalidateCache(args.input.workspaceId);

      return {
        id: newChannel.id,
        workspaceId: newChannel.workspaceId,
        type: newChannel.type,
        config: JSON.stringify(newChannel.config),
        isActive: newChannel.isActive,
      };
    },

    updateNotificationChannel: async (
      _: any,
      args: { id: string; input: { workspaceId: string; type: string; config: string; isActive?: boolean } },
      context: GraphQLContext
    ) => {
      // Authenticated and Authorized check (Only Admin/Owner)
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const allowedRoles = ['admin', 'owner'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new GraphQLError('Forbidden: Admin role or higher required', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const channel = await context.prisma.notificationChannel.findUnique({
        where: { id: args.id },
      });

      if (!channel) {
        throw new GraphQLError('Notification channel not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (context.user.workspaceId !== channel.workspaceId || context.user.workspaceId !== args.input.workspaceId) {
        throw new GraphQLError('Unauthorized workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(args.input.config);
      } catch (err) {
        throw new GraphQLError('Invalid JSON format for channel config', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const updated = await context.prisma.notificationChannel.update({
        where: { id: args.id },
        data: {
          type: args.input.type,
          config: parsedConfig,
          isActive: args.input.isActive !== undefined ? args.input.isActive : channel.isActive,
        },
      });

      // Invalidate the cache
      await NotificationService.invalidateCache(channel.workspaceId);

      return {
        id: updated.id,
        workspaceId: updated.workspaceId,
        type: updated.type,
        config: JSON.stringify(updated.config),
        isActive: updated.isActive,
      };
    },

    deleteNotificationChannel: async (_: any, args: { id: string }, context: GraphQLContext) => {
      // Authenticated and Authorized check (Only Admin/Owner)
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const allowedRoles = ['admin', 'owner'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new GraphQLError('Forbidden: Admin role or higher required', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const channel = await context.prisma.notificationChannel.findUnique({
        where: { id: args.id },
      });

      if (!channel) {
        throw new GraphQLError('Notification channel not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (context.user.workspaceId !== channel.workspaceId) {
        throw new GraphQLError('Unauthorized workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      await context.prisma.notificationChannel.delete({
        where: { id: args.id },
      });

      // Invalidate the cache
      await NotificationService.invalidateCache(channel.workspaceId);

      return true;
    },

    testNotificationChannel: async (_: any, args: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const channel = await context.prisma.notificationChannel.findUnique({
        where: { id: args.id },
      });

      if (!channel) {
        throw new GraphQLError('Notification channel not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (context.user.workspaceId !== channel.workspaceId) {
        throw new GraphQLError('Unauthorized workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      // Trigger a mock test alert job delivery
      try {
        const dummyIncident = {
          id: 'test-incident-uuid',
          title: '🚨 Test Notification Signal from alerting-service',
          severity: 'INFO',
          status: 'OPEN',
          anomalyScore: 0.0,
          anomalyType: 'TEST_HEARTBEAT',
          detectedAt: new Date().toISOString(),
          workspaceId: channel.workspaceId,
          hostId: 'test-host-uuid',
        };

        // Create fallback host for tests if it does not exist
        const hostExists = await context.prisma.host.findUnique({
          where: { id: 'test-host-uuid' },
        });

        if (!hostExists) {
          await context.prisma.host.create({
            data: {
              id: 'test-host-uuid',
              workspaceId: channel.workspaceId,
              hostname: 'neuralops-test-agent',
              ipAddress: '127.0.0.1',
              cloudProvider: 'on-premise',
              status: 'healthy',
            },
          });
        }

        await NotificationService.dispatchNotifications(dummyIncident);
        return true;
      } catch (err: any) {
        throw new GraphQLError(`Failed to dispatch test notification: ${err.message}`, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};
export default notificationResolvers;
