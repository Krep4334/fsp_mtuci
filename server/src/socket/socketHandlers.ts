import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Middleware для аутентификации
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth['token'];
      
      if (!token) {
        return next(new Error('Токен не предоставлен'));
      }

      const jwtSecret = process.env['JWT_SECRET'];
      if (!jwtSecret) {
        return next(new Error('JWT secret не настроен'));
      }
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return next(new Error('Недействительный токен'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error('Ошибка аутентификации'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Пользователь ${socket.userId} подключился к Socket.io`);

    // Подключение к комнате турнира
    socket.on('join_tournament', async (tournamentId: string) => {
      try {
        // Проверка существования турнира
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId }
        });

        if (!tournament) {
          socket.emit('error', { message: 'Турнир не найден' });
          return;
        }

        // Проверка прав доступа к турниру
        const hasAccess = await checkTournamentAccess(socket.userId!, tournamentId, socket.userRole!);
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Недостаточно прав для просмотра турнира' });
          return;
        }

        socket.join(`tournament_${tournamentId}`);
        socket.emit('joined_tournament', { tournamentId });
        
        console.log(`Пользователь ${socket.userId} подключился к турниру ${tournamentId}`);
      } catch (error) {
        socket.emit('error', { message: 'Ошибка подключения к турниру' });
      }
    });

    // Отключение от комнаты турнира
    socket.on('leave_tournament', (tournamentId: string) => {
      socket.leave(`tournament_${tournamentId}`);
      socket.emit('left_tournament', { tournamentId });
    });

    // Подключение к комнате матча
    socket.on('join_match', async (matchId: string) => {
      try {
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: { tournament: true }
        });

        if (!match) {
          socket.emit('error', { message: 'Матч не найден' });
          return;
        }

        // Проверка прав доступа к матчу
        const hasAccess = await checkTournamentAccess(socket.userId!, (match as any).tournamentId, socket.userRole!);
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Недостаточно прав для просмотра матча' });
          return;
        }

        socket.join(`match_${matchId}`);
        socket.emit('joined_match', { matchId });
        
        console.log(`Пользователь ${socket.userId} подключился к матчу ${matchId}`);
      } catch (error) {
        socket.emit('error', { message: 'Ошибка подключения к матчу' });
      }
    });

    // Отключение от комнаты матча
    socket.on('leave_match', (matchId: string) => {
      socket.leave(`match_${matchId}`);
      socket.emit('left_match', { matchId });
    });

    // Обновление статуса матча
    socket.on('match_status_update', async (data: { matchId: string, status: string }) => {
      try {
        const { matchId, status } = data;

        // Проверка прав на изменение статуса матча
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: {
            tournament: {
              include: {
                judges: {
                  where: { userId: socket.userId as string }
                }
              }
            }
          }
        });

        if (!match) {
          socket.emit('error', { message: 'Матч не найден' });
          return;
        }

        const isJudge = (match as any).tournament.judges.length > 0;
        const isOrganizer = (match as any).tournament.organizerId === socket.userId;
        const isAdmin = socket.userRole === 'ADMIN';

        if (!isJudge && !isOrganizer && !isAdmin) {
          socket.emit('error', { message: 'Недостаточно прав для изменения статуса матча' });
          return;
        }

        // Обновление статуса матча
        const updatedMatch = await prisma.match.update({
          where: { id: matchId },
          data: { status: status as any },
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
          }
        });

        // Отправка обновления всем подписанным на матч
        io.to(`match_${matchId}`).emit('match_updated', { match: updatedMatch });
        
        // Отправка обновления всем подписанным на турнир
        io.to(`tournament_${(match as any).tournamentId}`).emit('tournament_updated', {
          type: 'match_status_changed',
          matchId,
          status
        });

        console.log(`Статус матча ${matchId} изменен на ${status} пользователем ${socket.userId}`);
      } catch (error) {
        socket.emit('error', { message: 'Ошибка обновления статуса матча' });
      }
    });

    // Ввод результата матча
    socket.on('match_result', async (data: { matchId: string, team1Score: number, team2Score: number }) => {
      try {
        const { matchId, team1Score, team2Score } = data;

        // Проверка прав на ввод результата
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: {
            tournament: {
              include: {
                judges: {
                  where: { userId: socket.userId as string }
                }
              }
            }
          }
        });

        if (!match) {
          socket.emit('error', { message: 'Матч не найден' });
          return;
        }

        const isJudge = (match as any).tournament.judges.length > 0;
        const isOrganizer = (match as any).tournament.organizerId === socket.userId;
        const isAdmin = socket.userRole === 'ADMIN';

        if (!isJudge && !isOrganizer && !isAdmin) {
          socket.emit('error', { message: 'Недостаточно прав для ввода результата' });
          return;
        }

        // Создание результата
        const result = await prisma.matchResult.create({
          data: {
            matchId,
            userId: socket.userId!,
            team1Score,
            team2Score,
            isConfirmed: isOrganizer || isAdmin
          }
        });

        // Обновление статуса матча
        const updatedMatch = await prisma.match.update({
          where: { id: matchId },
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

        // Отправка обновления всем подписанным на матч
        io.to(`match_${matchId}`).emit('match_result_updated', { 
          match: updatedMatch,
          result 
        });
        
        // Отправка обновления всем подписанным на турнир
        io.to(`tournament_${(match as any).tournamentId}`).emit('tournament_updated', {
          type: 'match_completed',
          matchId,
          team1Score,
          team2Score,
          winner: team1Score > team2Score ? match.team1Id : match.team2Id
        });

        console.log(`Результат матча ${matchId} введен пользователем ${socket.userId}: ${team1Score}-${team2Score}`);
      } catch (error) {
        socket.emit('error', { message: 'Ошибка ввода результата матча' });
      }
    });

    // Обновление турнирной сетки
    socket.on('bracket_update', async (data: { tournamentId: string }) => {
      try {
        const { tournamentId } = data;

        // Проверка прав на просмотр турнира
        const hasAccess = await checkTournamentAccess(socket.userId!, tournamentId, socket.userRole!);
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Недостаточно прав для просмотра турнира' });
          return;
        }

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
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              },
              orderBy: [{ round: 'asc' }, { position: 'asc' }]
            }
          }
        });

        // Отправка обновленной сетки
        socket.emit('bracket_updated', { brackets });
        
        console.log(`Сетка турнира ${tournamentId} обновлена для пользователя ${socket.userId}`);
      } catch (error) {
        socket.emit('error', { message: 'Ошибка обновления сетки' });
      }
    });

    // Отключение
    socket.on('disconnect', () => {
      console.log(`Пользователь ${socket.userId} отключился от Socket.io`);
    });
  });
};

// Вспомогательная функция для проверки доступа к турниру
async function checkTournamentAccess(userId: string, tournamentId: string, userRole: string): Promise<boolean> {
  try {
    // Админы имеют доступ ко всем турнирам
    if (userRole === 'ADMIN') {
      return true;
    }

    // Проверка участия в турнире
    const participation = await prisma.participation.findFirst({
      where: {
        userId,
        tournamentId,
        status: 'APPROVED'
      }
    });

    if (participation) {
      return true;
    }

    // Проверка роли судьи
    const judgeRole = await prisma.tournamentJudge.findFirst({
      where: {
        userId,
        tournamentId
      }
    });

    if (judgeRole) {
      return true;
    }

    // Проверка роли организатора
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true }
    });

    if (tournament && tournament.organizerId === userId) {
      return true;
    }

    // Для публичных турниров разрешаем доступ зрителям
    const publicTournament = await prisma.tournament.findUnique({
      where: { 
        id: tournamentId,
        status: {
          in: ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED']
        }
      }
    });

    return !!publicTournament;
  } catch (error) {
    console.error('Ошибка проверки доступа к турниру:', error);
    return false;
  }
}

// Export removed - io is passed as parameter to setupSocketHandlers
