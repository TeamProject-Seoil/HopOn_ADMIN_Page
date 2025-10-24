<!-- src/pages/LoginPage.vue -->
<template>
  <div class="page">
    <div class="panel">
      <div class="brand">
        <div class="logo">A</div>
        <div class="title">
          <h1>HopOn 관리자 센터</h1>
          <p>관리자 전용 로그인</p>
        </div>
      </div>

      <form @submit.prevent="onSubmit" class="form">
        <div class="field">
          <label for="userid">아이디</label>
          <input id="userid" class="input" v-model.trim="userid" placeholder="admin" autocomplete="username" />
        </div>
        <div class="field">
          <label for="password">비밀번호</label>
          <input id="password" class="input" v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" />
        </div>

        <button class="btn" :disabled="auth.loading">
          <span v-if="!auth.loading">로그인</span>
          <span v-else>로그인 중…</span>
        </button>

        <!-- 강제 로그아웃 안내 -->
        <p v-if="forcedMessage" class="note warn">{{ forcedMessage }}</p>

        <p v-if="error" class="note error">{{ error }}</p>
      </form>

      <p class="foot">© {{ year }} HopOn Admin</p>
    </div>

    <!-- 다른 기기 로그인 안내 모달 -->
    <div v-if="showReplaceModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-icon">!</div>
          <div class="modal-title">다른 기기에서 로그인 중</div>
        </div>
        <div class="modal-body">
          동일 계정이 다른 기기에서 이미 로그인되어 있습니다.<br />
          <b>계속 진행하면 현재 기기에서 로그인</b>되며,
          <span class="muted">다른 기기에서는 자동으로 로그아웃됩니다.</span>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" @click="closeModal">취소</button>
          <button class="btn danger" @click="confirmReplace">확인하고 로그인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const userid = ref('')
const password = ref('')
const error = ref('')

const showReplaceModal = ref(false)
const pendingLogin = ref({ userid: '', password: '' })

const forcedMessage = computed(() => auth.forcedLogoutMessage)
const year = new Date().getFullYear()

const onSubmit = async () => {
  error.value = ''
  try {
    await auth.login({ userid: userid.value, password: password.value })
    const to = route.query.redirect || '/'
    router.replace(to)
  } catch (e) {
    const status = e?.response?.status
    const reason = e?.response?.headers?.['x-reason'] || ''
    if (status === 409 && reason === 'ALREADY_LOGGED_IN_OTHER_DEVICE') {
      pendingLogin.value = { userid: userid.value, password: password.value }
      showReplaceModal.value = true
      return
    }
    error.value = '로그인 실패. 아이디/비밀번호를 확인하세요.'
  }
}

const closeModal = () => {
  showReplaceModal.value = false
  pendingLogin.value = { userid: '', password: '' }
}

const confirmReplace = async () => {
  try {
    await auth.login({ ...pendingLogin.value, force: true })
    closeModal()
    const to = route.query.redirect || '/'
    router.replace(to)
  } catch (_) {
    error.value = '로그인 실패. 잠시 후 다시 시도하세요.'
  }
}

onMounted(() => {
  if (auth.forcedLogoutReason) {
    setTimeout(() => {
      auth.forcedLogoutReason = null
      const persisted = JSON.parse(localStorage.getItem('hopon_admin_auth') || '{}')
      persisted.forcedLogoutReason = null
      localStorage.setItem('hopon_admin_auth', JSON.stringify(persisted))
    }, 8000)
  }
})
</script>

<style scoped>
/* 레이아웃 (다크 배경) */
.page {
  position: relative;
  min-height: 100svh;              /* 모바일 주소창 변화 대응 */
  display: grid;
  place-items: center;
  padding: 24px;
  color-scheme: dark;
  color: #e5e7eb;

  /* 중앙 세로 그라데이션 완전 제거 + 좌/우 라디얼만 남김 */
  background: #0b0f1a
    radial-gradient(42% 60% at 18% 45%,
      rgba(59,130,246,.18) 0%,
      rgba(59,130,246,.10) 40%,
      rgba(59,130,246,0)  58%),
    radial-gradient(42% 60% at 82% 60%,
      rgba(16,185,129,.15) 0%,
      rgba(16,185,129,.08) 40%,
      rgba(16,185,129,0)  58%) !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
  background-position: center !important;
}

/* 상/하단 비네팅(중앙 패널 강조) */
.page::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 90% at 50% -10%, rgba(0,0,0,.35), transparent 60%),
    radial-gradient(120% 90% at 50% 110%, rgba(0,0,0,.35), transparent 60%);
}

/* 패널 */
.panel {
  width: 380px;
  max-width: 92vw;
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); /* iOS/Safari */
  border: 1px solid #1f2937;
  border-radius: 20px;
  box-shadow:
    0 24px 60px rgba(0,0,0,.55),
    0 10px 26px rgba(0,0,0,.35);
  padding: 24px 24px 12px;
}

/* 블러 미지원 브라우저 폴백 */
@supports not ((backdrop-filter: blur(10px)) or (-webkit-backdrop-filter: blur(10px))) {
  .panel { background: rgba(15, 23, 42, 0.92); }
}

/* 브랜드 헤더 */
.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}
.logo {
  width: 44px; height: 44px;
  display: grid; place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #22d3ee, #6366f1);
  color: #fff; font-weight: 800; font-size: 18px;
  box-shadow: 0 10px 24px rgba(34,211,238,.25);
}
.title h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: .2px;
  color: #f1f5f9;
}
.title p {                /* 잘못된 `title p` 제거 */
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

/* 폼 */
.form { display: grid; gap: 12px; margin-top: 4px; }
.field { display: grid; gap: 6px; }
label { font-size: 12px; color: #cbd5e1; }
.input {
  width: 100%;
  padding: 12px 12px;
  border: 1px solid #334155;
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  transition: box-shadow .15s, border-color .15s, transform .02s, background .15s;
  background: #0b1220;
  color: #e5e7eb;
  caret-color: #e5e7eb;
}
.input::placeholder { color: #64748b; }
.input:focus {
  border-color: #22d3ee;
  box-shadow: 0 0 0 4px rgba(34,211,238,0.18);
}
.input:active { transform: translateY(0.5px); }

/* 접근성: 키보드 포커스 가시성 */
.input:focus-visible,
.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(34,211,238,0.28);
  border-color: #22d3ee;
}

/* 버튼 */
.btn {
  width: 100%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 12px 14px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #06b6d4, #4f46e5);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: transform .035s ease, filter .2s ease;
  box-shadow: 0 10px 24px rgba(79,70,229,.28);
}
.btn:disabled { opacity: .7; cursor: not-allowed; }
.btn:not(:disabled):active { transform: translateY(1px); }
.btn.ghost {
  background: #0b1220;
  color: #e2e8f0;
  border: 1px solid #334155;
}
.btn.danger {
  background: linear-gradient(135deg, #ef4444, #f59e0b);
  color: #fff;
  box-shadow: 0 10px 24px rgba(239,68,68,.28);
}

/* 안내문구 */
.note { margin: 6px 2px 0; font-size: 12px; }
.warn { color: #f59e0b; }
.error { color: #fca5a5; }

/* 푸터 */
.foot {
  margin: 14px 4px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

/* 모달 (다크 톤) */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(2,6,23, .6);
  display: grid; place-items: center;
  z-index: 50;
}
.modal {
  width: 420px; max-width: 92vw;
  background: #0b1220;
  border-radius: 16px;
  border: 1px solid #334155;
  box-shadow: 0 24px 80px rgba(0,0,0,.6);
  overflow: hidden;
}
.modal-header {
  display: flex; gap: 12px; align-items: center;
  padding: 14px 16px;
  background: #111827;
  border-bottom: 1px solid #374151;
}
.modal-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: #f59e0b; color: #111827; font-weight: 900;
}
.modal-title {
  font-weight: 800; color: #fbbf24; font-size: 14px;
}
.modal-body {
  padding: 16px;
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.6;
}
.modal-body .muted { color: #94a3b8; font-size: 12px; }
.modal-actions {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 12px 16px;
  background: #0b1220;
}
</style>

