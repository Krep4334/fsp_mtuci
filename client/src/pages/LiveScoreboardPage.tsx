import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { tournamentAPI } from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import { 
  Trophy, 
  Users, 
  Clock, 
  CheckCircle,
  Play,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react'
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

const LiveScoreboardPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const [brackets, setBrackets] = useState<Bracket[]>([])
  const [isLive, setIsLive] = useState(false)
  const { isConnected, joinTournament } = useSocket()

  const { data: tournamentData, isLoading, refetch } = useQuery(
    ['tournament', tournamentId],
    () => tournamentAPI.getTournament(tournamentId!),
    {
      enabled: !!tournamentId,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        setBrackets(data.data.tournament.brackets || [])
        setIsLive(data.data.tournament.status === 'IN_PROGRESS')
      },
    }
  )

  const tournament = tournamentData?.data?.tournament

  // Socket connection for live updates
  useEffect(() => {
    if (tournamentId && isConnected) {
      joinTournament(tournamentId)
    }
  }, [tournamentId, isConnected, joinTournament])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4 text-warning-600" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-success-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'badge-warning'
      case 'COMPLETED':
        return 'badge-success'
      default:
        return 'badge-gray'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'В процессе'
      case 'COMPLETED':
        return 'Завершен'
      default:
        return 'Запланирован'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Турнир не найден</h1>
        <p className="text-gray-600">
          Запрашиваемый турнир не существует или был удален.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                  <span>{tournament.name}</span>
                  {isLive && (
                    <span className="live-indicator">
                      LIVE
                    </span>
                  )}
                </h1>
                <p className="text-lg text-gray-600">Онлайн табло</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <div className="flex items-center space-x-1 text-success-600">
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm font-medium">Подключено</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-danger-600">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm font-medium">Отключено</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  {tournament._count?.teams || 0} команд
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 lg:mt-0">
            <button
              onClick={() => refetch()}
              className="btn btn-outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </button>
          </div>
        </div>
      </div>

      {/* Brackets */}
      {brackets.length > 0 ? (
        <div className="space-y-6">
          {brackets.map((bracket) => (
            <div key={bracket.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {bracket.name}
                </h2>
              </div>
              
              <div className="p-6">
                {bracket.matches && bracket.matches.length > 0 ? (
                  <div className="space-y-4">
                    {bracket.matches.map((match) => (
                      <div
                        key={match.id}
                        className={cn(
                          'bracket-match',
                          match.status === 'COMPLETED' && 'completed',
                          match.status === 'IN_PROGRESS' && 'in-progress'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="text-sm text-gray-500 min-w-0">
                              Раунд {match.round}
                            </div>
                            
                            <div className="flex items-center space-x-4 flex-1">
                              {/* Team 1 */}
                              <div className="flex items-center space-x-3 flex-1">
                                {match.team1?.logo ? (
                                  <img
                                    src={match.team1.logo}
                                    alt={match.team1.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {match.team1?.name?.[0] || 'T'}
                                    </span>
                                  </div>
                                )}
                                <span className="font-medium text-gray-900">
                                  {match.team1?.name || 'TBD'}
                                </span>
                              </div>

                              {/* Score */}
                              <div className="flex items-center space-x-2 min-w-0">
                                {match.results && match.results.length > 0 ? (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-lg font-bold text-gray-900">
                                      {match.results[0].team1Score}
                                    </span>
                                    <span className="text-gray-400">-</span>
                                    <span className="text-lg font-bold text-gray-900">
                                      {match.results[0].team2Score}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">vs</span>
                                )}
                              </div>

                              {/* Team 2 */}
                              <div className="flex items-center space-x-3 flex-1 justify-end">
                                <span className="font-medium text-gray-900">
                                  {match.team2?.name || 'TBD'}
                                </span>
                                {match.team2?.logo ? (
                                  <img
                                    src={match.team2.logo}
                                    alt={match.team2.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {match.team2?.name?.[0] || 'T'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <span className={cn(
                              'badge',
                              getStatusColor(match.status)
                            )}>
                              {getStatusIcon(match.status)}
                              <span className="ml-1">
                                {getStatusText(match.status)}
                              </span>
                            </span>
                            
                            {match.results && match.results.length > 0 && (
                              <span className={cn(
                                'badge',
                                match.results[0].isConfirmed ? 'badge-success' : 'badge-warning'
                              )}>
                                {match.results[0].isConfirmed ? 'Подтвержден' : 'Ожидает подтверждения'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Матчи еще не созданы
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Турнирная сетка будет отображена после создания матчей
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Турнирная сетка не создана
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Дождитесь создания турнирной сетки организатором
          </p>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {isConnected && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span>Live обновления активны</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveScoreboardPage
