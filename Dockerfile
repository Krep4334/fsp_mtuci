# syntax=docker/dockerfile:1

FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client ./
ARG VITE_PUBLIC_SITE_URL=http://localhost:3001
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server ./
RUN npx prisma generate && npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./client/dist
EXPOSE 3001
ENV PORT=3001
ENV CLIENT_URL=http://localhost:3001
CMD sh -c "npx prisma migrate deploy && node dist/index.js"
