import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { TestDataGenerator, TestTournamentConfig } from '../utils/testDataGenerator';

const router = express.Router();
const prisma = new PrismaClient();

// Создание админского пользователя
router.post('/create-admin', async (req: any, res: any, next: any) => {
  try {
    const { createAdminUser } = await import('../utils/createAdmin');
    const credentials = await createAdminUser();
    
    res.json({
      success: true,
      data: credentials,
      message: 'Админский пользователь успешно создан или уже существует'
    });
  } catch (error) {
    next(error);
  }
});

// Создание тестового турнира
router.post('/create-test-tournament', authenticate, authorize('ADMIN'), [
  body('name').isLength({ min: 3, max: 100 }),
  body('type').isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']),
  body('teamCount').optional().isInt({ min: 2, max: 32 }),
  body('playersPerTeam').optional().isInt({ min: 1, max: 10 }),
  body('status').optional().isIn(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED'])
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const {
      name,
      type,
      teamCount = 8,
      playersPerTeam = 5,
      status = 'REGISTRATION_CLOSED'
    } = req.body;

    const config: TestTournamentConfig = {
      name,
      type,
      teamCount,
      playersPerTeam,
      status
    };

    const result = await TestDataGenerator.createTestTournament(config, req.user!.id);

    res.status(201).json({
      success: true,
      data: result,
      message: `Тестовый турнир "${name}" успешно создан с ${result.createdTeams} командами и ${result.createdUsers} игроками`
    });
  } catch (error) {
    next(error);
  }
});

// Быстрое создание тестового турнира с предустановками
router.post('/quick-test-tournament', authenticate, authorize('ADMIN'), [
  body('preset').isIn(['single-8', 'single-16', 'double-8', 'round-robin-6', 'swiss-12'])
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { preset } = req.body;
    const userId = req.user!.id;

    let config: TestTournamentConfig;

    switch (preset) {
      case 'single-8':
        config = {
          name: 'Single Elimination 8 Teams',
          type: 'SINGLE_ELIMINATION',
          teamCount: 8,
          playersPerTeam: 5,
          status: 'IN_PROGRESS'
        };
        break;
      case 'single-16':
        config = {
          name: 'Single Elimination 16 Teams',
          type: 'SINGLE_ELIMINATION',
          teamCount: 16,
          playersPerTeam: 5,
          status: 'IN_PROGRESS'
        };
        break;
      case 'double-8':
        config = {
          name: 'Double Elimination 8 Teams',
          type: 'DOUBLE_ELIMINATION',
          teamCount: 8,
          playersPerTeam: 5,
          status: 'IN_PROGRESS'
        };
        break;
      case 'round-robin-6':
        config = {
          name: 'Round Robin 6 Teams',
          type: 'ROUND_ROBIN',
          teamCount: 6,
          playersPerTeam: 5,
          status: 'IN_PROGRESS'
        };
        break;
      case 'swiss-12':
        config = {
          name: 'Swiss System 12 Teams',
          type: 'SWISS',
          teamCount: 12,
          playersPerTeam: 5,
          status: 'IN_PROGRESS'
        };
        break;
      default:
        return next(createError('Неподдерживаемый пресет', 400));
    }

    const result = await TestDataGenerator.createTestTournament(config, userId);

    res.status(201).json({
      success: true,
      data: result,
      message: `Быстрый тестовый турнир "${config.name}" создан успешно`
    });
  } catch (error) {
    next(error);
  }
});

// Получение статистики тестовых данных
router.get('/test-data-stats', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: any, next: any) => {
  try {
    const stats = await TestDataGenerator.getTestDataStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Очистка всех тестовых данных
router.delete('/cleanup-test-data', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: any, next: any) => {
  try {
    const result = await TestDataGenerator.cleanupTestData();
    
    res.json({
      success: true,
      data: result,
      message: 'Все тестовые данные успешно удалены'
    });
  } catch (error) {
    next(error);
  }
});

// Быстрое изменение статуса турнира (только для тестовых)
router.patch('/test-tournament/:id/status', authenticate, authorize('ADMIN'), [
  body('status').isIn(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED'])
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const tournamentId = req.params['id'];
    const { status } = req.body;

    // Проверяем, что это тестовый турнир
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId as string }
    });

    if (!tournament) {
      return next(createError('Турнир не найден', 404));
    }

    if (!tournament.name.startsWith('[TEST]')) {
      return next(createError('Можно изменять статус только тестовых турниров', 403));
    }

    // Обновляем статус
    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId as string },
      data: { status },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
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

    res.json({
      success: true,
      data: { tournament: updatedTournament },
      message: `Статус турнира изменен на ${status}`
    });
  } catch (error) {
    next(error);
  }
});

// Получение списка тестовых турниров
router.get('/test-tournaments', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: any, next: any) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: {
        name: {
          startsWith: '[TEST]'
        }
      },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
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

export default router;
