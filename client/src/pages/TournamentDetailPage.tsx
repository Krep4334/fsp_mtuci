import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { tournamentAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { 
  Trophy, 
  Calendar, 
  Users, 
  MapPin, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Play,
  Eye,
  Settings,
  Trash2
} from 'lucide-react'
import { cn } from '../utils/cn'

const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: tournamentData, isLoading } = useQuery(
    ['tournament', id],
    () => tournamentAPI.getTournament(id!),
    {
      enabled: !!id,
      refetchOnWindowFocus: false,
    }
  )

  const tournament = tournamentData?.data?.data?.tournament

  const deleteTournamentMutation = useMutation(tournamentAPI.deleteTournament, {
    onSuccess: () => {
      toast.success('Турнир успешно удален')
      queryClient.invalidateQueries(['tournaments'])
      navigate('/tournaments')
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Ошибка удаления турнира'
      toast.error(message)
    },
  })

  const handleDeleteTournament = () => {
    if (tournament && window.confirm(`Вы уверены, что хотите удалить турнир "${tournament.name}"? Это действие нельзя отменить.`)) {
      deleteTournamentMutation.mutate(tournament.id)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-warning-600" />
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-success-600" />
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-danger-600" />
      default:
        return <Calendar className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'badge-warning'
      case 'COMPLETED':
        return 'badge-success'
      case 'CANCELLED':
        return 'badge-danger'
      case 'REGISTRATION_OPEN':
        return 'badge-primary'
      default:
        return 'badge-gray'
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      DRAFT: 'Черновик',
      REGISTRATION_OPEN: 'Регистрация открыта',
      REGISTRATION_CLOSED: 'Регистрация закрыта',
      IN_PROGRESS: 'В процессе',
      COMPLETED: 'Завершен',
      CANCELLED: 'Отменен'
    }
    return statusMap[status] || status
  }

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      SINGLE_ELIMINATION: 'Single Elimination',
      DOUBLE_ELIMINATION: 'Double Elimination',
      ROUND_ROBIN: 'Round Robin',
      SWISS: 'Swiss System'
    }
    return typeMap[type] || type
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
        <p className="text-gray-600 mb-6">
          Запрашиваемый турнир не существует или был удален.
        </p>
        <Link to="/tournaments" className="btn btn-primary">
          Вернуться к списку турниров
        </Link>
      </div>
    )
  }

  const canEdit = user?.role === 'ADMIN' || tournament.organizer?.id === user?.id
  const isJudge = tournament.judges?.some(judge => judge.user.id === user?.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
                <p className="text-lg text-gray-600">{getTypeText(tournament.type)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <span className={cn('badge', getStatusColor(tournament.status))}>
                {getStatusIcon(tournament.status)}
                <span className="ml-2">
                  {getStatusText(tournament.status)}
                </span>
              </span>
            </div>

            {tournament.description && (
              <p className="text-gray-700 mb-4">{tournament.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  {tournament._count?.teams || 0} команд
                </span>
              </div>
              
              {tournament.maxTeams && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    Макс: {tournament.maxTeams}
                  </span>
                </div>
              )}

              {tournament.startDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {new Date(tournament.startDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}

              {tournament.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{tournament.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2">
            <button 
              className="btn btn-primary"
              onClick={() => toast('Live табло будет доступно после создания турнирной сетки', { icon: 'ℹ️' })}
            >
              <Eye className="h-4 w-4 mr-2" />
              Live табло
            </button>

            {canEdit && (
              <button 
                className="btn btn-outline"
                onClick={() => toast('Редактирование турнира будет доступно в следующей версии', { icon: 'ℹ️' })}
              >
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </button>
            )}

            {(canEdit || isJudge) && (
              <button 
                className="btn btn-outline"
                onClick={() => toast('Управление турниром будет доступно в следующей версии', { icon: 'ℹ️' })}
              >
                <Settings className="h-4 w-4 mr-2" />
                Управление
              </button>
            )}

            {canEdit && (
              <button 
                className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={handleDeleteTournament}
                disabled={deleteTournamentMutation.isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить турнир
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Команды</p>
              <p className="text-2xl font-bold text-gray-900">
                {tournament._count?.teams || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <Play className="h-5 w-5 text-success-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Матчи</p>
              <p className="text-2xl font-bold text-gray-900">
                {tournament._count?.matches || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-5 w-5 text-warning-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Сетки</p>
              <p className="text-2xl font-bold text-gray-900">
                {tournament._count?.brackets || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-secondary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Призовой фонд</p>
              <p className="text-2xl font-bold text-gray-900">
                {tournament.prizePool ? `${tournament.prizePool.toLocaleString()} ₽` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Teams */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Команды ({tournament.teams?.length || 0})
          </h2>
        </div>
        <div className="p-6">
          {tournament.teams && tournament.teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournament.teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {team.name[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {team.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Капитан: {team.captain?.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Команды не найдены
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Пока никто не зарегистрировался на турнир
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Brackets */}
      {tournament.brackets && tournament.brackets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Турнирная сетка
            </h2>
          </div>
          <div className="p-6">
            {tournament.brackets.map((bracket) => (
              <div key={bracket.id} className="mb-6">
                <h3 className="text-md font-medium text-gray-900 mb-4">
                  {bracket.name}
                </h3>
                {bracket.matches && bracket.matches.length > 0 ? (
                  <div className="space-y-2">
                    {bracket.matches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">
                            Раунд {match.round}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {match.team1?.name || 'TBD'}
                            </span>
                            <span className="text-gray-400">vs</span>
                            <span className="text-sm font-medium">
                              {match.team2?.name || 'TBD'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            'badge',
                            match.status === 'COMPLETED' ? 'badge-success' :
                            match.status === 'IN_PROGRESS' ? 'badge-warning' :
                            'badge-gray'
                          )}>
                            {match.status === 'COMPLETED' ? 'Завершен' :
                             match.status === 'IN_PROGRESS' ? 'В процессе' :
                             'Запланирован'}
                          </span>
                          {match.results && match.results.length > 0 && (
                            <span className="text-sm font-medium">
                              {match.results[0].team1Score} - {match.results[0].team2Score}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Матчи еще не созданы
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TournamentDetailPage
