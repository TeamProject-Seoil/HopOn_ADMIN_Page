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

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null,
    refreshToken: null,
    role: null,
    user: null,            // { userid, username, role, email, hasProfileImage, ... }
    loading: false,
    deviceId: generateDeviceId(),
    ...loadPersisted(),
  }),

  getters: {
    isAuthenticated: (s) => !!s.accessToken,
    // ✅ 헤더/프로필 이미지 로딩에서 바로 씀
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
  },

  actions: {
    async login({ userid, password }) {
      this.loading = true
      try {
        const { data } = await api.post('/auth/login', {
          userid, password, clientType: CLIENT_TYPE, deviceId: this.deviceId,
        })
        this.accessToken = data.accessToken
        this.refreshToken = data.refreshToken
        this.role = data.role

        await this.fetchMe()
        savePersisted({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          role: this.role,
          user: this.user,
          deviceId: this.deviceId
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
        deviceId: this.deviceId
      })
    },

    async fetchMe() {
      const { data } = await api.get('/users/me')
      // 서버가 hasProfileImage/ email 같은 필드를 주면 그대로 보존
      this.user = data
      savePersisted({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        role: this.role,
        user: this.user,
        deviceId: this.deviceId
      })
    },

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
      savePersisted({ deviceId: this.deviceId })
    },
  },
})
