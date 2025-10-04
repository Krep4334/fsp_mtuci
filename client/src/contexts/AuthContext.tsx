import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  role: string
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }

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
        isLoading: false,
        isAuthenticated: true,
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
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

  // Проверка токена при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' })
          const response = await authAPI.getMe()
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: response.data.data.user, token },
          })
        } catch (error) {
          localStorage.removeItem('token')
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
      const { user, token } = response.data.data

      localStorage.setItem('token', token)
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token },
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
      const { user, token } = response.data.data

      localStorage.setItem('token', token)
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token },
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
    localStorage.removeItem('token')
    dispatch({ type: 'LOGOUT' })
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
