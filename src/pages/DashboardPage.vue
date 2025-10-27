<!-- src/pages/DashboardPage.vue -->
<template>
  <div class="dashboard stack">
    <!-- 헤더 -->
    <div class="card dash-header">
      <div class="dash-header-top">
        <h1 class="dash-title">관리 대시보드</h1>
        <button class="btn-ghost sm" @click="refreshAll" :disabled="busyAny" title="데이터 새로고침">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          새로고침
        </button>
      </div>
      <p class="badge dash-sub">오늘 현황을 한눈에 확인하고 빠르게 조치하세요.</p>
    </div>

    <!-- KPI -->
    <section class="kpi-grid">
      <div class="kpi card" :class="{ loading: loadingCounts }">
        <div class="kpi-ring ring-blue"></div>
        <div class="kpi-head">
          <span class="dot dot-blue"></span><span class="label">승인 대기</span>
        </div>
        <div class="kpi-num">
          <span v-if="!loadingCounts">{{ counts.pending ?? '—' }}</span>
          <span v-else class="skeleton w-40"></span>
        </div>
        <div class="kpi-sub">검토 필요한 드라이버</div>
      </div>

      <div class="kpi card" :class="{ loading: loadingCounts }">
        <div class="kpi-ring ring-green"></div>
        <div class="kpi-head">
          <span class="dot dot-green"></span><span class="label">승인됨</span>
        </div>
        <div class="kpi-num">
          <span v-if="!loadingCounts">{{ counts.approved ?? '—' }}</span>
          <span v-else class="skeleton w-40"></span>
        </div>
        <div class="kpi-sub">운행 가능 계정</div>
      </div>

      <div class="kpi card" :class="{ loading: loadingCounts }">
        <div class="kpi-ring ring-amber"></div>
        <div class="kpi-head">
          <span class="dot dot-amber"></span><span class="label">반려됨</span>
        </div>
        <div class="kpi-num">
          <span v-if="!loadingCounts">{{ counts.rejected ?? '—' }}</span>
          <span v-else class="skeleton w-40"></span>
        </div>
        <div class="kpi-sub">보완/재접수 필요</div>
      </div>

      <div class="kpi card">
        <div class="kpi-ring ring-cyan"></div>
        <div class="kpi-head">
          <span class="dot dot-cyan"></span><span class="label">알림</span>
        </div>
        <div class="kpi-num">
          <span v-if="!loadingInquiries">{{ openInquiries ?? '—' }}</span>
          <span v-else class="skeleton w-40"></span>
        </div>
        <div class="kpi-sub">미답변 문의</div>
      </div>
    </section>

    <!-- 3열: 가입자 그래프 / 대기중 드라이버 / 최근 문의 -->
    <section class="grid-3">
      <!-- 가입자 수 그래프 -->
      <div class="card panel chart-panel" :class="{ loading: loadingSignups }">
        <div class="kpi-head">
          <span class="dot dot-indigo"></span>
          <span class="label">가입자 수 (최근 14일)</span>
          <span class="trend" v-if="!loadingSignups && signups.length">
            <span :class="trendDelta >= 0 ? 'up' : 'down'">
              {{ trendDelta >= 0 ? '▲' : '▼' }} {{ Math.abs(trendDelta) }}
            </span>
            <span class="muted small"> (전일 대비)</span>
          </span>
        </div>

        <div class="chart-wrap" v-if="!loadingSignups && signups.length">
          <svg :viewBox="`0 0 ${chartW} ${chartH}`" preserveAspectRatio="none" class="spark">
            <defs>
              <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-opacity="0.35"/>
                <stop offset="100%" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path :d="areaPath" class="area"/>
            <path :d="linePath" class="line"/>
            <circle v-if="lastPoint" :cx="lastPoint.x" :cy="lastPoint.y" r="2.8" class="dot-end"/>
          </svg>
          <!-- 양끝 날짜 라벨 -->
          <div class="chart-axis">
            <span>{{ startDateLabel }}</span>
            <span>{{ endDateLabel }}</span>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><b>합계</b> {{ signupsTotal }}</span>
            <span class="legend-item"><b>오늘</b> {{ todayCount }}</span>
          </div>
        </div>

        <div v-else-if="loadingSignups" class="skeleton w-240" style="height:80px;"></div>
        <div v-else class="empty small">최근 14일 데이터가 없습니다.</div>
      </div>

      <!-- 승인 대기 드라이버 -->
      <div class="card panel">
        <div class="section-head">
          <h3>승인 대기 드라이버</h3>
          <router-link class="btn-ghost sm" :to="toNameOrPath('drivers','/drivers')">전체 보기</router-link>
        </div>

        <div class="scroll-body">
          <div v-if="loadingPending" class="list skeleton-list">
            <div class="row"><span class="skeleton avatar-skel"></span><div class="meta"><span class="skeleton w-140"></span><span class="skeleton w-180"></span></div></div>
            <div class="row"><span class="skeleton avatar-skel"></span><div class="meta"><span class="skeleton w-120"></span><span class="skeleton w-160"></span></div></div>
          </div>
          <div v-else-if="pendingRows.length === 0" class="empty">대기중 계정이 없습니다.</div>

          <ul v-else class="list">
            <li v-for="u in pendingRows" :key="u.userNum" class="row hover-raise">
              <div class="avatar ring">
                <img
                  v-if="u.avatarUrl"
                  :src="u.avatarUrl"
                  :key="u.avatarUrl"
                  alt="avatar"
                  width="36" height="36"
                  loading="lazy" decoding="async"
                  @error="u.avatarUrl=''"
                />
                <span v-else>{{ (u.username || u.userid).slice(0,2).toUpperCase() }}</span>
              </div>
              <div class="meta">
                <div class="line1">
                  <strong class="name ellipsis" :title="u.username || u.userid">{{ u.username || u.userid }}</strong>
                  <span class="chip info">대기중</span>
                </div>
                <div class="line2">
                  <span class="muted">{{ u.userid }}</span>
                  <span class="sep" v-if="u.createdAtIso && u.userid">·</span>
                  <span class="muted" v-if="u.createdAtIso" :title="u.createdAtIso">신청 {{ toLocal(u.createdAtIso) }}</span>
                </div>
              </div>
              <div class="actions">
                <router-link class="btn pill sm" :to="toNameOrPath('drivers','/drivers')">검토</router-link>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- 최근 문의 -->
      <div class="card panel">
        <div class="section-head">
          <h3>최근 문의(미답변 우선)</h3>
          <router-link class="btn-ghost sm" :to="toNameOrPath('inquiries','/inquiries')">전체 보기</router-link>
        </div>

        <div class="scroll-body">
          <div v-if="loadingInquiries" class="list skeleton-list">
            <div class="row thin"><span class="skeleton icon-skel"></span><div class="meta"><span class="skeleton w-180"></span><span class="skeleton w-200"></span></div></div>
          </div>
          <div v-else-if="inquiries.length === 0" class="empty">새 문의가 없습니다.</div>

          <ul v-else class="list">
            <li v-for="q in inquiries" :key="q.id" class="row thin hover-raise">
              <div class="mail-icon" :class="q.status === 'OPEN' ? 'open' : 'ok'">
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 5h16v14H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 5l8 6 8-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              </div>
              <div class="meta">
                <div class="line1">
                  <strong class="ellipsis" :title="q.title">{{ q.title }}</strong>
                  <span class="chip" :class="q.status==='OPEN' ? 'warn' : 'ok'">{{ q.status==='OPEN' ? '대기' : '답변' }}</span>
                </div>
                <div class="line2">
                  <span class="muted">{{ q.name }} &lt;{{ q.email }}&gt;</span>
                  <span class="sep" v-if="q.createdAtIso">·</span>
                  <span class="muted" v-if="q.createdAtIso" :title="q.createdAtIso">{{ toLocal(q.createdAtIso) }}</span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 2열: 전체 예약 / 최근 공지 -->
    <section class="grid-2">
      <div class="card panel">
        <div class="section-head">
          <h3>전체 예약 (최근)</h3>
        </div>

        <div class="scroll-body">
          <div v-if="loadingResv" class="list skeleton-list">
            <div class="row thin"><span class="skeleton icon-skel"></span><div class="meta"><span class="skeleton w-200"></span><span class="skeleton w-240"></span></div></div>
          </div>
          <div v-else-if="reservations.length === 0" class="empty">등록된 예약이 없습니다.</div>

          <ul v-else class="list">
            <li v-for="r in reservations" :key="r.id" class="row thin hover-raise">
              <div class="mail-icon" :class="statusClass(r.status)">
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5h8M5 12h14M7 19h10" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              </div>
              <div class="meta">
                <div class="line1">
                  <strong class="ellipsis" :title="routeTitle(r)">{{ routeTitle(r) }}</strong>
                  <span class="chip" :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span>
                </div>
                <div class="line2">
                  <span class="muted">{{ stopPair(r) }}</span>
                  <span class="sep" v-if="(r.requestedAtIso || r.requestedAt) && stopPair(r)">·</span>
                  <span class="muted" v-if="r.requestedAtIso || r.requestedAt" :title="r.requestedAtIso || r.requestedAt">
                    {{ toLocal(r.requestedAtIso || r.requestedAt) }}
                  </span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="card panel">
        <div class="section-head">
          <h3>최근 공지</h3>
          <router-link class="btn-ghost sm" :to="toNameOrPath('notices','/notices')">공지 관리</router-link>
        </div>

        <div class="scroll-body">
          <div v-if="loadingNotices" class="bullet skeleton-list">
            <div class="skeleton w-240"></div><div class="skeleton w-200"></div>
          </div>
          <div v-else-if="notices.length === 0" class="empty">등록된 공지가 없습니다.</div>

          <ul v-else class="bullet">
            <li v-for="n in notices" :key="n.id" class="hover-underline">
              <span class="title ellipsis" :title="n.title">{{ n.title }}</span>
              <span class="muted small" v-if="n.createdAtIso" :title="n.createdAtIso">· {{ toLocal(n.createdAtIso) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/http'

/* ===== Router helper ===== */
const router = useRouter()
function toNameOrPath(name, fallbackPath = '/') {
  try {
    return (router && typeof router.hasRoute === 'function' && router.hasRoute(name))
      ? { name }
      : fallbackPath
  } catch { return fallbackPath }
}

/* ===== KPI 기본 ===== */
const counts = ref({ approved: null, rejected: null, pending: null })
const openInquiries = ref(null)
const loadingCounts = ref(true)

/* ===== 가입자 수(최근 14일) — /admin/users 목록(createdAtIso) 기반 집계 ===== */
const signups = ref([])               // [{date:'YYYY-MM-DD', count:number}]
const loadingSignups = ref(true)
/* viewBox 고정, 실제 렌더 크기는 CSS 100%로 카드 높이에 맞춤 */
const chartW = 300, chartH = 120
const padding = { l: 6, r: 6, t: 6, b: 10 }

const values = computed(() => (signups.value || []).map(d => Math.max(0, Number(d?.count ?? d?.value ?? d) || 0)))
const minY = computed(() => (values.value.length ? Math.min(...values.value) : 0))
const maxY = computed(() => {
  if (!values.value.length) return 1
  const m = Math.max(...values.value)
  return m === minY.value ? m + 1 : m
})
function yScale(v){
  const innerH = chartH - padding.t - padding.b
  const rng = (maxY.value - minY.value) || 1
  return padding.t + innerH * (1 - (v - minY.value) / rng)
}
function xScale(i){
  const n = Math.max(signups.value.length - 1, 1)
  const innerW = chartW - padding.l - padding.r
  return padding.l + innerW * (i / n)
}
const points = computed(() => values.value.map((v,i)=>({ x: xScale(i), y: yScale(v) })))
const linePath = computed(() => points.value.length ? points.value.map((p,i)=> (i? 'L':'M') + p.x + ' ' + p.y).join(' ') : '')
const areaPath = computed(() => {
  if (!points.value.length) return ''
  const first = points.value[0], last = points.value.at(-1)
  const yBottom = chartH - padding.b
  return `M${first.x} ${yBottom} L` + points.value.map(p=>`${p.x} ${p.y}`).join(' L') + ` L${last.x} ${yBottom} Z`
})
const lastPoint = computed(() => points.value.at(-1))
const signupsTotal = computed(() => values.value.reduce((a,b)=>a+b, 0))
const todayCount = computed(() => values.value.at(-1) ?? 0)
const trendDelta = computed(() => values.value.length >= 2 ? (values.value.at(-1) - values.value.at(-2)) : 0)

/* 그래프 라벨(양끝 날짜) */
const startDateLabel = computed(() => signups.value?.[0]?.date ?? '')
const endDateLabel   = computed(() => signups.value?.[signups.value.length-1]?.date ?? '')

/* ===== Pending / Inquiries / Notices ===== */
const pendingRows = ref([])      // 각 row에 { avatarUrl } 부여
const loadingPending = ref(true)
const inquiries = ref([])
const loadingInquiries = ref(true)
const notices = ref([])
const loadingNotices = ref(true)

/* ===== Reservations (전체) ===== */
const reservations = ref([])
const loadingResv = ref(true)

/* ===== Busy ===== */
const busyAny = computed(() =>
  loadingCounts.value || loadingPending.value || loadingInquiries.value || loadingNotices.value ||
  loadingResv.value || loadingSignups.value
)

/* ===== Utils ===== */
function toLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleString()
}
function routeTitle(r){ return r?.routeName || r?.route_name || r?.routeId || r?.route_id || '노선' }
function stopPair(r){
  const from = r?.boardStopName || r?.board_stop_name || r?.boardStopId || r?.board_stop_id
  const to   = r?.destStopName  || r?.dest_stop_name  || r?.dest_stop_id
  return (from && to) ? `${from} → ${to}` : (from || to || '경로 미지정')
}
function statusLabel(s){
  switch ((s||'').toUpperCase()){
    case 'CONFIRMED': return '확정'
    case 'CANCELLED': return '취소'
    case 'BOARDED':   return '탑승'
    case 'NOSHOW':    return '노쇼'
    default:          return s || ''
  }
}
function statusClass(s){
  const up = (s||'').toUpperCase()
  if (up === 'CONFIRMED') return 'info'
  if (up === 'BOARDED')   return 'ok'
  if (up === 'CANCELLED' || up === 'NOSHOW') return 'warn'
  return ''
}

/* ===== ObjectURL 정리 ===== */
function revokeAvatars(list = pendingRows.value){
  list.forEach(u => {
    if (u.avatarUrl && u.avatarUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(u.avatarUrl) } catch {}
    }
    u.avatarUrl = ''
  })
}
onBeforeUnmount(() => revokeAvatars())

/* ===== Loads ===== */
async function refreshAll(){
  revokeAvatars()
  loadingCounts.value = loadingPending.value = loadingInquiries.value = loadingNotices.value =
  loadingResv.value   = loadingSignups.value = true
  await Promise.allSettled([
    loadCounts(), loadPending(), loadInquiries(), loadNotices(), loadReservations(), loadSignups()
  ])
}
async function loadCounts(){
  try { const { data } = await api.get('/admin/drivers/counts'); counts.value = data ?? {} }
  finally { loadingCounts.value = false }
}
async function loadPending(){
  try {
    const { data } = await api.get('/admin/drivers/pending', { params: { page: 0, size: 50, sort: 'createdAt,desc' }})
    const base = (data?.content ?? []).map(u => ({ ...u, avatarUrl: '' }))
    pendingRows.value = base
    await nextTick()
    // 인증 헤더 필요할 수 있으므로 Blob으로 받아서 ObjectURL 생성
    const tasks = base.filter(u => u.hasProfileImage).map(async (u) => {
      try {
        const res = await api.get(`/admin/drivers/${encodeURIComponent(u.userid)}/profile`, { responseType: 'blob' })
        u.avatarUrl = URL.createObjectURL(res.data)
      } catch { u.avatarUrl = '' }
    })
    await Promise.allSettled(tasks)
    pendingRows.value = [...pendingRows.value]
  } finally { loadingPending.value = false }
}
async function loadInquiries(){
  try {
    const { data } = await api.get('/admin/inquiries', { params: { status: 'OPEN', page: 0, size: 50 }})
    const openList = data?.content ?? []
    openInquiries.value = data?.totalElements ?? openList.length
    if (openList.length < 50) {
      const { data: answered } = await api.get('/admin/inquiries', { params: { status: 'ANSWERED', page: 0, size: Math.max(0, 50 - openList.length) }})
      inquiries.value = openList.concat(answered?.content ?? [])
    } else {
      inquiries.value = openList
    }
  } finally { loadingInquiries.value = false }
}
async function loadNotices(){
  try {
    const { data } = await api.get('/admin/notices', { params: { page: 0, size: 50, sort: 'createdAt,desc' }})
    notices.value = data?.content ?? []
  } finally { loadingNotices.value = false }
}
async function loadReservations(){
  try {
    const { data } = await api.get('/reservations', { params: { page: 0, size: 50, sort: 'requestedAt,desc' }})
    const rows = Array.isArray(data) ? data : (data?.content ?? [])
    reservations.value = rows
  } finally { loadingResv.value = false }
}

/* --- 가입자 집계: /admin/users 목록의 createdAtIso만 사용 --- */
async function loadSignups(){
  try { await loadSignupsFromUsers() }
  finally { loadingSignups.value = false }
}

/* users 목록에서 생성일로 최근 14일 카운트 집계 */
async function loadSignupsFromUsers(){
  const days = 14
  const end = new Date()                          // 오늘
  const start = new Date(end); start.setDate(end.getDate() - (days - 1)) // 14일 전
  const buckets = makeEmptyBuckets(start, days)   // {'YYYY-MM-DD':0,...}

  let page = 0
  const pageSize = 200
  const maxPages = 10  // 안전장치
  for (; page < maxPages; page++){
    const { data } = await api.get('/admin/users', {
      params: { page, size: pageSize, sort: 'createdAt,desc' }
    })
    const rows = Array.isArray(data) ? data : (data?.content ?? [])
    if (!rows.length) break

    for (const u of rows){
      const iso = u?.createdAtIso
      if (!iso) continue
      const d = new Date(iso)
      if (isNaN(d)) continue
      // 기간 밖이면 루프 종료
      if (d < start) { page = maxPages; break }
      if (d > end) continue
      const key = yyyyMmDd(d)
      if (key in buckets) buckets[key]++
    }

    if (data?.last === true || data?.empty === true) break
    if (rows.length < pageSize) break
  }

  signups.value = Object.keys(buckets).sort().map(k => ({ date: k, count: buckets[k] }))
}

/* 유틸: 날짜 버킷/포맷/정규화 */
function yyyyMmDd(d){
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}
function makeEmptyBuckets(startDate, days){
  const map = {}
  for (let i=0;i<days;i++){
    const d = new Date(startDate); d.setDate(startDate.getDate()+i)
    map[yyyyMmDd(d)] = 0
  }
  return map
}

onMounted(() => { refreshAll() })
</script>

<style scoped>
/* ===== 기본 팔레트/글자 ===== */
.dashboard { --muted:#94a3b8; color:#e5e7eb; }

/* ===== 공용 레이아웃/카드 ===== */
.stack{ display:flex; flex-direction:column; gap:12px; }
.card{ background:#0f1627; border:1px solid #1b2744; border-radius:12px; padding:12px; }

/* ===== 헤더 ===== */
.dash-header-top{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.dash-title{ margin:0; }
.dash-sub{ margin-top:8px; font-size:16px; }
.badge{
  border:1px solid var(--border, #253252);
  padding:2px 8px; border-radius:999px; font-size:12px; display:inline-block;
  color:var(--text, #e5e7eb); background:transparent;
}
.btn-ghost.sm{ padding:6px 10px; font-size:12px; }

/* ===== KPI ===== */
.kpi-grid{ display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; }
.kpi{
  position:relative; overflow:hidden; padding:14px;
  display:flex; flex-direction:column; gap:6px;
  background:#0f1627; border:1px solid #1b2744; border-radius:12px;
}
.kpi.loading{ opacity:.6; filter:saturate(80%); }
.kpi-head{ display:flex; align-items:center; gap:8px; color:#c9d5ff; font-weight:800; }
.kpi-num{ font-size:28px; font-weight:900; letter-spacing:.2px; }
.kpi-sub{ color:var(--muted); font-size:12px; }

.dot{ inline-size:10px; block-size:10px; border-radius:999px; display:inline-block; }
.dot-blue{ background:#3b82f6; } .dot-green{ background:#10b981; }
.dot-amber{ background:#f59e0b; } .dot-cyan{ background:#06b6d4; } .dot-indigo{ background:#6366f1; }

/* KPI 장식 링 */
.kpi-ring{ position:absolute; inset:-30% -30% auto auto; width:160px; height:160px; border-radius:50%;
           filter:blur(14px); opacity:.15; pointer-events:none; }
.ring-blue{ background:conic-gradient(from 220deg,#60a5fa,#22d3ee,#a78bfa,#60a5fa); }
.ring-green{ background:conic-gradient(from 220deg,#34d399,#22c55e,#06b6d4,#34d399); }
.ring-amber{ background:conic-gradient(from 220deg,#f59e0b,#fb923c,#ef4444,#f59e0b); }
.ring-cyan{ background:conic-gradient(from 220deg,#22d3ee,#3b82f6,#a78bfa,#22d3ee); }

/* ===== 그래프 패널(카드 높이에 맞추기) ===== */
.chart-panel{
  --panel-h: 240px;
  min-height: var(--panel-h);
  display:flex; flex-direction:column; gap:6px;
}
.chart-wrap{
  margin-top:6px;
  flex:1;
  min-height: 160px;
  display:flex; flex-direction:column;
}
.spark{ width:100%; height:100%; }
.spark .line{ fill:none; stroke:#7dd3fc; stroke-width:2; }
.spark .area{ fill:url(#fillGrad); }
.spark .dot-end{ fill:#ffffff; stroke:#7dd3fc; stroke-width:2; }
/* 양끝 날짜 라벨 */
.chart-axis{ display:flex; justify-content:space-between; font-size:12px; color:#94a3b8; margin-top:4px; }
.chart-legend{ display:flex; gap:12px; margin-top:6px; color:#cbd5e1; font-size:12px; }
.trend { margin-left:auto; }
.trend .up{ color:#86efac; } .trend .down{ color:#fca5a5; }

/* ===== 스크롤 바디 ===== */
.scroll-body{ max-height: 360px; overflow:auto; padding-right: 2px; }

/* ===== 그리드 ===== */
.grid-2{ display:grid; grid-template-columns: 1.2fr 1fr; gap:12px; }
.grid-3{ display:grid; grid-template-columns: 1.4fr 1fr 1fr; gap:12px; }

/* ===== 섹션 헤더 ===== */
.section-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
.section-head h3{ margin:0; font-size:18px; font-weight:900; }
.row-mini{ display:flex; gap:6px; align-items:center; }

/* ===== 리스트 ===== */
.list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
.row{
  display:flex; align-items:center; gap:12px; padding:8px; border:1px solid #1b2744; border-radius:10px;
  background:#0b1220;
}
.row.thin{ padding:8px 10px; }
.avatar{
  inline-size:36px; block-size:36px; border-radius:999px; overflow:hidden; display:grid; place-items:center;
  background:#1a2540; color:#cbd5e1; font-weight:800;
}
.avatar img{ width:100%; height:100%; object-fit:cover; display:block; }
.meta{ min-width:0; flex:1; }
.line1{ display:flex; align-items:center; gap:8px; }
.line2{ display:flex; align-items:center; gap:6px; margin-top:2px; color:var(--muted); }
.name{ font-weight:800; }
.ellipsis{ overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.sep{ opacity:.6; }

/* 아이콘/상태 */
.mail-icon{ inline-size:28px; block-size:28px; display:grid; place-items:center; border-radius:8px; background:#0e1a33; }
.mail-icon.open, .chip.warn{ background:#3b1d1d; color:#fca5a5; border-color:#5a2a2a; }
.mail-icon.ok, .chip.ok{ background:#12331f; color:#86efac; border-color:#245c38; }
.chip{ border:1px solid #253252; border-radius:999px; padding:2px 8px; font-size:12px; }
.chip.info{ background:#12203f; color:#c9d5ff; border-color:#233153; }

/* 버튼 */
.btn{ background:linear-gradient(135deg, #06b6d4, #4f46e5); color:#fff;
      border:1px solid transparent; border-radius:10px; padding:8px 10px; cursor:pointer; font-weight:800; }
.btn-ghost{ background:transparent; color:#e5e7eb; border:1px solid #253252;
            border-radius:10px; padding:8px 10px; cursor:pointer; font-weight:800; }
.btn.sm{ padding:6px 10px; font-size:12px; } .btn-ghost.sm{ padding:6px 10px; font-size:12px; }
.pill{ border-radius:999px; }
.ring{ box-shadow: inset 0 0 0 2px #243352; }

/* 공지 */
.bullet{ list-style:none; margin:0; padding:0; display:grid; gap:8px; }
.bullet li{ display:flex; align-items:center; gap:8px; padding:8px 10px; border:1px solid #1b2744; border-radius:10px; background:#0b1220; }
.bullet .title{ font-weight:700; }
.small{ font-size:12px; }

/* 스켈레톤 */
.skeleton{ display:inline-block; height:14px; border-radius:6px;
           background:linear-gradient(90deg,#111a33,#162240,#111a33);
           background-size:200% 100%; animation:skel 1.2s infinite; }
.skeleton-list .row{ background:#0b1220; }
.avatar-skel{ width:36px; height:36px; border-radius:999px; }
.icon-skel{ width:28px; height:28px; border-radius:8px; }
.w-40{ width:40px; } .w-120{ width:120px; } .w-140{ width:140px; } .w-160{ width:160px; }
.w-180{ width:180px; } .w-200{ width:200px; } .w-240{ width:240px; }
@keyframes skel{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* 호버/효과 */
.hover-raise{ transition:transform .2s ease, box-shadow .2s ease; }
.hover-raise:hover{ transform:translateY(-2px); box-shadow:0 10px 24px rgba(0,0,0,.25); }

/* 빈 상태 */
.empty{ color:#94a3b8; padding:12px; text-align:center; }

/* 반응형 */
@media (max-width: 980px){
  .kpi-grid{ grid-template-columns: 1fr; }
  .grid-2, .grid-3{ grid-template-columns: 1fr; }
  .chart-panel{ --panel-h: 200px; }
  .scroll-body{ max-height: 300px; }
}
</style>
