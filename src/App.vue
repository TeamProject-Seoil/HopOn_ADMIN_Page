<template>
  <!-- 로그인 등 auth 전용 화면은 레이아웃 숨김 -->
  <div v-if="isAuthLayout" class="auth-wrap">
    <router-view />
  </div>

  <!-- 기본 레이아웃 -->
  <div v-else class="layout">
    <AppHeader />
    <div class="container">
      <AppSidebar />
      <main class="main">
        <router-view />
      </main>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppFooter from '@/components/AppFooter.vue'

const route = useRoute()
const isAuthLayout = computed(() => route.meta.layout === 'auth')
</script>
