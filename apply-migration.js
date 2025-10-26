// Скрипт для применения миграции базы данных
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Применение миграции базы данных...\n');

try {
  // Проверяем, какой тип БД используется
  const schemaPath = path.join(__dirname, 'server', 'prisma', 'schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  const isSQLite = schema.includes('provider = "sqlite"');
  
  if (isSQLite) {
    console.log('📊 Обнаружена SQLite база данных');
    console.log('⚠️  Для SQLite миграция будет выполнена через Prisma\n');
    
    // Выполняем миграцию через Prisma
    console.log('1️⃣ Генерация Prisma клиента...');
    execSync('cd server && npx prisma generate', { stdio: 'inherit' });
    
    console.log('\n2️⃣ Создание миграции...');
    execSync('cd server && npx prisma migrate dev --name make_team_ids_optional --create-only', { stdio: 'inherit' });
    
    console.log('\n3️⃣ Применение миграции...');
    execSync('cd server && npx prisma migrate deploy', { stdio: 'inherit' });
    
    console.log('\n✅ Миграция применена!');
  } else {
    console.log('📊 Обнаружена PostgreSQL база данных');
    console.log('\nВыполните SQL из файла server/migrate-match-optional.sql вручную\n');
  }
  
} catch (error) {
  console.error('❌ Ошибка применения миграции:', error.message);
  console.log('\n📝 Альтернативный способ:');
  console.log('1. Откройте server/prisma/schema.prisma');
  console.log('2. Убедитесь, что team1Id и team2Id отмечены как String?');
  console.log('3. Выполните: cd server && npx prisma migrate dev');
}
