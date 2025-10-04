import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { tournamentAPI } from '../services/api'
import { Trophy, Calendar, Users, MapPin, DollarSign } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

interface TournamentForm {
  name: string
  description: string
  type: string
  maxTeams?: number
  registrationStart?: string
  registrationEnd?: string
  startDate?: string
  endDate?: string
  location?: string
  prizePool?: number
  rules?: string
}

const EditTournamentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: tournamentData, isLoading } = useQuery(
    ['tournament', id],
    () => tournamentAPI.getTournament(id!),
    {
      enabled: !!id,
      refetchOnWindowFocus: false,
    }
  )

  const tournament = tournamentData?.data?.tournament

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<TournamentForm>({
    defaultValues: {
      type: 'SINGLE_ELIMINATION',
    },
  })

  // Reset form when tournament data is loaded
  useEffect(() => {
    if (tournament) {
      reset({
        name: tournament.name,
        description: tournament.description || '',
        type: tournament.type,
        maxTeams: tournament.maxTeams || undefined,
        registrationStart: tournament.registrationStart 
          ? new Date(tournament.registrationStart).toISOString().slice(0, 16)
          : undefined,
        registrationEnd: tournament.registrationEnd 
          ? new Date(tournament.registrationEnd).toISOString().slice(0, 16)
          : undefined,
        startDate: tournament.startDate 
          ? new Date(tournament.startDate).toISOString().slice(0, 16)
          : undefined,
        endDate: tournament.endDate 
          ? new Date(tournament.endDate).toISOString().slice(0, 16)
          : undefined,
        location: tournament.location || '',
        prizePool: tournament.prizePool || undefined,
        rules: tournament.rules || '',
      })
    }
  }, [tournament, reset])

  const updateTournamentMutation = useMutation(
    (data: TournamentForm) => tournamentAPI.updateTournament(id!, data),
    {
      onSuccess: () => {
        toast.success('Турнир успешно обновлен!')
        queryClient.invalidateQueries(['tournament', id])
        navigate(`/tournaments/${id}`)
      },
      onError: (error: any) => {
        const message = error.response?.data?.error?.message || 'Ошибка обновления турнира'
        toast.error(message)
      },
    }
  )

  const onSubmit = async (data: TournamentForm) => {
    setIsSubmitting(true)
    try {
      await updateTournamentMutation.mutateAsync(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const tournamentType = watch('type')

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
        <button
          onClick={() => navigate('/tournaments')}
          className="btn btn-primary"
        >
          Вернуться к списку турниров
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Trophy className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Редактировать турнир</h1>
            <p className="text-gray-600">Обновите информацию о турнире</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Основная информация
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Название турнира *
              </label>
              <input
                {...register('name', {
                  required: 'Название турнира обязательно',
                  minLength: {
                    value: 3,
                    message: 'Минимум 3 символа'
                  },
                  maxLength: {
                    value: 100,
                    message: 'Максимум 100 символов'
                  }
                })}
                type="text"
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="Введите название турнира"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                {...register('description', {
                  maxLength: {
                    value: 1000,
                    message: 'Максимум 1000 символов'
                  }
                })}
                rows={4}
                className={`input ${errors.description ? 'input-error' : ''}`}
                placeholder="Описание турнира, правила, особенности..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Формат турнира *
              </label>
              <select
                {...register('type', { required: 'Формат турнира обязателен' })}
                className={`input ${errors.type ? 'input-error' : ''}`}
              >
                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="SWISS">Swiss System</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-danger-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="maxTeams" className="block text-sm font-medium text-gray-700 mb-2">
                Максимум команд
              </label>
              <input
                {...register('maxTeams', {
                  min: {
                    value: 2,
                    message: 'Минимум 2 команды'
                  }
                })}
                type="number"
                min="2"
                className={`input ${errors.maxTeams ? 'input-error' : ''}`}
                placeholder="Неограниченно"
              />
              {errors.maxTeams && (
                <p className="mt-1 text-sm text-danger-600">{errors.maxTeams.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Dates and Location */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Даты и место проведения
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="registrationStart" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Начало регистрации
              </label>
              <input
                {...register('registrationStart')}
                type="datetime-local"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="registrationEnd" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Окончание регистрации
              </label>
              <input
                {...register('registrationEnd')}
                type="datetime-local"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Дата начала турнира
              </label>
              <input
                {...register('startDate')}
                type="datetime-local"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Дата окончания турнира
              </label>
              <input
                {...register('endDate')}
                type="datetime-local"
                className="input"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Место проведения
              </label>
              <input
                {...register('location', {
                  maxLength: {
                    value: 200,
                    message: 'Максимум 200 символов'
                  }
                })}
                type="text"
                className={`input ${errors.location ? 'input-error' : ''}`}
                placeholder="Адрес или название места проведения"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-danger-600">{errors.location.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Prize and Rules */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Призовой фонд и правила
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="prizePool" className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Призовой фонд (₽)
              </label>
              <input
                {...register('prizePool', {
                  min: {
                    value: 0,
                    message: 'Призовой фонд не может быть отрицательным'
                  }
                })}
                type="number"
                min="0"
                step="100"
                className={`input ${errors.prizePool ? 'input-error' : ''}`}
                placeholder="0"
              />
              {errors.prizePool && (
                <p className="mt-1 text-sm text-danger-600">{errors.prizePool.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="rules" className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Правила турнира
              </label>
              <textarea
                {...register('rules', {
                  maxLength: {
                    value: 5000,
                    message: 'Максимум 5000 символов'
                  }
                })}
                rows={6}
                className={`input ${errors.rules ? 'input-error' : ''}`}
                placeholder="Подробные правила турнира..."
              />
              {errors.rules && (
                <p className="mt-1 text-sm text-danger-600">{errors.rules.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <button
            type="button"
            onClick={() => navigate(`/tournaments/${id}`)}
            className="btn btn-outline"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Сохранение...
              </>
            ) : (
              'Сохранить изменения'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditTournamentPage
