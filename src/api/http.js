import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8081',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
    config.headers['X-Client-Type'] = 'ADMIN_APP' // 백엔드 aud 검증 대비
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const auth = useAuthStore()
    const original = error.config
    if (!original || original._retry) throw error

    // 401이면 한 번만 토큰 재발급 시도
    if (error.response && error.response.status === 401 && auth.refreshToken) {
      try {
        original._retry = true
        await auth.refresh()
        original.headers.Authorization = `Bearer ${auth.accessToken}`
        original.headers['X-Client-Type'] = 'ADMIN_APP'
        return api(original)
      } catch (e) {
        await auth.logout()
      }
    }
    throw error
  }
)

export default api
