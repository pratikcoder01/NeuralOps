import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { schema } from './graphql/schema';
import { buildContext } from './graphql/context';

export async function createServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // 1. Establish the WebSocket Server dedicated to GraphQL Subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // 2. Attach WebSocket connection events to useServer schema handler
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        // ws subscriptions context
        const connectionParams = ctx.connectionParams as any;
        const authHeader = connectionParams?.Authorization || connectionParams?.authorization;
        return buildContext({
          headers: {
            authorization: authHeader,
          },
        });
      },
    },
    wsServer
  );

  // 3. Establish the Apollo Server 4 GraphQL handler
  const server = new ApolloServer({
    schema,
    plugins: [
      // Gracefully shutdown the HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Gracefully shutdown the WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  // 4. Mount CORS, JSON parsing, and context mapping middleware to Express
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => buildContext(req),
    })
  );

  // 5. Expose simple health status endpoint
  app.get('/health', async (req, res) => {
    try {
      res.json({
        status: 'ok',
        service: 'alerting-service',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  return { httpServer, app, apolloServer: server };
}

export default createServer;
