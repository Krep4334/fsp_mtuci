import express from 'express';
import { query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Получение пользователей (только для админов)
router.get('/', authenticate, authorize('ADMIN'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('search').optional().isLength({ min: 1, max: 100 })
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные параметры запроса', 400));
    }

    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              organizedTournaments: true,
              participations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Получение профиля пользователя
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(createError('ID пользователя не указан', 400));
    }
    const currentUserId = req.user!.id;

    // Пользователь может видеть только свой профиль или быть админом
    if (id !== currentUserId && req.user!.role !== 'ADMIN') {
      return next(createError('Недостаточно прав для просмотра профиля', 403));
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        createdAt: true,
        organizedTournaments: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            startDate: true,
            endDate: true,
            _count: {
              select: {
                teams: true,
                matches: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        participations: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            team: {
              select: {
                id: true,
                name: true,
                logo: true,
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    status: true,
                    startDate: true,
                    endDate: true
                  }
                }
              }
            }
          },
          orderBy: { appliedAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            organizedTournaments: true,
            participations: true,
            judgeTournaments: true
          }
        }
      }
    });

    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Обновление роли пользователя (только для админов)
router.patch('/:id/role', authenticate, authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(createError('ID пользователя не указан', 400));
    }
    const { role } = req.body;

    if (!['ADMIN', 'ORGANIZER', 'JUDGE', 'PARTICIPANT', 'SPECTATOR'].includes(role)) {
      return next(createError('Некорректная роль', 400));
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
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

// Блокировка/разблокировка пользователя (только для админов)
router.patch('/:id/status', authenticate, authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(createError('ID пользователя не указан', 400));
    }
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return next(createError('Некорректное значение статуса', 400));
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
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

// Получение турниров пользователя
router.get('/:id/tournaments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(createError('ID пользователя не указан', 400));
    }
    const currentUserId = req.user!.id;

    // Пользователь может видеть только свои турниры или быть админом
    if (id !== currentUserId && req.user!.role !== 'ADMIN') {
      return next(createError('Недостаточно прав для просмотра турниров пользователя', 403));
    }

    const tournaments = await prisma.tournament.findMany({
      where: { organizerId: id as string },
      include: {
        _count: {
          select: {
            teams: true,
            matches: true,
            brackets: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { tournaments }
    });
  } catch (error) {
    next(error);
  }
});

// Получение участий пользователя
router.get('/:id/participations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(createError('ID пользователя не указан', 400));
    }
    const currentUserId = req.user!.id;

    // Пользователь может видеть только свои участия или быть админом
    if (id !== currentUserId && req.user!.role !== 'ADMIN') {
      return next(createError('Недостаточно прав для просмотра участий пользователя', 403));
    }

    const participations = await prisma.participation.findMany({
      where: { userId: id as string },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
            captain: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            startDate: true,
            endDate: true,
            organizer: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    res.json({
      success: true,
      data: { participations }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
