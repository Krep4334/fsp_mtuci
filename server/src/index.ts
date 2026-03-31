import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

// Импорт роутов
import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import matchRoutes from './routes/matches';
import userRoutes from './routes/users';
import bracketRoutes from './routes/brackets';
import debugRoutes from './routes/debug';
import storageRoutes from './routes/storage';
import { ensureBucketExists } from './services/objectStorage';

// Импорт middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Импорт socket handlers
import { setupSocketHandlers } from './socket/socketHandlers';
import { setIoInstance } from './socket';

// Импорт функции создания админа
import { createAdminUser } from './utils/createAdmin';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env['CLIENT_URL'] || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Сохраняем экземпляр io для доступа из роутов
setIoInstance(io);

const PORT = process.env['PORT'] || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['CLIENT_URL'] || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brackets', bracketRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/storage', storageRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io handlers
setupSocketHandlers(io);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Бакет в MinIO/S3 (если настроено)
ensureBucketExists().catch(() => {
  console.warn('⚠️  Объектное хранилище недоступно или не настроено — загрузки в S3 отключены');
});

// Автоматическое создание админа при запуске сервера
createAdminUser().catch(error => {
  console.error('⚠️  Ошибка создания админа:', error);
});

server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 API доступно по адресу: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.io подключен`);
  console.log(`\n👤 Вход в систему:`);
  console.log(`   Email: admin@tournament.local`);
  console.log(`   Username: admin`);
  console.log(`   Password: admin123`);
  console.log(`\n   ИЛИ\n`);
  console.log(`   Email: test@test.test`);
  console.log(`   Username: test`);
  console.log(`   Password: testtest`);
});

export { io };
