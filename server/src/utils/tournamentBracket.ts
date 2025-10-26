import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Team {
  id: string;
  name: string;
  logo?: string;
}

export interface BracketMatch {
  round: number;
  position: number;
  team1Id?: string;
  team2Id?: string;
  isBye?: boolean;
}

export class TournamentBracketGenerator {
  // Генерация сетки для single elimination
  static async generateSingleElimination(tournamentId: string): Promise<void> {
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' }
    });

    if (teams.length < 2) {
      throw new Error('Недостаточно команд для создания турнира');
    }

    const teamCount = teams.length;
    const bracketSize = this.getNextPowerOfTwo(teamCount);
    const totalRounds = Math.log2(bracketSize);
    
    // Создание основной сетки
    const mainBracket = await prisma.bracket.create({
      data: {
        tournamentId,
        name: 'Основная сетка',
        round: 1,
        isActive: true
      }
    });

    // Генерация матчей
    const matches: BracketMatch[] = [];
    let currentRound = 1;
    let currentPosition = 1;
    let remainingTeams = teams;

    // Первый раунд - распределение команд
    const firstRoundMatches = Math.ceil(teamCount / 2);
    
    for (let i = 0; i < firstRoundMatches; i++) {
      const team1 = remainingTeams[i * 2];
      const team2 = remainingTeams[i * 2 + 1];

      matches.push({
        round: currentRound,
        position: currentPosition++,
        team1Id: team1?.id as string,
        team2Id: team2?.id as string,
        isBye: !team2
      });
    }

    // Последующие раунды
    let nextRoundTeams = firstRoundMatches;
    currentRound++;

    while (nextRoundTeams > 1) {
      const currentRoundMatches = Math.ceil(nextRoundTeams / 2);
      let positionInRound = 1; // Сбрасываем позицию для каждого раунда
      
      for (let i = 0; i < currentRoundMatches; i++) {
        matches.push({
          round: currentRound,
          position: positionInRound++, // Отдельный счетчик позиции в раунде
          isBye: false
        });
      }

      nextRoundTeams = currentRoundMatches;
      currentRound++;
    }

    // Сохранение матчей в базу данных
    for (const match of matches) {
      const matchData: any = {
        tournamentId,
        bracketId: mainBracket.id,
        round: match.round,
        position: match.position,
        isBye: match.isBye || false,
        status: 'SCHEDULED'
      };

      // Добавляем команды только если они указаны
      if (match.team1Id) {
        matchData.team1Id = match.team1Id;
      }
      if (match.team2Id) {
        matchData.team2Id = match.team2Id;
      }

      // Если нет команд, создаем матч без них (для будущих раундов)
      try {
        await prisma.match.create({
          data: matchData
        });
      } catch (error) {
        console.error('Ошибка создания матча:', error);
        console.log('Данные матча:', matchData);
        throw error;
      }
    }
  }

  // Генерация сетки для double elimination
  static async generateDoubleElimination(tournamentId: string): Promise<void> {
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' }
    });

    if (teams.length < 2) {
      throw new Error('Недостаточно команд для создания турнира');
    }

    const teamCount = teams.length;
    const bracketSize = this.getNextPowerOfTwo(teamCount);
    
    // Создание основной сетки (Winners Bracket)
    const winnersBracket = await prisma.bracket.create({
      data: {
        tournamentId,
        name: 'Сетка победителей',
        round: 1,
        isActive: true
      }
    });

    // Создание сетки проигравших (Losers Bracket)
    const losersBracket = await prisma.bracket.create({
      data: {
        tournamentId,
        name: 'Сетка проигравших',
        round: 1,
        isActive: true
      }
    });

    // Генерация основной сетки
    await this.generateSingleElimination(tournamentId);

    // Генерация сетки проигравших (упрощенная версия)
    const losersRounds = (Math.log2(bracketSize) - 1) * 2;
    
    for (let round = 1; round <= losersRounds; round++) {
      const matchesInRound = Math.max(1, Math.floor(bracketSize / Math.pow(2, round + 1)));
      
      for (let pos = 1; pos <= matchesInRound; pos++) {
        await prisma.match.create({
          data: {
            tournamentId,
            bracketId: losersBracket.id,
            team1Id: '',
            team2Id: '',
            round,
            position: pos,
            status: 'SCHEDULED'
          }
        });
      }
    }

    // Финальный матч
    await prisma.match.create({
      data: {
        tournamentId,
        bracketId: winnersBracket.id,
        team1Id: '',
        team2Id: '',
        round: Math.log2(bracketSize) + 1,
        position: 1,
        status: 'SCHEDULED'
      }
    });
  }

  // Генерация сетки для round robin
  static async generateRoundRobin(tournamentId: string): Promise<void> {
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' }
    });

    if (teams.length < 2) {
      throw new Error('Недостаточно команд для создания турнира');
    }

    // Создание одной сетки для round robin
    const bracket = await prisma.bracket.create({
      data: {
        tournamentId,
        name: 'Круговая система',
        round: 1,
        isActive: true
      }
    });

    // Генерация всех возможных пар команд
    const matches: BracketMatch[] = [];
    let position = 1;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          round: 1,
          position: position++,
          team1Id: teams[i]?.id as string,
          team2Id: teams[j]?.id as string
        });
      }
    }

    // Сохранение матчей
    for (const match of matches) {
      await prisma.match.create({
        data: {
          tournamentId,
          bracketId: bracket.id,
          team1Id: match.team1Id as string,
          team2Id: match.team2Id as string,
          round: match.round,
          position: match.position,
          status: 'SCHEDULED'
        }
      });
    }
  }

  // Генерация сетки для Swiss системы (упрощенная версия)
  static async generateSwiss(tournamentId: string, rounds: number = 5): Promise<void> {
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' }
    });

    if (teams.length < 4) {
      throw new Error('Для Swiss системы необходимо минимум 4 команды');
    }

    // Создание сетки
    const bracket = await prisma.bracket.create({
      data: {
        tournamentId,
        name: 'Swiss система',
        round: 1,
        isActive: true
      }
    });

    // Первый раунд - случайное распределение
    const shuffledTeams = this.shuffleArray([...teams]);
    const matches: BracketMatch[] = [];

    for (let i = 0; i < shuffledTeams.length; i += 2) {
      matches.push({
        round: 1,
        position: Math.floor(i / 2) + 1,
        team1Id: shuffledTeams[i]?.id as string,
        team2Id: shuffledTeams[i + 1]?.id as string
      });
    }

    // Последующие раунды (упрощенная версия)
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = Math.ceil(shuffledTeams.length / 2);
      
      for (let pos = 1; pos <= matchesInRound; pos++) {
        matches.push({
          round,
          position: pos,
          isBye: false
        });
      }
    }

    // Сохранение матчей
    for (const match of matches) {
      await prisma.match.create({
        data: {
          tournamentId,
          bracketId: bracket.id,
          team1Id: match.team1Id as string,
          team2Id: match.team2Id as string,
          round: match.round,
          position: match.position,
          status: 'SCHEDULED'
        }
      });
    }
  }

  // Обновление сетки после завершения матча
  static async updateBracketAfterMatch(tournamentId: string, completedMatchId: string): Promise<void> {
    const completedMatch = await prisma.match.findUnique({
      where: { id: completedMatchId },
      include: {
        results: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!completedMatch || !completedMatch.results.length) {
      return;
    }

    const result = completedMatch.results[0];
    const winnerTeamId = (result?.team1Score || 0) > (result?.team2Score || 0)
      ? completedMatch.team1Id 
      : completedMatch.team2Id;

    // Поиск следующего матча в сетке
    const nextMatch = await prisma.match.findFirst({
      where: {
        tournamentId,
        round: completedMatch.round + 1,
        OR: [
          { team1Id: '' },
          { team2Id: '' }
        ]
      },
      orderBy: { position: 'asc' }
    });

    if (nextMatch) {
      // Определение позиции команды в следующем матче
      const isTeam1Position = completedMatch.position % 2 === 1;
      
      await prisma.match.update({
        where: { id: nextMatch.id },
        data: {
          ...(isTeam1Position ? { team1Id: winnerTeamId as string } : { team2Id: winnerTeamId as string })
        }
      });
    }
  }

  // Получение следующей степени двойки
  private static getNextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  // Перемешивание массива
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }

  // Генерация жеребьевки
  static async generateDraw(tournamentId: string): Promise<void> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: true
      }
    });

    if (!tournament) {
      throw new Error('Турнир не найден');
    }

    if (tournament.teams.length < 2) {
      throw new Error('Недостаточно команд для жеребьевки');
    }

    // Перемешивание команд
    const shuffledTeams = this.shuffleArray(tournament.teams);

    // Обновление порядка команд
    for (let i = 0; i < shuffledTeams.length; i++) {
      await prisma.team.update({
        where: { id: shuffledTeams[i]?.id as string },
        data: { /* можно добавить поле order если нужно */ }
      });
    }
  }
}
