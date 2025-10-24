// src/api/http.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8081',
  timeout: 15000,
})

// 요청 인터셉터: 토큰과 AUD 헤더 부착
api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  // 백엔드 JwtAuthenticationFilter에서 반드시 확인하므로 항상 넣어줌
  config.headers['X-Client-Type'] = 'ADMIN_APP'
  return config
})

// 응답 인터셉터: 401 → 한 번만 리프레시 시도, 실패 시 강제 로그아웃 사유 저장
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const auth = useAuthStore()
    const original = error.config
    if (!original) throw error

    const status = error?.response?.status
    const isAuthApi = original.url?.includes('/auth/')
    const reasonHeader = error?.response?.headers?.['x-reason'] || ''

    // 이미 재시도했다면 그대로 실패 처리
    if (original._retry) {
      if (status === 401 || status === 403) {
        await auth.handleForcedLogout('SESSION_REPLACED_OR_EXPIRED')
      }
      throw error
    }

    // 401: access 만료 또는 세션 버전 불일치
    if (status === 401 && !isAuthApi) {
      if (auth.refreshToken) {
        try {
          original._retry = true
          await auth.refresh()
          original.headers = {
            ...(original.headers || {}),
            Authorization: `Bearer ${auth.accessToken}`,
            'X-Client-Type': 'ADMIN_APP',
          }
          return api(original)
        } catch (e) {
          await auth.handleForcedLogout('SESSION_REPLACED_OR_EXPIRED')
          throw error
        }
      } else {
        await auth.handleForcedLogout('UNAUTHORIZED')
      }
    }

    // 403: 권한 문제 → 강제 로그아웃(역할 변경/토큰 불일치 가능)
    if (status === 403 && !isAuthApi) {
      await auth.handleForcedLogout('FORBIDDEN')
    }

    // 디버깅용
    if (reasonHeader) {
      // eslint-disable-next-line no-console
      console.warn('Server X-Reason:', reasonHeader)
    }

    throw error
  }
)

export default api
