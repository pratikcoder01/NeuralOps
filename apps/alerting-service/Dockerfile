# Multistage Node.js Dockerfile with Prisma integration
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 4000

ENV PORT 4000
ENV NODE_ENV production

CMD ["node", "dist/index.js"]
