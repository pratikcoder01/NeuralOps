# Stage 1: Build & Compile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# Stage 2: Runtime Environment
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Non-root user compliance
RUN addgroup -g 10001 -S appgroup && adduser -u 10001 -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/graphql?query=%7B__schema%7Btypes%7Bname%7D%7D%7D || exit 1

CMD ["node", "dist/index.js"]
