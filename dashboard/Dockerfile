# Multi-stage Dockerfile for dashboard (Vite + React)
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Optional build arguments for environment variables
ARG VITE_MQTT_WS_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_MQTT_WS_URL=$VITE_MQTT_WS_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build production bundle to dist/
RUN npm run build

# Stage 2: Serve production bundle with Nginx Alpine
FROM nginx:alpine AS runner

# Remove default nginx configurations
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
