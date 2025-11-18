<!-- src/components/AppFooter.vue -->
<template>
  <footer class="footer fixed-footer" role="contentinfo" aria-label="사이트 푸터">
    <div class="footer-inner">
      <!-- 브랜드(링크 아님) -->
      <span class="brand" aria-label="브랜드">
        <img class="logo" :src="logoSrc" alt="" />
        <span class="brand-name">{{ brandName }}</span>
      </span>

      <!-- 오른쪽: 공지사항 / 문의 / (환경)서버상태+버전 -->
      <nav class="links" aria-label="푸터 링크">
        <router-link class="link" to="/notices" title="공지사항">공지사항</router-link>
        <router-link class="link" to="/inquiries" title="문의">문의</router-link>

        <span class="dot" aria-hidden="true">•</span>

        <!-- 환경 배지: 운영에서는 기본 숨김, 스테이징/개발에서만 표시 -->
        <span v-if="showEnvBadge" class="status" :title="envTitle" role="status" :aria-label="envTitle">
          <span class="status-dot" :class="envDotClass" aria-hidden="true"></span>
          <span class="status-label">{{ envLabel }}</span>
        </span>

        <!-- 서버 배지 (정상/오프라인만) -->
        <span class="status" :title="srvTitle" role="status" :aria-label="srvTitle">
          <span class="status-dot" :class="srvDotClass" aria-hidden="true"></span>
          <span class="status-label">{{ srvLabel }}</span>
        </span>

        <span class="ver" :title="`환경: ${mode}`">{{ version }}</span>
      </nav>
    </div>
  </footer>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import logoFile from '@/assets/HopOn-logo.svg'

/* ── 브랜드/버전/환경 ───────────────────────────────────── */
const brandName = import.meta.env.VITE_BRAND_NAME || 'HopOn'
const mode      = import.meta.env.MODE
const appEnv    = (import.meta.env.VITE_APP_ENV || mode || '').toLowerCase()
const version   = import.meta.env.VITE_APP_VERSION || 'v1.0.0'
const logoSrc   = logoFile

/* ── 환경 배지 (build-time) ─────────────────────────────── */
let envLabel = '개발'
let envDotClass = 'is-dev'
const isProd = /(prod|production)/i.test(appEnv)
const isStg  = /(stag|staging)/i.test(appEnv)
if (isProd) { envLabel = '운영'; envDotClass = 'is-prod' }
else if (isStg) { envLabel = '스테이징'; envDotClass = 'is-stg' }
const envTitle = `배포 환경: ${envLabel}`
const showEnvBadge = (import.meta.env.VITE_SHOW_ENV_BADGE ?? (isProd ? 'false' : 'true')) === 'true'

/* ── 서버 헬스 배지 (runtime) ───────────────────────────── */
const srvLabel = ref('확인중…')
const srvDotClass = ref('is-dev') // 회색 시작
const srvTitle = ref('백엔드 상태: 확인중…')

const HEALTH_URL_ENV      = import.meta.env.VITE_HEALTH_URL || ''          // 예: http://localhost:8081/actuator/health
const HEALTH_TIMEOUT_MS   = Number(import.meta.env.VITE_HEALTH_TIMEOUT_MS ?? 4000)
const HEALTH_INTERVAL_MS  = Number(import.meta.env.VITE_HEALTH_INTERVAL_MS ?? 15000)

/* 절대 URL 권장. 필요하면 동일 오리진 fallback도 사용 */
const CANDIDATE_URLS = [
  HEALTH_URL_ENV,
  `${location.origin}/actuator/health`,
  `${location.origin}/health`,
].filter(Boolean)

let timer = null

async function checkHealthOnce(url) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const u = new URL(url, location.href)
    u.searchParams.set('_t', String(Date.now())) // cache buster

    const res = await fetch(u.toString(), {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(t)

    // 프론트로 리다이렉트되면 실패 처리
    if (res.redirected) return { ok: false, code: res.status }

    // 200이면 타입 상관 없이 JSON 시도 (Actuator는 vnd.*+json 임)
    if (res.status === 200) {
      let data = null
      try { data = await res.clone().json() } catch (_) { /* JSON 아님 */ }

      const up = !!(data && typeof data.status === 'string' && data.status.toUpperCase() === 'UP')
      return { ok: up, code: res.status }
    }

    return { ok: false, code: res.status }
  } catch {
    clearTimeout(t)
    return null
  }
}


async function checkHealth() {
  // 기본값: 오프라인
  let statusSet = false

  for (const url of CANDIDATE_URLS) {
    const r = await checkHealthOnce(url)
    if (r === null) continue        // 네트워크 실패 → 다음 후보로
    if (r.ok) {                     // 정상
      srvLabel.value = '정상'
      srvDotClass.value = 'is-prod' // 초록
      srvTitle.value = `백엔드 상태: 정상 (HTTP ${r.code})`
      statusSet = true
      break
    } else {
      // 200이 아니거나 JSON/UP 조건 불충족 → 오프라인로 취급(장애 상태 삭제)
      srvLabel.value = '오프라인'
      srvDotClass.value = 'is-warn' // 빨강
      srvTitle.value = `백엔드 상태: 오프라인/연결 실패 (HTTP ${r.code})`
      statusSet = true
      // 다음 후보를 보지 않고 바로 확정하려면 break; 유지
      break
    }
  }

  if (!statusSet) {
    // 모든 후보가 네트워크적으로 실패 → 오프라인
    srvLabel.value = '오프라인'
    srvDotClass.value = 'is-warn'
    srvTitle.value = '백엔드 상태: 오프라인/연결 실패'
  }
}

onMounted(() => {
  checkHealth()
  timer = setInterval(checkHealth, HEALTH_INTERVAL_MS)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
footer {
  min-height: 60px;
}
.fixed-footer{
  position: fixed; left: 0; right: 0; bottom: 0; height: 44px;
  background: var(--panel); border-top: 1px solid var(--border);
  color: var(--muted); z-index: 50; display: flex; align-items: center;
}
.footer-inner{
  width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.brand{
  display: inline-flex; align-items: center; gap: 8px;
  color: var(--text); cursor: default; user-select: none; text-decoration: none;
}
.logo{ width: 18px; height: 18px; display: block; }
.brand-name{ font-weight: 700; color: var(--text); }

.links{ display: inline-flex; align-items: center; gap: 12px; }
.link{ color: var(--muted); text-decoration: none; }
.link:hover{ color: var(--text); text-decoration: underline; }
.dot{ opacity: .5; }
.ver{ color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }

.status{
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px; border-radius: 999px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--border);
  color: var(--text); font-size: 12px;
}
.status-dot{ width: 8px; height: 8px; border-radius: 999px; animation: pulse 2.2s ease-in-out infinite; }
.status-label{ line-height: 1; }

.status-dot.is-prod{ background:#22c55e; } /* 정상(초록) */
.status-dot.is-stg { background:#f59e0b; } /* 환경 배지만 사용 */
.status-dot.is-dev { background:#9ca3af; } /* 확인중(회색) */
.status-dot.is-warn{ background:#ef4444; } /* 오프라인(빨강) */

@keyframes pulse{
  0%{ transform: scale(1); opacity: 1; }
  50%{ transform: scale(1.25); opacity: .85; }
  100%{ transform: scale(1); opacity: 1; }
}

@media (max-width: 480px){
  .footer-inner{ padding: 0 12px; gap: 8px; }
  .links{ gap: 8px; }
  .brand-name{ display:none; }
  .status-label{ display:none; }
}
</style>
