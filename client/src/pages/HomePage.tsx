import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Trophy, 
  Users, 
  Clock, 
  Award, 
  ChevronRight,
  Play,
  Calendar,
  Target
} from 'lucide-react'

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth()

  const features = [
    {
      icon: Trophy,
      title: 'Управление турнирами',
      description: 'Создавайте и управляйте турнирами любой сложности с различными форматами'
    },
    {
      icon: Users,
      title: 'Командная работа',
      description: 'Организуйте команды, назначайте роли и контролируйте участие'
    },
    {
      icon: Clock,
      title: 'Live обновления',
      description: 'Получайте обновления в реальном времени через WebSocket'
    },
    {
      icon: Award,
      title: 'Статистика',
      description: 'Отслеживайте результаты и анализируйте статистику турниров'
    }
  ]

  const tournamentTypes = [
    {
      icon: Target,
      title: 'Single Elimination',
      description: 'Классический формат на выбывание'
    },
    {
      icon: Play,
      title: 'Double Elimination',
      description: 'Формат с возможностью возврата через сетку проигравших'
    },
    {
      icon: Calendar,
      title: 'Round Robin',
      description: 'Круговая система, где каждая команда играет с каждой'
    },
    {
      icon: Trophy,
      title: 'Swiss System',
      description: 'Система с автоматическим подбором соперников'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Tournament Manager
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Профессиональная система управления турнирами с онлайн табло, 
              жеребьевкой и live обновлениями
            </p>
            
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-primary-600 bg-white hover:bg-gray-50 transition-colors"
              >
                Перейти в панель управления
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            ) : (
              <div className="space-x-4">
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-primary-600 bg-white hover:bg-gray-50 transition-colors"
                >
                  Начать бесплатно
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-medium rounded-lg text-white hover:bg-white hover:text-primary-600 transition-colors"
                >
                  Войти
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Возможности платформы
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Все необходимые инструменты для организации и проведения турниров
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-lg mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tournament Types Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Поддерживаемые форматы
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Выберите подходящий формат для вашего турнира
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tournamentTypes.map((type, index) => {
              const Icon = type.icon
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {type.title}
                  </h3>
                  <p className="text-gray-600">
                    {type.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Готовы начать?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Создайте свой первый турнир уже сегодня
          </p>
          
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-primary-600 bg-white hover:bg-gray-50 transition-colors"
            >
              Зарегистрироваться бесплатно
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Trophy className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-bold">Tournament Manager</span>
            </div>
            <p className="text-gray-400">
              © 2024 Tournament Manager. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
