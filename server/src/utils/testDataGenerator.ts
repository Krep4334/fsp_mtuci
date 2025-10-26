import { PrismaClient } from '@prisma/client';
import { TournamentBracketGenerator } from './tournamentBracket';

const prisma = new PrismaClient();

export interface TestTournamentConfig {
  name: string;
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
  teamCount?: number;
  playersPerTeam?: number;
  status?: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED';
}

export class TestDataGenerator {
  // Генерация случайных имен команд
  private static teamNames = [
    'Thunder Bolts', 'Fire Dragons', 'Ice Warriors', 'Storm Riders', 'Shadow Hunters',
    'Golden Eagles', 'Silver Wolves', 'Crimson Tigers', 'Azure Phoenix', 'Dark Knights',
    'Lightning Strike', 'Frost Giants', 'Wind Walkers', 'Earth Shakers', 'Sky Guardians',
    'Night Hawks', 'Dawn Breakers', 'Twilight Seekers', 'Sun Warriors', 'Moon Riders'
  ];

  // Генерация случайных имен игроков
  private static playerNames = [
    'Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Avery', 'Quinn',
    'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Hayden', 'Jamie', 'Kendall',
    'Logan', 'Parker', 'Reese', 'Sage', 'Skyler', 'Tatum', 'Valentine', 'Winter',
    'Adrian', 'Brooklyn', 'Charlie', 'Dakota', 'Emerson', 'Harper', 'Indigo', 'Jules'
  ];

  // Генерация случайных фамилий
  private static lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young'
  ];

  // Создание турнира с тестовыми данными
  static async createTestTournament(config: TestTournamentConfig, organizerId: string) {
    const {
      name,
      type,
      teamCount = 8,
      playersPerTeam = 5,
      status = 'REGISTRATION_CLOSED'
    } = config;

    // Создание турнира
    const tournament = await prisma.tournament.create({
      data: {
        name: `[TEST] ${name}`,
        description: `Тестовый турнир для отладки системы. Создан автоматически с ${teamCount} командами.`,
        type,
        status,
        maxTeams: teamCount,
        registrationStart: new Date(),
        registrationEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // через день
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // через 2 дня
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // через неделю
        location: 'Тестовая арена',
        prizePool: 10000,
        rules: 'Тестовые правила турнира для отладки системы.',
        organizerId
      }
    });

    // Создание тестовых команд
    const teams = [];
    for (let i = 0; i < teamCount; i++) {
      const teamName = this.getRandomTeamName(i);
      const team = await prisma.team.create({
        data: {
          name: teamName,
          description: `Тестовая команда ${i + 1} для отладки`,
          tournamentId: tournament.id,
          captainId: organizerId // временно капитан - организатор
        }
      });
      teams.push(team);
    }

    // Создание тестовых пользователей и назначение их в команды
    const createdUsers = [];
    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      const team = teams[teamIndex];
      if (!team) continue;
      
      // Создание игроков для команды
      for (let playerIndex = 0; playerIndex < playersPerTeam; playerIndex++) {
        const firstName = this.getRandomPlayerName();
        const lastName = this.getRandomLastName();
        const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${teamIndex}${playerIndex}`;
        const email = `${username}@test.tournament.local`;

        // Проверяем, не существует ли уже такой пользователь
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { username }
            ]
          }
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              username,
              password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8Kz2', // "password123"
              firstName,
              lastName,
              role: 'PARTICIPANT'
            }
          });
        }

        createdUsers.push(user);

        // Добавление игрока в команду
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId: user.id
          }
        });

        // Если это первый игрок команды, делаем его капитаном
        if (playerIndex === 0) {
          await prisma.team.update({
            where: { id: team.id },
            data: { captainId: user.id }
          });
        }
      }

      // Создание участия команды в турнире
      await prisma.participation.create({
        data: {
          teamId: team.id,
          userId: team.captainId,
          tournamentId: tournament.id,
          status: 'APPROVED',
          approvedAt: new Date()
        }
      });
    }

    // Если статус турнира позволяет, создаем турнирную сетку
    if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
      await this.generateTournamentBracket(tournament.id, type);
    }

    // Получаем полную информацию о созданном турнире
    const fullTournament = await prisma.tournament.findUnique({
      where: { id: tournament.id },
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
          include: {
            captain: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            },
            members: {
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

    return {
      tournament: fullTournament,
      createdUsers: createdUsers.length,
      createdTeams: teams.length
    };
  }

  // Генерация турнирной сетки
  private static async generateTournamentBracket(tournamentId: string, type: string) {
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
    }
  }

  // Получение случайного имени команды
  private static getRandomTeamName(index: number): string {
    if (index < this.teamNames.length) {
      return this.teamNames[index]!;
    }
    return `Team ${index + 1}`;
  }

  // Получение случайного имени игрока
  private static getRandomPlayerName(): string {
    return this.playerNames[Math.floor(Math.random() * this.playerNames.length)]!;
  }

  // Получение случайной фамилии
  private static getRandomLastName(): string {
    return this.lastNames[Math.floor(Math.random() * this.lastNames.length)]!;
  }

  // Очистка всех тестовых данных
  static async cleanupTestData() {
    // Удаление тестовых турниров
    await prisma.tournament.deleteMany({
      where: {
        name: {
          startsWith: '[TEST]'
        }
      }
    });

    // Удаление тестовых пользователей
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: '@test.tournament.local'
        }
      }
    });

    return { message: 'Тестовые данные очищены' };
  }

  // Получение статистики тестовых данных
  static async getTestDataStats() {
    const testTournaments = await prisma.tournament.count({
      where: {
        name: {
          startsWith: '[TEST]'
        }
      }
    });

    const testUsers = await prisma.user.count({
      where: {
        email: {
          endsWith: '@test.tournament.local'
        }
      }
    });

    return {
      testTournaments,
      testUsers
    };
  }
}
