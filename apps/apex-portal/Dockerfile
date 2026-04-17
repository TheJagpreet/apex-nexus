# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .

# Build-time VITE_ vars must be passed as ARGs
ARG VITE_RAG_URL=http://localhost:8000
ARG VITE_IDENTITY_URL=http://localhost:8001
ARG VITE_GATEWAY_URL=http://localhost:8002
ARG VITE_AGENTS_URL=http://localhost:8003

ENV VITE_RAG_URL=$VITE_RAG_URL
ENV VITE_IDENTITY_URL=$VITE_IDENTITY_URL
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_AGENTS_URL=$VITE_AGENTS_URL

RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing — serve index.html for all routes
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
