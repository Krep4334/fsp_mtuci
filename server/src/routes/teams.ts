import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Получение команд турнира
router.get('/tournament/:tournamentId', async (req: any, res: any, next: any) => {
  try {
    const { tournamentId } = req.params;

    const teams = await prisma.team.findMany({
      where: { tournamentId },
      include: {
        captain: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        members: {
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
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: { teams }
    });
  } catch (error) {
    next(error);
  }
});

// Создание команды
router.post('/', authenticate, [
  body('name').isLength({ min: 2, max: 50 }),
  body('description').optional().isLength({ max: 500 }),
  body('tournamentId').isUUID()
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { name, description, tournamentId } = req.body;
    const userId = req.user!.id;

    // Проверка существования турнира
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return next(createError('Турнир не найден', 404));
    }

    // Проверка статуса турнира
    if (tournament.status !== 'REGISTRATION_OPEN') {
      return next(createError('Регистрация на турнир закрыта', 400));
    }

    // Проверка максимального количества команд
    if (tournament.maxTeams) {
      const teamCount = await prisma.team.count({
        where: { tournamentId }
      });

      if (teamCount >= tournament.maxTeams) {
        return next(createError('Достигнуто максимальное количество команд', 400));
      }
    }

    // Проверка уникальности имени команды в турнире
    const existingTeam = await prisma.team.findFirst({
      where: {
        tournamentId,
        name
      }
    });

    if (existingTeam) {
      return next(createError('Команда с таким именем уже существует в турнире', 409));
    }

    // Создание команды
    const team = await prisma.team.create({
      data: {
        name,
        description,
        captainId: userId,
        tournamentId
      },
      include: {
        captain: {
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

    // Добавление капитана как участника команды
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId
      }
    });

    res.status(201).json({
      success: true,
      data: { team }
    });
  } catch (error) {
    next(error);
  }
});

// Добавление участника в команду
router.post('/:teamId/members', authenticate, [
  body('userId').isUUID()
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { teamId } = req.params;
    if (!teamId) {
      return next(createError('ID команды не указан', 400));
    }
    const { userId } = req.body;
    const currentUserId = req.user!.id;

    // Проверка существования команды
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        tournament: true,
        captain: true
      }
    });

    if (!team) {
      return next(createError('Команда не найдена', 404));
    }

    // Проверка прав (только капитан может добавлять участников)
    if (team.captainId !== currentUserId) {
      return next(createError('Только капитан может добавлять участников', 403));
    }

    // Проверка статуса турнира
    if ((team as any).tournament.status !== 'REGISTRATION_OPEN') {
      return next(createError('Регистрация на турнир закрыта', 400));
    }

    // Проверка существования пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    // Проверка, не состоит ли пользователь уже в команде
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: {
          tournamentId: (team as any).tournamentId
        }
      }
    });

    if (existingMembership) {
      return next(createError('Пользователь уже состоит в команде этого турнира', 409));
    }

    // Добавление участника
    const teamMember = await prisma.teamMember.create({
      data: {
        teamId: teamId as string,
        userId: userId as string
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
      data: { member: teamMember }
    });
  } catch (error) {
    next(error);
  }
});

// Удаление участника из команды
router.delete('/:teamId/members/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { teamId, userId } = req.params;
    if (!teamId || !userId) {
      return next(createError('ID команды или пользователя не указан', 400));
    }
    const currentUserId = req.user!.id;

    // Проверка существования команды
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { tournament: true }
    });

    if (!team) {
      return next(createError('Команда не найдена', 404));
    }

    // Проверка прав (капитан или сам участник)
    const isCaptain = team.captainId === currentUserId;
    const isSelf = userId === currentUserId;

    if (!isCaptain && !isSelf) {
      return next(createError('Недостаточно прав для удаления участника', 403));
    }

    // Проверка статуса турнира
    if ((team as any).tournament.status !== 'REGISTRATION_OPEN') {
      return next(createError('Регистрация на турнир закрыта', 400));
    }

    // Проверка, что это не капитан команды
    if (team.captainId === userId) {
      return next(createError('Нельзя удалить капитана команды', 400));
    }

    await prisma.teamMember.deleteMany({
      where: {
        teamId: teamId as string,
        userId: userId as string
      }
    });

    res.json({
      success: true,
      message: 'Участник успешно удален из команды'
    });
  } catch (error) {
    next(error);
  }
});

// Обновление информации о команде
router.put('/:teamId', authenticate, [
  body('name').optional().isLength({ min: 2, max: 50 }),
  body('description').optional().isLength({ max: 500 })
], async (req: AuthRequest, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('Некорректные данные', 400));
    }

    const { teamId } = req.params;
    if (!teamId) {
      return next(createError('ID команды не указан', 400));
    }
    const { name, description } = req.body;
    const userId = req.user!.id;

    // Проверка существования команды
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { tournament: true }
    });

    if (!team) {
      return next(createError('Команда не найдена', 404));
    }

    // Проверка прав (только капитан)
    if (team.captainId !== userId) {
      return next(createError('Только капитан может редактировать команду', 403));
    }

    // Проверка статуса турнира
    if ((team as any).tournament.status !== 'REGISTRATION_OPEN') {
      return next(createError('Регистрация на турнир закрыта', 400));
    }

    // Проверка уникальности имени если оно изменяется
    if (name && name !== team.name) {
      const existingTeam = await prisma.team.findFirst({
        where: {
          tournamentId: (team as any).tournamentId,
          name,
          NOT: { id: teamId as string }
        }
      });

      if (existingTeam) {
        return next(createError('Команда с таким именем уже существует в турнире', 409));
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description })
      },
      include: {
        captain: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        members: {
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
        }
      }
    });

    res.json({
      success: true,
      data: { team: updatedTeam }
    });
  } catch (error) {
    next(error);
  }
});

// Удаление команды
router.delete('/:teamId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      return next(createError('ID команды не указан', 400));
    }
    const userId = req.user!.id;

    // Проверка существования команды
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { tournament: true }
    });

    if (!team) {
      return next(createError('Команда не найдена', 404));
    }

    // Проверка прав (только капитан или администратор турнира)
    const isCaptain = team.captainId === userId;
    const isOrganizer = (team as any).tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isCaptain && !isOrganizer && !isAdmin) {
      return next(createError('Недостаточно прав для удаления команды', 403));
    }

    // Проверка статуса турнира
    if ((team as any).tournament.status !== 'REGISTRATION_OPEN') {
      return next(createError('Регистрация на турнир закрыта', 400));
    }

    await prisma.team.delete({
      where: { id: teamId }
    });

    res.json({
      success: true,
      message: 'Команда успешно удалена'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
