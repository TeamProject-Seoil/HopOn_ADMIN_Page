<template>
  <div class="stack">
    <div class="card">
      <h1 style="margin:0">기사 관리</h1>
      <p class="badge" style="margin-top:8px;font-size: 16px;">승인 관리</p>
    </div>

    <!-- 탭 -->
    <div class="tabs card">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: tab===t.key }"
        @click="switchTab(t.key)"
      >
        {{ t.label }} <span class="tab-badge">({{ counts[t.key.toLowerCase()] ?? 0 }})</span>
      </button>
    </div>

    <!-- ✅ 검색/정렬 바 -->
    <div class="card toolbar">
      <input class="input" v-model.trim="q" placeholder="검색 (userid / username)" @keyup.enter="goPage(1)"/>
      
      
      <button class="btn-ghost search-btn" @click="goPage(1)">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- ✅ 가입일 최신순/오래된순 세그먼트 -->
      <div class="seg">
        <button class="seg-btn" :class="{active: sortDir==='desc'}" @click="setSort('desc')">최신순</button>
        <button class="seg-btn" :class="{active: sortDir==='asc'}"  @click="setSort('asc')">오래된순</button>
      </div>
    </div>

    <!-- ✅ 리스트 카드 -->
    <div class="card">
      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-else-if="rows.length===0" style="color:var(--muted)">
        {{ emptyText }}
      </div>

      <div v-else class="stack">
        <div v-for="u in rows" :key="u.userNum" class="card" style="padding:12px">
          <div class="row-line">
            <div class="row-left">
              <div class="avatar">
                <img v-if="u.avatarUrl"
                     :src="u.avatarUrl"
                     :key="u.avatarUrl"
                     alt="profile"
                     class="avatar-img"
                     @error="onAvatarError($event, u)"/>
                <span v-else>{{ (u.username || u.userid).slice(0,2).toUpperCase() }}</span>
              </div>

              <div style="min-width:0">
                <div class="title-line">
                  <span class="ellipsis">{{ u.username || u.userid }}</span>
                  <!-- 회사명 뱃지 -->
                  <span v-if="u.company" class="badge badge-company" :title="u.company">{{ u.company }}</span>
                  <span v-if="u.hasDriverLicenseFile" class="badge badge-ok">자격증 등록됨</span>
                  <span v-else class="badge badge-warn">자격증 없음</span>
                </div>
                <div class="sub">
                  {{ u.userid }} · {{ roleKo(u.role) }}
                  <template v-if="u.email"> · {{ u.email }}</template>
                  <template v-if="u.createdAt">
                    · <span :title="u.createdAt">가입 {{ fmtDate(u.createdAt) }}</span>
                  </template>
                </div>
              </div>
            </div>

            <div class="row-actions">
              <button class="btn-ghost" @click="previewLicense(u)" :disabled="licenseLoading[u.userid]">
                {{ licenseLoading[u.userid] ? '불러오는 중…' : '자격증 보기' }}
              </button>

              <!-- 탭 별 액션 -->
              <template v-if="tab==='PENDING'">
                <button class="btn"
                        :disabled="!u.hasDriverLicenseFile || actionLoading[u.userid]"
                        :title="!u.hasDriverLicenseFile ? '자격증 등록 후 승인 가능합니다.' : ''"
                        @click="openConfirm('approve', u)">
                  {{ actionLoading[u.userid] ? '처리중…' : '승인' }}
                </button>
                <button class="btn-danger"
                        :disabled="actionLoading[u.userid]"
                        @click="openConfirm('reject', u)">
                  거절
                </button>
              </template>

              <template v-else-if="tab==='APPROVED'">
                <button class="btn-warning"
                        :disabled="actionLoading[u.userid]"
                        @click="openConfirm('pending', u)">
                  대기
                </button>
                <button class="btn-danger"
                        :disabled="actionLoading[u.userid]"
                        @click="openConfirm('reject', u)">
                  거절
                </button>
              </template>

              <template v-else-if="tab==='REJECTED'">
                <button class="btn-warning"
                        :disabled="actionLoading[u.userid]"
                        @click="openConfirm('pending', u)">
                  대기
                </button>
                <button class="btn"
                        :disabled="!u.hasDriverLicenseFile || actionLoading[u.userid]"
                        :title="!u.hasDriverLicenseFile ? '자격증 등록 후 승인 가능합니다.' : ''"
                        @click="openConfirm('approve', u)">
                  {{ actionLoading[u.userid] ? '처리중…' : '승인' }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <p v-if="msg" style="margin-top:8px;color:var(--muted)">{{ msg }}</p>
    </div>

    <!-- 하단 페이지네비게이션 -->
    <div class="pager-footer" v-if="total > 0">
      <div class="pager-wrap">
        <button class="pager-btn" :disabled="groupStart===1" @click="prevGroup">«</button>

        <button
          v-for="n in pageNumbersInGroup"
          :key="n"
          class="pager-btn"
          :class="{ active: page === n }"
          @click="goPage(n)"
        >{{ n }}</button>

        <button class="pager-btn" :disabled="groupEnd===totalPages" @click="nextGroup">»</button>

        <span class="pager-meta">
          총 {{ total }}명 · {{ page }} / {{ totalPages }} 페이지
        </span>
      </div>
    </div>

    <!-- 자격증 미리보기 모달 -->
    <div v-if="preview.open" class="modal-backdrop" @click.self="closePreview">
      <div class="card modal-card license-card">
        <div class="modal-header">
          <div class="modal-title">
            <span class="icon-circle">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 1.75a10.25 10.25 0 1 0 0 20.5 10.25 10.25 0 0 0 0-20.5Zm0 5.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm1.25 9h-2.5v-6h2.5v6Z" fill="currentColor"/>
              </svg>
            </span>
            <strong>{{ preview.username }}님 자격증 정보</strong>
          </div>
          <button class="btn-ghost" @click="closePreview">닫기</button>
        </div>

        <div class="modal-body">
          <div class="license-box">
            <img :src="preview.src" alt="Driver License" class="license-img"/>
          </div>

          <div class="license-info">
            <table class="license-info-table">
              <tr><td>이름</td><td>{{ preview.info.holderName || preview.username || '-' }}</td></tr>
              <tr><td>생년월일</td><td>{{ preview.info.birthDate || '-' }}</td></tr>
              <tr><td>면허번호</td><td>{{ preview.info.licenseNumber || '-' }}</td></tr>
              <tr><td>취득일자</td><td>{{ preview.info.acquiredDate || '-' }}</td></tr>
              <tr><td>아이디</td><td>{{ preview.userid }}</td></tr>
            </table>

            <p v-if="preview.infoFallback" class="license-warning">
              면허 상세 정보 API 호출이 실패하여 기본정보만 표시합니다.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 상태 변경 확인 모달 -->
    <div v-if="confirm.open" class="modal-backdrop" @click.self="closeConfirm">
      <div class="card modal-card confirm-card" :class="confirmAccentClass">
        <div class="modal-header compact">
          <div class="modal-title">
            <span class="icon-circle" :class="confirmAccentClass">
              <svg v-if="confirm.mode==='approve'" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.285 6.709a1 1 0 0 1 .006 1.414l-9.02 9.071a1 1 0 0 1-1.432.007L3.71 10.97a1 1 0 1 1 1.414-1.414l5.11 5.111 8.311-8.35a1 1 0 0 1 1.44-.008Z" fill="currentColor"/>
              </svg>
              <svg v-else-if="confirm.mode==='reject'" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.41 12l4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59 7.71 6.29a1 1 0 1 0-1.42 1.42L10.59 12l-4.3 4.29a1 1 0 1 0 1.42 1.42L12 13.41l4.29 4.3a1 1 0 0 0 1.42-1.42L13.41 12Z" fill="currentColor"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" fill="currentColor"/>
              </svg>
            </span>
            <strong>{{ confirm.title }}</strong>
          </div>
          <button class="btn-ghost" @click="closeConfirm">닫기</button>
        </div>

        <div class="confirm-body">
          <p class="confirm-msg">{{ confirm.message }}</p>

          <template v-if="confirm.mode==='reject'">
            <label class="label">거절 사유 (선택)</label>
            <textarea v-model.trim="confirm.reason" rows="3" class="input" placeholder="거절 사유를 입력하세요"></textarea>
          </template>
        </div>

        <div class="confirm-actions">
          <button class="btn-ghost" @click="closeConfirm">취소</button>
          <button
            :class="confirmButtonClass"
            @click="confirmSubmit">
            확인
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick, onMounted } from 'vue'
import api from '@/api/http'

/* ─ tabs ─ */
const tabs = [
  { key: 'PENDING',  label: '승인대기' },
  { key: 'REJECTED', label: '승인거절' },
  { key: 'APPROVED', label: '승인됨' },
]
const tab = ref('PENDING')

const counts = reactive({ approved: 0, rejected: 0, pending:  0 })

const q = ref('')
const rows = ref([])
const msg = ref('')
const error = ref('')

const actionLoading = reactive({})
const licenseLoading = reactive({})

const preview = reactive({
  open: false,
  userid: '',
  username: '',
  src: '',
  info: { holderName:'', birthDate:'', licenseNumber:'', acquiredDate:'' },
  infoFallback: false,
})

/* 빈 목록 문구 */
const emptyText = computed(() => {
  switch (tab.value) {
    case 'APPROVED': return '승인된 계정이 없습니다.'
    case 'REJECTED': return '승인 거절된 계정이 없습니다.'
    default:         return '대기중 계정이 없습니다.'
  }
})

/* 확인 모달 */
const confirm = reactive({
  open: false,
  mode: '',   // 'approve' | 'reject' | 'pending'
  user: null,
  title: '',
  message: '',
  reason: '',
})
function openConfirm(mode, user) {
  confirm.open = true
  confirm.mode = mode
  confirm.user = user
  confirm.reason = ''
  if (mode === 'approve') {
    confirm.title = '기사 승인 확인'
    confirm.message = `${user.userid} 계정을 승인하시겠습니까?`
  } else if (mode === 'reject') {
    confirm.title = '기사 거절 확인'
    confirm.message = `${user.userid} 계정을 거절하시겠습니까? (사유 입력 가능)`
  } else {
    confirm.title = '대기 상태로 변경'
    confirm.message = `${user.userid} 계정을 승인대기로 전환할까요?`
  }
}
function closeConfirm() {
  confirm.open = false
  confirm.mode = ''
  confirm.user = null
  confirm.reason = ''
}
async function confirmSubmit() {
  const u = confirm.user
  if (!u) return
  if (confirm.mode === 'approve') await approve(u)
  else if (confirm.mode === 'reject') await reject(u, confirm.reason)
  else await setPending(u)
  closeConfirm()
}

/* 모달 ESC 닫기 */
function onKey(e){ if(e.key==='Escape'){ if(confirm.open) closeConfirm(); if(preview.open) closePreview(); } }
onMounted(()=>document.addEventListener('keydown', onKey))
onBeforeUnmount(()=>document.removeEventListener('keydown', onKey))

/* pagination */
const size = ref(10)
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

/* ✅ 가입일 정렬: 최신순 기본 */
const sortDir = ref('desc')
function setSort(dir){
  if (sortDir.value === dir) return
  sortDir.value = dir
  page.value = 1
  fetchList()
}

/* 그룹 네비(5개) */
const groupStart = computed(() => Math.floor((page.value - 1) / 5) * 5 + 1)
const groupEnd   = computed(() => Math.min(groupStart.value + 4, totalPages.value))
const pageNumbersInGroup = computed(() => {
  const arr = []
  for (let n = groupStart.value; n <= (groupEnd.value || 1); n++) arr.push(n)
  return arr
})

/* 권한 한글 매핑 */
function roleKo(role) {
  switch (role) {
    case 'ROLE_ADMIN': return '관리자'
    case 'ROLE_DRIVER': return '기사'
    case 'ROLE_MANAGER': return '매니저'
    default: return role || '-'
  }
}

/* 가입 일시 포맷터 */
function fmtDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* 아바타 에러 → 이니셜 폴백 */
function onAvatarError(e, u) { try { URL.revokeObjectURL(u.avatarUrl) } catch {} ; u.avatarUrl = '' }

/* Blob URL 정리 */
function revokeAllAvatars(list) {
  (list || rows.value).forEach(u => {
    if (u.avatarUrl) { try { URL.revokeObjectURL(u.avatarUrl) } catch {} ; u.avatarUrl = '' }
  })
}
onBeforeUnmount(() => revokeAllAvatars())

/* 탭 전환 */
function switchTab(next) { if (tab.value === next) return; tab.value = next; page.value = 1; fetchList() }

/* 리스트 + 아바타 로딩 */
async function fetchList() {
  msg.value = ''; error.value = ''; revokeAllAvatars()
  const ep = tab.value === 'PENDING' ? '/admin/drivers/pending'
           : tab.value === 'APPROVED' ? '/admin/drivers/approved'
           : '/admin/drivers/rejected'

  try {
    const { data } = await api.get(ep, {
      params: {
        search: q.value,
        size: size.value,
        page: page.value - 1,
        sort: `createdAt,${sortDir.value}`
      }
    })
    const list = (data.content || []).map(u => ({ ...u, avatarUrl: '' }))
    rows.value = list
    total.value = data.totalElements ?? 0
    totalPages.value = data.totalPages ?? 1

    if (page.value > totalPages.value && totalPages.value > 0) {
      page.value = totalPages.value
      return fetchList()
    }

    await nextTick()
    const tasks = list.filter(u => u.hasProfileImage).map(async u => {
      try {
        const res = await api.get(`/admin/drivers/${encodeURIComponent(u.userid)}/profile`, { responseType: 'blob' })
        u.avatarUrl = URL.createObjectURL(res.data)
      } catch { u.avatarUrl = '' }
    })
    await Promise.allSettled(tasks)
    rows.value = [...rows.value]
  } catch (e) {
    const status = e?.response?.status
    const reason = e?.response?.data?.reason || e?.message || '알 수 없는 오류'
    error.value = `목록을 불러오지 못했습니다. ${status ? `[${status}] ` : ''}${reason}`
    rows.value = []; total.value = 0; totalPages.value = 0
  }
  refreshCounts()
}

async function refreshCounts() {
  try {
    const { data } = await api.get('/admin/drivers/counts')
    counts.approved = data.approved ?? 0
    counts.rejected = data.rejected ?? 0
    counts.pending  = data.pending  ?? 0
  } catch { /* no-op */ }
}
function goPage(n){ if(n<1 || (totalPages.value && n>totalPages.value)) return; page.value=n; fetchList() }
function prevGroup(){ const n = groupStart.value - 1; if (n >= 1) goPage(n) }
function nextGroup(){ const n = groupEnd.value + 1; if (n <= totalPages.value) goPage(n) }

/* 상태 변경 공통 API */
async function setStatus(u, status, reasonText) {
  actionLoading[u.userid] = true
  try {
    const body = { status }; if (reasonText) body.reason = reasonText
    await api.post(`/admin/drivers/${encodeURIComponent(u.userid)}/status`, body)
    msg.value = `${u.userid} 상태가 ${status}로 변경되었습니다.`
    await fetchList()
  } catch (e) {
    const statusCode = e?.response?.status
    const reason = e?.response?.data?.message || e?.response?.data?.reason || e?.message || '오류'
    msg.value = `상태 변경 실패: ${statusCode ? `[${statusCode}] ` : ''}${reason}`
  } finally {
    actionLoading[u.userid] = false
  }
}

/* approve/reject/pending */
async function approve(u) {
  if (!u.hasDriverLicenseFile) { msg.value = `${u.userid} : 자격증이 등록되지 않아 승인할 수 없습니다.`; return }
  await setStatus(u, 'APPROVED')
}
async function reject(u, reasonText) { await setStatus(u, 'REJECTED', reasonText) }
async function setPending(u) { await setStatus(u, 'PENDING') }

/* 미리보기 */
async function previewLicense(u) {
  licenseLoading[u.userid] = true
  try {
    if (!u.hasDriverLicenseFile) { msg.value = `${u.userid} : 등록된 자격증이 없습니다.`; return }
    const imgRes = await api.get(`/admin/drivers/${encodeURIComponent(u.userid)}/license`, { responseType: 'blob' })
    const url = URL.createObjectURL(imgRes.data)

    let info = null, fallback = false
    try { const res = await api.get(`/admin/drivers/${encodeURIComponent(u.userid)}/license/info`); info = res.data || null }
    catch { fallback = true }

    preview.userid = u.userid
    preview.username = u.username || u.userid
    preview.src = url
    preview.info = info || { holderName:'', birthDate:'', licenseNumber:'', acquiredDate:'' }
    preview.infoFallback = fallback
    preview.open = true
  } catch (e) {
    const status = e?.response?.status
    msg.value = `${u.userid} : 자격증 정보를 불러올 수 없습니다. ${status ? `[${status}]` : ''}`
  } finally { licenseLoading[u.userid] = false }
}
function closePreview() {
  if (preview.src) URL.revokeObjectURL(preview.src)
  preview.open = false
  preview.userid = ''
  preview.username = ''
  preview.src = ''
  preview.info = { holderName:'', birthDate:'', licenseNumber:'', acquiredDate:'' }
  preview.infoFallback = false
}

/* 모달 색상 클래스 */
const confirmAccentClass = computed(() => {
  if (confirm.mode === 'approve') return 'accent-approve'
  if (confirm.mode === 'reject') return 'accent-reject'
  return 'accent-pending'
})
const confirmButtonClass = computed(() => {
  if (confirm.mode === 'approve') return 'btn'
  if (confirm.mode === 'reject') return 'btn-danger'
  return 'btn-warning strong'
})

/* 최초 로드 */
fetchList()
</script>

<style scoped>
/* 색상 변수 */
:root, :host {
  --primary: #2563eb;
  --primary-600:#1d4ed8;
  --border: #253252;
  --text: #e5e7eb;
  --muted: #94a3b8;

  --danger: #ef4444;
  --danger-600:#dc2626;

  --warning:#f59e0b;
  --warning-600:#d97706;

  --card: #0f1627;
  --card-2:#0b1220;
}

/* 탭 */
.tabs{ display:flex; gap:8px; }
.tab-btn{
  border:1px solid var(--border);
  background:transparent; color:var(--text);
  padding:6px 10px; border-radius:8px; cursor:pointer;
  font-size: 16px;
}
.tab-btn.active{ background:var(--primary); border-color:var(--primary); color:#fff; }
.tab-badge{ opacity:.9; }

/* 폼 공통 */
.input{
  background:#0b1324; border:1px solid var(--border); color:var(--text);
  border-radius:8px; padding:8px 10px; outline:none; height: 60px; font-size: 16px;
}
.input:focus{ border-color:#2b3b66; box-shadow:0 0 0 3px rgba(59,130,246,.2); }

.toolbar{ display:flex; gap:8px; margin-bottom:10px; align-items:center; }
.search-btn{ display:inline-flex; align-items:center; gap:6px; writing-mode:horizontal-tb; height: 60px; width:60px; }

/* ✅ 정렬 세그먼트 */
.seg{ display:inline-flex; align-items:center; gap:0; border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-left:8px; height:60px; }
.seg-btn{
  background:transparent; color:var(--text); border:none; padding:0 14px; cursor:pointer; font-weight:600; height:100%;
}
.seg-btn + .seg-btn{ border-left:1px solid var(--border); }
.seg-btn.active{ background:var(--primary); color:#fff; }

/* 오류 박스 */
.error-box{ padding:10px; border:1px solid #5a2a2a; background:#3b1d1d; color:#fca5a5; border-radius:8px; margin-bottom:10px; }

/* 리스트 행 */
.row-line{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
.row-left{ display:flex; gap:10px; align-items:center; min-width:0; }
.row-actions{
  display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;
  align-items:center; min-width:220px;
}
.title-line{ font-weight:600; display:flex; align-items:center; gap:8px; }
.sub{ color:var(--muted); font-size:12px; }
.ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* 뱃지 */
.badge{ border:1px solid var(--border); padding:2px 8px; border-radius:999px; font-size:12px; display:inline-block; }
.badge-ok{ background:#12331f; border-color:#245c38; color:#86efac; }
.badge-warn{ background:#3b1d1d; border-color:#5a2a2a; color:#fca5a5; }
.badge-company{
  background:#12203f;
  border-color:#233153;
  color:#c9d5ff;
  max-width:220px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

/* 아바타 */
.avatar{
  width:36px; height:36px; border-radius:999px; overflow:hidden;
  display:grid; place-items:center; background:#1a2540; color:#cbd5e1; font-weight:700;
}
.avatar-img{ width:100%; height:100%; object-fit:cover; display:block; }

/* 페이저 */
.pager-footer{ margin-top:14px; padding:10px 0 16px; display:flex; justify-content:center; }
.pager-wrap{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.pager-btn{
  background:transparent; border:1px solid var(--border); color:var(--text);
  padding:6px 10px; border-radius:8px; cursor:pointer; min-width:36px;
  writing-mode:horizontal-tb;
}
.pager-btn:hover{ background:#1a2540; }
.pager-btn:disabled{ opacity:.5; cursor:not-allowed; }
.pager-btn.active{ background:var(--primary); border-color:var(--primary); color:#fff; }
.pager-meta{ margin-left:8px; color:var(--muted); font-size:12px; }

/* 버튼 */
.btn, .btn-ghost, .btn-danger, .btn-warning {
  border:1px solid transparent; border-radius:10px; padding:8px 12px; cursor:pointer;
  writing-mode:horizontal-tb; font-weight:600; transition:transform .02s ease, background .2s ease, border-color .2s ease, color .2s ease, box-shadow .2s ease;
}
.btn:active, .btn-danger:active, .btn-warning:active, .btn-ghost:active{ transform:translateY(1px); }

.btn{ background:var(--primary); color:#fff; border-color:var(--primary); }
.btn:hover{ background:var(--primary-600); border-color:var(--primary-600); }

.btn-danger{ background:var(--danger); color:#fff; border-color:var(--danger); }
.btn-danger:hover{ background:var(--danger-600); border-color:var(--danger-600); }

/* ⚠️ 대기 버튼 시인성 강화 */
.btn-warning{
  background:var(--warning);
  border-color:var(--warning-600);
  color:#111;
}
.btn-warning:hover{
  background:var(--warning-600);
  border-color:var(--warning-600);
  color:#111;
}
.btn-warning.strong{
  box-shadow:0 0 0 3px rgba(245,158,11,.25);
}
.btn-ghost{
  background:transparent; color:var(--text); border:1px solid var(--border);
}
.btn-ghost:hover{ background:#1a2540; }

/* 모달 공통 */
:root, :host{ --backdrop-dim: rgba(0,0,0,.55); }
.modal-backdrop{
  position:fixed; inset:0; display:grid; place-items:center;
  background: var(--backdrop-dim);
  backdrop-filter: blur(2px);
  z-index:60;
  animation:fadeIn .12s ease;
}
@keyframes fadeIn { from{ opacity:0 } to{ opacity:1 } }

.modal-card{
  background:#000;
  color:#fff;
  border:1px solid #1b2744;
  border-radius:16px;
  box-shadow:0 20px 60px rgba(0,0,0,.55);
  transform:translateY(6px);
  animation:pop .14s ease forwards;
}
@keyframes pop { to { transform:translateY(0) } }

body:has(.modal-backdrop){ overflow:hidden; }

.modal-header{
  display:flex; justify-content:space-between; align-items:center; padding:8px 10px 10px; border-bottom:1px solid #1b2744;
}
.modal-header.compact{ padding:6px 10px 8px; }
.modal-title{ display:flex; align-items:center; gap:10px; }
.icon-circle{ width:28px; height:28px; border-radius:999px; display:grid; place-items:center; background:#12203f; color:#c9d5ff; }

/* ─ 미리보기 모달 ─ */
.license-card{ width:min(980px, 96vw); max-height:92vh; padding:14px; }
.modal-body{
  display:flex; flex-direction:row; gap:18px; align-items:flex-start; max-height:78vh; overflow:auto; padding:12px 10px 10px;
}
.license-box{ display:grid; place-items:center; padding:8px; border:1px solid #233153; border-radius:12px; background:var(--card-2);
  max-width:min(66vw,720px); max-height:min(78vh,820px); overflow:auto; }
.license-img{ width:auto; height:auto; max-width:100%; max-height:min(76vh,800px); object-fit:contain; display:block; image-rendering:auto; }
@media (max-width:600px){
  .modal-body{ flex-direction:column; }
  .license-box{ max-width:92vw; max-height:64vh; }
  .license-img{ max-width:90vw; max-height:62vh; }
}
.license-info{ flex:1; min-width:260px; }
.license-info-table{ width:100%; border-collapse:collapse; font-size:15px; line-height:1.7; margin-top:6px; }
.license-info-table td{ padding:10px 12px; vertical-align:top; border-bottom:1px solid #1b2744; }
.license-info-table td:first-child{ color:#aab6d6; width:120px; white-space:nowrap; font-weight:600; }
.license-info-table tr:last-child td{ border-bottom:none; }
.license-warning{ margin-top:10px; color:#fca5a5; font-size:12px; line-height:1.4; white-space:pre-line; }

/* ─ 확인 모달 ─ */
.confirm-card{
  width:min(520px, 92vw);
  max-height:80vh; padding:10px 10px 12px;
  border-top-width:3px;
}
.accent-approve{ border-top-color: var(--primary); }
.accent-reject{ border-top-color: var(--danger); }
.accent-pending{ border-top-color: var(--warning); }

.confirm-body{ padding:12px 6px; }
.confirm-msg{ margin:0 0 10px; color:#d1d5db; line-height:1.55; }
.label{ display:block; margin:8px 0 6px; color:#cbd5e1; font-size:13px; }

.confirm-actions{
  display:flex; gap:8px; justify-content:flex-end; padding-top:10px; border-top:1px solid #1b2744;
}

/* 카드 */
.card{ background:var(--card); border:1px solid #1b2744; border-radius:12px; padding:12px; }
.card.modal-card { background:#000 !important; }
.confirm-card, .license-card{ background:#000 !important; }
.stack{ display:flex; flex-direction:column; gap:10px; }

/* === Notices와 스케일 맞춤 === */
:root, :host{
  --fs-base: 15px;
  --fs-small: 13.5px;
}
.card, .tabs, .toolbar, .row-line, .pager-wrap { font-size: var(--fs-base); }
.sub { font-size: calc(var(--fs-small)); line-height: 1.55; }

/* 버튼 스케일 */
.btn, .btn-ghost, .btn-danger, .btn-warning {
  font-size: 14.5px;
  padding: 10px 14px;
  min-height: 40px;
  border-radius: 12px;
}

/* 리스트 타이틀/배지 크기 */
.title-line{ font-size: 15.5px; }
.badge{ font-size: 13px; }

/* 대기 버튼 가시성 */
button.btn-warning { appearance:none; -webkit-appearance:none; background: var(--warning, #f59e0b) !important; border-color: var(--warning-600, #d97706) !important; color:#111 !important; }
button.btn-warning:hover, button.btn-warning:focus { background: var(--warning-600, #d97706) !important; border-color: var(--warning-600, #d97706) !important; color:#111 !important; }
button.btn-warning.strong { box-shadow:0 0 0 3px rgba(245,158,11,.28); }
button.btn-warning:disabled{ opacity:.7; filter: saturate(.9); cursor:not-allowed; }
</style>
