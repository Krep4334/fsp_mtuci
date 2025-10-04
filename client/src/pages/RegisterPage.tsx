import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { Trophy, Eye, EyeOff } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface RegisterForm {
  email: string
  username: string
  password: string
  confirmPassword: string
  firstName?: string
  lastName?: string
}

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>()

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      })
      navigate('/dashboard')
    } catch (error) {
      // Error handling is done in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <Trophy className="h-10 w-10 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">Tournament Manager</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Создать аккаунт
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Или{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            войдите в существующий
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Имя
                </label>
                <div className="mt-1">
                  <input
                    {...register('firstName', {
                      minLength: {
                        value: 1,
                        message: 'Минимум 1 символ'
                      },
                      maxLength: {
                        value: 50,
                        message: 'Максимум 50 символов'
                      }
                    })}
                    type="text"
                    autoComplete="given-name"
                    className={`input ${errors.firstName ? 'input-error' : ''}`}
                    placeholder="Имя"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-danger-600">{errors.firstName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Фамилия
                </label>
                <div className="mt-1">
                  <input
                    {...register('lastName', {
                      minLength: {
                        value: 1,
                        message: 'Минимум 1 символ'
                      },
                      maxLength: {
                        value: 50,
                        message: 'Максимум 50 символов'
                      }
                    })}
                    type="text"
                    autoComplete="family-name"
                    className={`input ${errors.lastName ? 'input-error' : ''}`}
                    placeholder="Фамилия"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-danger-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  {...register('email', {
                    required: 'Email обязателен',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Некорректный email'
                    }
                  })}
                  type="email"
                  autoComplete="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="Введите email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Имя пользователя
              </label>
              <div className="mt-1">
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
                  autoComplete="username"
                  className={`input ${errors.username ? 'input-error' : ''}`}
                  placeholder="Введите имя пользователя"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-danger-600">{errors.username.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password', {
                    required: 'Пароль обязателен',
                    minLength: {
                      value: 6,
                      message: 'Минимум 6 символов'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Подтвердите пароль
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Подтверждение пароля обязательно',
                    validate: (value) =>
                      value === password || 'Пароли не совпадают'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Подтвердите пароль"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full flex justify-center items-center"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Создание аккаунта...
                  </>
                ) : (
                  'Создать аккаунт'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Или</span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs text-gray-500 text-center">
                Регистрируясь, вы соглашаетесь с нашими{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  условиями использования
                </a>{' '}
                и{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  политикой конфиденциальности
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
