import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { generateRefreshToken, hashRefreshToken } from '../utils/tokenUtils';

const router = express.Router();
const prisma = new PrismaClient();

const ACCESS_TOKEN_EXPIRY = '15m';   // Короткоживущий access — меньше рисков при утечке
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/** Создаёт пару access + refresh и сохраняет refresh в БД */
async function createTokenPair(userId: string) {
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret) throw new Error('JWT secret не настроен');

  const accessToken = jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const { token: refreshToken, tokenHash } = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt }
  });

  return { accessToken, refreshToken };
}

// Регистрация
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 6 }),
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 })
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { email, username, password, firstName, lastName } = req.body;

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
      return next(createError('Пользователь с таким email или именем уже существует', 409));
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 12);

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    // Access + refresh токены
    const { accessToken, refreshToken } = await createTokenPair(user.id);

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Вход
router.post('/login', [
  body('login').notEmpty(), // email или username
  body('password').notEmpty()
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { login, password } = req.body;

    // Поиск пользователя по email или username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: login },
          { username: login }
        ],
        isActive: true
      }
    });

    if (!user) {
      return next(createError('Неверные учетные данные', 401));
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(createError('Неверные учетные данные', 401));
    }

    const { accessToken, refreshToken } = await createTokenPair(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Обновление access-токена по refresh-токену
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('refreshToken обязателен')
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const refreshTokenRaw = req.body.refreshToken as string;
    const tokenHash = hashRefreshToken(refreshTokenRaw);

    const stored = await prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true }
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
      return next(createError('Недействительный или истёкший refresh-токен', 401));
    }

    if (!stored.user.isActive) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      return next(createError('Пользователь заблокирован', 401));
    }

    // Удаляем использованный refresh (rotation)
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const { accessToken, refreshToken: newRefreshToken } = await createTokenPair(stored.userId);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Выход — инвалидация refresh-токена (опционально)
router.post('/logout', [
  body('refreshToken').optional()
], async (req: any, res: any, next: any) => {
  try {
    const refreshTokenRaw = req.body.refreshToken;
    if (refreshTokenRaw) {
      const tokenHash = hashRefreshToken(refreshTokenRaw);
      await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Получение текущего пользователя
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Обновление профиля
router.put('/profile', authenticate, [
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 }),
  body('username').optional().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/)
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { firstName, lastName, username } = req.body;
    const userId = req.user!.id;

    // Проверка уникальности username если он изменяется
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return next(createError('Пользователь с таким именем уже существует', 409));
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(username && { username })
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true
      }
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// ВРЕМЕННЫЙ endpoint для получения админки (удалить после использования)
router.post('/make-admin', async (req: any, res: any, next: any) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next(createError('Email обязателен', 400));
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

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

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'Роль успешно изменена на ADMIN'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
