import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Получение матчей турнира
router.get('/tournament/:tournamentId', async (req: any, res: any, next: any) => {
  try {
    const { tournamentId } = req.params;

    const matches = await prisma.match.findMany({
      where: { tournamentId },
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
        bracket: {
          select: {
            id: true,
            name: true,
            round: true
          }
        },
        results: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: [
        { round: 'asc' },
        { position: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: { matches }
    });
  } catch (error) {
    next(error);
  }
});

// Получение матча по ID
router.get('/:id', async (req: any, res: any, next: any) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        team1: {
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
        team2: {
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
        bracket: {
          select: {
            id: true,
            name: true,
            round: true
          }
        },
        results: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!match) {
      return next(createError('Матч не найден', 404));
    }

    res.json({
      success: true,
      data: { match }
    });
  } catch (error) {
    next(error);
  }
});

// Ввод результата матча
router.post('/:id/result', authenticate, [
  body('team1Score').isInt({ min: 0 }),
  body('team2Score').isInt({ min: 0 }),
  body('details').optional().isString()
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { id } = req.params;
    if (!id) {
      return next(createError('ID матча не указан', 400));
    }
    const { team1Score, team2Score, details } = req.body;
    const userId = req.user!.id;

    // Проверка существования матча
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        tournament: {
          include: {
            judges: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!match) {
      return next(createError('Матч не найден', 404));
    }

    // Проверка прав (судья, организатор или админ)
    const isJudge = (match as any).tournament.judges.length > 0;
    const isOrganizer = (match as any).tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isJudge && !isOrganizer && !isAdmin) {
      return next(createError('Недостаточно прав для ввода результатов', 403));
    }

    // Проверка статуса матча
    if (match.status === 'COMPLETED') {
      return next(createError('Результат матча уже введен', 400));
    }

    // Проверка на ничью (если не разрешена в турнире)
    if (team1Score === team2Score && (match as any).tournament.type !== 'ROUND_ROBIN') {
      return next(createError('Ничьи не разрешены в данном формате турнира', 400));
    }

    // Создание результата
    const result = await prisma.matchResult.create({
      data: {
        matchId: id as string,
        userId,
        team1Score: team1Score as any,
        team2Score: team2Score as any,
        details: details as any,
        isConfirmed: isOrganizer || isAdmin // Автоподтверждение для организаторов и админов
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Обновление статуса матча
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date()
      },
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
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { 
        match: updatedMatch,
        result 
      }
    });
  } catch (error) {
    next(error);
  }
});

// Подтверждение результата матча
router.patch('/:id/result/confirm', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(createError('ID матча не указан', 400));
    }
    const userId = req.user!.id;

    // Проверка существования матча
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        tournament: true,
        results: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!match) {
      return next(createError('Матч не найден', 404));
    }

    if (!(match as any).results.length) {
      return next(createError('Результат матча не найден', 404));
    }

    // Проверка прав (только организатор или админ)
    const isOrganizer = (match as any).tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      return next(createError('Недостаточно прав для подтверждения результата', 403));
    }

    // Подтверждение последнего результата
    const result = (match as any).results[0];
    const confirmedResult = await prisma.matchResult.update({
      where: { id: result.id },
      data: { isConfirmed: true },
      include: {
        user: {
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
      data: { result: confirmedResult }
    });
  } catch (error) {
    next(error);
  }
});

// Обновление статуса матча
router.patch('/:id/status', authenticate, [
  body('status').isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  body('scheduledAt').optional().isISO8601()
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { id } = req.params;
    if (!id) {
      return next(createError('ID матча не указан', 400));
    }
    const { status, scheduledAt } = req.body;
    const userId = req.user!.id;

    // Проверка существования матча
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        tournament: {
          include: {
            judges: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!match) {
      return next(createError('Матч не найден', 404));
    }

    // Проверка прав (судья, организатор или админ)
    const isJudge = (match as any).tournament.judges.length > 0;
    const isOrganizer = (match as any).tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isJudge && !isOrganizer && !isAdmin) {
      return next(createError('Недостаточно прав для изменения статуса матча', 403));
    }

    const updateData: any = { status };

    if (status === 'IN_PROGRESS' && !match.startedAt) {
      updateData.startedAt = new Date();
    }

    if (scheduledAt) {
      updateData.scheduledAt = new Date(scheduledAt);
    }

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: updateData,
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
        bracket: {
          select: {
            id: true,
            name: true,
            round: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { match: updatedMatch }
    });
  } catch (error) {
    next(error);
  }
});

// Получение статистики матчей турнира
router.get('/tournament/:tournamentId/stats', async (req: any, res: any, next: any) => {
  try {
    const { tournamentId } = req.params;

    const [totalMatches, completedMatches, inProgressMatches, scheduledMatches] = await Promise.all([
      prisma.match.count({
        where: { tournamentId }
      }),
      prisma.match.count({
        where: { 
          tournamentId,
          status: 'COMPLETED'
        }
      }),
      prisma.match.count({
        where: { 
          tournamentId,
          status: 'IN_PROGRESS'
        }
      }),
      prisma.match.count({
        where: { 
          tournamentId,
          status: 'SCHEDULED'
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalMatches,
        completed: completedMatches,
        inProgress: inProgressMatches,
        scheduled: scheduledMatches
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
