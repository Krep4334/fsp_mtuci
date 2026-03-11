import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authAPI } from '../services/api'
import { setAuthRefreshCallback } from '../services/authRefreshCallback'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  role: string
  avatar?: string
  createdAt?: string
}

interface AuthState {
  user: User | null
  token: string | null       // access token
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'UPDATE_TOKENS'; payload: { token: string; refreshToken: string } }

interface AuthContextType extends AuthState {
  login: (login: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
}

interface RegisterData {
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: true,
  isAuthenticated: false,
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isLoading: false,
        isAuthenticated: true,
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      }
    case 'UPDATE_TOKENS':
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
      }
    default:
      return state
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Callback для api interceptor: после успешного refresh обновляем state и localStorage
  useEffect(() => {
    setAuthRefreshCallback((accessToken, refreshToken) => {
      localStorage.setItem('token', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      dispatch({ type: 'UPDATE_TOKENS', payload: { token: accessToken, refreshToken } })
    })
    return () => setAuthRefreshCallback(null)
  }, [])

  // Проверка токена при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' })
          const response = await authAPI.getMe()
          // После возможного refresh в interceptor токены в localStorage уже обновлены
          const currentToken = localStorage.getItem('token')
          const currentRefresh = localStorage.getItem('refreshToken')
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: response.data.data.user, token: currentToken || token, refreshToken: currentRefresh || '' },
          })
        } catch (error) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          dispatch({ type: 'AUTH_FAILURE' })
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE' })
      }
    }

    checkAuth()
  }, [])

  const login = async (login: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' })
      const response = await authAPI.login(login, password)
      const data = response.data.data
      const user = data.user
      const accessToken = data.accessToken ?? data.token
      const refreshToken = data.refreshToken ?? ''

      localStorage.setItem('token', accessToken)
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token: accessToken, refreshToken },
      })

      toast.success(`Добро пожаловать, ${user.username}!`)
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE' })
      const message = error.response?.data?.error?.message || 'Ошибка входа'
      toast.error(message)
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'AUTH_START' })
      const response = await authAPI.register(data)
      const resData = response.data.data
      const user = resData.user
      const accessToken = resData.accessToken ?? resData.token
      const refreshToken = resData.refreshToken ?? ''

      localStorage.setItem('token', accessToken)
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token: accessToken, refreshToken },
      })

      toast.success(`Регистрация успешна! Добро пожаловать, ${user.username}!`)
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE' })
      const message = error.response?.data?.error?.message || 'Ошибка регистрации'
      toast.error(message)
      throw error
    }
  }

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    dispatch({ type: 'LOGOUT' })
    authAPI.logout(refreshToken).catch(() => {})
    toast.success('Вы вышли из системы')
  }

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user })
  }

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
