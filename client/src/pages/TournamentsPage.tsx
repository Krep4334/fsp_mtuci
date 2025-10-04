import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { tournamentAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

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
  Plus, 
  Search, 
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Trash2
} from 'lucide-react'
import { cn } from '../utils/cn'

const TournamentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: tournamentsData, isLoading, refetch } = useQuery(
    ['tournaments', { statusFilter, typeFilter, currentPage }],
    () => tournamentAPI.getTournaments({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      page: currentPage,
      limit: 12
    }),
    {
      refetchOnWindowFocus: false,
    }
  )

  const tournaments: Tournament[] = tournamentsData?.data?.data?.tournaments || []
  const pagination = tournamentsData?.data?.data?.pagination

  const deleteTournamentMutation = useMutation(tournamentAPI.deleteTournament, {
    onSuccess: () => {
      toast.success('Турнир успешно удален')
      queryClient.invalidateQueries(['tournaments'])
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Ошибка удаления турнира'
      toast.error(message)
    },
  })

  const handleDeleteTournament = (tournamentId: string, tournamentName: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить турнир "${tournamentName}"? Это действие нельзя отменить.`)) {
      deleteTournamentMutation.mutate(tournamentId)
    }
  }

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

  const filteredTournaments: Tournament[] = tournaments.filter((tournament: Tournament) =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFilterChange = () => {
    setCurrentPage(1)
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Турниры</h1>
          <p className="text-gray-600 mt-1">
            Управляйте и просматривайте все турниры
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/tournaments/new"
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать турнир
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск турниров..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                handleFilterChange()
              }}
              className="input"
            >
              <option value="">Все статусы</option>
              <option value="DRAFT">Черновик</option>
              <option value="REGISTRATION_OPEN">Регистрация открыта</option>
              <option value="REGISTRATION_CLOSED">Регистрация закрыта</option>
              <option value="IN_PROGRESS">В процессе</option>
              <option value="COMPLETED">Завершен</option>
              <option value="CANCELLED">Отменен</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                handleFilterChange()
              }}
              className="input"
            >
              <option value="">Все типы</option>
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="DOUBLE_ELIMINATION">Double Elimination</option>
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="SWISS">Swiss System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tournaments Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Турниры не найдены
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter || typeFilter
              ? 'Попробуйте изменить фильтры поиска'
              : 'Создайте свой первый турнир'
            }
          </p>
          {!searchTerm && !statusFilter && !typeFilter && (
            <div className="mt-6">
              <Link
                to="/tournaments/new"
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать турнир
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                          {tournament.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {getTypeText(tournament.type)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {tournament.description && (
                    <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                      {tournament.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <span className={cn('badge', getStatusColor(tournament.status))}>
                      {getStatusIcon(tournament.status)}
                      <span className="ml-1">
                        {getStatusText(tournament.status)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{tournament._count?.teams || 0} команд</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {tournament.startDate 
                          ? new Date(tournament.startDate).toLocaleDateString('ru-RU')
                          : 'Дата не указана'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Организатор: {tournament.organizer?.username}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <Link
                    to={`/tournaments/${tournament.id}`}
                    className="btn btn-outline btn-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Подробнее
                  </Link>
                  
                  <div className="flex items-center space-x-2">
                    {/* Кнопка удаления - только для админов и организаторов */}
                    {(user?.role === 'ADMIN' || tournament.organizer?.id === user?.id) && (
                      <button
                        onClick={() => handleDeleteTournament(tournament.id, tournament.name)}
                        disabled={deleteTournamentMutation.isLoading}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Удалить турнир"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Предыдущая
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={currentPage === pagination.pages}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Следующая
                </button>
              </div>
              
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Показано{' '}
                    <span className="font-medium">
                      {(currentPage - 1) * 12 + 1}
                    </span>{' '}
                    -{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * 12, pagination.total)}
                    </span>{' '}
                    из{' '}
                    <span className="font-medium">{pagination.total}</span>{' '}
                    результатов
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-outline btn-sm disabled:opacity-50"
                  >
                    Предыдущая
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'px-3 py-1 text-sm rounded-md',
                            currentPage === page
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          )}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                    disabled={currentPage === pagination.pages}
                    className="btn btn-outline btn-sm disabled:opacity-50"
                  >
                    Следующая
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TournamentsPage
