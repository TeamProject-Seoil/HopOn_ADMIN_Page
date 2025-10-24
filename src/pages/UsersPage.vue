<template>
  <div class="stack">
    <!-- 헤더 -->
    <div class="card">
      <h1 class="title">사용자 관리</h1>
      <p class="badge">관리자가 계정을 조회/관리하는 화면</p>
    </div>

    <!-- 탭 -->
    <div class="tabs card">
      <button
        :class="['tab-btn', activeTab==='USER' && 'active']"
        @click="switchTab('USER')"
      >
        사용자 <span class="tab-badge">({{ counts.user }})</span>
      </button>
      <button
        :class="['tab-btn', activeTab==='DRIVER' && 'active']"
        @click="switchTab('DRIVER')"
      >
        기사 <span class="tab-badge">({{ counts.driverTotal }})</span>
      </button>
      <button
        :class="['tab-btn', activeTab==='ADMIN' && 'active']"
        @click="switchTab('ADMIN')"
      >
        관리자 <span class="tab-badge">({{ counts.admin }})</span>
      </button>

      <router-link class="btn new-btn" :to="{ name: 'user-create' }">새 관리자 계정 생성</router-link>
    </div>

    <!-- 검색/필터 -->
    <div class="card toolbar">
      <label class="label">검색 (userid / username)</label>
      <div class="search-row">
        <input
          class="input"
          v-model.trim="q"
          placeholder="검색어를 입력하고 Enter 혹은 버튼 클릭"
          @keyup.enter="reloadList()"
        />
        <select
          v-if="activeTab==='DRIVER'"
          class="input select"
          v-model="driverStatus"
          @change="reloadList()"
          title="기사 상태"
        >
          <option value="ALL">전체 상태</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        <button class="btn-ghost icon" :disabled="loading" @click="reloadList()">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                  fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 리스트 -->
    <div class="card list-card">
      <div v-if="loading" class="empty">불러오는 중…</div>

      <template v-else>
        <div v-if="rows.length===0" class="empty right">결과가 없습니다.</div>

        <div v-else class="stack">
          <div v-for="u in rows" :key="u.userNum" class="card row-card">
            <div class="row-line">
              <div class="left">
                <div class="avatar"><span>{{ (u.username || u.userid).slice(0,2).toUpperCase() }}</span></div>
                <div class="meta">
                  <div class="title-line">
                    <strong class="ellipsis">{{ u.username || u.userid }}</strong>
                    <span class="chip role" :title="u.role">{{ u.role }}</span>
                    <span
                      v-if="activeTab==='DRIVER'"
                      :class="['chip', u.approvalStatus==='APPROVED' ? 'ok' : u.approvalStatus==='REJECTED' ? 'warn' : 'info']"
                    >
                      {{ u.approvalStatus || 'PENDING' }}
                    </span>
                  </div>
                  <div class="sub">
                    {{ u.userid }}
                    <template v-if="u.email"> · {{ u.email }}</template>
                    <template v-if="u.createdAtIso || u.createdAt">
                      · 가입 <span :title="u.createdAtIso || u.createdAt">{{ toLocal(u.createdAtIso || u.createdAt) }}</span>
                    </template>
                  </div>
                </div>
              </div>

              <div class="right">
                <span class="pill" :class="u.loggedIn ? 'green' : 'gray'">{{ u.loggedIn ? '로그인중' : '오프라인' }}</span>

                <button
                  class="btn xs danger"
                  :disabled="!u.loggedIn || actionLoading === u.userNum"
                  @click="forceLogout(u)"
                  title="세션 강제 종료"
                >로그아웃</button>

                <div v-if="activeTab==='DRIVER'" class="inline">
                  <select class="input xs" v-model="u._nextStatus">
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <button class="btn xs" :disabled="actionLoading === u.userNum || u._nextStatus === u.approvalStatus" @click="changeDriverStatus(u)">상태변경</button>
                </div>

                <select class="input xs" v-model="u._nextRole">
                  <option value="ROLE_USER">ROLE_USER</option>
                  <option value="ROLE_DRIVER">ROLE_DRIVER</option>
                  <option value="ROLE_ADMIN">ROLE_ADMIN</option>
                </select>
                <button class="btn xs" :disabled="actionLoading === u.userNum || u._nextRole === u.role" @click="changeRole(u)">권한변경</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 페이징 -->
        <div class="pager-footer" v-if="totalElements > 0">
          <div class="pager-wrap">
            <button class="pager-btn" :disabled="page===0" @click="prevPage">«</button>
            <span class="pager-meta">페이지 {{ page+1 }} / {{ Math.max(totalPages,1) }}</span>
            <button class="pager-btn" :disabled="page+1>=totalPages" @click="nextPage">»</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import api from '@/api/http'

const loading = ref(false)
const actionLoading = ref(null)

const activeTab = ref('USER')      // USER | DRIVER | ADMIN
const driverStatus = ref('ALL')    // DRIVER 전용
const q = ref('')

const page = ref(0)
const size = ref(20)

const rows = ref([])
const totalElements = ref(0)
const totalPages = ref(0)

/* ─ 정확한 탭 카운트 ─ */
const counts = reactive({
  user: 0,
  admin: 0,
  driverPending: 0,
  driverApproved: 0,
  driverRejected: 0,
  get driverTotal(){ return this.driverPending + this.driverApproved + this.driverRejected }
})

onMounted(async () => {
  await refreshCounts()
  await reloadList()
})

async function switchTab(tab){
  if (activeTab.value === tab) return
  activeTab.value = tab
  page.value = 0
  await reloadList()
}

async function nextPage(){
  if (page.value + 1 >= totalPages.value) return
  page.value++
  await reloadList()
}
async function prevPage(){
  if (page.value <= 0) return
  page.value--
  await reloadList()
}

function toLocal(iso){
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

/* 리스트 API */
async function searchUsers({ role, status=null, query='', pageNo=0, pageSize=20 }){
  const params = new URLSearchParams()
  if (role) params.append('role', role)
  if (status) params.append('status', status)
  if (query) params.append('q', query)
  params.append('page', pageNo)
  params.append('size', pageSize)
  params.append('sort', 'createdAt,desc')

  const { data } = await api.get('/admin/users', { params })
  return {
    content: data?.content || [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
  }
}

/* 카운트 전 페이지 순회 집계 */
async function refreshCounts(){
  const pageSize = 200
  let pageNo = 0
  let user = 0, admin = 0, dp = 0, da = 0, dr = 0

  while (true) {
    const params = new URLSearchParams()
    params.append('page', pageNo)
    params.append('size', pageSize)
    params.append('sort', 'createdAt,desc')
    const { data } = await api.get('/admin/users', { params })
    const list = data?.content || []
    if (list.length === 0) break

    for (const u of list) {
      if (u.role === 'ROLE_USER') user++
      else if (u.role === 'ROLE_ADMIN') admin++
      else if (u.role === 'ROLE_DRIVER') {
        if (u.approvalStatus === 'APPROVED') da++
        else if (u.approvalStatus === 'REJECTED') dr++
        else dp++
      }
    }

    pageNo += 1
    if (list.length < pageSize) {
      const { data: probe } = await api.get('/admin/users', {
        params: new URLSearchParams([['page', pageNo], ['size', pageSize], ['sort', 'createdAt,desc']])
      })
      if (!probe?.content || probe.content.length === 0) break
    }
  }

  counts.user = user
  counts.admin = admin
  counts.driverPending = dp
  counts.driverApproved = da
  counts.driverRejected = dr
}

/* 목록 */
async function reloadList(){
  loading.value = true
  try{
    let role = 'ROLE_USER'
    let status = null
    if (activeTab.value === 'ADMIN') role = 'ROLE_ADMIN'
    else if (activeTab.value === 'DRIVER'){ role = 'ROLE_DRIVER'; status = (driverStatus.value === 'ALL') ? null : driverStatus.value }

    const { content, totalElements: te, totalPages: tp } =
      await searchUsers({ role, status, query: q.value, pageNo: page.value, pageSize: size.value })

    rows.value = (content || []).map(u => ({
      ...u,
      loggedIn: !!u.loggedIn,
      _nextStatus: u.approvalStatus || 'PENDING',
      _nextRole: u.role || 'ROLE_USER',
    }))
    totalElements.value = te
    totalPages.value = tp
  } finally {
    loading.value = false
  }
}

/* 강제 로그아웃 */
async function forceLogout(u){
  if (!u || !u.userid) return
  actionLoading.value = u.userNum
  try{
    await api.post(`/admin/users/${encodeURIComponent(u.userid)}/sessions/revoke-all`)
  } finally {
    actionLoading.value = null
    await reloadList()
    await refreshCounts()
  }
}

/* 기사 상태 변경 */
async function changeDriverStatus(u){
  if (!u || !u.userid) return
  actionLoading.value = u.userNum
  try{
    await api.post(`/admin/users/${encodeURIComponent(u.userid)}/approval`, { status: u._nextStatus })
  } finally {
    actionLoading.value = null
    await reloadList()
    await refreshCounts()
  }
}

/* 권한 변경 */
async function changeRole(u){
  if (!u || !u.userid) return
  actionLoading.value = u.userNum
  try{
    await api.post(`/admin/users/${encodeURIComponent(u.userid)}/role`, { role: u._nextRole })
  } finally {
    actionLoading.value = null
    await reloadList()
    await refreshCounts()
  }
}

/* 탭/상태 변경 시 페이지 초기화 */
watch([activeTab, driverStatus], () => { page.value = 0 })
</script>

<style scoped>
/* ===== 기사관리 페이지와 동일 스케일/톤 ===== */
:root, :host {
  --primary:#2563eb; --primary-600:#1d4ed8;
  --border:#253252; --text:#e5e7eb; --muted:#94a3b8;
  --danger:#ef4444; --danger-600:#dc2626;
  --card:#0f1627; --card-2:#0b1220;

  --fs-base:15px; --fs-small:13.5px;
}

.stack{ display:flex; flex-direction:column; gap:10px; }

/* 카드/타이틀 */
.card{ background:var(--card); border:1px solid #1b2744; border-radius:12px; padding:12px; }
.title{ margin:0; font-size:28px; font-weight:900; letter-spacing:.2px; }
.badge{ display:inline-block; margin-top:6px; padding:4px 10px; border-radius:999px; border:1px solid var(--border); color:var(--muted); font-size:13px; }

/* 탭 */
.tabs{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.tab-btn{
  border:1px solid var(--border); background:transparent; color:var(--text);
  padding:6px 10px; border-radius:8px; cursor:pointer; font-size:16px;
}
.tab-btn.active{ background:var(--primary); border-color:var(--primary); color:#fff; }
.tab-badge{ opacity:.9; }
.new-btn{ margin-left:auto; height:40px; display:inline-grid; place-items:center; padding:0 12px; border-radius:10px; }

/* 검색 */
.toolbar{ display:block; font-size:var(--fs-base); }
.label{ display:block; color:#aab6d6; font-size:13px; margin:2px 0 8px; }
.search-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.input{
  background:#0b1324; border:1px solid var(--border); color:var(--text);
  border-radius:10px; padding:0 12px; height:44px; min-width:240px; outline:none;
}
.select{ min-width:160px; }
.input.xs{ padding:6px 8px; height:auto; font-size:12px; }

.btn-ghost{
  background:transparent; color:var(--text); border:1px solid var(--border);
  border-radius:10px; padding:10px 12px; cursor:pointer; font-weight:800;
}
.btn-ghost.icon{ width:44px; height:44px; display:grid; place-items:center; padding:0; }

/* 리스트 */
.list-card{ min-height:160px; }
.empty{ color:var(--muted); padding:24px 10px; }
.empty.right{ text-align:right; }

.row-card{ background:#0b1220; }
.row-line{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
.left{ display:flex; gap:10px; align-items:center; min-width:0; }
.right{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }

.avatar{
  width:40px; height:40px; border-radius:999px; display:grid; place-items:center;
  background:#1a2540; color:#cbd5e1; font-weight:800;
}
.meta .title-line{ display:flex; align-items:center; gap:8px; font-size:15.5px; font-weight:700; }
.meta .sub{ color:var(--muted); font-size:12.5px; margin-top:2px; }
.ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:42vw; }

/* 배지/상태 */
.chip{ border:1px solid var(--border); padding:2px 8px; border-radius:999px; font-size:12px; display:inline-block; }
.chip.role{ background:#0c1a33; color:#c9d5ff; border-color:#233153; }
.chip.ok{ background:#12331f; color:#86efac; border-color:#245c38; }
.chip.warn{ background:#3b1d1d; color:#fca5a5; border-color:#5a2a2a; }
.chip.info{ background:#12203f; color:#c9d5ff; border-color:#233153; }

/* 상태/버튼 */
.pill{ padding:4px 8px; border-radius:999px; font-size:12px; font-weight:800; }
.pill.green{ background:#064e3b; color:#bbf7d0; border:1px solid #065f46; }
.pill.gray{ background:#111827; color:#94a3b8; border:1px solid #334155; }

.btn{
  background:linear-gradient(135deg, #06b6d4, #4f46e5); color:#fff;
  border:1px solid transparent; border-radius:10px; padding:10px 12px; cursor:pointer; font-weight:800;
}
.btn.xs{ padding:6px 8px; font-size:12px; }
.btn.danger{ background:linear-gradient(135deg, var(--danger), #f59e0b); color:#fff; }

/* 페이징 */
.pager-footer{ padding:10px 12px; display:flex; justify-content:center; }
.pager-wrap{ display:flex; align-items:center; gap:8px; }
.pager-btn{
  background:transparent; border:1px solid var(--border); color:var(--text);
  padding:6px 10px; border-radius:10px; cursor:pointer; min-width:36px;
}
.pager-btn:disabled{ opacity:.5; cursor:not-allowed; }
.pager-meta{ color:var(--muted); font-size:12px; }
</style>
