import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../context';
import { pubsub } from '../../pubsub/redis_pubsub';

export const hostResolvers = {
  Query: {
    hosts: async (_: any, args: { workspaceId: string }, context: GraphQLContext) => {
      // Authenticated check
      if (!context.user || context.user.workspaceId !== args.workspaceId) {
        throw new GraphQLError('Unauthorized or invalid workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      return context.prisma.host.findMany({
        where: { workspaceId: args.workspaceId },
        orderBy: { hostname: 'asc' },
      });
    },
  },

  Subscription: {
    metricsStream: {
      subscribe: (_: any, args: { hostId: string }, context: GraphQLContext) => {
        return pubsub.asyncIterator(`metricsStream:${args.hostId}`);
      },
    },
  },

  Host: {
    tags: (parent: any) => {
      return typeof parent.tags === 'string' ? parent.tags : JSON.stringify(parent.tags);
    },
    lastHeartbeat: (parent: any) => new Date(parent.lastHeartbeat).toISOString(),
  },
};
export default hostResolvers;
