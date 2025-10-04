import { Request, Response } from 'express';

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Маршрут ${req.originalUrl} не найден`
    }
  });
};
