import { useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { matchAPI } from '../services/api'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'
import { Save, CheckCircle } from 'lucide-react'

interface MatchResultInputProps {
  matchId: string
  team1Name: string
  team2Name: string
  currentResult?: {
    team1Score: number
    team2Score: number
  }
}

const MatchResultInput: React.FC<MatchResultInputProps> = ({ 
  matchId, 
  team1Name, 
  team2Name, 
  currentResult 
}) => {
  const [team1Score, setTeam1Score] = useState(currentResult?.team1Score || 0)
  const [team2Score, setTeam2Score] = useState(currentResult?.team2Score || 0)
  const queryClient = useQueryClient()

  const submitResultMutation = useMutation(
    (data: { team1Score: number; team2Score: number }) => 
      matchAPI.submitMatchResult(matchId, data),
    {
      onSuccess: () => {
        toast.success('Результат матча сохранен!')
        queryClient.invalidateQueries('tournaments')
        queryClient.invalidateQueries('debug-tournaments')
      },
      onError: (error: any) => {
        const message = error.response?.data?.error?.message || 'Ошибка сохранения результата'
        toast.error(message)
      }
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (team1Score < 0 || team2Score < 0) {
      toast.error('Счет не может быть отрицательным')
      return
    }

    if (team1Score === team2Score) {
      if (!window.confirm('Результат матча ничья. Продолжить?')) {
        return
      }
    }

    submitResultMutation.mutate({ team1Score, team2Score })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Ввести результат</h4>
        <div className="text-xs text-gray-500">Раунд</div>
      </div>

      {/* Team 1 Score */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {team1Name}
          </label>
          <input
            type="number"
            min="0"
            value={team1Score}
            onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
            className="input w-full"
            required
          />
        </div>

        <div className="text-2xl font-bold text-gray-400 pt-6">-</div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {team2Name}
          </label>
          <input
            type="number"
            min="0"
            value={team2Score}
            onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
            className="input w-full"
            required
          />
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitResultMutation.isLoading}
        className="btn btn-primary w-full"
      >
        {submitResultMutation.isLoading ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Сохранение...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Сохранить результат
          </>
        )}
      </button>

      {currentResult && (
        <div className="flex items-center space-x-2 text-sm text-success-600">
          <CheckCircle className="h-4 w-4" />
          <span>Текущий результат сохранен</span>
        </div>
      )}
    </form>
  )
}

export default MatchResultInput
