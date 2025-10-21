<template>
  <div class="stack">
    <div class="card">
      <h2 style="margin:0">드라이버 승인</h2>
      <p class="badge" style="margin-top:8px">승인대기 버스기사 계정 목록</p>
    </div>

    <div class="card">
      <!-- 검색 + 정렬바 -->
      <div class="toolbar">
        <input class="input" v-model.trim="q" placeholder="검색 (userid / username)"/>

        <button class="btn-ghost search-btn" @click="goPage(1)">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                  fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>검색</span>
        </button>

        <select v-model="sortDir" class="input sort-select" title="가입일 정렬">
          <option value="asc">가입일 오름차순</option>
          <option value="desc">가입일 내림차순</option>
        </select>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-else-if="rows.length===0" style="color:var(--muted)">대기중 계정이 없습니다.</div>
      <div v-else class="stack">
        <div v-for="u in rows" :key="u.userNum" class="card" style="padding:12px">
          <div class="row-line">
            <div class="row-left">
              <!-- 아바타: axios로 받은 Blob URL 사용 -->
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
                  <span v-if="u.hasDriverLicenseFile" class="badge badge-ok">자격증 등록됨</span>
                  <span v-else class="badge badge-warn">자격증 없음</span>
                </div>
                <div class="sub">
                  {{ u.userid }} · {{ roleKo(u.role) }}
                  <template v-if="u.email"> · {{ u.email }}</template>
                </div>
              </div>
            </div>

            <div class="row-actions">
              <button class="btn-ghost" @click="previewLicense(u)" :disabled="licenseLoading[u.userid]">
                {{ licenseLoading[u.userid] ? '불러오는 중…' : '자격증 보기' }}
              </button>
              <button class="btn"
                      :disabled="!u.hasDriverLicenseFile || actionLoading[u.userid]"
                      :title="!u.hasDriverLicenseFile ? '자격증 등록 후 승인 가능합니다.' : ''"
                      @click="openConfirm('approve', u)">
                {{ actionLoading[u.userid] ? '처리중…' : '승인' }}
              </button>
              <button class="btn-ghost"
                      :disabled="actionLoading[u.userid]"
                      @click="openConfirm('reject', u)">
                거절
              </button>
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
    <div v-if="preview.open" class="modal-backdrop">
      <div class="card modal-card">
        <div class="modal-header">
          <strong>{{ preview.username }}님 자격증 정보</strong>
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
              면허 상세 정보 API가 없어 사용자 기본정보만 표시했습니다.
              (/admin/drivers/{userid}/license/info 미구현)
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 승인 / 거절 확인 모달 -->
    <div v-if="confirm.open" class="modal-backdrop">
      <div class="card modal-card confirm-card">
        <div class="modal-header">
          <strong>{{ confirm.title }}</strong>
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
          <button class="btn" @click="confirmSubmit">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import api from '@/api/http'

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

/* 확인 모달 */
const confirm = reactive({
  open: false,
  mode: '',   // 'approve' | 'reject'
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
  confirm.title = mode === 'approve' ? '드라이버 승인 확인' : '드라이버 거절 확인'
  confirm.message = mode === 'approve'
    ? `${user.userid} 계정을 승인하시겠습니까?`
    : `${user.userid} 계정을 거절하시겠습니까? (사유 입력 가능)`
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
  if (confirm.mode === 'approve') {
    await approve(u)
  } else if (confirm.mode === 'reject') {
    await reject(u, confirm.reason)
  }
  closeConfirm()
}

/* pagination */
const size = ref(10)
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

/* 가입일 정렬 (기본 asc) */
const sortDir = ref('asc')
watch(sortDir, () => { page.value = 1; fetchPending() })

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

/* 아바타 에러 → 이니셜 폴백 */
function onAvatarError(e, u) {
  try { URL.revokeObjectURL(u.avatarUrl) } catch {}
  u.avatarUrl = ''
}

/* 이전에 만든 Blob URL 정리 */
function revokeAllAvatars(list) {
  (list || rows.value).forEach(u => {
    if (u.avatarUrl) {
      try { URL.revokeObjectURL(u.avatarUrl) } catch {}
      u.avatarUrl = ''
    }
  })
}
onBeforeUnmount(() => revokeAllAvatars())

/* 목록 + 아바타 로딩 */
async function fetchPending() {
  msg.value = ''
  error.value = ''
  revokeAllAvatars()

  try {
    const { data } = await api.get('/admin/drivers/pending', {
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

    // 🔧 초기 DOM 렌더 후 아바타 비동기 로딩
    await nextTick()

    // 프로필 이미지 병렬 로딩(권한 헤더 포함)
    const tasks = list
      .filter(u => u.hasProfileImage)
      .map(async u => {
        try {
          const res = await api.get(`/admin/users/${encodeURIComponent(u.userid)}/profile-image`, { responseType: 'blob' })
          u.avatarUrl = URL.createObjectURL(res.data)
        } catch {
          u.avatarUrl = ''
        }
      })
    await Promise.allSettled(tasks)

    // 🔧 강제 반응성 트리거 → 즉시 렌더 반영
    rows.value = [...rows.value]
  } catch (e) {
    const status = e?.response?.status
    const reason = e?.response?.data?.reason || e?.message || '알 수 없는 오류'
    error.value = `목록을 불러오지 못했습니다. ${status ? `[${status}] ` : ''}${reason}`
    console.error('pending fetch error:', e)
    rows.value = []
    total.value = 0
    totalPages.value = 0
  }
}

function goPage(n) {
  if (n < 1 || (totalPages.value && n > totalPages.value)) return
  page.value = n
  fetchPending()
}
function prevGroup() {
  const n = groupStart.value - 1
  if (n >= 1) goPage(n)
}
function nextGroup() {
  const n = groupEnd.value + 1
  if (n <= totalPages.value) goPage(n)
}

/* approve/reject/preview */
async function approve(u) {
  if (!u.hasDriverLicenseFile) {
    msg.value = `${u.userid} : 자격증이 등록되지 않아 승인할 수 없습니다.`
    return
  }
  actionLoading[u.userid] = true
  try {
    await api.post(`/admin/drivers/${encodeURIComponent(u.userid)}/approve`)
    msg.value = `${u.userid} 승인 완료`
    fetchPending()
  } catch (e) {
    const status = e?.response?.status
    const reason = e?.response?.data?.reason || e?.message || '오류'
    msg.value = `승인 실패: ${status ? `[${status}] ` : ''}${reason}`
  } finally { actionLoading[u.userid] = false }
}

async function reject(u, reasonText) {
  const body = reasonText ? { reason: reasonText } : undefined
  actionLoading[u.userid] = true
  try {
    await api.post(`/admin/drivers/${encodeURIComponent(u.userid)}/reject`, body)
    msg.value = `${u.userid} 거절 완료`
    fetchPending()
  } catch (e) {
    const status = e?.response?.status
    const reasonMsg = e?.response?.data?.reason || e?.message || '오류'
    msg.value = `거절 실패: ${status ? `[${status}] ` : ''}${reasonMsg}`
  } finally { actionLoading[u.userid] = false }
}

async function previewLicense(u) {
  licenseLoading[u.userid] = true
  try {
    if (!u.hasDriverLicenseFile) {
      msg.value = `${u.userid} : 등록된 자격증이 없습니다.`
      return
    }
    const imgRes = await api.get(`/admin/drivers/${encodeURIComponent(u.userid)}/license`, { responseType: 'blob' })
    const url = URL.createObjectURL(imgRes.data)

    let info = null, fallback = false
    try {
      const res = await api.get(`/admin/drivers/${encodeURIComponent(u.userid)}/license/info`)
      info = res.data || null
    } catch { fallback = true }

    preview.userid = u.userid
    preview.username = u.username || u.userid
    preview.src = url
    preview.info = info || { holderName:'', birthDate:'', licenseNumber:'', acquiredDate:'' }
    preview.infoFallback = fallback
    preview.open = true
  } catch (e) {
    const status = e?.response?.status
    msg.value = `${u.userid} : 자격증 정보를 불러올 수 없습니다. ${status ? `[${status}]` : ''}`
  } finally {
    licenseLoading[u.userid] = false
  }
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

/* 최초 로드 */
goPage(1)
</script>

<style scoped>
/* (스타일은 그대로) */
.toolbar{ display:flex; gap:8px; margin-bottom:10px; align-items:center; }
.search-btn{ display:inline-flex; align-items:center; gap:6px; writing-mode:horizontal-tb; }
.sort-select{ width:160px; }

.error-box{ padding:10px; border:1px solid #5a2a2a; background:#3b1d1d; color:#fca5a5; border-radius:8px; margin-bottom:10px; }

.row-line{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
.row-left{ display:flex; gap:10px; align-items:center; min-width:0; }
.row-actions{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
.title-line{ font-weight:600; display:flex; align-items:center; gap:8px; }
.sub{ color:var(--muted); font-size:12px; }
.ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.badge-ok{ background:#12331f; border-color:#245c38; color:#86efac; }
.badge-warn{ background:#3b1d1d; border-color:#5a2a2a; color:#fca5a5; }

.avatar{
  width:36px; height:36px; border-radius:999px; overflow:hidden;
  display:grid; place-items:center; background:#1a2540; color:#cbd5e1; font-weight:700;
}
.avatar-img{ width:100%; height:100%; object-fit:cover; display:block; }

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

.modal-backdrop{ position:fixed; inset:0; display:grid; place-items:center; background:rgba(0,0,0,.6); z-index:60; }
.modal-card{ max-width:90vw; max-height:90vh; padding:12px; background:#0f1627; color:#fff; }
.modal-header{ display:flex; justify-content:space-between; align-items:center; padding:4px 8px 8px; }

.modal-body{ display:flex; flex-direction:row; gap:16px; align-items:flex-start; max-height:80vh; overflow:auto; padding:8px; }
.license-box{ display:grid; place-items:center; padding:6px; border:1px solid #333; border-radius:8px; background:#0b1220;
  max-width:min(60vw,560px); max-height:min(65vh,680px); overflow:auto; }
.license-img{ width:auto; height:auto; max-width:min(58vw,520px); max-height:min(62vh,640px); object-fit:contain; display:block; image-rendering:auto; }
@media (max-width:600px){ .modal-body{ flex-direction:column; } .license-box{ max-width:85vw; max-height:55vh; } .license-img{ max-width:82vw; max-height:52vh; } }
.license-info{ flex:1; min-width:220px; }
.license-info-table{ width:100%; border-collapse:collapse; font-size:14px; line-height:1.6; margin-top:4px; }
.license-info-table td{ padding:6px 8px; vertical-align:top; border-bottom:1px solid #222; }
.license-info-table td:first-child{ color:#aaa; width:110px; white-space:nowrap; }
.license-info-table tr:last-child td{ border-bottom:none; }
.license-warning{ margin-top:10px; color:#fca5a5; font-size:12px; line-height:1.4; white-space:pre-line; }

.confirm-card{ max-width:420px; width:92vw; }
.confirm-body{ padding:8px; display:flex; flex-direction:column; gap:8px; }
.confirm-msg{ color:#cbd5e1; }
.confirm-actions{ display:flex; justify-content:flex-end; gap:8px; padding:8px; }

.btn-ghost{ writing-mode:horizontal-tb; }
.btn{ writing-mode:horizontal-tb; }
</style>
