# Dockerfile для сервера
FROM node:18-alpine AS base

# Установка необходимых библиотек для Prisma
RUN apk add --no-cache openssl libc6-compat

# Установка зависимостей только для production
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Установка всех зависимостей (включая dev) для сборки
FROM base AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npm cache clean --force
RUN npx prisma generate
COPY . .
RUN npm run build

# Production образ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Создание непривилегированного пользователя
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Копирование необходимых файлов
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# Копируем Prisma CLI из builder (нужен для миграций)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --chown=nodejs:nodejs package*.json ./

# Создание директории для загрузок
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 3001

# Команда запуска с ожиданием базы данных
# Генерируем Prisma клиент перед миграциями
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node dist/index.js"]

