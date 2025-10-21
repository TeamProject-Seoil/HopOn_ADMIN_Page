<!-- src/components/AppFooter.vue -->
<template>
  <footer class="footer fixed-footer" role="contentinfo" aria-label="사이트 푸터">
    <div class="footer-inner">
      <!-- 브랜드(링크 아님) -->
      <span class="brand" aria-label="브랜드">
        <img class="logo" :src="logoSrc" alt="" />
        <span class="brand-name">{{ brandName }}</span>
      </span>

      <!-- 오른쪽: 공지사항 / 문의 / 상태+버전 -->
      <nav class="links" aria-label="푸터 링크">
        <router-link class="link" to="/notices" title="공지사항">공지사항</router-link>
        <router-link class="link" to="/support" title="문의">문의</router-link>

        <span class="dot" aria-hidden="true">•</span>

        <!-- 상태 배지 (운영/스테이징/개발) -->
        <span class="status" :title="statusTitle" role="status" :aria-label="statusTitle">
          <span class="status-dot" :class="statusClass" aria-hidden="true"></span>
          <span class="status-label">{{ statusLabel }}</span>
        </span>

        <span class="ver" :title="`환경: ${mode}`">{{ version }}</span>
      </nav>
    </div>
  </footer>
</template>

<script setup>
import logoFile from '@/assets/hopon-logo.svg'

const brandName = import.meta.env.VITE_BRAND_NAME || 'HopOn'
const mode      = import.meta.env.MODE
const appEnv    = (import.meta.env.VITE_APP_ENV || mode || '').toLowerCase()
// 버전 기본값 1.0.0
const version   = import.meta.env.VITE_APP_VERSION || 'v1.0.0'
const logoSrc   = logoFile

// 상태 매핑
let statusLabel = '개발'
let statusClass = 'is-dev'
if (appEnv.includes('prod')) {
  statusLabel = '운영'
  statusClass = 'is-prod'
} else if (appEnv.includes('stag')) {
  statusLabel = '스테이징'
  statusClass = 'is-stg'
}
const statusTitle = `현재 환경: ${statusLabel}`
</script>

<style scoped>
.fixed-footer{
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: 44px;
  background: var(--panel);
  border-top: 1px solid var(--border);
  color: var(--muted);
  z-index: 50;
  display: flex; align-items: center;
}

.footer-inner{
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 브랜드(링크 아님) */
.brand{
  display: inline-flex; align-items: center; gap: 8px;
  color: var(--text);
  cursor: default;
  user-select: none;
  text-decoration: none;
}
.logo{ width: 18px; height: 18px; display: block; }
.brand-name{ font-weight: 700; color: var(--text); }

/* 링크/버전 */
.links{ display: inline-flex; align-items: center; gap: 12px; }
.link{ color: var(--muted); text-decoration: none; }
.link:hover{ color: var(--text); text-decoration: underline; }
.dot{ opacity: .5; }
.ver{ color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }

/* 상태 배지 */
.status{
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px; border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 12px;
}
.status-dot{
  width: 8px; height: 8px; border-radius: 999px;
  box-shadow: 0 0 0 0 rgba(0,0,0,0.0);
  /* 가벼운 펄스 */
  animation: pulse 2.2s ease-in-out infinite;
}
.status-label{ line-height: 1; }

/* 색상 매핑 */
.status-dot.is-prod{ background:#22c55e; }   /* 초록: 운영 */
.status-dot.is-stg { background:#f59e0b; }   /* 주황: 스테이징 */
.status-dot.is-dev { background:#9ca3af; }   /* 회색: 개발 */

/* 펄스 애니메이션 (부담 없는 수준) */
@keyframes pulse {
  0%   { transform: scale(1);   opacity: 1; }
  50%  { transform: scale(1.25); opacity: .85; }
  100% { transform: scale(1);   opacity: 1; }
}

/* 모바일 */
@media (max-width: 480px){
  .footer-inner{ padding: 0 12px; gap: 8px; }
  .links{ gap: 8px; }
  .brand-name{ display:none; }
  .status-label{ display:none; } /* 모바일에선 점만 보이게 하고 싶다면 유지 */
}
</style>
