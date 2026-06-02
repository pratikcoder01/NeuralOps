import { incidentResolvers } from './incident';
import { hostResolvers } from './host';
import { analyticsResolvers } from './analytics';
import { notificationResolvers } from './notification';

export const resolvers = {
  Query: {
    ...incidentResolvers.Query,
    ...hostResolvers.Query,
    ...analyticsResolvers.Query,
    ...notificationResolvers.Query,
  },
  Mutation: {
    ...incidentResolvers.Mutation,
    ...notificationResolvers.Mutation,
  },
  Subscription: {
    ...incidentResolvers.Subscription,
    ...hostResolvers.Subscription,
  },
  Incident: incidentResolvers.Incident,
  RemediationAction: incidentResolvers.RemediationAction,
  Host: hostResolvers.Host,
};

export default resolvers;
