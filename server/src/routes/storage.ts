import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import {
  isObjectStorageConfigured,
  uploadBuffer,
  deleteObjectKey,
  newObjectKey,
} from '../services/objectStorage';

const router = express.Router();
const prisma = new PrismaClient();

const maxBytes = Number(process.env['MAX_S3_FILE_SIZE'] || 20 * 1024 * 1024);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes },
});

function requireStorage(_req: express.Request, _res: express.Response, next: express.NextFunction) {
  if (!isObjectStorageConfigured()) {
    return next(
      createError(
        'Объектное хранилище отключено или не настроено. Локально: запусти MinIO на порту 9000 (docker-compose up minio) или задай S3_* в .env. Отключение: DISABLE_OBJECT_STORAGE=true',
        503
      )
    );
  }
  next();
}

// Аватар: загрузка в MinIO/S3 + ссылка в users.avatar
router.post(
  '/avatar',
  authenticate,
  requireStorage,
  upload.single('file'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return next(createError('Файл не передан', 400));
      }
      const userId = req.user!.id;
      const key = newObjectKey(userId, 'avatars', req.file.originalname);
      const { url } = await uploadBuffer({
        key,
        body: req.file.buffer,
        contentType: req.file.mimetype,
      });

      const user = await prisma.user.update({
        where: { id: userId },
        data: { avatar: url },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
        },
      });

      res.json({
        success: true,
        data: { url, user },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Редко используемые материалы: ключ + публичный URL в БД
router.post(
  '/material',
  authenticate,
  requireStorage,
  upload.single('file'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return next(createError('Файл не передан', 400));
      }
      const userId = req.user!.id;
      const label = typeof req.body.label === 'string' ? req.body.label.slice(0, 200) : undefined;
      const key = newObjectKey(userId, 'materials', req.file.originalname);
      const { url } = await uploadBuffer({
        key,
        body: req.file.buffer,
        contentType: req.file.mimetype,
      });

      const row = await prisma.userStoredObject.create({
        data: {
          userId,
          objectKey: key,
          objectUrl: url,
          originalName: req.file.originalname,
          contentType: req.file.mimetype,
          sizeBytes: req.file.size,
          label,
        },
      });

      res.status(201).json({ success: true, data: { object: row } });
    } catch (error) {
      next(error);
    }
  }
);

// Список своих объектов в хранилище
router.get('/my', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const objects = await prisma.userStoredObject.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { objects } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(createError('ID не указан', 400));

    const row = await prisma.userStoredObject.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!row) {
      return next(createError('Объект не найден', 404));
    }

    if (isObjectStorageConfigured()) {
      try {
        await deleteObjectKey(row.objectKey);
      } catch {
        // продолжаем удаление записи в БД
      }
    }

    await prisma.userStoredObject.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
