import { PrismaClient } from '@prisma/client';
import { PubSubEngine } from 'graphql-subscriptions';
import { prisma } from '../prisma/client';
import { pubsub } from '../pubsub/redis_pubsub';
import { createLoaders, DataLoaders } from '../middleware/dataloader';
import { getClaimsFromHeader, UserClaims } from '../middleware/auth';

export interface GraphQLContext {
  prisma: PrismaClient;
  pubsub: PubSubEngine;
  loaders: DataLoaders;
  user: UserClaims | null;
}

export function buildContext(req?: any): GraphQLContext {
  const loaders = createLoaders();
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
  const user = getClaimsFromHeader(authHeader);

  return {
    prisma,
    pubsub,
    loaders,
    user,
  };
}

export default buildContext;
