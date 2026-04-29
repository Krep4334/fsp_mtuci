import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { authAPI, storageAPI } from '../services/api'
import { User, Mail, Calendar, Shield, Edit, Save, X, Upload, FileText, Trash2, ExternalLink } from 'lucide-react'
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
  const [materialLabel, setMaterialLabel] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const materialInputRef = useRef<HTMLInputElement>(null)

  const { data: myObjectsRes, refetch: refetchObjects } = useQuery(
    ['storage-my', user?.id],
    () => storageAPI.getMyObjects(),
    { enabled: Boolean(user?.id), refetchOnWindowFocus: false }
  )
  const storedObjects =
    (myObjectsRes?.data?.data?.objects as Array<{
      id: string
      objectUrl: string
      originalName: string
      label?: string | null
      contentType?: string | null
      sizeBytes?: number | null
      createdAt: string
    }>) ?? []

  const uploadAvatarMutation = useMutation(
    (file: File) => storageAPI.uploadAvatar(file),
    {
      onSuccess: (res) => {
        const u = res.data?.data?.user
        if (u) updateUser(u)
        toast.success('Аватар сохранён в хранилище, в профиле — ссылка из БД')
      },
      onError: (e: any) => {
        toast.error(
          e.response?.data?.error?.message || 'Не удалось загрузить аватар (проверь MinIO/S3)'
        )
      },
    }
  )

  const uploadMaterialMutation = useMutation(
    ({ file, label }: { file: File; label?: string }) => storageAPI.uploadMaterial(file, label),
    {
      onSuccess: () => {
        refetchObjects()
        setMaterialLabel('')
        toast.success('Файл сохранён в хранилище, ссылка записана в БД')
      },
      onError: (e: any) => {
        toast.error(e.response?.data?.error?.message || 'Ошибка загрузки материала')
      },
    }
  )

  const deleteObjectMutation = useMutation((id: string) => storageAPI.deleteStoredObject(id), {
    onSuccess: () => {
      refetchObjects()
      toast.success('Объект удалён')
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error?.message || 'Ошибка удаления')
    },
  })

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
      updateUser(response.data.data.user)
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
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadAvatarMutation.mutate(f)
          e.target.value = ''
        }}
      />

      {/* Header — основное применение хранилища: аватар */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2 shrink-0">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-gray-100">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-primary-600" />
              )}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={uploadAvatarMutation.isLoading}
              onClick={() => avatarInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploadAvatarMutation.isLoading ? 'Загрузка…' : 'Сменить фото'}
            </button>
            <p className="text-xs text-gray-500 text-center sm:text-left max-w-[200px] leading-snug">
              Фото лежит в объектном хранилище (MinIO/S3). В PostgreSQL — только URL в поле{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">avatar</code>.
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.username
              }
            </h1>
            <p className="text-gray-600 mt-1">
              <span className={getRoleColor(user?.role || '')}>
                {getRoleText(user?.role || '')}
              </span>
            </p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-outline self-start"
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

      {/* Дополнительно: другие объекты в том же хранилище (лаба / редкие файлы) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Дополнительные файлы</h2>
          <p className="text-sm text-gray-500 mt-1">
            Аватар настраивается сверху. Здесь — при необходимости другие объекты: тоже в MinIO/S3, метаданные и ссылка в таблице{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">user_stored_objects</code>.
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Загрузить материал</h3>
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <input
                type="text"
                className="input flex-1"
                placeholder="Подпись (необязательно)"
                value={materialLabel}
                onChange={(e) => setMaterialLabel(e.target.value)}
              />
              <input
                ref={materialInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadMaterialMutation.mutate({ file: f, label: materialLabel || undefined })
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={uploadMaterialMutation.isLoading}
                onClick={() => materialInputRef.current?.click()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Выбрать файл
              </button>
            </div>
            {storedObjects.length === 0 ? (
              <p className="text-sm text-gray-500">Пока нет загруженных объектов</p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {storedObjects.map((obj) => (
                  <li key={obj.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{obj.originalName}</div>
                      {obj.label && <div className="text-gray-500">{obj.label}</div>}
                      <a
                        href={obj.objectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Открыть по ссылке из БД
                      </a>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm text-danger-600 border-danger-200 shrink-0"
                      onClick={() => {
                        if (window.confirm('Удалить объект из хранилища и БД?')) {
                          deleteObjectMutation.mutate(obj.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
