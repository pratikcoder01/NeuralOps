import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../context';

export const analyticsResolvers = {
  Query: {
    analyticsOverview: async (
      _: any,
      args: { workspaceId: string; period: string },
      context: GraphQLContext
    ) => {
      // Authenticated check
      if (!context.user || context.user.workspaceId !== args.workspaceId) {
        throw new GraphQLError('Unauthorized or invalid workspace context', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      const now = new Date();
      let periodDays = 30;
      if (args.period.toLowerCase() === '7d') periodDays = 7;
      if (args.period.toLowerCase() === '24h') periodDays = 1;

      const startDate = new Date();
      startDate.setDate(now.getDate() - periodDays);

      // 1. Gather counts and averages via Prisma
      const totalIncidents = await context.prisma.incident.count({
        where: {
          workspaceId: args.workspaceId,
          detectedAt: { gte: startDate },
        },
      });

      const avgStats = await context.prisma.incident.aggregate({
        where: {
          workspaceId: args.workspaceId,
          detectedAt: { gte: startDate },
        },
        _avg: {
          ttdSeconds: true,
          ttrSeconds: true,
        },
      });

      // 2. Count resolved today
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const resolvedToday = await context.prisma.incident.count({
        where: {
          workspaceId: args.workspaceId,
          status: 'RESOLVED',
          resolvedAt: { gte: yesterday },
        },
      });

      // 3. Count open critical
      const openCritical = await context.prisma.incident.count({
        where: {
          workspaceId: args.workspaceId,
          severity: 'CRITICAL',
          status: { in: ['ACTIVE', 'INVESTIGATING'] },
        },
      });

      // 4. Count by severity
      const severityGroups = await context.prisma.incident.groupBy({
        by: ['severity'],
        where: {
          workspaceId: args.workspaceId,
          detectedAt: { gte: startDate },
        },
        _count: {
          _all: true,
        },
      });

      const severityObj: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };
      severityGroups.forEach((g) => {
        severityObj[g.severity] = g._count._all;
      });

      // 5. Gather top hosts
      const hostGroups = await context.prisma.incident.groupBy({
        by: ['hostId'],
        where: {
          workspaceId: args.workspaceId,
          detectedAt: { gte: startDate },
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            hostId: 'desc',
          },
        },
        take: 5,
      });

      const topHosts = await Promise.all(
        hostGroups.map(async (hg) => {
          const host = await context.prisma.host.findUnique({
            where: { id: hg.hostId },
            select: { hostname: true },
          });
          return {
            hostname: host?.hostname || 'unknown-host',
            count: hg._count._all,
          };
        })
      );

      // 6. Gather incidents by day (last 30 days)
      const dayBuckets: Record<string, number> = {};
      for (let i = 0; i < periodDays; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        dayBuckets[dayStr] = 0;
      }

      const incidents = await context.prisma.incident.findMany({
        where: {
          workspaceId: args.workspaceId,
          detectedAt: { gte: startDate },
        },
        select: { detectedAt: true },
      });

      incidents.forEach((inc) => {
        const dayStr = new Date(inc.detectedAt).toISOString().split('T')[0];
        if (dayBuckets[dayStr] !== undefined) {
          dayBuckets[dayStr]++;
        }
      });

      const incidentsByDay = Object.entries(dayBuckets).map(([day, count]) => ({
        day,
        count,
      })).reverse();

      return {
        totalIncidents,
        avgMttdSeconds: avgStats._avg.ttdSeconds || 0.0,
        avgMttrSeconds: avgStats._avg.ttrSeconds || 0.0,
        incidentsBySeverity: JSON.stringify(severityObj),
        incidentsByDay: JSON.stringify(incidentsByDay),
        topHostsByIncidents: JSON.stringify(topHosts),
        resolvedToday,
        openCritical,
      };
    },
  },
};
export default analyticsResolvers;
