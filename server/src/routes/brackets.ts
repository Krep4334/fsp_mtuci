import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { TournamentBracketGenerator } from '../utils/tournamentBracket';

const router = express.Router();
const prisma = new PrismaClient();

// Генерация турнирной сетки
router.post('/generate', authenticate, [
  body('tournamentId').isUUID(),
  body('type').isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS'])
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { tournamentId, type } = req.body;
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
    const isJudge = tournament.judges.length > 0;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isJudge && !isAdmin) {
      return next(createError('Недостаточно прав для генерации сетки', 403));
    }

    // Проверка статуса турнира
    if (tournament.status !== 'REGISTRATION_CLOSED') {
      return next(createError('Регистрация на турнир еще не закрыта', 400));
    }

    // Проверка наличия команд
    const teamCount = await prisma.team.count({
      where: { tournamentId }
    });

    if (teamCount < 2) {
      return next(createError('Недостаточно команд для создания турнира', 400));
    }

    // Удаление существующих сеток и матчей
    await prisma.match.deleteMany({
      where: { tournamentId }
    });

    await prisma.bracket.deleteMany({
      where: { tournamentId }
    });

    // Генерация сетки в зависимости от типа
    switch (type) {
      case 'SINGLE_ELIMINATION':
        await TournamentBracketGenerator.generateSingleElimination(tournamentId);
        break;
      case 'DOUBLE_ELIMINATION':
        await TournamentBracketGenerator.generateDoubleElimination(tournamentId);
        break;
      case 'ROUND_ROBIN':
        await TournamentBracketGenerator.generateRoundRobin(tournamentId);
        break;
      case 'SWISS':
        await TournamentBracketGenerator.generateSwiss(tournamentId);
        break;
      default:
        return next(createError('Неподдерживаемый тип турнира', 400));
    }

    // Обновление статуса турнира
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'IN_PROGRESS' }
    });

    // Получение созданной сетки
    const brackets = await prisma.bracket.findMany({
      where: { tournamentId },
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
            }
          },
          orderBy: [{ round: 'asc' }, { position: 'asc' }]
        }
      }
    });

    res.json({
      success: true,
      data: { brackets },
      message: 'Турнирная сетка успешно создана'
    });
  } catch (error) {
    next(error);
  }
});

// Жеребьевка команд
router.post('/draw', authenticate, [
  body('tournamentId').isUUID()
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { tournamentId } = req.body;
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
    const isJudge = tournament.judges.length > 0;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isJudge && !isAdmin) {
      return next(createError('Недостаточно прав для проведения жеребьевки', 403));
    }

    // Проверка статуса турнира
    if (tournament.status !== 'REGISTRATION_CLOSED') {
      return next(createError('Жеребьевка возможна только после закрытия регистрации', 400));
    }

    // Проверка наличия команд
    const teamCount = await prisma.team.count({
      where: { tournamentId }
    });

    if (teamCount < 2) {
      return next(createError('Недостаточно команд для жеребьевки', 400));
    }

    // Проведение жеребьевки
    await TournamentBracketGenerator.generateDraw(tournamentId);

    // Получение обновленного списка команд
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: { teams },
      message: 'Жеребьевка успешно проведена'
    });
  } catch (error) {
    next(error);
  }
});

// Получение турнирной сетки
router.get('/tournament/:tournamentId', async (req: any, res: any, next: any) => {
  try {
    const { tournamentId } = req.params;

    const brackets = await prisma.bracket.findMany({
      where: { tournamentId },
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
          orderBy: [{ round: 'asc' }, { position: 'asc' }]
        }
      },
      orderBy: { round: 'asc' }
    });

    res.json({
      success: true,
      data: { brackets }
    });
  } catch (error) {
    next(error);
  }
});

// Обновление сетки после завершения матча
router.post('/update', authenticate, [
  body('tournamentId').isUUID(),
  body('completedMatchId').isUUID()
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { tournamentId, completedMatchId } = req.body;
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
    const isJudge = tournament.judges.length > 0;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isJudge && !isAdmin) {
      return next(createError('Недостаточно прав для обновления сетки', 403));
    }

    // Обновление сетки
    await TournamentBracketGenerator.updateBracketAfterMatch(tournamentId, completedMatchId);

    // Получение обновленной сетки
    const brackets = await prisma.bracket.findMany({
      where: { tournamentId },
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
          orderBy: [{ round: 'asc' }, { position: 'asc' }]
        }
      }
    });

    res.json({
      success: true,
      data: { brackets },
      message: 'Сетка успешно обновлена'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
