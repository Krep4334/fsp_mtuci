import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TournamentsPage from './pages/TournamentsPage'
import TournamentDetailPage from './pages/TournamentDetailPage'
import CreateTournamentPage from './pages/CreateTournamentPage'
import EditTournamentPage from './pages/EditTournamentPage'
import ProfilePage from './pages/ProfilePage'
import DashboardPage from './pages/DashboardPage'
import LiveScoreboardPage from './pages/LiveScoreboardPage'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tournaments" element={<TournamentsPage />} />
            <Route path="tournaments/new" element={<CreateTournamentPage />} />
            <Route path="tournaments/:id" element={<TournamentDetailPage />} />
            <Route path="tournaments/:id/edit" element={<EditTournamentPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="live/:tournamentId" element={<LiveScoreboardPage />} />
          </Route>
          
          {/* Redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
