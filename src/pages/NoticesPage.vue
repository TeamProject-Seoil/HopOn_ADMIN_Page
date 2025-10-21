<!-- src/pages/NoticesPage.vue -->
<template>
  <div class="stack">
    <div class="card">
      <h1 style="margin:0">공지사항</h1>
      <p class="badge" style="margin-top:8px;font-size: 16px;">관리자 전용</p>
    </div>

    <!-- ✅ 유형 탭 -->
    <div class="tabs card">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: tab===t.key }"
        @click="switchTab(t.key)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 검색/필터 -->
    <div class="card toolbar">
      <input class="input" v-model.trim="q" placeholder="검색 (제목/내용)"/>

      <!-- 대상 필터만 유지 -->
      <select class="input sort-select" v-model="target" title="공지 대상">
        <option value="">전체 대상</option>
        <option value="ALL">전체</option>
        <option value="USER">사용자</option>
        <option value="DRIVER">기사</option>
      </select>

      <button class="btn-ghost search-btn" @click="goPage(1)">검색</button>

      <div class="spacer"></div>
      <button class="btn" @click="openEditor()">새 공지</button>
    </div>

    <div class="card">
      <div v-if="error" class="error-box">{{ error }}</div>
      <div v-else-if="rows.length===0" style="color:var(--muted)">공지 없음</div>

      <div v-else class="stack">
        <div v-for="n in rows" :key="n.id" class="card row">
          <div class="row-left">
            <div class="title-line">
              <span class="ellipsis">{{ n.title }}</span>
              <span class="badge">{{ typeKo(n.noticeType) }}</span>
              <span class="badge">{{ targetKo(n.targetRole) }}</span>
            </div>
            <div class="sub">
              조회수 {{ n.viewCount }} ·
              생성 {{ fmtDate(n.createdAt) }} ·
              수정 {{ fmtDate(n.updatedAt) }}
            </div>
          </div>

          <div class="row-actions">
            <!-- ✅ 보기(조회수 증가 없음) -->
            <button class="btn-ghost" @click="openViewer(n)">보기</button>
            <button class="btn-ghost" @click="openEditor(n)">수정</button>
            <button class="btn-danger" @click="askDelete(n)">삭제</button>
          </div>
        </div>
      </div>

      <p v-if="msg" style="margin-top:8px;color:var(--muted)">{{ msg }}</p>
    </div>

    <!-- ✅ 페이징 (그룹 네비 포함) -->
    <div v-if="total>0" class="pager-footer">
      <div class="pager-wrap">
        <button class="pager-btn" :disabled="groupStart===1" @click="prevGroup">«</button>
        <button v-for="n in pageNumbersInGroup" :key="n"
                class="pager-btn" :class="{ active: page === n }"
                @click="goPage(n)">{{ n }}</button>
        <button class="pager-btn" :disabled="groupEnd===totalPages" @click="nextGroup">»</button>

        <span class="pager-meta">총 {{ total }}건 · {{ page }} / {{ totalPages }} 페이지</span>
      </div>
    </div>

    <!-- 작성/수정 모달 -->
    <div v-if="editor.open" class="modal-backdrop" @click.self="closeEditor">
      <div class="card modal-card">
        <div class="modal-header">
          <strong>{{ editor.id ? '공지 수정' : '새 공지' }}</strong>
          <button class="btn-ghost" @click="closeEditor">닫기</button>
        </div>

        <div class="modal-body form">
          <label class="label">제목</label>
          <input class="input" v-model.trim="editor.title" placeholder="제목"/>

          <label class="label">내용</label>
          <textarea class="input" rows="8" v-model.trim="editor.content" placeholder="내용"></textarea>

          <div class="grid2">
            <div>
              <label class="label">공지 유형</label>
              <select class="input" v-model="editor.noticeType">
                <option value="INFO">일반</option>
                <option value="UPDATE">업데이트</option>
                <option value="MAINTENANCE">점검</option>
              </select>
            </div>
            <div>
              <label class="label">공지 대상</label>
              <select class="input" v-model="editor.targetRole">
                <option value="ALL">전체</option>
                <option value="USER">사용자</option>
                <option value="DRIVER">기사</option>
              </select>
            </div>
          </div>
        </div>

        <div class="confirm-actions">
          <button class="btn-ghost" @click="closeEditor">취소</button>
          <button class="btn" @click="saveNotice" :disabled="saveLoading">
            {{ saveLoading ? '저장중…' : '저장' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 삭제 확인 모달 -->
    <div v-if="confirm.open" class="modal-backdrop" @click.self="closeConfirm">
      <div class="card modal-card confirm-card accent-reject">
        <div class="modal-header compact">
          <strong>삭제 확인</strong>
          <button class="btn-ghost" @click="closeConfirm">닫기</button>
        </div>
        <div class="confirm-body">
          <p class="confirm-msg">정말로 “{{ confirm.title }}” 공지를 삭제할까요?</p>
        </div>
        <div class="confirm-actions">
          <button class="btn-ghost" @click="closeConfirm">취소</button>
          <button class="btn-danger" @click="doDelete" :disabled="deleteLoading">
            {{ deleteLoading ? '삭제중…' : '삭제' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ✅ 내용 보기 모달 (조회수 증가 X) -->
    <div v-if="viewer.open" class="modal-backdrop" @click.self="closeViewer">
      <div class="card modal-card view-card">
        <div class="modal-header">
          <strong>공지 보기</strong>
          <button class="btn-ghost" @click="closeViewer">닫기</button>
        </div>
        <div class="modal-body view-body">
          <h3 class="view-title">{{ viewer.title }}</h3>
          <div class="view-meta">
            <span class="badge">{{ typeKo(viewer.noticeType) }}</span>
            <span class="badge">{{ targetKo(viewer.targetRole) }}</span>
            <span class="sub">생성 {{ fmtDate(viewer.createdAt) }} · 수정 {{ fmtDate(viewer.updatedAt) }}</span>
          </div>
          <pre class="view-content">{{ viewer.content }}</pre>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import api from '@/api/http'

/* ─ 유형 탭 ─ */
const tabs = [
  { key: 'ALL',          label: '전체' },
  { key: 'INFO',         label: '일반' },
  { key: 'UPDATE',       label: '업데이트' },
  { key: 'MAINTENANCE',  label: '점검' },
]
const tab = ref('ALL')

const q = ref('')
const target = ref('')   // 대상은 드롭다운 유지

const rows = ref([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const totalPages = ref(0)
const msg = ref('')
const error = ref('')

const saveLoading = ref(false)
const deleteLoading = ref(false)

/* 에디터 */
const editor = reactive({
  open:false, id:null, title:'', content:'', noticeType:'INFO', targetRole:'ALL'
})
/* 삭제 확인 */
const confirm = reactive({ open:false, id:null, title:'' })
/* 보기 모달 */
const viewer = reactive({
  open:false, id:null, title:'', content:'', noticeType:'INFO', targetRole:'ALL',
  createdAt:'', updatedAt:''
})

function targetKo(t){
  return t==='ALL' ? '전체' : t==='USER' ? '사용자' : t==='DRIVER' ? '기사' : '-'
}
function typeKo(t){
  return t==='INFO' ? '일반' : t==='UPDATE' ? '업데이트' : t==='MAINTENANCE' ? '점검' : '-'
}
function fmtDate(iso){
  if(!iso) return '-'
  const d = new Date(iso)
  if(Number.isNaN(d.getTime())) return iso
  const p=n=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/* 그룹 페이지 네비 (5개 단위) */
const groupStart = computed(()=> Math.floor((page.value-1)/5)*5 + 1)
const groupEnd   = computed(()=> Math.min(groupStart.value + 4, totalPages.value))
const pageNumbersInGroup = computed(()=>{
  const arr=[]
  for(let n=groupStart.value; n<= (groupEnd.value || 1); n++) arr.push(n)
  return arr
})

/* 탭 전환 */
function switchTab(next){
  if (tab.value === next) return
  tab.value = next
  page.value = 1
  fetchList()
}

/* 목록 조회 */
async function fetchList(){
  error.value=''; msg.value=''
  try{
    const params = { page: page.value-1, size: size.value, sort: 'updatedAt,desc' }
    if (q.value) params.q = q.value
    if (target.value) params.target = target.value
    if (tab.value && tab.value !== 'ALL') params.type = tab.value   // ✅ 유형은 탭에서 전달

    const { data } = await api.get('/admin/notices', { params })
    rows.value = data.content || []
    total.value = data.totalElements ?? 0
    totalPages.value = data.totalPages ?? 1

    if (page.value > totalPages.value && totalPages.value > 0) {
      page.value = totalPages.value
      return fetchList()
    }
  } catch(e){
    const status = e?.response?.status
    const reason = e?.response?.data?.message || e?.message || '오류'
    error.value = `목록을 불러오지 못했습니다. ${status ? `[${status}] ` : ''}${reason}`
    rows.value=[]; total.value=0; totalPages.value=0
  }
}

function goPage(n){ if(n<1 || (totalPages.value && n>totalPages.value)) return; page.value=n; fetchList() }
function prevGroup(){ const n = groupStart.value - 1; if (n >= 1) goPage(n) }
function nextGroup(){ const n = groupEnd.value + 1; if (n <= totalPages.value) goPage(n) }

/* 보기 모달 (조회수 증가 없음: 서버 호출 안 함) */
function openViewer(n){
  viewer.open = true
  viewer.id = n.id
  viewer.title = n.title
  viewer.content = n.content
  viewer.noticeType = n.noticeType
  viewer.targetRole = n.targetRole
  viewer.createdAt = n.createdAt
  viewer.updatedAt = n.updatedAt
}
function closeViewer(){ viewer.open=false }

/* 에디터 모달 */
function openEditor(n){
  editor.open = true
  if(n){
    editor.id = n.id
    editor.title = n.title
    editor.content = n.content
    editor.noticeType = n.noticeType
    editor.targetRole = n.targetRole
  } else {
    editor.id = null
    editor.title = ''
    editor.content = ''
    editor.noticeType = 'INFO'
    editor.targetRole = 'ALL'
  }
}
function closeEditor(){ editor.open=false }

/* 저장 */
async function saveNotice(){
  if(!editor.title?.trim() || !editor.content?.trim()){
    msg.value = '제목과 내용을 입력하세요.'
    return
  }
  saveLoading.value = true
  try{
    const body = {
      title: editor.title.trim(),
      content: editor.content.trim(),
      noticeType: editor.noticeType,
      targetRole: editor.targetRole
    }
    if(editor.id){
      await api.put(`/admin/notices/${editor.id}`, body)
      msg.value = '수정되었습니다.'
    } else {
      await api.post('/admin/notices', body)
      msg.value = '작성되었습니다.'
    }
    closeEditor()
    await fetchList()
  }catch(e){
    const status = e?.response?.status
    const reason = e?.response?.data?.message || e?.message || '오류'
    msg.value = `저장 실패: ${status ? `[${status}] ` : ''}${reason}`
  }finally{
    saveLoading.value = false
  }
}

/* 삭제 */
function askDelete(n){
  confirm.open = true
  confirm.id = n.id
  confirm.title = n.title
}
function closeConfirm(){ confirm.open=false; confirm.id=null; confirm.title='' }

async function doDelete(){
  if(!confirm.id) return
  deleteLoading.value = true
  try{
    await api.delete(`/admin/notices/${confirm.id}`)
    msg.value = '삭제되었습니다.'
    closeConfirm()
    await fetchList()
  }catch(e){
    const status = e?.response?.status
    const reason = e?.response?.data?.message || e?.message || '오류'
    msg.value = `삭제 실패: ${status ? `[${status}] ` : ''}${reason}`
  }finally{
    deleteLoading.value = false
  }
}

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

  /* ✨ 모달 백드롭(투명X, 살짝 블러) */
  --backdrop-dim: rgba(0,0,0,.55);
}

/* 탭 */
.tabs{ display:flex; gap:8px; }
.tab-btn{
  border:1px solid var(--border);
  background:transparent; color:var(--text);
  padding:6px 10px; border-radius:8px; cursor:pointer;
  font-size:16px;
}
.tab-btn.active{ background:var(--primary); border-color:var(--primary); color:#fff; }
.tab-badge{ opacity:.9; }

/* 폼 공통 */
.input{
  background:#0b1324; border:1px solid var(--border); color:var(--text);
  border-radius:8px; padding:8px 10px; outline:none;
  height:60px; font-size:16px;
}
.input:focus{ border-color:#2b3b66; box-shadow:0 0 0 3px rgba(59,130,246,.2); }

.toolbar{ display:flex; gap:8px; margin-bottom:10px; align-items:center; }
.search-btn{ display:inline-flex; align-items:center; gap:6px; writing-mode:horizontal-tb; height:60px; width:60px; }
.sort-select{ width:160px; height:60px; font-size:16px; }
.spacer{ flex:1; }

/* 오류 박스 */
.error-box{ padding:10px; border:1px solid #5a2a2a; background:#3b1d1d; color:#fca5a5; border-radius:8px; margin-bottom:10px; }

/* 리스트 행 */
.row{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px; }
.row-left{ min-width:0; }
.row-actions{ display:flex; gap:8px; align-items:center; }
.title-line{ font-weight:600; display:flex; align-items:center; gap:8px; }
.sub{ color:var(--muted); font-size:12px; margin-top:4px; }
.ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-block; max-width:48vw; }

/* 뱃지 */
.badge{ border:1px solid var(--border); padding:2px 8px; border-radius:999px; font-size:12px; display:inline-block; }

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
  min-height:40px;
}
.btn:active, .btn-danger:active, .btn-warning:active, .btn-ghost:active{ transform:translateY(1px); }

.btn{ background:var(--primary); color:#fff; border-color:var(--primary); }
.btn:hover{ background:var(--primary-600); border-color:var(--primary-600); }

.btn-danger{ background:var(--danger); color:#fff; border-color:var(--danger); }
.btn-danger:hover{ background:var(--danger-600); border-color:var(--danger-600); }

.btn-warning{ background:var(--warning); border-color:var(--warning-600); color:#111; }
.btn-warning:hover{ background:var(--warning-600); border-color:var(--warning-600); color:#111; }
.btn-warning.strong{ box-shadow:0 0 0 3px rgba(245,158,11,.25); }

.btn-ghost{ background:transparent; color:var(--text); border:1px solid var(--border); }
.btn-ghost:hover{ background:#1a2540; }

/* 모달 공통 */
.modal-backdrop{
  position:fixed; inset:0; display:grid; place-items:center;
  background: var(--backdrop-dim);
  backdrop-filter: blur(2px);
  z-index:60; animation: fadeIn .12s ease;
}
@keyframes fadeIn { from{ opacity:0 } to{ opacity:1 } }

.modal-card{
  width:min(720px, 94vw); max-height:90vh; padding:12px;
  background:#000 !important; color:#fff;
  border:1px solid #1b2744; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.55);
  transform:translateY(6px); animation: pop .14s ease forwards;
}
@keyframes pop { to { transform:translateY(0) } }

.modal-header{
  display:flex; justify-content:space-between; align-items:center;
  padding:8px 10px 10px; border-bottom:1px solid #1b2744;
}
.modal-header.compact{ padding:6px 10px 8px; }

.modal-body.form{ display:flex; flex-direction:column; gap:10px; padding:10px 8px 12px; }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.label{ color:#cbd5e1; font-size:13px; }

/* 삭제 확인 모달 */
.confirm-card{ width:min(440px, 92vw); border-top:3px solid var(--danger); }
.confirm-body{ padding:12px 8px; }
.confirm-msg{ margin:0 0 8px; color:#d1d5db; }
.confirm-actions{ display:flex; gap:8px; justify-content:flex-end; padding-top:8px; border-top:1px solid #1b2744; }

/* 보기 모달 */
.view-card{ width:min(760px, 95vw); }
.view-body{ padding:12px 10px; }
.view-title{ margin:0 0 6px; font-size:18px; }
.view-meta{ display:flex; gap:8px; align-items:center; margin-bottom:10px; flex-wrap:wrap; }
.view-content{
  white-space:pre-wrap;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  line-height:1.6;
  background:#0b1324;
  border:1px solid var(--border);
  border-radius:10px;
  padding:12px;
  max-height:55vh; overflow:auto;
  margin:0;
}

/* 카드/레이아웃 */
.card{ background:var(--card); border:1px solid #1b2744; border-radius:12px; padding:12px; }
.stack{ display:flex; flex-direction:column; gap:10px; }
textarea.input{height: 200px;}
</style>
