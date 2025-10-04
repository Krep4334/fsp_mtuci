import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinTournament: (tournamentId: string) => void
  leaveTournament: (tournamentId: string) => void
  joinMatch: (matchId: string) => void
  leaveMatch: (matchId: string) => void
  updateMatchStatus: (matchId: string, status: string) => void
  submitMatchResult: (matchId: string, team1Score: number, team2Score: number) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { token, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io('http://localhost:3001', {
        auth: {
          token,
        },
      })

      newSocket.on('connect', () => {
        console.log('Connected to Socket.io server')
        setIsConnected(true)
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Socket.io server')
        setIsConnected(false)
      })

      newSocket.on('error', (error) => {
        console.error('Socket error:', error)
        toast.error(error.message || 'Ошибка подключения')
      })

      // Слушатели событий турнира
      newSocket.on('tournament_updated', (data) => {
        console.log('Tournament updated:', data)
        // Здесь можно добавить логику обновления состояния турнира
      })

      newSocket.on('match_updated', (data) => {
        console.log('Match updated:', data)
        // Здесь можно добавить логику обновления состояния матча
      })

      newSocket.on('match_result_updated', (data) => {
        console.log('Match result updated:', data)
        toast.success('Результат матча обновлен')
      })

      newSocket.on('bracket_updated', (data) => {
        console.log('Bracket updated:', data)
        // Здесь можно добавить логику обновления турнирной сетки
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, token])

  const joinTournament = (tournamentId: string) => {
    if (socket && isConnected) {
      socket.emit('join_tournament', tournamentId)
    }
  }

  const leaveTournament = (tournamentId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_tournament', tournamentId)
    }
  }

  const joinMatch = (matchId: string) => {
    if (socket && isConnected) {
      socket.emit('join_match', matchId)
    }
  }

  const leaveMatch = (matchId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_match', matchId)
    }
  }

  const updateMatchStatus = (matchId: string, status: string) => {
    if (socket && isConnected) {
      socket.emit('match_status_update', { matchId, status })
    }
  }

  const submitMatchResult = (matchId: string, team1Score: number, team2Score: number) => {
    if (socket && isConnected) {
      socket.emit('match_result', { matchId, team1Score, team2Score })
    }
  }

  const value: SocketContextType = {
    socket,
    isConnected,
    joinTournament,
    leaveTournament,
    joinMatch,
    leaveMatch,
    updateMatchStatus,
    submitMatchResult,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
