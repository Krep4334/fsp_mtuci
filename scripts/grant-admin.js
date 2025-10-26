const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function grantAdmin() {
  try {
    // По умолчанию ищем пользователя test
    const email = 'test@test.test';
    const username = 'test';
    
    console.log('🔍 Ищем пользователя test...\n');
    
    // Находим пользователя по email или username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (!user) {
      console.log('❌ Пользователь test не найден!');
      console.log('Убедитесь, что пользователь зарегистрирован в системе.');
      process.exit(1);
    }

    console.log('✅ Пользователь найден:');
    console.log('  Email:', user.email);
    console.log('  Username:', user.username);
    console.log('  Текущая роль:', user.role);
    console.log();

    if (user.role === 'ADMIN') {
      console.log('✅ Пользователь уже является администратором!');
      await prisma.$disconnect();
      return;
    }

    // Обновляем роль на ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    console.log('🎉 Права администратора успешно выданы!');
    console.log('📧 Email:', updatedUser.email);
    console.log('👤 Username:', updatedUser.username);
    console.log('🔐 Role:', updatedUser.role);
    console.log();
    console.log('🔑 Данные для входа:');
    console.log('  Username: test');
    console.log('  Email: test@test.test');
    console.log('  Password: testtest');

  } catch (error) {
    console.error('❌ Ошибка выдачи прав администратора:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

grantAdmin();
