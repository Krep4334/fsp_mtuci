import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { tournamentAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

interface Tournament {
  id: string
  name: string
  description?: string
  type: string
  status: string
  maxTeams?: number
  startDate?: string
  location?: string
  organizer?: {
    id: string
    username: string
  }
  _count?: {
    teams: number
    matches: number
  }
}
import { 
  Trophy, 
  Users, 
  Calendar, 
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '../utils/cn'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  const { data: tournamentsData, isLoading } = useQuery(
    'user-tournaments',
    () => tournamentAPI.getTournaments({ limit: 6 }),
    {
      refetchOnWindowFocus: false,
    }
  )

  const tournaments: Tournament[] = tournamentsData?.data?.data?.tournaments || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-warning-600" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-success-600" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-danger-600" />
      default:
        return <Calendar className="h-4 w-4 text-gray-400" />
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

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              Добро пожаловать, {user?.firstName || user?.username}!
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Управляйте своими турнирами и следите за результатами
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-4">
            <Link
              to="/tournaments/new"
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать турнир
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Всего турниров</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {tournamentsData?.data?.data?.pagination?.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success-600" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Завершенных</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {tournaments.filter(t => t.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning-600" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500">В процессе</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {tournaments.filter(t => t.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-600" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Всего команд</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {tournaments.reduce((sum, t) => sum + (t._count?.teams || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tournaments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Последние турниры
            </h2>
            <Link
              to="/tournaments"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Посмотреть все
            </Link>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Турниры не найдены
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Создайте свой первый турнир
              </p>
              <div className="mt-6">
                <Link
                  to="/tournaments/new"
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать турнир
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {tournament.name}
                        </p>
                        <span className={cn('badge', getStatusColor(tournament.status))}>
                          {getStatusIcon(tournament.status)}
                          <span className="ml-1">
                            {getStatusText(tournament.status)}
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {getTypeText(tournament.type)} • {tournament._count?.teams || 0} команд
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/tournaments/${tournament.id}`}
                      className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md"
                      title="Посмотреть детали"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Быстрые действия
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link
            to="/tournaments/new"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
              <Plus className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Создать турнир</p>
              <p className="text-sm text-gray-500">Начать новый турнир</p>
            </div>
          </Link>

          <Link
            to="/tournaments"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center mr-4">
              <Trophy className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Все турниры</p>
              <p className="text-sm text-gray-500">Просмотр всех турниров</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center mr-4">
              <Users className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Профиль</p>
              <p className="text-sm text-gray-500">Настройки аккаунта</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
