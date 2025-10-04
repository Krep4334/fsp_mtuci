import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createError } from './errorHandler';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw createError('Токен доступа не предоставлен', 401);
    }

    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      return next(createError('JWT secret не настроен', 500));
    }
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw createError('Недействительный токен', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(createError('Недействительный токен', 401));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Пользователь не аутентифицирован', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('Недостаточно прав доступа', 403));
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      return next(createError('JWT secret не настроен', 500));
    }
    const decoded = jwt.verify(token, jwtSecret) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, isActive: true }
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Игнорируем ошибки для необязательной аутентификации
    next();
  }
};
