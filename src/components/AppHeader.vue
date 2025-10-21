<template>
  <header class="header">
    <div class="brand">
      <span><img class="logo" :src="logoSrc" alt="" /></span>
      <span>HopOn 관리자 센터</span>
    </div>

    <div v-if="auth.isAuthenticated" class="right">
      <button class="btn-ghost" @click="goSettings" title="설정">⚙️</button>

      <!-- 아바타: 프로필 이미지 있으면 이미지, 없으면 이니셜 -->
      <div class="avatar" :title="auth.displayName">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          :key="avatarUrl"
          alt="profile"
          class="avatar-img"
          @error="onAvatarError"
        />
        <span v-else>{{ auth.initials }}</span>
      </div>

      <span class="name"><strong>{{ auth.displayName }}</strong> 님</span>
      <button class="btn" @click="onLogout">로그아웃</button>
    </div>
    <div v-else>
      <router-link class="btn" :to="{name:'login'}">로그인</router-link>
    </div>
  </header>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/http'
import logoFile from '@/assets/hopon-logo.svg'

const router = useRouter()
const auth = useAuthStore()
const logoSrc = logoFile

const avatarUrl = ref('') // Blob URL 저장

const revokeAvatar = () => {
  if (avatarUrl.value) {
    try { URL.revokeObjectURL(avatarUrl.value) } catch {}
    avatarUrl.value = ''
  }
}

const loadAvatar = async () => {
  // 인증 안 되었거나 userid 없으면 스킵
  if (!auth.isAuthenticated || !auth.userid) {
    revokeAvatar()
    return
  }
  // 일단 정리 후 시작
  revokeAvatar()
  await nextTick()
  try {
    // 백엔드 BLOB 엔드포인트 호출 (권한 헤더는 axios 인스턴스에서 자동 포함)
    const res = await api.get(`/admin/users/${encodeURIComponent(auth.userid)}/profile-image`, {
      responseType: 'blob'
    })
    avatarUrl.value = URL.createObjectURL(res.data)
  } catch {
    // 이미지가 없거나 404면 폴백: 이니셜
    revokeAvatar()
  }
}

// 최초 진입 시도
onMounted(loadAvatar)
// auth 상태가 바뀌면 다시 읽기 (로그인/유저 변경/프로필 업뎃 등)
watch(() => [auth.isAuthenticated, auth.userid], loadAvatar)
// 컴포넌트 사라질 때 Object URL 정리
onBeforeUnmount(revokeAvatar)

const onAvatarError = () => {
  // 브라우저가 이미지 렌더에 실패한 경우도 폴백
  revokeAvatar()
}

const onLogout = async () => {
  revokeAvatar()
  await auth.logout()
  router.push({ name: 'login' })
}
const goSettings = () => router.push({ name: 'settings' })
</script>

<style>
.logo{
  width: 25px; height: 25px;
  display: block;
}

.header{
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 16px; border-bottom:1px solid var(--border);
  background:#0b1220; color:#e5e7eb;
}

.brand{ display:flex; align-items:center; gap:8px; font-weight:700; }

.right{ display:flex; align-items:center; gap:10px; }

.avatar{
  width:32px; height:32px; border-radius:999px; overflow:hidden;
  display:grid; place-items:center; background:#1a2540; color:#cbd5e1; font-weight:700;
  flex-shrink:0;
}
.avatar-img{ width:100%; height:100%; object-fit:cover; display:block; }
.name{ white-space:nowrap; }
</style>
