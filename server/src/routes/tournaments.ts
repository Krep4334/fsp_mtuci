import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Получение всех турниров
router.get('/', [
  query('status').optional().isIn(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  query('type').optional().isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные параметры запроса', 400));
    }

    const { status, type, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          organizer: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          teams: {
            select: { id: true, name: true, logo: true }
          },
          _count: {
            select: {
              teams: true,
              matches: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tournament.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        tournaments,
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

// Получение турнира по ID
router.get('/:id', async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        judges: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        teams: {
          include: {
            captain: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            },
            _count: {
              select: { members: true }
            }
          }
        },
        brackets: {
          include: {
            matches: {
              include: {
                team1: {
                  select: {
                    id: true,
                    name: true,
                    logo: true
                  }
                },
                team2: {
                  select: {
                    id: true,
                    name: true,
                    logo: true
                  }
                },
                results: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true
                      }
                    }
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              },
              orderBy: [{ round: 'asc' }, { position: 'asc' }]
            }
          }
        },
        _count: {
          select: {
            teams: true,
            matches: true,
            brackets: true
          }
        }
      }
    });

    if (!tournament) {
      return next(createError('Турнир не найден', 404));
    }

    res.json({
      success: true,
      data: { tournament }
    });
  } catch (error) {
    next(error);
  }
});

// Создание турнира
router.post('/', authenticate, authorize('ADMIN', 'ORGANIZER'), [
  body('name').isLength({ min: 3, max: 100 }),
  body('description').optional().isLength({ max: 1000 }),
  body('type').isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']),
  body('maxTeams').optional().isString().custom((value) => {
    if (value && (isNaN(parseInt(value)) || parseInt(value) < 2)) {
      throw new Error('maxTeams должно быть числом больше 1');
    }
    return true;
  }),
  body('registrationStart').optional().custom((value) => {
    if (value && value !== '' && !Date.parse(value)) {
      throw new Error('registrationStart должно быть валидной датой');
    }
    return true;
  }),
  body('registrationEnd').optional().custom((value) => {
    if (value && value !== '' && !Date.parse(value)) {
      throw new Error('registrationEnd должно быть валидной датой');
    }
    return true;
  }),
  body('startDate').optional().custom((value) => {
    if (value && value !== '' && !Date.parse(value)) {
      throw new Error('startDate должно быть валидной датой');
    }
    return true;
  }),
  body('endDate').optional().custom((value) => {
    if (value && value !== '' && !Date.parse(value)) {
      throw new Error('endDate должно быть валидной датой');
    }
    return true;
  }),
  body('location').optional().isLength({ max: 200 }),
  body('prizePool').optional().isString().custom((value) => {
    if (value && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
      throw new Error('prizePool должно быть числом больше или равным 0');
    }
    return true;
  }),
  body('rules').optional().isLength({ max: 5000 })
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const {
      name,
      description,
      type,
      maxTeams,
      registrationStart,
      registrationEnd,
      startDate,
      endDate,
      location,
      prizePool,
      rules
    } = req.body;

    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        type,
        maxTeams: maxTeams ? parseInt(maxTeams) : null,
        registrationStart: registrationStart && registrationStart !== '' ? new Date(registrationStart) : null,
        registrationEnd: registrationEnd && registrationEnd !== '' ? new Date(registrationEnd) : null,
        startDate: startDate && startDate !== '' ? new Date(startDate) : null,
        endDate: endDate && endDate !== '' ? new Date(endDate) : null,
        location,
        prizePool: prizePool && prizePool !== '' ? parseFloat(prizePool) : null,
        rules,
        organizerId: req.user!.id
      },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { tournament }
    });
  } catch (error) {
    next(error);
  }
});

// Обновление турнира
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const tournamentId = req.params['id'];
    if (!tournamentId) {
      return next(createError('ID турнира не указан', 400));
    }
    const userId = req.user!.id;

    // Проверка прав доступа
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        judges: {
          where: { userId }
        }
      }
    });

    if (!tournament) {
      return next(createError('Турнир не найден', 404));
    }

    const isOrganizer = tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const isJudge = (tournament as any).judges && (tournament as any).judges.length > 0;

    if (!isOrganizer && !isAdmin && !isJudge) {
      return next(createError('Недостаточно прав для редактирования турнира', 403));
    }

    const {
      name,
      description,
      maxTeams,
      registrationStart,
      registrationEnd,
      startDate,
      endDate,
      location,
      prizePool,
      rules
    } = req.body;

    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(maxTeams && { maxTeams }),
        ...(registrationStart && { registrationStart: new Date(registrationStart) }),
        ...(registrationEnd && { registrationEnd: new Date(registrationEnd) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(location !== undefined && { location }),
        ...(prizePool !== undefined && { prizePool }),
        ...(rules !== undefined && { rules })
      },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { tournament: updatedTournament }
    });
  } catch (error) {
    next(error);
  }
});

// Изменение статуса турнира
router.patch('/:id/status', authenticate, [
  body('status').isIn(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const tournamentId = req.params['id'];
    if (!tournamentId) {
      return next(createError('ID турнира не указан', 400));
    }
    const userId = req.user!.id;
    const { status } = req.body;

    // Проверка прав доступа
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return next(createError('Турнир не найден', 404));
    }

    const isOrganizer = tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      return next(createError('Недостаточно прав для изменения статуса турнира', 403));
    }

    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { tournament: updatedTournament }
    });
  } catch (error) {
    next(error);
  }
});

// Добавление судьи к турниру
router.post('/:id/judges', authenticate, [
  body('userId').isUUID(),
  body('permissions').isArray()
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const tournamentId = req.params['id'];
    if (!tournamentId) {
      return next(createError('ID турнира не указан', 400));
    }
    const userId = req.user!.id;
    const { userId: judgeUserId, permissions } = req.body;

    // Проверка прав доступа
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return next(createError('Турнир не найден', 404));
    }

    const isOrganizer = tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      return next(createError('Недостаточно прав для добавления судей', 403));
    }

    // Проверка существования пользователя
    const judge = await prisma.user.findUnique({
      where: { id: judgeUserId }
    });

    if (!judge) {
      return next(createError('Пользователь не найден', 404));
    }

    const tournamentJudge = await prisma.tournamentJudge.create({
      data: {
        tournamentId: tournamentId as string,
        userId: judgeUserId as string,
        permissions: permissions as any
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { judge: tournamentJudge }
    });
  } catch (error) {
    next(error);
  }
});

// Удаление турнира
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const tournamentId = req.params['id'];
    if (!tournamentId) {
      return next(createError('ID турнира не указан', 400));
    }
    const userId = req.user!.id;

    // Проверка прав доступа
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return next(createError('Турнир не найден', 404));
    }

    const isOrganizer = tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      return next(createError('Недостаточно прав для удаления турнира', 403));
    }

    await prisma.tournament.delete({
      where: { id: tournamentId }
    });

    res.json({
      success: true,
      message: 'Турнир успешно удален'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
