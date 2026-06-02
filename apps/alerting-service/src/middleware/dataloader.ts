import DataLoader from 'dataloader';
import { prisma } from '../prisma/client';

export interface DataLoaders {
  hostLoader: DataLoader<string, any>;
  userLoader: DataLoader<string, any>;
}

export function createLoaders(): DataLoaders {
  return {
    hostLoader: new DataLoader<string, any>(async (keys) => {
      try {
        const uniqueKeys = Array.from(new Set(keys));
        const hosts = await prisma.host.findMany({
          where: {
            id: {
              in: uniqueKeys,
            },
          },
        });
        const hostMap = new Map(hosts.map((h) => [h.id, h]));
        return keys.map((key) => hostMap.get(key) || null);
      } catch (err) {
        console.error('DataLoader error in hostLoader:', err);
        return keys.map(() => null);
      }
    }),
    userLoader: new DataLoader<string, any>(async (keys) => {
      try {
        const uniqueKeys = Array.from(new Set(keys));
        const users = await prisma.user.findMany({
          where: {
            id: {
              in: uniqueKeys,
            },
          },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));
        return keys.map((key) => userMap.get(key) || null);
      } catch (err) {
        console.error('DataLoader error in userLoader:', err);
        return keys.map(() => null);
      }
    }),
  };
}
export default createLoaders;
