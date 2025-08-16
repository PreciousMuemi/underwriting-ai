import { api } from './client'

export interface StartResponse {
  conversation_id: string
  next_question: any
  state: any
}

export const conversationApi = {
  start: (prefill?: Record<string, any>) => api.post<StartResponse>('/api/conversation/start', { prefill }).then(r => r.data),
  respond: (conversation_id: string, answer: any) => api.post('/api/conversation/respond', { conversation_id, answer }).then(r => r.data),
  status: (conversation_id: string) => api.get(`/api/conversation/status/${conversation_id}`).then(r => r.data),
}
