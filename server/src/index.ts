import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { createApp } from './app';
import { setupSocketHandlers } from './socket/socketHandlers';
import { setIoInstance } from './socket';
import { ensureBucketExists } from './services/objectStorage';
import { createAdminUser } from './utils/createAdmin';

dotenv.config();

const app = createApp();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env['CLIENT_URL'] || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

setIoInstance(io);
setupSocketHandlers(io);

const PORT = process.env['PORT'] || 3001;

ensureBucketExists().catch(() => {
  console.warn('⚠️  Объектное хранилище недоступно или не настроено — загрузки в S3 отключены');
});

createAdminUser().catch((error) => {
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

export { app, io };
