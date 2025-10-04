import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

// Создание экземпляра axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Интерцептор для добавления токена к запросам
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

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
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

export default api
