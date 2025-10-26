<!-- src/pages/InquiriesPage.vue -->
<template>
  <div class="stack">
    <div class="card">
      <h1 style="margin:0">문의 관리</h1>
      <p class="badge" style="margin-top:8px;font-size: 16px;">관리자 전용</p>
    </div>

    <!-- 상태 탭 + (갯수) -->
    <div class="tabs card">
      <button v-for="t in tabs" :key="t.key"
              class="tab-btn" :class="{active: tab===t.key}"
              @click="switchTab(t.key)">
        {{ t.label }} <span class="tab-badge">({{ counts[t.key] ?? 0 }})</span>
      </button>
    </div>

    <!-- 검색 + 로그인여부 필터 + 정렬 -->
    <div class="card toolbar">
      <input class="input" v-model.trim="q" placeholder="검색 (제목/내용/이메일/이름/아이디)"/>

      <div class="seg member-seg" title="회원/비회원 필터">
        <button class="seg-btn"
                :class="{active: memberFilter==='ANON'}"
                @click="toggleMember('ANON')">비회원</button>
        <button class="seg-btn"
                :class="{active: memberFilter==='LOGGED'}"
                @click="toggleMember('LOGGED')">회원</button>
      </div>

      <button class="btn-ghost search-btn" @click="goPage(1)" aria-label="검색">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="seg">
        <button class="seg-btn" :class="{active: sortDir==='desc'}" @click="setSort('desc')" title="생성시각 내림차순(최신순)">최신순</button>
        <button class="seg-btn" :class="{active: sortDir==='asc'}"  @click="setSort('asc')"  title="생성시각 오름차순(오래된순)">오래된순</button>
      </div>
    </div>

    <!-- 목록 -->
    <div class="card">
      <div v-if="error" class="error-box">{{ error }}</div>
      <div v-else-if="filteredRows.length===0" style="color:var(--muted)">문의 없음</div>

      <div v-else class="stack">
        <div v-for="it in filteredRows" :key="it.id" class="card row">
          <div class="row-left">
            <div class="title-line">
              <span class="ellipsis">{{ it.title }}</span>
              <span class="badge">{{ statusKo(it.status) }}</span>
            </div>
            <div class="sub">
              {{ it.name }} <template v-if="it.userid">({{ it.userid }})</template>
              · {{ it.email }} · 생성 {{ fmtDate(it.createdAt) }}
            </div>
          </div>

          <div class="row-actions">
            <button class="btn-ghost" @click="openDetail(it.id)">보기</button>

            <!-- ✅ 답변 탭(ANSWERED)에서는 '답변' 버튼 제거 -->
            <button
              class="btn"
              v-if="it.status!=='CLOSED' && tab!=='ANSWERED'"
              @click="openReply(it.id)"
            >답변</button>

            <button class="btn-warning" v-if="it.status!=='CLOSED'" @click="openCloseConfirm(it.id)">종료</button>
          </div>
        </div>
      </div>

      <p v-if="msg" style="margin-top:8px;color:var(--muted)">{{ msg }}</p>
    </div>

    <!-- 페이징 -->
    <div v-if="total>0" class="pager-footer">
      <div class="pager-wrap">
        <button class="pager-btn" :disabled="groupStart===1" @click="prevGroup">«</button>
        <button v-for="n in pageNumbersInGroup" :key="n" class="pager-btn" :class="{active:page===n}" @click="goPage(n)">{{ n }}</button>
        <button class="pager-btn" :disabled="groupEnd===totalPages" @click="nextGroup">»</button>
        <span class="pager-meta">총 {{ total }}건 · {{ page }} / {{ totalPages }} 페이지</span>
      </div>
    </div>

    <!-- 상세 모달 -->
    <div v-if="detail.open" class="modal-backdrop" @click.self="closeDetail">
      <div class="card modal-card view-card">
        <div class="modal-header">
          <strong>문의 상세</strong>
          <button class="btn-ghost" @click="closeDetail">닫기</button>
        </div>
        <div class="modal-body view-body" v-if="detail.data">
          <h3 class="view-title">{{ detail.data.title }}</h3>
          <div class="view-meta">
            <span class="badge">{{ statusKo(detail.data.status) }}</span>
            <span class="sub">작성자 {{ detail.data.name }} <template v-if="detail.data.userid">({{ detail.data.userid }})</template> · {{ detail.data.email }}</span>
            <span class="sub">생성 {{ fmtDate(detail.data.createdAt) }} · 수정 {{ fmtDate(detail.data.updatedAt) }}</span>
          </div>
          <pre class="view-content">{{ detail.data.content }}</pre>

          <div v-if="detail.data.attachments?.length" class="stack" style="margin-top:10px">
            <strong>첨부</strong>
            <div class="att-wrap">
              <button
                v-for="a in detail.data.attachments"
                :key="'att'+a.id"
                class="badge"
                @click="openAttachment(detail.data.id, a)"
                :title="isImage(a.contentType) ? '미리보기' : '다운로드'">
                {{ isImage(a.contentType) ? '미리보기' : '다운로드' }}: {{ a.filename }}
              </button>
            </div>
          </div>

          <div v-if="detail.data.replies?.length" class="stack" style="margin-top:10px">
            <strong>이전 답변</strong>
            <div v-for="r in detail.data.replies" :key="r.id" class="card" style="padding:8px">
              <div class="sub">작성 {{ fmtDate(r.createdAt) }}</div>
              <pre class="view-content" style="margin-top:6px">{{ r.message }}</pre>
            </div>
          </div>

          <div class="confirm-actions">
            <!-- 상세에서는 유지(요청은 목록만 제거였음) -->
            <button class="btn" @click="openReply(detail.data.id)">이 문의에 답변</button>
            <button class="btn-warning" v-if="detail.data.status!=='CLOSED'" @click="openCloseConfirm(detail.data.id)">종료</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 답변 모달 -->
    <div v-if="reply.open" class="modal-backdrop" @click.self="closeReply">
      <div class="card modal-card confirm-card accent-approve">
        <div class="modal-header">
          <strong>답변 보내기</strong>
          <button class="btn-ghost" @click="closeReply">닫기</button>
        </div>
        <div class="modal-body form">
          <label class="label">답변 내용</label>
          <textarea class="input" v-model.trim="reply.message" placeholder="내용" rows="8"></textarea>
        </div>
        <div class="confirm-actions">
          <button class="btn-ghost" @click="closeReply">취소</button>
          <button class="btn" :disabled="reply.loading" @click="sendReply">{{ reply.loading ? '발송중…' : '발송' }}</button>
        </div>
      </div>
    </div>

    <!-- 종료 확인 모달 -->
    <div v-if="closeConfirm.open" class="modal-backdrop" @click.self="closeCloseConfirm">
      <div class="card modal-card confirm-card accent-warning">
        <div class="modal-header">
          <strong>문의 종료</strong>
          <button class="btn-ghost" @click="closeCloseConfirm">닫기</button>
        </div>
        <div class="modal-body">
          <p>이 문의를 <b>종료</b>하시겠어요? 종료 후에는 더 이상 답변을 보낼 수 없습니다.</p>
        </div>
        <div class="confirm-actions">
          <button class="btn-ghost" @click="closeCloseConfirm">취소</button>
          <button class="btn-warning" :disabled="closeConfirm.loading" @click="confirmClose">
            {{ closeConfirm.loading ? '처리중…' : '종료' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import api from '@/api/http'

const tabs = [
  { key:'ALL',      label:'전체' },
  { key:'OPEN',     label:'미답변' },
  { key:'ANSWERED', label:'답변' },
  { key:'CLOSED',   label:'종료' },
]
const tab = ref('ALL')

const q = ref('')
const rows = ref([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const totalPages = ref(0)
const msg = ref('')
const error = ref('')

/* 회원/비회원 필터 (ALL | LOGGED | ANON) */
const memberFilter = ref('ALL')
function toggleMember(v){
  memberFilter.value = (memberFilter.value === v) ? 'ALL' : v
}

/* 탭 (갯수) 상태 */
const counts = reactive({ ALL: 0, OPEN: 0, ANSWERED: 0, CLOSED: 0 })

/* 정렬 */
const sortDir = ref('desc')
function setSort(dir){
  if (sortDir.value === dir) return
  sortDir.value = dir
  page.value = 1
  fetchList()
}

const detail = reactive({ open:false, data:null })
const reply  = reactive({ open:false, id:null, message:'', loading:false })

/* 종료 확인 모달 상태 */
const closeConfirm = reactive({ open:false, id:null, loading:false })
function openCloseConfirm(id){ closeConfirm.open = true; closeConfirm.id = id }
function closeCloseConfirm(){ closeConfirm.open = false; closeConfirm.id = null; closeConfirm.loading = false }
async function confirmClose(){
  if(!closeConfirm.id) return
  closeConfirm.loading = true
  await setStatus(closeConfirm.id, 'CLOSED')
  closeCloseConfirm()
}

function statusKo(s){ return s==='OPEN'?'미답변':(s==='ANSWERED'?'답변':'종료') }
function fmtDate(iso){
  if(!iso) return '-'
  const d=new Date(iso)
  if(Number.isNaN(d.getTime())) return iso
  const p=n=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const groupStart = computed(()=> Math.floor((page.value-1)/5)*5 + 1)
const groupEnd   = computed(()=> Math.min(groupStart.value + 4, totalPages.value))
const pageNumbersInGroup = computed(()=>{ const arr=[]; for(let n=groupStart.value; n<= (groupEnd.value||1); n++) arr.push(n); return arr })

function switchTab(k){ if(tab.value===k) return; tab.value=k; page.value=1; fetchList() }

/* (갯수) 계산 */
async function fetchCounts(){
  const base = { page: 0, size: 1, sort: `createdAt,${sortDir.value}` }
  if (q.value) base.q = q.value
  const req = (statusKey) => {
    const params = { ...base }
    if (statusKey !== 'ALL') params.status = statusKey
    return api.get('/admin/inquiries', { params })
  }

  try{
    const [allRes, openRes, ansRes, clsRes] = await Promise.all([
      req('ALL'), req('OPEN'), req('ANSWERED'), req('CLOSED')
    ])
    counts.ALL      = allRes?.data?.totalElements ?? 0
    counts.OPEN     = openRes?.data?.totalElements ?? 0
    counts.ANSWERED = ansRes?.data?.totalElements ?? 0
    counts.CLOSED   = clsRes?.data?.totalElements ?? 0
  }catch(_e){ /* 무시 */ }
}

async function fetchList(){
  error.value=''; msg.value=''
  const doCounts = fetchCounts()

  try{
    const params = { page: page.value-1, size: size.value, sort:`createdAt,${sortDir.value}` }
    if (q.value) params.q = q.value
    if (tab.value !== 'ALL') params.status = tab.value
    const { data } = await api.get('/admin/inquiries', { params })
    rows.value = data.content || []
    total.value = data.totalElements ?? 0
    totalPages.value = data.totalPages ?? 1
    if (page.value > totalPages.value && totalPages.value > 0) { page.value = totalPages.value; return fetchList() }
  }catch(e){
    const status = e?.response?.status
    const reason = e?.response?.data?.reason || e?.message || '오류'
    error.value = `목록 실패: ${status ? `[${status}] ` : ''}${reason}`
    rows.value=[]; total.value=0; totalPages.value=0
  } finally { await doCounts }
}

/* 회원/비회원 필터 적용(클라이언트 측) */
const filteredRows = computed(()=>{
  if (memberFilter.value === 'LOGGED') return rows.value.filter(r => !!r.userid)
  if (memberFilter.value === 'ANON')   return rows.value.filter(r => !r.userid)
  return rows.value
})

function goPage(n){ if(n<1 || (totalPages.value && n>totalPages.value)) return; page.value=n; fetchList() }
function prevGroup(){ const n=groupStart.value-1; if(n>=1) goPage(n) }
function nextGroup(){ const n=groupEnd.value+1; if(n<=totalPages.value) goPage(n) }

async function openDetail(id){
  try{
    const { data } = await api.get(`/admin/inquiries/${id}`)
    detail.data = data
    detail.open = true
  }catch(e){ msg.value = '상세를 불러오지 못했습니다.' }
}
function closeDetail(){ detail.open=false; detail.data=null }

/* 첨부: 이미지면 미리보기(인라인), 아니면 다운로드 */
function isImage(ct){ return /^image\//i.test(ct || '') }

async function openAttachment(inquiryId, att){
  const inline = isImage(att.contentType)
  try{
    const { data, headers } = await api.get(
      `/admin/inquiries/${inquiryId}/attachments/${att.id}`,
      { params:{ inline }, responseType:'blob' }
    )

    let filename = att.filename || 'attachment'
    const cd = headers?.['content-disposition'] || headers?.get?.('content-disposition')
    if (cd) {
      const m = /filename\*?=(?:UTF-8'')?("?)([^";]+)\1/.exec(cd)
      if (m && m[2]) filename = decodeURIComponent(m[2].replace(/\+/g, '%20'))
    }

    const blob = new Blob([data], { type: headers?.['content-type'] || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)

    if (inline) {
      window.open(url, '_blank')
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    setTimeout(()=>URL.revokeObjectURL(url), 10_000)
  }catch(e){
    msg.value = '첨부를 열 수 없습니다.'
  }
}

function openReply(id){ reply.open=true; reply.id=id; reply.message='' }
function closeReply(){ reply.open=false; reply.id=null; reply.message='' }

async function sendReply(){
  if(!reply.id || !reply.message?.trim()){ msg.value='내용을 입력하세요.'; return }
  reply.loading = true
  try{
    await api.post(`/admin/inquiries/${reply.id}/reply`, { message: reply.message.trim() })
    msg.value = '답변을 발송했습니다.'
    closeReply()
    if (detail.open && detail.data?.id === reply.id) await openDetail(reply.id)
    await fetchList()
  }catch(e){
    const status = e?.response?.status
    const reason = e?.response?.data?.reason || e?.message || '오류'
    msg.value = `발송 실패: ${status ? `[${status}] ` : ''}${reason}`
  }finally{
    reply.loading = false
  }
}

async function setStatus(id, s){
  try{
    await api.put(`/admin/inquiries/${id}/status`, null, { params:{ status:s } })
    msg.value = `상태가 ${statusKo(s)}(으)로 변경되었습니다.`
    if (detail.open && detail.data?.id === id) await openDetail(id)
    await fetchList()
  }catch(e){
    msg.value = '상태 변경 실패'
  }
}

fetchList()
</script>

<style scoped>
:root, :host {
  --primary:#2563eb; --primary-600:#1d4ed8;
  --border:#253252; --text:#e5e7eb; --muted:#94a3b8;
  --danger:#ef4444; --danger-600:#dc2626;
  --warning:#f59e0b; --warning-600:#d97706;
  --card:#0f1627; --card-2:#0b1220;
  --backdrop-dim: rgba(0,0,0,.55);
}

/* 공통 */
.stack{ display:flex; flex-direction:column; gap:10px; }
.card{ background:var(--card); border:1px solid #1b2744; border-radius:12px; padding:12px; }
.badge{ border:1px solid var(--border); padding:2px 8px; border-radius:999px; font-size:12px; display:inline-block; }

/* 탭 */
.tabs{ display:flex; gap:8px; }
.tab-btn{ border:1px solid var(--border); background:transparent; color:var(--text); padding:6px 10px; border-radius:8px; cursor:pointer; font-size:16px; }
.tab-btn.active{ background:var(--primary); border-color:var(--primary); color:#fff; }
.tab-badge{ opacity:.9; }

/* ── 검색 툴바 ─────────────────────────────────────────── */
.toolbar{
  display:flex; align-items:center; gap:8px;
  flex-wrap: nowrap;
}
.toolbar > *{ flex: 0 0 auto; }

.input{
  background:#0b1324; border:1px solid var(--border); color:var(--text);
  border-radius:8px; padding:8px 10px; outline:none; height:60px; font-size:16px;
  flex: 1 1 auto; min-width: 260px;
}
.input:focus{ border-color:#2b3b66; box-shadow:0 0 0 3px rgba(59,130,246,.2); }

.seg{
  display:inline-flex; align-items:center; gap:0;
  border:1px solid var(--border); border-radius:10px; overflow:hidden; height:60px;
}
.seg-btn{
  background:transparent; color:var(--text); border:none; padding:0 14px; cursor:pointer; font-weight:600; height:100%;
}
.seg-btn + .seg-btn{ border-left:1px solid var(--border); }
.seg-btn.active{ background:var(--primary); color:#fff; }

.search-btn{ display:inline-flex; align-items:center; justify-content:center; width:60px; height:60px; }

/* ── 목록 행 ─────────────────────────────────────────── */
.row{
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; padding:12px; overflow:visible;
}
.row-left{ flex:1 1 auto; min-width:0; }
.title-line{ font-weight:600; display:flex; align-items:center; gap:8px; min-width:0; }
.sub{ color:var(--muted); font-size:12px; margin-top:4px; }
.ellipsis{ flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* 액션 버튼 */
.row-actions{ display:flex; gap:8px; flex:0 0 auto; }
.btn, .btn-ghost, .btn-danger, .btn-warning{
  border:1px solid transparent; border-radius:10px; padding:8px 12px; cursor:pointer; font-weight:600; min-height:40px;
}
.btn{ background:var(--primary); color:#fff; border-color:var(--primary); }
.btn:hover{ background:var(--primary-600); border-color:var(--primary-600); }
.btn-ghost{ background:transparent; color:var(--text); border:1px solid var(--border); }
.btn-ghost:hover{ background:#1a2540; }

/* 종료 버튼 */
.btn-warning{
  background-color: var(--warning) !important;
  border-color:   var(--warning) !important;
  color:#111 !important;
}
.btn-warning:hover, .btn-warning:focus{
  background-color: var(--warning-600) !important;
  border-color:   var(--warning-600) !important;
  color:#111 !important;
}

/* 페이징 */
.pager-footer{ padding:10px 0 16px; display:flex; justify-content:center; }
.pager-wrap{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.pager-btn{ background:transparent; border:1px solid var(--border); color:var(--text); padding:6px 10px; border-radius:8px; cursor:pointer; min-width:36px; }
.pager-btn.active{ background:var(--primary); color:#fff; border-color:var(--primary); }
.pager-meta{ margin-left:8px; color:var(--muted); font-size:12px; }

/* ── 모달 ─────────────────────────────────────────── */
.modal-backdrop{ position:fixed; inset:0; display:grid; place-items:center; background: var(--backdrop-dim); backdrop-filter: blur(2px); z-index:60; }
.modal-card{ width:min(780px, 94vw); max-height:90vh; padding:12px; background:#000; color:#fff; border:1px solid #1b2744; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.55); display:flex; flex-direction:column; }
.modal-header{ display:flex; justify-content:space-between; align-items:center; padding:8px 10px 10px; border-bottom:1px solid #1b2744; }
.confirm-card{ border-top:3px solid var(--primary); }
.view-card{ width:min(820px, 95vw); }
.view-body{ padding:12px 10px; }
.view-title{ margin:0 0 6px; font-size:18px; }
.view-meta{ display:flex; gap:8px; align-items:center; margin-bottom:10px; flex-wrap:wrap; }
.view-content{ white-space:pre-wrap; background:#0b1324; border:1px solid var(--border); border-radius:10px; padding:12px; max-height:55vh; overflow:auto; margin:0; }
.att-wrap{ display:flex; gap:8px; flex-wrap:wrap; }

/* 🔹 모달 버튼 영역: 상단 구분선 + 오른쪽 정렬 + 간격 */
.confirm-actions{
  margin-top:12px;
  padding-top:12px;
  border-top:1px solid #1b2744;
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:10px;
}

.error-box{ padding:10px; border:1px solid #5a2a2a; background:#3b1d1d; color:#fca5a5; border-radius:8px; margin-bottom:10px; }
.label{ color:#cbd5e1; font-size:13px; }

/* 종료 확인 모달 강조선 */
.accent-warning{ border-top:3px solid var(--warning); }

/* 반응형 */
@media (max-width: 860px){
  .toolbar{ flex-wrap: wrap; }
  .input{ flex: 1 1 100%; min-width: 220px; }
}
</style>
