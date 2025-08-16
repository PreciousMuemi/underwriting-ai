import { api } from './client'

export const quotesApi = {
  generate: (payload: any) => api.post('/api/quote/generate', payload).then(r => r.data),
  listMine: (page = 1, perPage = 10) => api.get('/api/user/quotes', { params: { page, per_page: perPage } }).then(r => r.data),
  getOne: (id: number) => api.get(`/api/user/quotes/${id}`).then(r => r.data),
  delete: (id: number) => api.delete(`/api/user/quotes/${id}`).then(r => r.data),
}
