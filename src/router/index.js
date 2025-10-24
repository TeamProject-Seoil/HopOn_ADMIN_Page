// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import LoginPage from '@/pages/LoginPage.vue'
import DashboardPage from '@/pages/DashboardPage.vue'
import UsersPage from '@/pages/UsersPage.vue'
import UserCreatePage from '@/pages/UserCreatePage.vue' // ✅ 생성 페이지 추가
import DriversPage from '@/pages/DriversPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import InquiriesPage from '@/pages/InquiriesPage.vue'
import NoticesPage from '@/pages/NoticesPage.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginPage, meta: { guestOnly: true, layout: 'auth' } },

  { path: '/',            name: 'dashboard',      component: DashboardPage,   meta: { requiresAuth: true, title: '대시보드' } },
  { path: '/users',       name: 'users',          component: UsersPage,       meta: { requiresAuth: true, title: '사용자 관리' } },
  { path: '/users/create',name: 'user-create',    component: UserCreatePage,  meta: { requiresAuth: true, title: '새 계정 생성' } }, // ✅ 추가
  { path: '/drivers',     name: 'drivers',        component: DriversPage,     meta: { requiresAuth: true, title: '드라이버 승인' } },
  { path: '/notices',     name: 'notices',        component: NoticesPage,     meta: { requiresAuth: true, title: '공지사항' } },
  { path: '/settings',    name: 'settings',       component: SettingsPage,    meta: { requiresAuth: true, title: '설정' } },
  { path: '/inquiries',   name: 'inquiries',      component: InquiriesPage,   meta: { requiresAuth: true, title: '문의 관리' } },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
