# Dockerfile для клиента
FROM node:18-alpine AS base

# Стадия установки зависимостей
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Стадия сборки
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production стадия с nginx
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Удаление дефолтных файлов nginx
RUN rm -rf ./*

# Копирование собранных файлов
COPY --from=builder /app/dist .

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

