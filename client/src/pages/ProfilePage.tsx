import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { User, Mail, Calendar, Shield, Edit, Save, X } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

interface ProfileForm {
  firstName?: string
  lastName?: string
  username?: string
}

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
    },
  })

  const updateProfileMutation = useMutation(authAPI.updateProfile, {
    onSuccess: (response) => {
      updateUser(response.data.user)
      toast.success('Профиль успешно обновлен!')
      setIsEditing(false)
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Ошибка обновления профиля'
      toast.error(message)
    },
  })

  const onSubmit = async (data: ProfileForm) => {
    await updateProfileMutation.mutateAsync(data)
  }

  const handleCancel = () => {
    reset({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
    })
    setIsEditing(false)
  }

  const getRoleText = (role: string) => {
    const roleMap: { [key: string]: string } = {
      ADMIN: 'Администратор',
      ORGANIZER: 'Организатор',
      JUDGE: 'Судья',
      PARTICIPANT: 'Участник',
      SPECTATOR: 'Зритель'
    }
    return roleMap[role] || role
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'badge-danger'
      case 'ORGANIZER':
        return 'badge-primary'
      case 'JUDGE':
        return 'badge-warning'
      default:
        return 'badge-gray'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-primary-600" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.username
              }
            </h1>
            <p className="text-gray-600">
              <span className={getRoleColor(user?.role || '')}>
                {getRoleText(user?.role || '')}
              </span>
            </p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-outline"
          >
            {isEditing ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Отмена
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </>
            )}
          </button>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Информация профиля</h2>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                Имя
              </label>
              {isEditing ? (
                <input
                  {...register('firstName', {
                    maxLength: {
                      value: 50,
                      message: 'Максимум 50 символов'
                    }
                  })}
                  type="text"
                  className={`input ${errors.firstName ? 'input-error' : ''}`}
                  placeholder="Введите имя"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {user?.firstName || 'Не указано'}
                  </span>
                </div>
              )}
              {errors.firstName && (
                <p className="mt-1 text-sm text-danger-600">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Фамилия
              </label>
              {isEditing ? (
                <input
                  {...register('lastName', {
                    maxLength: {
                      value: 50,
                      message: 'Максимум 50 символов'
                    }
                  })}
                  type="text"
                  className={`input ${errors.lastName ? 'input-error' : ''}`}
                  placeholder="Введите фамилию"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {user?.lastName || 'Не указано'}
                  </span>
                </div>
              )}
              {errors.lastName && (
                <p className="mt-1 text-sm text-danger-600">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Имя пользователя
              </label>
              {isEditing ? (
                <input
                  {...register('username', {
                    required: 'Имя пользователя обязательно',
                    minLength: {
                      value: 3,
                      message: 'Минимум 3 символа'
                    },
                    maxLength: {
                      value: 20,
                      message: 'Максимум 20 символов'
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Только буквы, цифры и подчеркивания'
                    }
                  })}
                  type="text"
                  className={`input ${errors.username ? 'input-error' : ''}`}
                  placeholder="Введите имя пользователя"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{user?.username}</span>
                </div>
              )}
              {errors.username && (
                <p className="mt-1 text-sm text-danger-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{user?.email}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Email нельзя изменить
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Роль
              </label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className={getRoleColor(user?.role || '')}>
                  {getRoleText(user?.role || '')}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата регистрации
              </label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : 'Не указано'}
                </span>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-outline"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isLoading}
                className="btn btn-primary"
              >
                {updateProfileMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Безопасность</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Смена пароля</h3>
                <p className="text-sm text-gray-500">
                  Обновите свой пароль для повышения безопасности
                </p>
              </div>
              <button className="btn btn-outline btn-sm">
                Изменить пароль
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Двухфакторная аутентификация</h3>
                <p className="text-sm text-gray-500">
                  Добавьте дополнительный уровень защиты
                </p>
              </div>
              <button className="btn btn-outline btn-sm">
                Настроить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
