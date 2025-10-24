<template>
  <div class="page">
    <!-- 상단 헤더/안내는 전체 폭 -->
    <div class="stack">
      <div class="card head">
        <div class="head-row">
          <div>
            <h1 class="title">관리자 계정 생성</h1>
            <p class="badge">새 관리자 계정을 생성하고, 현재 관리자 목록을 확인하세요.</p>
          </div>
          <router-link class="btn ghost" :to="{ name: 'users' }">사용자 관리로</router-link>
        </div>
      </div>

      <div class="card note-card">
        <div class="note-row">
          <span class="icon-circle">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 14h-2v-6h2v6Zm0-8h-2V6h2v2Z" fill="currentColor"/>
            </svg>
          </span>
          <div class="note-text">
            <strong>생성 안내</strong>
            <p>
              이 화면에서는 <b>관리자</b> 계정만 생성할 수 있습니다.<br/>
              생성 시 회사명은 <b>HopOn</b>, 승인 상태는 <b>승인됨</b>으로 자동 설정되며, 기본 프로필 이미지가 적용됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 본문: 좌측 폼 / 우측 관리자 목록 -->
    <div class="content-grid">
      <!-- ◀ 좌측: 폼 (레이블 좌측 정렬 + 가운데 배치 느낌 유지) -->
      <div class="col">
        <div class="card">
          <form class="form centered" @submit.prevent="openConfirm">
            <!-- 아이디 -->
            <div class="field-row">
              <label class="label" for="userid">아이디</label>
              <div class="control">
                <div class="input-wrap with-suffix">
                  <span class="input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5Z" fill="currentColor"/></svg>
                  </span>
                  <input
                    id="userid"
                    class="input"
                    v-model.trim="form.userid"
                    placeholder="영문/숫자/._- 4~32자"
                    autocomplete="off"
                    @input="idChecked = null"
                    @blur="validateUserid"
                  />
                  <button type="button" class="input-suffix btn-ghost" @click="checkDuplicate" :disabled="!validIdFormat || checkingId">
                    {{ checkingId ? '확인중…' : '중복확인' }}
                  </button>
                </div>
                <p v-if="v.userid" class="hint error">{{ v.userid }}</p>
                <p v-else-if="idChecked === true" class="hint ok">사용 가능한 아이디입니다.</p>
                <p v-else-if="idChecked === false" class="hint error">이미 사용 중인 아이디입니다.</p>
              </div>
            </div>

            <!-- 비밀번호 -->
            <div class="field-row">
              <label class="label" for="password">비밀번호</label>
              <div class="control">
                <div class="input-wrap">
                  <span class="input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 0V6a2 2 0 0 1 4 0v2h-4Z" fill="currentColor"/></svg>
                  </span>
                  <input
                    id="password"
                    class="input"
                    v-model="form.password"
                    :type="showPw ? 'text' : 'password'"
                    placeholder="8자 이상 / 특수문자 허용 / 2종류 이상"
                    autocomplete="new-password"
                    @input="validatePassword()"
                  />
                  <button class="input-suffix" type="button" @click="showPw=!showPw" :aria-label="showPw ? '비밀번호 숨기기' : '비밀번호 보기'">
                    <svg v-if="!showPw" width="16" height="16" viewBox="0 0 24 24"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Zm0 12a5 5 0 1 1 5-5 5 5 0 0 1-5 5Z" fill="currentColor"/></svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24"><path d="M2 5.27 3.28 4 20 20.72 18.73 22l-2.46-2.46A10.46 10.46 0 0 1 12 19C7 19 2.73 15.89 1 12a12.62 12.62 0 0 1 5-5.73L2 5.27ZM12 7a5 5 0 0 1 5 5 4.93 4.93 0 0 1-.48 2.14l-6.66-6.66A4.93 4.93 0 0 1 12 7Z" fill="currentColor"/></svg>
                  </button>
                </div>

                <ul class="rules">
                  <li :class="{ok: rule.len}">길이 8자 이상 (최대 64자)</li>
                  <li :class="{ok: rule.classes}">영문 대/소문자/숫자 중 2종류 이상</li>
                  <li :class="{ok: rule.noSeq}">연속된 문자/숫자열 3자리 이상 금지</li>
                  <li :class="{ok: rule.noKey}">키보드 연속열(qwe, asd, zxc, 123 등) 금지</li>
                  <li class="muted">특수문자 사용 가능</li>
                </ul>
              </div>
            </div>

            <!-- 비밀번호 확인 -->
            <div class="field-row">
              <label class="label" for="password2">비밀번호 확인</label>
              <div class="control">
                <div class="input-wrap">
                  <span class="input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" fill="currentColor"/></svg>
                  </span>
                  <input
                    id="password2"
                    class="input"
                    v-model="password2"
                    :type="showPw ? 'text' : 'password'"
                    placeholder="비밀번호 재입력"
                    @input="comparePw"
                  />
                </div>
                <p v-if="password2.length>0 && pwMatch" class="hint ok">비밀번호가 일치합니다.</p>
                <p v-else-if="password2.length>0 && !pwMatch" class="hint error">비밀번호가 일치하지 않습니다.</p>
              </div>
            </div>

            <!-- 표시 이름 -->
            <div class="field-row">
              <label class="label" for="username">표시 이름 (선택)</label>
              <div class="control">
                <div class="input-wrap">
                  <span class="input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5Z" fill="currentColor"/></svg>
                  </span>
                  <input
                    id="username"
                    class="input"
                    v-model.trim="form.username"
                    placeholder="이름 또는 별칭 (선택)"
                    autocomplete="off"
                  />
                </div>
              </div>
            </div>

            <!-- 권한(읽기 전용, 한국어 표기) -->
            <div class="field-row">
              <label class="label">권한</label>
              <div class="control">
                <div class="pill role-pill" title="이 화면에서는 관리자 권한만 생성 가능합니다.">
                  관리자 <span class="role-fixed"> (고정)</span>
                </div>
              </div>
            </div>

            <div class="actions">
              <button class="btn" :disabled="loading || !canSubmit">
                {{ loading ? '생성 중…' : '관리자 계정 생성' }}
              </button>
              <button class="btn ghost" type="button" @click="resetForm" :disabled="loading">초기화</button>
            </div>

            <p v-if="message" :class="['note', messageType]">{{ message }}</p>
          </form>
        </div>
      </div>

      <!-- 관리자 목록 -->
      <div class="col">
        <div class="card">
          <div class="admin-list-head">
            <h2 class="section-title">관리자 목록</h2>
            <div class="tools">
              <input class="input sm" v-model.trim="search" placeholder="관리자 검색 (아이디/이름)" @keyup.enter="fetchAdmins(1)" />
              <button class="btn-ghost sm" @click="fetchAdmins(1)">검색</button>

              <div class="seg sm">
                <button class="seg-btn" :class="{ active: sortDir === 'desc' }" @click="setSort('desc')">최신순</button>
                <button class="seg-btn" :class="{ active: sortDir === 'asc' }" @click="setSort('asc')">오래된순</button>
              </div>
            </div>
          </div>

          <div v-if="adminError" class="error-box">{{ adminError }}</div>

          <div v-else>
            <div v-if="admins.length === 0" class="empty">관리자 계정이 없습니다.</div>

            <ul v-else class="admin-list">
              <li v-for="a in admins" :key="a.userNum" class="admin-item">
                <div class="ai-main">
                  <div class="ai-name">
                    <img :src="a.profileImage || '/path/to/default-image.jpg'" alt="Profile Image" class="profile-img" />
                    <strong>{{ a.username || a.userid }}</strong>
                    <span class="ai-id">@{{ a.userid }}</span>
                  </div>
                  <div class="ai-sub">
                    <span class="badge badge-role">관리자</span>
                    <template v-if="a.createdAtIso">
                      · <span :title="a.createdAtIso">가입 {{ fmtDate(a.createdAtIso) }}</span>
                    </template>
                    <template v-if="a.loggedIn">
                      · <span class="dot online"></span> 로그인됨
                    </template>
                  </div>
                </div>
                <div class="ai-meta">
                  <span class="mini">마지막 로그인</span>
                  <span class="mini strong">{{ a.lastLoginAtIso ? fmtDate(a.lastLoginAtIso) : '-' }}</span>
                </div>
              </li>
            </ul>

            <div class="pager-footer" v-if="totalAdmins > size">
              <button class="pager-btn" :disabled="page <= 1" @click="fetchAdmins(page - 1)">이전</button>
              <span class="pager-meta">{{ page }} / {{ totalPages }}</span>
              <button class="pager-btn" :disabled="page >= totalPages" @click="fetchAdmins(page + 1)">다음</button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 확인 모달 -->
    <div v-if="confirm.open" class="modal" @keydown.esc="closeConfirm" tabindex="-1">
      <div class="overlay" @click="closeConfirm"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h2 id="confirmTitle">관리자 계정 생성 확인</h2>
        <p class="muted">아래 정보로 관리자 계정을 생성합니다. 진행할까요?</p>

        <div class="summary">
          <div class="row"><span>아이디</span><strong>{{ form.userid }}</strong></div>
          <div class="row"><span>표시 이름</span><strong>{{ form.username || '—' }}</strong></div>
          <div class="row"><span>회사</span><strong>HopOn</strong></div>
          <div class="row"><span>승인 상태</span><strong>승인됨</strong></div>
          <div class="row"><span>권한</span><strong>관리자</strong></div>
        </div>

        <div class="dialog-actions">
          <button class="btn ghost" type="button" @click="closeConfirm" :disabled="loading">취소</button>
          <button class="btn" type="button" @click="confirmCreate" :disabled="loading">
            {{ loading ? '생성 중…' : '확인' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/http'

const router = useRouter()

/* ───────── 좌측: 생성 폼 상태 ───────── */
const form = reactive({ userid: '', password: '', username: '' })
const password2 = ref('')
const showPw = ref(false)

const v = reactive({ userid: '' })
const idChecked = ref(null)
const checkingId = ref(false)

const message = ref('')
const messageType = ref('muted')
const loading = ref(false)

/* 모달 */
const confirm = reactive({ open: false })
function openConfirm () { if (!canSubmit.value) return; confirm.open = true }
function closeConfirm () { if (loading.value) return; confirm.open = false }
// 정렬 상태 (기본: 최신순)
const sortDir = ref('desc')
function setSort(dir){
  if (sortDir.value === dir) return
  sortDir.value = dir
  fetchAdmins(1) // 첫 페이지로 재조회
}

/* 아이디 검사/중복확인 */
const idRegex = /^[a-zA-Z0-9._-]{4,32}$/
const validIdFormat = computed(() => idRegex.test(form.userid || ''))
function validateUserid(){ v.userid = ''; if (!validIdFormat.value) v.userid = '아이디는 영문/숫자/._- 조합 4~32자여야 합니다.' }
async function checkDuplicate(){
  validateUserid(); if (v.userid) return
  idChecked.value = null; checkingId.value = true
  try {
    const { data } = await api.get('/admin/users/exists', { params: { userid: form.userid }})
    idChecked.value = !data?.exists
  } catch {
    idChecked.value = null
  } finally {
    checkingId.value = false
  }
}

/* 비밀번호 규칙 (8+, 특수 허용) */
const rule = reactive({ len: false, classes: false, noSeq: false, noKey: false })
const pwMatch = ref(false)
function validatePassword(){
  const s = form.password || ''
  rule.len = s.length >= 8 && s.length <= 64
  const hasU = /[A-Z]/.test(s), hasL = /[a-z]/.test(s), hasD = /[0-9]/.test(s)
  rule.classes = (hasU + hasL + hasD) >= 2
  rule.noSeq = !hasSeqAlphaOrDigit(s)
  rule.noKey = !hasKeyboardSeq(s)
  comparePw()
}
function comparePw(){ pwMatch.value = (form.password || '').length > 0 && form.password === password2.value }
function hasSeqAlphaOrDigit(s){
  for (let i=0;i<=s.length-3;i++){
    const a=s.charCodeAt(i), b=s.charCodeAt(i+1), c=s.charCodeAt(i+2)
    const isDigit=(x)=>x>=48&&x<=57, isLower=(x)=>x>=97&&x<=122, toLower=(x)=> (x>=65&&x<=90)?x+32:x
    if (isDigit(a)&&isDigit(b)&&isDigit(c)){ if ((b===a+1&&c===b+1)||(b===a-1&&c===b-1)) return true }
    const la=toLower(a), lb=toLower(b), lc=toLower(c)
    if (isLower(la)&&isLower(lb)&&isLower(lc)){ if ((lb===la+1&&lc===lb+1)||(lb===la-1&&lc===lb-1)) return true }
  }
  return false
}
function hasKeyboardSeq(s){
  const lower=(s||'').toLowerCase(), rows=['qwertyuiop','asdfghjkl','zxcvbnm','1234567890','0987654321']
  for (const row of rows){
    for (let i=0;i<=row.length-3;i++){ const sub=row.substring(i,i+3); if (lower.includes(sub)) return true }
    const rev=row.split('').reverse().join('')
    for (let i=0;i<=rev.length-3;i++){ const sub=rev.substring(i,i+3); if (lower.includes(sub)) return true }
  }
  return false
}

/* 제출 가능 */
const allRulesOk = computed(()=> rule.len && rule.classes && rule.noSeq && rule.noKey)
const canSubmit = computed(()=> validIdFormat.value && idChecked.value===true && (form.password?.length>0) && allRulesOk.value && pwMatch.value)

/* 초기화 */
function resetForm(){
  form.userid=''; form.password=''; form.username=''
  password2.value=''; v.userid=''; idChecked.value=null; showPw.value=false
  message.value=''; messageType.value='muted'
  Object.assign(rule, {len:false, classes:false, noSeq:false, noKey:false}); pwMatch.value=false
}

/* 실제 생성 */
async function confirmCreate(){
  loading.value = true; message.value = ''; messageType.value = 'muted'
  try {
    const payload = { userid: form.userid, password: form.password, username: form.username || null, role: 'ROLE_ADMIN' }
    await api.post('/admin/users', payload)
    closeConfirm()
    await router.push({ name: 'users' })
  } catch (e) {
    const status = e?.response?.status; const reason = e?.response?.data?.message || e?.response?.data?.reason
    message.value = `❌ 생성 실패${status ? ` [${status}]` : ''} ${reason ? `- ${reason}` : ''}`; messageType.value = 'error'
  } finally { loading.value = false }
}

/* ───────── 우측: 관리자 목록 상태 ───────── */
const admins = ref([])
const adminError = ref('')
const search = ref('')
const size = 10
const page = ref(1)
const totalAdmins = ref(0)
const totalPages = computed(()=> Math.max(1, Math.ceil(totalAdmins.value / size)))

function fmtDate(iso){
  if (!iso) return '-'
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return iso
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 페이지 네비게이션을 위해 추가된 메소드
async function fetchAdmins(toPage = 1) {
  adminError.value = ''
  try {
    const { data } = await api.get('/admin/users', {
      params: {
        role: 'ROLE_ADMIN',
        q: search.value || undefined,
        page: toPage - 1,
        size,
        sort: `createdAt,${sortDir.value}`, // 정렬 상태 적용
      },
    });
    admins.value = data?.content || [];
    totalAdmins.value = data?.totalElements ?? admins.value.length;
    page.value = toPage;
  } catch (e) {
    const status = e?.response?.status;
    const reason = e?.response?.data?.reason || e?.message || '불러오기 실패';
    adminError.value = `관리자 목록을 불러오지 못했습니다. ${status ? `[${status}] ` : ''}${reason}`;
    admins.value = [];
    totalAdmins.value = 0;
  }
}


fetchAdmins()
</script>

<style scoped>
:root, :host{
  --primary:#2563eb; --primary-600:#1d4ed8;
  --border:#253252; --text:#e5e7eb; --muted:#94a3b8;
  --card:#0f1627; --card2:#0b1220;
  --danger:#ef4444; --success:#16a34a;
  --ok:#16a34a; --warn:#f59e0b;
  --fs-base:15px; --fs-small:13.5px;
}

/* 페이지 하단 패딩으로 푸터와 겹침 방지 */
.page{ padding-bottom: 64px; }

/* 상단 스택 */
.stack{ display:flex; flex-direction:column; gap:10px; }
.card{ background:var(--card); border:1px solid #1b2744; border-radius:12px; padding:12px; }
.head-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.title{ margin:0; font-size:28px; font-weight:900; letter-spacing:.2px; }
.badge{ display:inline-block; margin-top:8px; padding:2px 8px; border-radius:999px; border:1px solid var(--border); color:var(--muted); font-size:16px; }

/* 안내 카드 */
.note-card{ background:linear-gradient(180deg, #0d1425, #0b1220); }
.note-row{ display:flex; gap:10px; align-items:flex-start; }
.icon-circle{ width:28px; height:28px; border-radius:999px; display:grid; place-items:center; background:#12203f; color:#c9d5ff; flex-shrink:0; }
.note-text p{ margin:.25rem 0 0; color:#cbd5e1; font-size:14px; line-height:1.55; }

/* 본문 그리드: 좌/우 2열 */
.content-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
  margin-top:12px;
}
.col{ min-width:0; }

/* ─ 폼: 가운데 배치(+ 좌측 레이블 2열) ─ */
.form.centered{
  max-width: 720px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}
.field-row{
  display: grid;
  grid-template-columns: 160px 1fr;   /* 레이블 고정폭 */
  align-items: start;
  gap: 12px;
}
.label{
  color:#cbd5e1; font-size:14px; font-weight:700;
  line-height: 48px;
  min-height: 48px;
}
.control{ min-width: 0; }

/* 입력 UI */
.input-wrap{ position:relative; }
.input-wrap.with-suffix .input{ padding-right:108px; }
.input{
  width:100%;
  height:48px;
  padding:0 40px 0 36px;
  border:1px solid var(--border);
  border-radius:12px;
  background:#0b1324;
  color:#e5e7eb;
  outline:none;
  font-size:15px;
  transition:border .15s ease, box-shadow .15s ease, background .15s ease;
}
.input.sm{ height:40px; padding-left:12px; padding-right:12px; }
.input::placeholder{ color:#93a4c9aa; }
.input:focus{
  border-color:#2b3b66;
  box-shadow:0 0 0 3px rgba(59,130,246,.25);
  background:#0c1430;
}
.input-icon{
  position:absolute; inset:0 auto 0 10px; display:grid; place-items:center; pointer-events:none; color:#98a6cf;
}
.input-suffix{
  position:absolute; right:8px; top:50%; transform:translateY(-50%);
  background:transparent; border:1px solid var(--border); color:#e5e7eb;
  height:36px; min-width:96px; padding:0 10px; border-radius:10px; display:grid; place-items:center; cursor:pointer;
  font-weight:700;
}
.input-suffix.btn-ghost:hover{ background:#101a33; }

/* 규칙/힌트: 좌측 정렬 */
.rules { list-style:none; padding:6px 2px 0; margin:0; display:grid; gap:4px; font-size:13px; color:#9fb1d6; }
.rules li{ position:relative; padding-left:20px; }
.rules li::before{ content:'•'; position:absolute; left:6px; top:0; opacity:.6; }
.rules li.ok{ color:#86efac; }
.rules li.ok::before{ content:'✓'; left:4px; }
.rules li.muted{ color:#9fb1d699; }
.hint{ font-size:12px; margin:4px 2px 0; }
.hint.ok{ color:#86efac; }
.hint.error{ color:#fca5a5; }

/* 권한 표시 */
.pill{
  display:inline-flex; align-items:center; gap:8px;
  height:38px; padding:0 12px;
  border:1px dashed #334155; border-radius:999px; background:#0a1020; color:#cbd5e1; font-weight:800;
}
.role-fixed{ color:#93c5fd; font-weight:700; font-size:12px; }

/* 버튼/메시지 */
.actions{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:4px; }
.btn{
  background:var(--primary); color:#fff; border:1px solid var(--primary);
  border-radius:12px; padding:10px 14px; font-weight:800; cursor:pointer; min-width:180px;
  transition:transform .03s ease, opacity .2s ease, background .2s ease, border-color .2s ease;
}
.btn:hover{ background:var(--primary-600); border-color:var(--primary-600); }
.btn:active{ transform:translateY(1px); }
.btn:disabled{ opacity:.7; cursor:not-allowed; }
.btn.ghost{ background:transparent; color:#e5e7eb; border:1px solid var(--border); }
.btn-ghost.sm{ height:40px; padding:0 10px; border-radius:10px; }

/* ─ 우측 목록 ─ */
.section-title{ margin:0 0 8px; font-size:18px; font-weight:900; }
.admin-list-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
.tools{ display:flex; gap:6px; align-items:center; }
.error-box{ padding:10px; border:1px solid #5a2a2a; background:#3b1d1d; color:#fca5a5; border-radius:8px; }
.empty{ color:var(--muted); font-size:14px; }
/* 프로필 이미지 스타일 */
/* 프로필 이미지 스타일 */
.profile-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 8px;
}


.admin-list{ list-style:none; padding:0; margin:0; display:grid; gap:8px; }
.admin-item{
  display:flex; justify-content:space-between; align-items:center; gap:12px;
  border:1px solid #1b2744; border-radius:10px; padding:10px 12px; background:#0b1324;
}
.ai-main{ min-width:0; }
.ai-name{ display:flex; gap:8px; align-items:baseline; }
.ai-id{ color:#9fb1d6; font-size:12px; }
.ai-sub{ color:#94a3b8; font-size:12px; }
.badge-role{ border:1px solid #233153; background:#12203f; color:#c9d5ff; padding:2px 8px; border-radius:999px; font-size:12px; }
.dot{ display:inline-block; width:8px; height:8px; border-radius:999px; vertical-align:middle; margin-right:4px; }
.online{ background:#16a34a; }

.ai-meta{ text-align:right; }
.mini{ display:block; font-size:11.5px; color:#9fb1d6; }
.mini.strong{ color:#e5e7eb; font-weight:700; }

/* 정렬 세그먼트 (검색 우측) */
.seg.sm{
  display:inline-flex; align-items:center; gap:0;
  border:1px solid var(--border); border-radius:10px; overflow:hidden;
  height:40px; margin-left:6px;
}
.seg-btn{
  background:transparent; color:var(--text); border:none;
  padding:0 12px; height:100%; cursor:pointer; font-weight:700;
}
.seg-btn + .seg-btn{ border-left:1px solid var(--border); }
.seg-btn.active{
  background:var(--primary); color:#fff;
}

/* 간단 페이저 */
/* 페이지네이션 스타일 */
.pager-footer {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.pager-btn {
  background: transparent;
  color: #e5e7eb;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
}

.pager-meta {
  color: #94a3b8;
  font-size: 12px;
}



/* ─ 모달 ─ */
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
.dialog h2{ margin: 4px 0 6px; font-size: 20px; font-weight: 900; text-align:center; }
.dialog .muted{ color: var(--muted); font-size: 14px; margin: 0 0 12px; text-align:center; }
.summary{ display: grid; gap: 8px; margin: 10px 0 16px; }
.summary .row{ display: flex; justify-content: space-between; gap: 12px; border: 1px dashed #243152; border-radius: 10px; padding: 10px 12px; }
.summary .row span{ color: #9fb1d6; }
.summary .row strong{ color: var(--text); }
.dialog-actions{ display: flex; justify-content: center; gap: 8px; margin-top: 8px; }


/* 반응형: 1열로 전환 */
@media (max-width: 1024px){
  .content-grid{ grid-template-columns: 1fr; }
}
@media (max-width: 640px){
  .field-row{ grid-template-columns: 1fr; }
  .label{ line-height: 1.2; min-height: auto; }
}
</style>
