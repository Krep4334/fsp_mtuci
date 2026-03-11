# Tournament Manager - Система управления турнирами

Профессиональная система управления турнирами с онлайн табло, жеребьевкой и live обновлениями.

## 🚀 Возможности

- **Управление турнирами**: Создание, настройка и управление турнирами различных форматов
- **Система команд**: Регистрация команд и управление участниками
- **Турнирная сетка**: Автоматическая генерация сеток для различных форматов
- **Жеребьевка**: Автоматическая и ручная жеребьевка команд
- **Роли и права**: Система ролей (Админ, Организатор, Судья, Участник, Зритель)
- **Live обновления**: Real-time обновления через WebSocket
- **Онлайн табло**: Публичное отображение результатов в реальном времени
- **Статистика**: Подробная статистика турниров и матчей

## 📋 Поддерживаемые форматы турниров

- **Single Elimination** - Классический формат на выбывание
- **Double Elimination** - Формат с возможностью возврата
- **Round Robin** - Круговая система
- **Swiss System** - Система с автоматическим подбором соперников

## 🛠 Технологический стек

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **Socket.io** для real-time обновлений
- **JWT** аутентификация
- **bcryptjs** для хеширования паролей

### Frontend
- **React** + **TypeScript**
- **Vite** для сборки
- **Tailwind CSS** для стилизации
- **React Query** для управления состоянием
- **React Hook Form** для форм
- **Socket.io Client** для real-time соединения

## 📦 Установка и запуск

### Вариант 1: Docker (рекомендуется)

**Предварительные требования:**
- Docker Desktop (или Docker Engine + Docker Compose)

**Быстрый запуск:**
```bash
# Запустить все сервисы одной командой
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

После запуска приложение доступно:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001/api

**Учетные данные администратора:**
- Email: `admin@tournament.local`
- Username: `admin`
- Password: `admin123`

**Полезные команды:**
```bash
docker-compose ps              # Статус контейнеров
docker-compose restart         # Перезапуск
docker-compose logs -f server  # Логи сервера
docker-compose exec server sh  # Вход в контейнер сервера
```

### Вариант 2: Локальная установка

**Предварительные требования:**

- Node.js 18+
- PostgreSQL 13+
- npm или yarn

#### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd tournament-management-system
```

#### 2. Установка зависимостей

```bash
# Установка зависимостей для всего проекта
npm run install:all

# Или установка по отдельности
npm install
cd server && npm install
cd ../client && npm install
```

#### 3. Настройка базы данных

```bash
# Переход в папку сервера
cd server

# Копирование файла конфигурации
cp env.example .env

# Редактирование .env файла
# Укажите правильные данные для подключения к PostgreSQL:
# DATABASE_URL="postgresql://username:password@localhost:5432/tournament_db"
# JWT_SECRET="your-super-secret-jwt-key-here"
# PORT=3001
# CLIENT_URL="http://localhost:5173"
```

#### 4. Инициализация базы данных

```bash
# Генерация Prisma клиента
npm run db:generate

# Применение миграций
npm run db:migrate
```

#### 5. Запуск приложения

```bash
# Возврат в корневую папку
cd ..

# Запуск в режиме разработки (backend + frontend)
npm run dev

# Или запуск по отдельности:
# Backend (порт 3001)
npm run server:dev

# Frontend (порт 5173)
npm run client:dev
```

## 🌐 Доступ к приложению

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Prisma Studio**: http://localhost:5555 (запуск: `npm run db:studio`)

## 👥 Роли пользователей

### Администратор (ADMIN)
- Полный доступ ко всем функциям системы
- Управление пользователями и их ролями
- Просмотр всех турниров

### Организатор (ORGANIZER)
- Создание и управление турнирами
- Назначение судей
- Управление командами и матчами

### Судья (JUDGE)
- Ввод результатов матчей
- Обновление статуса матчей
- Просмотр турнирной сетки

### Участник (PARTICIPANT)
- Регистрация в турнирах
- Создание и управление командами
- Просмотр результатов

### Зритель (SPECTATOR)
- Просмотр публичной информации
- Доступ к онлайн табло

## 📱 Основные функции

### Для организаторов:
1. **Создание турнира** - Настройка параметров, дат, призового фонда
2. **Управление регистрацией** - Открытие/закрытие регистрации
3. **Генерация сетки** - Автоматическое создание турнирной сетки
4. **Назначение судей** - Добавление судей с определенными правами
5. **Управление матчами** - Контроль процесса проведения турнира

### Для судей:
1. **Ввод результатов** - Добавление результатов матчей
2. **Обновление статуса** - Изменение статуса матчей
3. **Подтверждение результатов** - Валидация введенных данных

### Для участников:
1. **Регистрация команд** - Создание команды и приглашение участников
2. **Подача заявок** - Участие в турнирах
3. **Просмотр результатов** - Отслеживание прогресса команды

### Для зрителей:
1. **Онлайн табло** - Live просмотр результатов
2. **Статистика турнира** - Общая информация о турнире

## 🔧 Разработка

### Структура проекта

```
tournament-management-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Переиспользуемые компоненты
│   │   ├── contexts/       # React контексты
│   │   ├── pages/          # Страницы приложения
│   │   ├── services/       # API сервисы
│   │   └── utils/          # Утилиты
│   ├── public/             # Статические файлы
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API маршруты
│   │   ├── middleware/     # Express middleware
│   │   ├── socket/         # Socket.io обработчики
│   │   └── utils/          # Утилиты
│   ├── prisma/             # Схема базы данных
│   └── package.json
└── package.json            # Корневой package.json
```

### Полезные команды

```bash
# Разработка
npm run dev                 # Запуск в режиме разработки
npm run server:dev         # Только backend
npm run client:dev         # Только frontend

# База данных
npm run db:migrate         # Применение миграций
npm run db:generate        # Генерация Prisma клиента
npm run db:studio          # Запуск Prisma Studio

# Сборка
npm run build              # Сборка frontend
npm run start              # Запуск production сервера
```

## 🚀 Развертывание

### Production сборка

```bash
# Сборка frontend
cd client
npm run build

# Сборка backend
cd ../server
npm run build

# Запуск production сервера
npm start
```

### Переменные окружения для production

```env
DATABASE_URL="postgresql://username:password@host:port/database"
JWT_SECRET="your-production-jwt-secret"
NODE_ENV="production"
PORT=3001
CLIENT_URL="https://your-domain.com"
```

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 📞 Поддержка

Если у вас есть вопросы или проблемы, создайте issue в репозитории проекта.

---

**Tournament Manager** - Профессиональное решение для управления турнирами 🏆
