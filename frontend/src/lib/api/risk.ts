import { api } from './client'

export interface PredictionResponse {
  status: 'success' | 'error'
  risk_score?: number
  risk_level?: string
  quote?: number
  pricing_breakdown?: any
  confidence?: number
  error?: string
}

export const riskApi = {
  predict: (payload: any) => api.post<PredictionResponse>('/api/predict', payload).then(r => r.data),
  explain: (payload: any) => api.post('/api/risk/explain', payload).then(r => r.data),
}
