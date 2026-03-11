import axios, { AxiosError } from 'axios'
import { notifyTokensRefreshed } from './authRefreshCallback'

// Используем переменную окружения или относительный путь для Docker
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Создание экземпляра axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Интерцептор для добавления access-токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Один активный refresh, чтобы при нескольких 401 подряд не дергать refresh несколько раз
let refreshPromise: Promise<string | null> | null = null

// Интерцептор: при 401 пробуем обновить access по refresh, затем повторяем запрос
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      const isUnauth = error.response?.status === 401
      if (isUnauth) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    // Не обновляем токен при 401 от самого эндпоинта refresh
    if (originalRequest.url?.includes('/auth/refresh')) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (!refreshPromise) {
      refreshPromise = api
        .post<{ data: { accessToken: string; refreshToken: string } }>('/auth/refresh', { refreshToken })
        .then((res) => {
          const accessToken = res.data.data.accessToken
          const newRefreshToken = res.data.data.refreshToken
          localStorage.setItem('token', accessToken)
          localStorage.setItem('refreshToken', newRefreshToken)
          notifyTokensRefreshed(accessToken, newRefreshToken)
          return accessToken
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
          return null
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    const newAccess = await refreshPromise
    if (!newAccess) return Promise.reject(error)

    originalRequest._retry = true
    originalRequest.headers.Authorization = `Bearer ${newAccess}`
    return api(originalRequest)
  }
)

// API для аутентификации
export const authAPI = {
  login: (login: string, password: string) =>
    api.post('/auth/login', { login, password }),

  register: (data: {
    email: string
    username: string
    password: string
    firstName?: string
    lastName?: string
  }) =>
    api.post('/auth/register', data),

  getMe: () =>
    api.get('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken?: string | null) =>
    api.post('/auth/logout', { refreshToken }),

  updateProfile: (data: {
    firstName?: string
    lastName?: string
    username?: string
  }) =>
    api.put('/auth/profile', data),
}

// API для турниров
export const tournamentAPI = {
  getTournaments: (params?: {
    status?: string
    type?: string
    page?: number
    limit?: number
  }) =>
    api.get('/tournaments', { params }),
  
  getTournament: (id: string) =>
    api.get(`/tournaments/${id}`),
  
  createTournament: (data: {
    name: string
    description?: string
    type: string
    maxTeams?: number
    registrationStart?: string
    registrationEnd?: string
    startDate?: string
    endDate?: string
    location?: string
    prizePool?: number
    rules?: string
  }) =>
    api.post('/tournaments', data),
  
  updateTournament: (id: string, data: any) =>
    api.put(`/tournaments/${id}`, data),
  
  updateTournamentStatus: (id: string, status: string) =>
    api.patch(`/tournaments/${id}/status`, { status }),
  
  addJudge: (id: string, data: { userId: string; permissions: string[] }) =>
    api.post(`/tournaments/${id}/judges`, data),
  
  deleteTournament: (id: string) =>
    api.delete(`/tournaments/${id}`),
}

// API для команд
export const teamAPI = {
  getTournamentTeams: (tournamentId: string) =>
    api.get(`/teams/tournament/${tournamentId}`),
  
  createTeam: (data: {
    name: string
    description?: string
    tournamentId: string
  }) =>
    api.post('/teams', data),
  
  updateTeam: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/teams/${id}`, data),
  
  addTeamMember: (teamId: string, userId: string) =>
    api.post(`/teams/${teamId}/members`, { userId }),
  
  removeTeamMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
  
  deleteTeam: (id: string) =>
    api.delete(`/teams/${id}`),
}

// API для матчей
export const matchAPI = {
  getTournamentMatches: (tournamentId: string) =>
    api.get(`/matches/tournament/${tournamentId}`),
  
  getMatch: (id: string) =>
    api.get(`/matches/${id}`),
  
  submitMatchResult: (id: string, data: {
    team1Score: number
    team2Score: number
    details?: string
  }) =>
    api.post(`/matches/${id}/result`, data),
  
  confirmMatchResult: (id: string) =>
    api.patch(`/matches/${id}/result/confirm`),
  
  updateMatchStatus: (id: string, data: {
    status: string
    scheduledAt?: string
  }) =>
    api.patch(`/matches/${id}/status`, data),
  
  getMatchStats: (tournamentId: string) =>
    api.get(`/matches/tournament/${tournamentId}/stats`),
}

// API для турнирной сетки
export const bracketAPI = {
  generateBracket: (data: { tournamentId: string; type: string }) =>
    api.post('/brackets/generate', data),
  
  generateDraw: (tournamentId: string) =>
    api.post('/brackets/draw', { tournamentId }),
  
  getTournamentBrackets: (tournamentId: string) =>
    api.get(`/brackets/tournament/${tournamentId}`),
  
  updateBracket: (data: { tournamentId: string; completedMatchId: string }) =>
    api.post('/brackets/update', data),
}

// API для пользователей
export const userAPI = {
  getUsers: (params?: {
    page?: number
    limit?: number
    search?: string
  }) =>
    api.get('/users', { params }),
  
  getUser: (id: string) =>
    api.get(`/users/${id}`),
  
  updateUserRole: (id: string, role: string) =>
    api.patch(`/users/${id}/role`, { role }),
  
  updateUserStatus: (id: string, isActive: boolean) =>
    api.patch(`/users/${id}/status`, { isActive }),
  
  getUserTournaments: (id: string) =>
    api.get(`/users/${id}/tournaments`),
  
  getUserParticipations: (id: string) =>
    api.get(`/users/${id}/participations`),
}

// API для отладки (только для админов)
export const debugAPI = {
  createTestTournament: (data: {
    name: string
    type: string
    teamCount?: number
    playersPerTeam?: number
    status?: string
  }) =>
    api.post('/debug/create-test-tournament', data),
  
  createQuickTestTournament: (preset: string) =>
    api.post('/debug/quick-test-tournament', { preset }),
  
  getTestDataStats: () =>
    api.get('/debug/test-data-stats'),
  
  cleanupTestData: () =>
    api.delete('/debug/cleanup-test-data'),
  
  updateTestTournamentStatus: (id: string, status: string) =>
    api.patch(`/debug/test-tournament/${id}/status`, { status }),
  
  getTestTournaments: () =>
    api.get('/debug/test-tournaments'),
}

export default api
