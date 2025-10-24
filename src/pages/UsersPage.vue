<template>
  <div class="stack users-admin">
    <!-- 헤더 -->
    <div class="card">
      <h1 class="title">사용자 관리</h1>
      <p class="badge">관리자가 계정을 조회/관리하는 화면</p>
    </div>

    <!-- 탭 -->
    <div class="tabs card">
      <button :class="['tab-btn', activeTab==='USER' && 'active']" @click="switchTab('USER')">
        사용자 <span class="tab-badge">({{ counts.user }})</span>
      </button>
      <button :class="['tab-btn', activeTab==='DRIVER' && 'active']" @click="switchTab('DRIVER')">
        기사 <span class="tab-badge">({{ counts.driverTotal }})</span>
      </button>
      <button :class="['tab-btn', activeTab==='ADMIN' && 'active']" @click="switchTab('ADMIN')">
        관리자 <span class="tab-badge">({{ counts.admin }})</span>
      </button>

      <router-link class="btn new-btn" :to="{ name: 'user-create' }">새 관리자 계정 생성</router-link>
    </div>

    <!-- 검색/필터 (한 줄 고정) -->
    <div class="card toolbar">
      <label class="label">검색 (아이디 / 이름)</label>
      <div class="search-row one-line">
        <input
          class="input"
          v-model.trim="q"
          placeholder="검색어를 입력하고 Enter 혹은 버튼 클릭"
          @keyup.enter="reloadList()"
        />

        <!-- 기사 상태 필터 -->
        <select
          v-if="activeTab==='DRIVER'"
          class="input select narrow"
          v-model="driverStatus"
          @change="reloadList()"
          title="기사 상태"
        >
          <option value="ALL">전체 상태</option>
          <option value="PENDING">대기중</option>
          <option value="APPROVED">승인됨</option>
          <option value="REJECTED">반려됨</option>
        </select>

        <!-- 로그인 상태 필터 (모든 탭 공통) -->
        <select
          class="input select narrow"
          v-model="loginFilter"
          @change="onLoginFilterChange"
          title="로그인 상태"
        >
          <option value="ALL">전체</option>
          <option value="IN">로그인</option>
          <option value="OUT">로그아웃</option>
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
              <!-- 왼쪽 영역 -->
              <div class="left">
                <div class="avatar">
                  <img
                    v-if="u.avatarUrl"
                    :src="u.avatarUrl"
                    :alt="(u.username || u.userid) + ' 프로필 이미지'"
                    class="avatar-img"
                    width="36" height="36"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                    referrerpolicy="no-referrer"
                    @error="onAvatarError($event, u)"
                  />
                  <span v-else>{{ (u.username || u.userid).slice(0,2).toUpperCase() }}</span>
                </div>

                <div class="meta">
                  <div class="title-line">
                    <strong class="ellipsis">{{ u.username || u.userid }}</strong>
                    <span class="chip role" :title="u.role">{{ roleKo(u.role) }}</span>

                    <span
                      v-if="activeTab==='DRIVER'"
                      :class="['chip', u.approvalStatus==='APPROVED' ? 'ok' : u.approvalStatus==='REJECTED' ? 'warn' : 'info']"
                      :title="u.approvalStatus || 'PENDING'"
                    >
                      {{ statusKo(u.approvalStatus || 'PENDING') }}
                    </span>
                  </div>

                  <div class="sub">
                    {{ u.userid }}
                    <template v-if="u.email"> · {{ u.email }}</template>
                    <template v-if="u.createdAtIso || u.createdAt">
                      · 가입 <span :title="u.createdAtIso || u.createdAt">{{ toLocal(u.createdAtIso || u.createdAt) }}</span>
                    </template>
                    <template v-if="u.lastLoginAtIso || u.lastLoginAt">
                      · 마지막 로그인 <span :title="u.lastLoginAtIso || u.lastLoginAt">{{ toLocal(u.lastLoginAtIso || u.lastLoginAt) }}</span>
                    </template>
                  </div>
                </div>
              </div>

              <!-- 오른쪽 영역 (액션들) -->
              <div class="right">
                <!-- 1) 로그인/로그아웃 -->
                <div class="action-row">
                  <span class="pill" :class="u.loggedIn ? 'green' : 'gray'">{{ u.loggedIn ? '로그인됨' : '오프라인' }}</span>
                  <button
                    class="btn xs danger"
                    :disabled="!u.loggedIn || actionLoading === u.userNum"
                    @click="askLogout(u)"
                    title="모든 활성 세션 강제 종료"
                  >로그아웃</button>
                </div>

                <!-- 2) (DRIVER 전용) 상태변경 -->
                <div v-if="activeTab==='DRIVER'" class="action-row">
                  <select class="input xs narrow" v-model="u._nextStatus" title="기사 승인 상태">
                    <option value="PENDING">대기중</option>
                    <option value="APPROVED">승인됨</option>
                    <option value="REJECTED">반려됨</option>
                  </select>
                  <button
                    class="btn xs"
                    :disabled="actionLoading === u.userNum || u._nextStatus === (u.approvalStatus || 'PENDING')"
                    @click="askChangeStatus(u)"
                  >
                    상태변경
                  </button>
                </div>

                <!-- 3) 권한변경 -->
                <div class="action-row">
                  <select class="input xs narrow" v-model="u._nextRole" title="권한">
                    <option value="ROLE_USER">일반 사용자</option>
                    <option value="ROLE_DRIVER">기사</option>
                    <option value="ROLE_ADMIN">관리자</option>
                  </select>
                  <button
                    class="btn xs"
                    :disabled="actionLoading === u.userNum || u._nextRole === u.role"
                    @click="askChangeRole(u)"
                  >
                    권한변경
                  </button>
                </div>
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

    <!-- ✅ 공용 확인 모달 -->
    <div v-if="confirm.open" class="modal" @keydown.esc="closeConfirm" tabindex="-1">
      <div class="overlay" @click="closeConfirm"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h2 id="confirmTitle">{{ confirm.title }}</h2>
        <p class="muted" v-if="confirm.desc">{{ confirm.desc }}</p>

        <!-- 요약 -->
        <div class="summary" v-if="confirm.type !== 'logout'">
          <div class="row">
            <span>대상</span><strong>{{ confirm.user?.username || confirm.user?.userid }}</strong>
          </div>

          <template v-if="confirm.type==='status'">
            <div class="row"><span>현재 상태</span><strong>{{ statusKo(confirm.user?.approvalStatus || 'PENDING') }}</strong></div>
            <div class="row"><span>변경 후</span><strong>{{ statusKo(confirm.nextStatus) }}</strong></div>
          </template>

          <template v-else-if="confirm.type==='role'">
            <div class="row"><span>현재 권한</span><strong>{{ roleKo(confirm.user?.role) }}</strong></div>
            <div class="row"><span>변경 후</span><strong>{{ roleKo(confirm.nextRole) }}</strong></div>
          </template>
        </div>

        <div class="dialog-actions">
          <button class="btn ghost" type="button" @click="closeConfirm" :disabled="actionLoading">취소</button>
          <button class="btn" type="button" @click="onConfirm" :disabled="actionLoading">
            {{ actionLoading ? '처리 중…' : confirm.okText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import api from '@/api/http'

const loading = ref(false)
const actionLoading = ref(null)

const activeTab = ref('USER')      // USER | DRIVER | ADMIN
const driverStatus = ref('ALL')    // DRIVER 전용
const loginFilter = ref('ALL')     // ALL | IN | OUT
const q = ref('')

const page = ref(0)
const size = ref(20)

const rows = ref([])
const totalElements = ref(0)
const totalPages = ref(0)

/* 확인 모달 상태 */
const confirm = reactive({
  open: false,
  type: '',          // 'logout' | 'status' | 'role'
  title: '',
  desc: '',
  okText: '확인',
  user: null,        // 대상 사용자 객체
  nextStatus: 'PENDING',
  nextRole: 'ROLE_USER',
})

/* ─ 정확한 탭 카운트 ─ */
const counts = reactive({
  user: 0,
  admin: 0,
  driverPending: 0,
  driverApproved: 0,
  driverRejected: 0,
  get driverTotal(){ return this.driverPending + this.driverApproved + this.driverRejected }
})

/* ─ 한글 매핑 ─ */
function roleKo(role){
  switch (role) {
    case 'ROLE_ADMIN':  return '관리자'
    case 'ROLE_DRIVER': return '기사'
    case 'ROLE_USER':   return '일반 사용자'
    default:            return role || '-'
  }
}
function statusKo(status){
  switch (status) {
    case 'APPROVED': return '승인됨'
    case 'REJECTED': return '반려됨'
    case 'PENDING':
    default:         return '대기중'
  }
}
function toLocal(iso){
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

/* 목록 API */
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

/* 카운트 */
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

/* 아바타 로딩/정리 */
function revokeAllAvatars(list = rows.value){
  for (const u of list) {
    if (u?.avatarUrl) {
      try { URL.revokeObjectURL(u.avatarUrl) } catch {}
      u.avatarUrl = ''
    }
  }
}
function onAvatarError(e, u){
  if (!u) return
  try { URL.revokeObjectURL(u.avatarUrl) } catch {}
  u.avatarUrl = '' // 이니셜로 폴백
}
onBeforeUnmount(() => revokeAllAvatars())

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

    revokeAllAvatars()
    let list = (content || []).map(u => ({
      ...u,
      avatarUrl: '',
      loggedIn: !!u.loggedIn,
      _nextStatus: u.approvalStatus || 'PENDING',
      _nextRole: u.role || 'ROLE_USER',
    }))

    /* 로그인 상태 필터 (클라이언트 측) */
    if (loginFilter.value !== 'ALL') {
      const wantIn = loginFilter.value === 'IN'
      list = list.filter(x => (!!x.loggedIn) === wantIn)
      rows.value = list
      totalElements.value = list.length
      totalPages.value = 1
      page.value = 0
    } else {
      rows.value = list
      totalElements.value = te
      totalPages.value = tp
    }

    await nextTick()
    const tasks = rows.value.map(async (u) => {
      try {
        const res = await api.get(`/admin/users/${encodeURIComponent(u.userid)}/profile-image`, { responseType: 'blob' })
        u.avatarUrl = URL.createObjectURL(res.data)
      } catch {
        u.avatarUrl = ''
      }
    })
    await Promise.allSettled(tasks)
    rows.value = [...rows.value]
  } finally {
    loading.value = false
  }
}

/* 로그인 필터 변경 시 즉시 재조회 */
function onLoginFilterChange(){
  page.value = 0
  reloadList()
}

/* ───────── 액션: 모달 열기 ───────── */
function askLogout(u){
  if (!u?.loggedIn) return
  confirm.open = true
  confirm.type = 'logout'
  confirm.user = u
  confirm.title = '로그아웃 확인'
  confirm.desc = `${u.username || u.userid}의 모든 활성 세션을 종료합니다. 진행할까요?`
  confirm.okText = '로그아웃'
}
function askChangeStatus(u){
  confirm.open = true
  confirm.type = 'status'
  confirm.user = u
  confirm.nextStatus = u._nextStatus
  confirm.title = '기사 상태 변경'
  confirm.desc = '아래와 같이 상태를 변경합니다.'
  confirm.okText = '상태변경'
}
function askChangeRole(u){
  confirm.open = true
  confirm.type = 'role'
  confirm.user = u
  confirm.nextRole = u._nextRole
  confirm.title = '권한 변경'
  confirm.desc = '아래와 같이 권한을 변경합니다.'
  confirm.okText = '권한변경'
}
function closeConfirm(){
  if (actionLoading.value) return
  confirm.open = false
  confirm.type = ''
  confirm.user = null
}

/* ───────── 모달 확인 처리: 확인 즉시 닫기 ───────── */
async function onConfirm(){
  if (!confirm.user) return

  // 1) 현재 선택값 스냅샷
  const user = confirm.user
  const type = confirm.type
  const nextStatus = confirm.nextStatus
  const nextRole = confirm.nextRole

  // 2) 모달 먼저 닫기 (UI 깔끔)
  closeConfirm()

  // 3) 서버 처리
  actionLoading.value = user.userNum
  try{
    if (type === 'logout'){
      await api.post(`/admin/users/${encodeURIComponent(user.userid)}/sessions/revoke-all`)
    } else if (type === 'status'){
      await api.post(`/admin/users/${encodeURIComponent(user.userid)}/approval`, { status: nextStatus })
    } else if (type === 'role'){
      await api.post(`/admin/users/${encodeURIComponent(user.userid)}/role`, { role: nextRole })
    }
    await reloadList()
    await refreshCounts()
  } finally {
    actionLoading.value = null
  }
}

/* 탭/상태 변경 시 페이지 초기화 */
watch([activeTab, driverStatus], () => { page.value = 0 })

/* 최초 로드 */
onMounted(async () => {
  await refreshCounts()
  await reloadList()
})

/* 페이지 이동 */
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
</script>

<style scoped>
/* ===== 톤/스케일 ===== */
:root, :host {
  --primary:#2563eb; --primary-600:#1d4ed8;
  --border:#253252; --text:#e5e7eb; --muted:#94a3b8;
  --danger:#ef4444; --danger-600:#dc2626;
  --card:#0f1627; --card-2:#0b1220;

  --fs-base:15px; --fs-small:13.5px;

  /* 기사관리 화면과 동일한 크기 */
  --avatar-size:36px;
}

.stack{ display:flex; flex-direction:column; gap:10px; }

/* 카드/타이틀 */
.card{ background:var(--card); border:1px solid #1b2744; border-radius:12px; padding:12px; }
.title{ margin:0; font-size:28px; font-weight:900; letter-spacing:.2px; }
.badge{ display:inline-block; margin-top:6px; padding:4px 10px; border-radius:999px; border:1px solid var(--border); color:#94a3b8; font-size:13px; }

/* 탭 */
.tabs{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.tab-btn{
  border:1px solid var(--border); background:transparent; color:#e5e7eb;
  padding:8px 12px; border-radius:10px; cursor:pointer; font-size:15.5px; font-weight:700;
}
.tab-btn.active{ background:var(--primary); border-color:var(--primary); color:#fff; }
.tab-badge{ opacity:.9; }
.new-btn{ margin-left:auto; height:40px; display:inline-grid; place-items:center; padding:0 12px; border-radius:10px; }

/* 검색 — 한 줄 고정 */
.toolbar{ display:block; font-size:var(--fs-base); }
.label{ display:block; color:#aab6d6; font-size:13px; margin:2px 0 8px; }
.search-row{
  display:flex;
  gap:8px;
  align-items:center;
}
.search-row.one-line{ flex-wrap:nowrap; }
.input{
  background:#0b1324; border:1px solid var(--border); color:#e5e7eb;
  border-radius:10px; padding:0 12px; height:44px; min-width:220px; outline:none;
}
.input:focus{ border-color:#2b3b66; box-shadow:0 0 0 3px rgba(59,130,246,.2); }
.select{ min-width:160px; }
.narrow{ min-width: 140px; }    /* 콤팩트 셀렉트 */
.input.xs{ padding:6px 8px; height:auto; font-size:12px; }

/* 버튼 */
.btn{
  background:linear-gradient(135deg, #06b6d4, #4f46e5); color:#fff;
  border:1px solid transparent; border-radius:10px; padding:10px 12px; cursor:pointer; font-weight:800;
}
.btn.xs{ padding:6px 8px; font-size:12px; }
.btn.danger{ background:linear-gradient(135deg, var(--danger), #f59e0b); color:#fff; }
.btn-ghost{
  background:transparent; color:#e5e7eb; border:1px solid var(--border);
  border-radius:10px; padding:10px 12px; cursor:pointer; font-weight:800;
}
.btn-ghost.icon{ width:44px; height:44px; display:grid; place-items:center; padding:0; }

/* 리스트 */
.list-card{ min-height:160px; }
.empty{ color:var(--muted); padding:24px 10px; }
.empty.right{ text-align:right; }

.row-card{ background:#0b1220; }
.row-line{ display:flex; align-items:center; justify-content:space-between; gap:16px; }
.left{ display:flex; gap:12px; align-items:center; min-width:0; }

/* 오른쪽 액션을 ‘줄 단위’로 고정 */
.right{
  display:flex;
  flex-direction:column;
  gap:8px;
  align-items:flex-end;
  min-width: 260px;
}
.action-row{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:nowrap;
}
.input.narrow{ width: auto; }

/* 아바타 고정 */
.users-admin .row-card .avatar{
  --size: var(--avatar-size, 36px);
  inline-size: var(--size) !important;
  block-size: var(--size) !important;
  flex: 0 0 var(--size) !important;
  aspect-ratio: 1 / 1 !important;
  border-radius: 999px !important;
  overflow: hidden !important;
  display: grid !important;
  place-items: center !important;
  background:#1a2540 !important;
  color:#cbd5e1 !important;
  font-weight:700 !important;
}
.users-admin .row-card .avatar > img.avatar-img{
  inline-size: 100% !important;
  block-size: 100% !important;
  max-inline-size: none !important;
  max-block-size: none !important;
  object-fit: cover !important;
  border-radius: inherit !important;
  display:block !important;
}

/* 텍스트 */
.meta .title-line{ display:flex; align-items:center; gap:8px; font-size:15.5px; font-weight:700; }
.meta .sub{ color:#94a3b8; font-size:12.5px; margin-top:2px; }
.ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:42vw; }

/* 배지/상태 칩 */
.chip{ border:1px solid var(--border); padding:2px 8px; border-radius:999px; font-size:12px; display:inline-block; }
.chip.role{ background:#0c1a33; color:#c9d5ff; border-color:#233153; }
.chip.ok{ background:#12331f; color:#86efac; border-color:#245c38; }
.chip.warn{ background:#3b1d1d; color:#fca5a5; border-color:#5a2a2a; }
.chip.info{ background:#12203f; color:#c9d5ff; border-color:#233153; }

/* 상태/로그인 */
.pill{ padding:4px 8px; border-radius:999px; font-size:12px; font-weight:800; }
.pill.green{ background:#064e3b; color:#bbf7d0; border:1px solid #065f46; }
.pill.gray{ background:#111827; color:#94a3b8; border:1px solid #334155; }

/* 페이징 */
.pager-footer{ padding:10px 12px; display:flex; justify-content:center; }
.pager-wrap{ display:flex; align-items:center; gap:8px; }
.pager-btn{
  background:transparent; border:1px solid var(--border); color:#e5e7eb;
  padding:6px 10px; border-radius:10px; cursor:pointer; min-width:36px;
}
.pager-btn:disabled{ opacity:.5; cursor:not-allowed; }
.pager-meta{ color:#94a3b8; font-size:12px; }

/* 모달 */
.modal{ position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; }
.overlay{ position: absolute; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); }
.dialog{
  position: relative; z-index: 1;
  width: min(560px, 92vw);
  background: #0f1627;
  border: 1px solid #1b2744;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}
.dialog h2{ margin:4px 0 6px; font-size:20px; font-weight:900; text-align:center; }
.dialog .muted{ color: var(--muted); font-size: 14px; margin: 0 0 12px; text-align:center; }
.summary{ display: grid; gap: 8px; margin: 10px 0 16px; }
.summary .row{ display: flex; justify-content: space-between; gap: 12px; border: 1px dashed #243152; border-radius: 10px; padding: 10px 12px; }
.summary .row span{ color: #9fb1d6; }
.summary .row strong{ color: var(--text); }
.dialog-actions{ display: flex; justify-content: center; gap: 8px; margin-top: 8px; }
.btn.ghost{ background:transparent; color:#e5e7eb; border:1px solid var(--border); }

/* 반응형 */
@media (max-width: 640px){
  .search-row.one-line{ flex-wrap:wrap; }
  .ellipsis{ max-width:56vw; }
  .right{ gap:6px; }
  .action-row{ gap:6px; }
  .narrow{ min-width: 130px; }
}
</style>
