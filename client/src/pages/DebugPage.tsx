import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { debugAPI, bracketAPI, tournamentAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { 
  Bug, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Trophy, 
  Users, 
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Zap,
  Eye,
  ExternalLink
} from 'lucide-react'
import { cn } from '../utils/cn'
import { Link } from 'react-router-dom'
import MatchResultInput from '../components/MatchResultInput'

interface TestTournament {
  id: string
  name: string
  type: string
  status: string
  createdAt: string
  organizer: {
    id: string
    username: string
  }
  _count: {
    teams: number
    matches: number
    brackets: number
  }
}

const DebugPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showQuickPresets, setShowQuickPresets] = useState(false)
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set())
  const [matchResultInput, setMatchResultInput] = useState<string | null>(null)

  // Проверка прав доступа
  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Доступ запрещен
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Эта страница доступна только администраторам
          </p>
        </div>
      </div>
    )
  }

  // Получение статистики тестовых данных
  const { data: statsData } = useQuery(
    'debug-stats',
    debugAPI.getTestDataStats,
    {
      refetchInterval: 30000, // обновляем каждые 30 секунд
    }
  )

  // Получение списка тестовых турниров
  const { data: tournamentsData, isLoading: tournamentsLoading, refetch: refetchTournaments } = useQuery(
    'debug-tournaments',
    debugAPI.getTestTournaments
  )

  const testTournaments: TestTournament[] = tournamentsData?.data?.data?.tournaments || []
  const stats = statsData?.data?.data || { testTournaments: 0, testUsers: 0 }

  // Мутации
  const createTestTournamentMutation = useMutation(debugAPI.createTestTournament, {
    onSuccess: (response) => {
      toast.success(response.data.message)
      queryClient.invalidateQueries('debug-stats')
      queryClient.invalidateQueries('debug-tournaments')
      queryClient.invalidateQueries('tournaments')
      setShowCreateForm(false)
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Ошибка создания тестового турнира'
      toast.error(message)
    },
  })

  const createQuickTournamentMutation = useMutation(debugAPI.createQuickTestTournament, {
    onSuccess: (response) => {
      toast.success(response.data.message)
      queryClient.invalidateQueries('debug-stats')
      queryClient.invalidateQueries('debug-tournaments')
      queryClient.invalidateQueries('tournaments')
      setShowQuickPresets(false)
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Ошибка создания быстрого турнира'
      toast.error(message)
    },
  })

  const cleanupMutation = useMutation(debugAPI.cleanupTestData, {
    onSuccess: (response) => {
      toast.success(response.data.message)
      queryClient.invalidateQueries('debug-stats')
      queryClient.invalidateQueries('debug-tournaments')
      queryClient.invalidateQueries('tournaments')
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Ошибка очистки данных'
      toast.error(message)
    },
  })

  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: string }) => debugAPI.updateTestTournamentStatus(id, status),
    {
      onSuccess: (response) => {
        toast.success(response.data.message)
        queryClient.invalidateQueries('debug-tournaments')
        queryClient.invalidateQueries('tournaments')
      },
      onError: (error: any) => {
        const message = error.response?.data?.error?.message || 'Ошибка изменения статуса'
        toast.error(message)
      },
    }
  )

  const generateBracketMutation = useMutation(
    ({ tournamentId, type }: { tournamentId: string; type: string }) => bracketAPI.generateBracket({ tournamentId, type }),
    {
      onSuccess: (response) => {
        toast.success(response.data.message || 'Турнирная сетка успешно создана!')
        queryClient.invalidateQueries('debug-tournaments')
        queryClient.invalidateQueries('tournaments')
      },
      onError: (error: any) => {
        const message = error.response?.data?.error?.message || 'Ошибка создания сетки'
        toast.error(message)
      },
    }
  )

  const handleGenerateBracket = (tournamentId: string, type: string) => {
    if (window.confirm('Создать турнирную сетку для этого турнира?')) {
      generateBracketMutation.mutate({ tournamentId, type })
    }
  }

  const handleCreateTestTournament = (formData: any) => {
    createTestTournamentMutation.mutate(formData)
  }

  const handleQuickCreate = (preset: string) => {
    createQuickTournamentMutation.mutate(preset)
  }

  const handleCleanup = () => {
    if (window.confirm('Вы уверены, что хотите удалить ВСЕ тестовые данные? Это действие нельзя отменить.')) {
      cleanupMutation.mutate()
    }
  }

  const handleStatusChange = (tournamentId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: tournamentId, status: newStatus })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4 text-warning-600" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-success-600" />
      case 'REGISTRATION_OPEN':
        return <Users className="h-4 w-4 text-primary-600" />
      default:
        return <Settings className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'badge-warning'
      case 'COMPLETED':
        return 'badge-success'
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

  const quickPresets = [
    {
      id: 'single-8',
      name: 'Single Elimination 8 команд',
      description: 'Классический турнир на выбывание с 8 командами',
      icon: Trophy
    },
    {
      id: 'single-16',
      name: 'Single Elimination 16 команд',
      description: 'Турнир на выбывание с 16 командами',
      icon: Trophy
    },
    {
      id: 'double-8',
      name: 'Double Elimination 8 команд',
      description: 'Турнир с сеткой проигравших',
      icon: RefreshCw
    },
    {
      id: 'round-robin-6',
      name: 'Round Robin 6 команд',
      description: 'Круговая система с 6 командами',
      icon: Users
    },
    {
      id: 'swiss-12',
      name: 'Swiss System 12 команд',
      description: 'Swiss система с 12 командами',
      icon: Settings
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bug className="h-6 w-6 mr-2 text-warning-600" />
            Панель отладки
          </h1>
          <p className="text-gray-600 mt-1">
            Инструменты для создания и управления тестовыми данными
          </p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Тестовые турниры</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.testTournaments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Тестовые пользователи</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.testUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Активные турниры</p>
              <p className="text-2xl font-semibold text-gray-900">
                {testTournaments.filter(t => t.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Действия */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowQuickPresets(!showQuickPresets)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Быстрое создание
          </button>
          
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Настроить турнир
          </button>
          
          <button
            onClick={handleCleanup}
            disabled={cleanupMutation.isLoading}
            className="btn btn-danger"
          >
            {cleanupMutation.isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Очистить все
          </button>
          
          <button
            onClick={() => refetchTournaments()}
            className="btn btn-outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </button>
        </div>

        {/* Быстрые пресеты */}
        {showQuickPresets && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Выберите пресет:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickPresets.map((preset) => {
                const Icon = preset.icon
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleQuickCreate(preset.id)}
                    disabled={createQuickTournamentMutation.isLoading}
                    className="p-4 text-left bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center mb-2">
                      <Icon className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="font-medium text-gray-900">{preset.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{preset.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Форма создания */}
        {showCreateForm && (
          <CreateTestTournamentForm 
            onSubmit={handleCreateTestTournament}
            isLoading={createTestTournamentMutation.isLoading}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </div>

      {/* Список тестовых турниров */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Тестовые турниры</h2>
        </div>
        
        {tournamentsLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : testTournaments.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Нет тестовых турниров
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Создайте первый тестовый турнир для отладки
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {testTournaments.map((tournament) => (
              <div key={tournament.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {tournament.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {tournament.type.replace('_', ' ')} • {tournament._count.teams} команд • {tournament._count.matches} матчей
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={cn('badge', getStatusColor(tournament.status))}>
                      {getStatusIcon(tournament.status)}
                      <span className="ml-1">
                        {getStatusText(tournament.status)}
                      </span>
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      {tournament._count.brackets === 0 && tournament.status === 'REGISTRATION_CLOSED' && (
                        <button
                          onClick={() => handleGenerateBracket(tournament.id, tournament.type)}
                          disabled={generateBracketMutation.isLoading}
                          className="btn btn-primary btn-sm"
                          title="Запустить турнир"
                        >
                          {generateBracketMutation.isLoading ? (
                            <LoadingSpinner size="sm" className="mr-1" />
                          ) : (
                            <Zap className="h-4 w-4 mr-1" />
                          )}
                          Запустить
                        </button>
                      )}
                      
                      <select
                        value={tournament.status}
                        onChange={(e) => handleStatusChange(tournament.id, e.target.value)}
                        disabled={updateStatusMutation.isLoading}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1"
                      >
                        <option value="DRAFT">Черновик</option>
                        <option value="REGISTRATION_OPEN">Регистрация открыта</option>
                        <option value="REGISTRATION_CLOSED">Регистрация закрыта</option>
                        <option value="IN_PROGRESS">В процессе</option>
                        <option value="COMPLETED">Завершен</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Компонент формы создания тестового турнира
const CreateTestTournamentForm: React.FC<{
  onSubmit: (data: any) => void
  isLoading: boolean
  onCancel: () => void
}> = ({ onSubmit, isLoading, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'SINGLE_ELIMINATION',
    teamCount: 8,
    playersPerTeam: 5,
    status: 'REGISTRATION_CLOSED'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Настройки турнира:</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название турнира
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="Введите название"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Тип турнира
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="input"
          >
            <option value="SINGLE_ELIMINATION">Single Elimination</option>
            <option value="DOUBLE_ELIMINATION">Double Elimination</option>
            <option value="ROUND_ROBIN">Round Robin</option>
            <option value="SWISS">Swiss System</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Количество команд
          </label>
          <input
            type="number"
            min="2"
            max="32"
            value={formData.teamCount}
            onChange={(e) => setFormData({ ...formData, teamCount: parseInt(e.target.value) })}
            className="input"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Игроков в команде
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.playersPerTeam}
            onChange={(e) => setFormData({ ...formData, playersPerTeam: parseInt(e.target.value) })}
            className="input"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Статус
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="input"
          >
            <option value="DRAFT">Черновик</option>
            <option value="REGISTRATION_OPEN">Регистрация открыта</option>
            <option value="REGISTRATION_CLOSED">Регистрация закрыта</option>
            <option value="IN_PROGRESS">В процессе</option>
            <option value="COMPLETED">Завершен</option>
          </select>
        </div>
      </div>
      
      <div className="flex items-center justify-end space-x-4 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Создание...
            </>
          ) : (
            'Создать турнир'
          )}
        </button>
      </div>
    </form>
  )
}

export default DebugPage
