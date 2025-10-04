import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../utils/cn'
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  Settings,
  BarChart3,
  Plus,
  Eye,
  X
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const { user } = useAuth()

  const navigation = [
    {
      name: 'Панель управления',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'ORGANIZER', 'JUDGE', 'PARTICIPANT']
    },
    {
      name: 'Турниры',
      href: '/tournaments',
      icon: Trophy,
      roles: ['ADMIN', 'ORGANIZER', 'JUDGE', 'PARTICIPANT']
    },
    {
      name: 'Создать турнир',
      href: '/tournaments/new',
      icon: Plus,
      roles: ['ADMIN', 'ORGANIZER']
    },
  ]

  const adminNavigation = [
    {
      name: 'Пользователи',
      href: '/users',
      icon: Users,
      roles: ['ADMIN']
    },
    {
      name: 'Статистика',
      href: '/analytics',
      icon: BarChart3,
      roles: ['ADMIN']
    },
    {
      name: 'Настройки',
      href: '/settings',
      icon: Settings,
      roles: ['ADMIN']
    },
  ]

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const canAccess = (roles: string[]) => {
    return roles.includes(user?.role || '')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 lg:hidden">
            <span className="text-lg font-semibold text-gray-900">Меню</span>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              {navigation
                .filter(item => canAccess(item.roles))
                .map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          onClose()
                        }
                      }}
                      className={cn(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        isActive(item.href)
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          isActive(item.href)
                            ? 'text-primary-500'
                            : 'text-gray-400 group-hover:text-gray-500'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
            </div>

            {/* Admin section */}
            {user?.role === 'ADMIN' && (
              <div className="pt-4 border-t border-gray-200">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Администрирование
                </p>
                <div className="mt-1 space-y-1">
                  {adminNavigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onClose()
                          }
                        }}
                        className={cn(
                          'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                          isActive(item.href)
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        )}
                      >
                        <Icon
                          className={cn(
                            'mr-3 h-5 w-5 flex-shrink-0',
                            isActive(item.href)
                              ? 'text-primary-500'
                              : 'text-gray-400 group-hover:text-gray-500'
                          )}
                        />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>Tournament Manager</p>
              <p>v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
