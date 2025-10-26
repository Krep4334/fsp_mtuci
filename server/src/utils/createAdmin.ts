import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Используем глобальный экземпляр Prisma, чтобы не закрывать соединение
const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export async function createAdminUser() {
  try {
    const email = 'admin@tournament.local';
    const username = 'admin';
    const password = 'admin123';
    
    // Проверка существования пользователя
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      // Обновляем существующего пользователя до админа
      if (existingUser.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'ADMIN' }
        });
        console.log('✅ Пользователь обновлен до роли ADMIN');
      } else {
        console.log('ℹ️ Пользователь уже является админом');
      }
      
      return {
        email,
        username,
        password
      };
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 12);

    // Создание админского пользователя
    const adminUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'System',
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Админский пользователь успешно создан!');
    console.log('📧 Email:', email);
    console.log('👤 Username:', username);
    console.log('🔑 Password:', password);
    console.log('⚠️  Сохраните эти данные!');

    return {
      email,
      username,
      password
    };
  } catch (error) {
    console.error('❌ Ошибка создания админского пользователя:', error);
    return null;
  }
}

// Выполняем создание админа, если файл запускается напрямую
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('\n✨ Готово! Теперь вы можете войти в систему.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка:', error);
      process.exit(1);
    });
}
