import { cn } from '../utils/cn'

interface Match {
  id: string
  team1?: {
    id: string
    name: string
    logo?: string
  }
  team2?: {
    id: string
    name: string
    logo?: string
  }
  status: string
  round: number
  position: number
  results?: Array<{
    team1Score: number
    team2Score: number
    isConfirmed: boolean
  }>
}

interface Bracket {
  id: string
  name: string
  matches: Match[]
}

interface BracketViewProps {
  bracket: Bracket
  tournamentType: string
}

const BracketView: React.FC<BracketViewProps> = ({ bracket, tournamentType }) => {
  // Группируем матчи по раундам
  const matchesByRound: { [key: number]: Match[] } = {}
  
  bracket.matches.forEach(match => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = []
    }
    matchesByRound[match.round].push(match)
  })

  // Сортируем матчи в каждом раунде по позиции
  Object.keys(matchesByRound).forEach(round => {
    matchesByRound[Number(round)].sort((a, b) => a.position - b.position)
  })

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b)
  const maxRound = Math.max(...rounds)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'border-warning-400 bg-warning-50'
      case 'COMPLETED':
        return 'border-success-400 bg-success-50'
      default:
        return 'border-gray-300 bg-white'
    }
  }

  const renderMatchCard = (match: Match) => {
    const hasResult = match.results && match.results.length > 0
    const winnerId = hasResult && match.results![0].team1Score > match.results![0].team2Score
      ? match.team1?.id
      : hasResult
        ? match.team2?.id
        : null

    return (
      <div className={cn(
        "w-full sm:w-56 md:w-64 border-2 rounded-lg overflow-hidden transition-all hover:shadow-lg",
        getStatusColor(match.status)
      )}>
        {/* Команда 1 */}
        <div className={cn(
          "px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 flex items-center justify-between transition-colors",
          winnerId === match.team1?.id && "bg-success-100",
          !match.team1 && "opacity-50"
        )}>
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
            {match.team1?.logo ? (
              <img
                src={match.team1.logo}
                alt={match.team1.name}
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-gray-600">
                  {match.team1?.name?.[0] || 'T'}
                </span>
              </div>
            )}
            <span className="text-xs sm:text-sm font-semibold truncate">
              {match.team1?.name || 'TBD'}
            </span>
          </div>
          {hasResult && (
            <span className="text-base sm:text-lg font-bold ml-2 text-gray-800">
              {match.results![0].team1Score}
            </span>
          )}
        </div>

        {/* Разделитель */}
        <div className="h-px bg-gray-300" />

        {/* Команда 2 */}
        <div className={cn(
          "px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 flex items-center justify-between transition-colors",
          winnerId === match.team2?.id && "bg-success-100",
          !match.team2 && "opacity-50"
        )}>
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
            {match.team2?.logo ? (
              <img
                src={match.team2.logo}
                alt={match.team2.name}
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-gray-600">
                  {match.team2?.name?.[0] || 'T'}
                </span>
              </div>
            )}
            <span className="text-xs sm:text-sm font-semibold truncate">
              {match.team2?.name || 'TBD'}
            </span>
          </div>
          {hasResult && (
            <span className="text-base sm:text-lg font-bold ml-2 text-gray-800">
              {match.results![0].team2Score}
            </span>
          )}
        </div>
      </div>
    )
  }

  const renderSingleElimination = () => {
    // Определяем количество матчей в первом раунде (самый полный раунд)
    const firstRoundMatches = matchesByRound[rounds[0]]?.length || 0
    
    // Вычисляем позиции для каждого раунда
    const getMatchPosition = (round: number, position: number): number => {
      // Для первого раунда просто возвращаем позицию
      if (round === rounds[0]) {
        return position
      }
      
      // Для следующих раундов вычисляем позицию между двумя матчами предыдущего раунда
      // Матч в позиции N следующего раунда находится между матчами (2N-1) и (2N) предыдущего раунда
      // Позиция = среднее между (2N-1) и (2N) = (2N-1 + 2N) / 2 = (4N-1) / 2
      const prevRound = rounds[rounds.indexOf(round) - 1]
      const prevRoundMatches = matchesByRound[prevRound].length
      
      // Количество "слотов" для позиций
      const totalSlots = prevRoundMatches * 2
      
      // Вычисляем, какой слот занимает этот матч
      // Матч в позиции N следующего раунда находится в слоте 2N
      const slotNumber = position * 2
      
      return slotNumber
    }

    return (
      <div className="w-full overflow-x-auto py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
        <div className="flex justify-start items-start space-x-4 sm:space-x-6 md:space-x-8 lg:space-x-12 min-w-max">
          {rounds.map((round, roundIndex) => {
            const matchesInRound = matchesByRound[round]
            
            // Вычисляем отступ сверху для каждого раунда
            // Используем CSS переменные для адаптивности
            const topOffset = roundIndex * 80 // Базовый отступ, CSS media queries скорректируют

            return (
              <div 
                key={round} 
                className="flex flex-col items-center space-y-3 sm:space-y-4 md:space-y-6"
                style={{ marginTop: `${topOffset}px` }}
              >
                {/* Название раунда */}
                <div className="text-sm sm:text-base md:text-lg font-bold text-primary-700 mb-3 sm:mb-4 md:mb-6 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-primary-100 rounded-full text-center whitespace-nowrap">
                  {round === maxRound ? 'Финал' :
                   round === maxRound - 1 ? 'Полуфинал' :
                   round === maxRound - 2 ? 'Четвертьфинал' :
                   `Раунд ${round}`}
                </div>

                {/* Матчи раунда */}
                <div className="flex flex-col space-y-3 sm:space-y-4 md:space-y-6">
                  {matchesInRound.map((match, matchIndex) => (
                    <div key={match.id} className="relative">
                      {renderMatchCard(match)}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Для других форматов используем простой список
  const renderSimpleList = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bracket.matches.map((match) => (
          <div
            key={match.id}
            className={cn(
              "p-4 border-2 rounded-lg",
              getStatusColor(match.status)
            )}
          >
            <div className="text-xs text-gray-500 mb-2">
              Раунд {match.round}, Позиция {match.position}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{match.team1?.name || 'TBD'}</span>
                {match.results && match.results.length > 0 && (
                  <span className="font-bold">{match.results[0].team1Score}</span>
                )}
              </div>
              <div className="text-center text-gray-400 text-xs">vs</div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{match.team2?.name || 'TBD'}</span>
                {match.results && match.results.length > 0 && (
                  <span className="font-bold">{match.results[0].team2Score}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (tournamentType === 'SINGLE_ELIMINATION' || tournamentType === 'DOUBLE_ELIMINATION') {
    return renderSingleElimination()
  }

  return renderSimpleList()
}

export default BracketView