# Настройка на macOS

Если вы получаете ошибку "permission denied" при запуске `npm run dev` на Mac, выполните следующие шаги:

## Решение проблемы с разрешениями

### 1. Установите зависимости заново
```bash
npm run install:all
```

### 2. Если проблема сохраняется, исправьте права доступа (только на Mac/Linux)
На Mac или Linux выполните:
```bash
npm run fix:permissions
```

Или вручную:
```bash
chmod +x node_modules/.bin/*
chmod +x server/node_modules/.bin/*
chmod +x client/node_modules/.bin/*
```

### 3. Альтернативный запуск (если проблема не решена)
Если после этого ошибка сохраняется, используйте:

```bash
# Запуск сервера отдельно
cd server && npm run dev

# Запуск клиента отдельно (в другом терминале)
cd client && npm run dev
```

### 4. Или через npx (для обхода проблем с путями)
```bash
cd server
npx nodemon src/index.ts
```

### 5. Переустановка node_modules
Если ничего не помогает:
```bash
rm -rf node_modules server/node_modules client/node_modules
npm run install:all
```

## Возможная причина проблемы
Проблема может возникать из-за:
- Том NTFS или exFAT вместо APFS (на некоторых Mac)
- Неправильные права доступа в node_modules
- Установка из архива или с внешнего диска

## Проверка решения
После применения любого из решений попробуйте:
```bash
npm run dev
```

Оба сервера (клиент и сервер) должны запуститься без ошибок.

