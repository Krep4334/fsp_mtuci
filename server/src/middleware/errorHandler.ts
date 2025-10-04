import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Логирование ошибки
  console.error(`Error ${statusCode}: ${message}`);
  console.error(error.stack);

  // Если это ошибка валидации Prisma
  if (error.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Некорректные данные';
  }

  // Если это ошибка уникальности Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    statusCode = 409;
    message = 'Запись уже существует';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env['NODE_ENV'] === 'development' && { stack: error.stack })
    }
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
