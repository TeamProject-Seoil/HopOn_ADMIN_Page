<!-- src/components/AppHeader.vue -->
<template>
  <header class="header">
    <!-- ▼ 브랜드 전체를 클릭하면 대시보드로 -->
    <router-link class="brand" :to="{ name: 'dashboard' }" title="대시보드로 이동">
      <span><img class="logo" :src="logoSrc" alt="" /></span>
      <span>HopOn 관리자 센터</span>
    </router-link>

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
import logoFile from '@/assets/HopOn-logo.svg'

const router = useRouter()
const auth = useAuthStore()
const logoSrc = logoFile

const avatarUrl = ref('')

const revokeAvatar = () => {
  if (avatarUrl.value) {
    try { URL.revokeObjectURL(avatarUrl.value) } catch {}
    avatarUrl.value = ''
  }
}

const loadAvatar = async () => {
  if (!auth.isAuthenticated || !auth.userid) { revokeAvatar(); return }
  revokeAvatar()
  await nextTick()
  try {
    const res = await api.get(`/admin/users/${encodeURIComponent(auth.userid)}/profile-image`, {
      responseType: 'blob'
    })
    avatarUrl.value = URL.createObjectURL(res.data)
  } catch { revokeAvatar() }
}

onMounted(loadAvatar)
watch(() => [auth.isAuthenticated, auth.userid], loadAvatar)
onBeforeUnmount(revokeAvatar)

const onAvatarError = () => { revokeAvatar() }

const onLogout = async () => {
  revokeAvatar()
  await auth.logout()
  router.push({ name: 'login' })
}
const goSettings = () => router.push({ name: 'settings' })
</script>

<style>
/* ───────── 작은 스케일업을 변수로 관리 ───────── */
:root, :host {
  --hdr-font: 16px;     /* 15.5 → 16 */
  --brand-font: 19px;   /* 18 → 19 */
  --logo-size: 42px;    /* 36 → 42 */
  --avatar-size: 44px;  /* 40 → 44 */
  --btn-min-h: 42px;    /* 40 → 42 */
}

.logo{
  width: var(--logo-size);
  height: var(--logo-size);
  display: block;
}

.header{
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 20px;
  border-bottom:1px solid var(--border);
  background:#0b1220; color:#e5e7eb;
  min-height: calc(var(--btn-min-h) + 38px);
  font-size: var(--hdr-font);
}

/* router-link로 바꾸었으므로 a 스타일 리셋 */
.brand{
  display:flex; align-items:center; gap:10px;
  font-weight:700;
  font-size: var(--brand-font);
  color: inherit;
  text-decoration: none;
}
.brand:focus-visible{ outline:2px solid #3b82f6; outline-offset:4px; border-radius:8px; }

.right{ display:flex; align-items:center; gap:12px; }

.avatar{
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius:999px; overflow:hidden;
  display:grid; place-items:center;
  background:#1a2540; color:#cbd5e1; font-weight:700;
  flex-shrink:0;
}
.avatar-img{ width:100%; height:100%; object-fit:cover; display:block; }

.name{ white-space:nowrap; font-size: calc(var(--hdr-font) - 0.25px); }

.header .btn,
.header .btn-ghost{
  padding:10px 14px;
  border-radius:12px;
  font-size:14.25px;
  min-height: var(--btn-min-h);
  line-height: 1.1;
}

.header .btn-ghost[title="설정"]{
  width: var(--btn-min-h);
  height: var(--btn-min-h);
  display:grid; place-items:center;
  padding:0;
  font-size:19px;
}
</style>
