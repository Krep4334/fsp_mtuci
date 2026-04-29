import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { userAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { Search, Users, Shield, UserCheck, UserX } from 'lucide-react'
import { cn } from '../utils/cn'

interface ListedUser {
  id: string
  email: string
  username: string
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  role: string
  isActive: boolean
  createdAt: string
  _count?: { organizedTournaments: number; participations: number }
}

const roleLabel: Record<string, string> = {
  ADMIN: 'Админ',
  ORGANIZER: 'Организатор',
  JUDGE: 'Судья',
  PARTICIPANT: 'Участник',
  SPECTATOR: 'Зритель',
}

const UsersPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery(
    ['admin-users', page, search, roleFilter, activeFilter],
    () =>
      userAPI.getUsers({
        page,
        limit: 12,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter,
      }),
    { enabled: user?.role === 'ADMIN', refetchOnWindowFocus: false }
  )

  const statusMutation = useMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) => userAPI.updateUserStatus(id, isActive),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users'])
        toast.success('Статус обновлён')
      },
      onError: (e: any) => {
        toast.error(e.response?.data?.error?.message || 'Ошибка')
      },
    }
  )

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  const users: ListedUser[] = data?.data?.data?.users ?? []
  const pagination = data?.data?.data?.pagination

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-primary-600" />
            Пользователи
          </h1>
          <p className="text-gray-600 mt-1">
            Фильтрация и управление учётными записями (лаб. №3)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Поиск по email, username, имени..."
              className="input pl-10 w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Роль</label>
            <select
              className="input w-full"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Все роли</option>
              {(['ADMIN', 'ORGANIZER', 'JUDGE', 'PARTICIPANT', 'SPECTATOR'] as const).map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
            <select
              className="input w-full"
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as 'all' | 'true' | 'false')
                setPage(1)
              }}
            >
              <option value="all">Все</option>
              <option value="true">Активные</option>
              <option value="false">Заблокированные</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Пользователь
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Роль
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Турниры / участия
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 overflow-hidden flex-shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-primary-700 text-sm font-medium">
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{u.username}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Shield className="h-4 w-4 text-gray-400" />
                        {roleLabel[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'badge',
                          u.isActive ? 'badge-success' : 'badge-danger'
                        )}
                      >
                        {u.isActive ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {u._count?.organizedTournaments ?? 0} / {u._count?.participations ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== user?.id && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={statusMutation.isLoading}
                          onClick={() =>
                            statusMutation.mutate({ id: u.id, isActive: !u.isActive })
                          }
                        >
                          {u.isActive ? (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Блокировать
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Разблокировать
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">Никого не найдено по фильтрам</div>
          )}
          {pagination && pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Стр. {pagination.page} из {pagination.pages} (всего {pagination.total})
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Назад
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UsersPage
