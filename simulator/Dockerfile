# Multi-stage Dockerfile for simulator & embedded broker
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Ports: 1883 (MQTT TCP), 8083 (MQTT WebSocket)
EXPOSE 1883 8083

USER node

# By default runs the embedded broker; can be overridden in compose to run simulator generator
CMD ["node", "dist/broker.js"]
