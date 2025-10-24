// src/stores/auth.js
import { defineStore } from 'pinia'
import api from '@/api/http'

const CLIENT_TYPE = 'ADMIN_APP'
const STORAGE_KEY = 'hopon_admin_auth'

function loadPersisted() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}
function savePersisted(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}
function generateDeviceId() {
  const key = 'hopon_admin_device'
  let id = localStorage.getItem(key)
  if (!id) {
    id = 'web-' + crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

// 강제 로그아웃 사유별 메시지
function reasonToMessage(reason) {
  switch (reason) {
    case 'SESSION_REPLACED_OR_EXPIRED':
      return '다른 곳에서 로그인되어 이 세션이 종료되었습니다.'
    case 'FORBIDDEN':
      return '접근 권한이 없습니다. 다시 로그인하세요.'
    case 'UNAUTHORIZED':
    default:
      return '인증이 만료되었습니다. 다시 로그인하세요.'
  }
}

// 라우터를 동적 import로 불러와 순환참조 방지
async function goLogin({ withRedirect = false } = {}) {
  const { default: router } = await import('@/router')
  const current = router.currentRoute.value
  const target = withRedirect && current?.name !== 'login'
    ? { name: 'login', query: { redirect: current.fullPath } }
    : { name: 'login' }
  await router.replace(target)
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null,
    refreshToken: null,
    role: null,
    user: null,            // { userid, username, role, email, hasProfileImage, ... }
    loading: false,
    deviceId: generateDeviceId(),
    forcedLogoutReason: null, // 강제 로그아웃 사유(로그인 화면에서 안내)
    ...loadPersisted(),
  }),

  getters: {
    isAuthenticated: (s) => !!s.accessToken,
    userid: (s) => s?.user?.userid || null,
    email: (s) => s?.user?.email || null,
    hasProfileImage: (s) => !!s?.user?.hasProfileImage,
    displayName: (s) => s?.user?.username || s?.user?.userid || '관리자',
    initials: (s) => {
      const name = (s?.user?.username || s?.user?.userid || 'A').trim()
      const parts = name.split(/\s+/)
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
      return name.substring(0, 2).toUpperCase()
    },
    forcedLogoutMessage: (s) => s.forcedLogoutReason ? reasonToMessage(s.forcedLogoutReason) : '',
  },

  actions: {
    /**
     * 로그인
     * @param {{userid: string, password: string, force?: boolean}} payload
     *   force=true 이면 (백엔드가 409를 주는 구성에서) 재시도용 헤더 'X-Force-Login'을 보냄
     */
    async login({ userid, password, force = false }) {
      this.loading = true
      try {
        const { data } = await api.post(
          '/auth/login',
          { userid, password, clientType: CLIENT_TYPE, deviceId: this.deviceId },
          force ? { headers: { 'X-Force-Login': '1' } } : undefined
        )
        this.accessToken = data.accessToken
        this.refreshToken = data.refreshToken
        this.role = data.role
        this.forcedLogoutReason = null

        await this.fetchMe()
        savePersisted({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          role: this.role,
          user: this.user,
          deviceId: this.deviceId,
          forcedLogoutReason: this.forcedLogoutReason,
        })
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      const { data } = await api.post('/auth/refresh', null, {
        params: { refreshToken: this.refreshToken, clientType: CLIENT_TYPE, deviceId: this.deviceId },
      })
      this.accessToken = data.accessToken
      this.refreshToken = data.refreshToken
      this.role = data.role
      savePersisted({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        role: this.role,
        user: this.user,
        deviceId: this.deviceId,
        forcedLogoutReason: this.forcedLogoutReason,
      })
    },

    async fetchMe() {
      const { data } = await api.get('/users/me')
      this.user = data
      savePersisted({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        role: this.role,
        user: this.user,
        deviceId: this.deviceId,
        forcedLogoutReason: this.forcedLogoutReason,
      })
    },

    // ✅ 사용자가 직접 로그아웃: 상태 초기화 후 즉시 로그인 화면으로 이동
    async logout() {
      try {
        if (this.refreshToken) {
          await api.post('/auth/logout', {
            refreshToken: this.refreshToken, clientType: CLIENT_TYPE, deviceId: this.deviceId,
          })
        }
      } catch (_) { /* 서버 세션 없어도 무시 */ }

      this.accessToken = null
      this.refreshToken = null
      this.role = null
      this.user = null
      this.forcedLogoutReason = null
      savePersisted({ deviceId: this.deviceId, forcedLogoutReason: null })

      // 바로 로그인 페이지로 (히스토리 교체)
      await goLogin({ withRedirect: false })
    },

    /** ✅ 백엔드가 이전 세션을 무효화했을 때 호출 (401/403 시) */
    async handleForcedLogout(reason = 'UNAUTHORIZED') {
      this.accessToken = null
      this.refreshToken = null
      this.role = null
      this.user = null
      this.forcedLogoutReason = reason
      savePersisted({
        deviceId: this.deviceId,
        forcedLogoutReason: this.forcedLogoutReason,
      })

      // 즉시 로그인 페이지로 (필요하면 원래 경로를 redirect로 넘기려면 true)
      await goLogin({ withRedirect: false })
    },
  },
})
