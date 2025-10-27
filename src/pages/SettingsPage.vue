<template>
  <div class="settings">
    <!-- 🔐 1) 잠금 상태: 비밀번호 카드 하나만 가운데 -->
    <template v-if="!verified">
      <div class="center">
        <div class="card gate-only">
          <h2 class="title">보안 확인</h2>
          <p class="muted">설정에 들어가기 전에 비밀번호를 한 번 더 확인합니다.</p>

          <form class="stack" @submit.prevent="doVerify">
            <input
              class="input"
              v-model.trim="gatePassword"
              type="password"
              autocomplete="current-password"
              placeholder="현재 비밀번호"
            />
            <button class="btn" :disabled="verifying">
              {{ verifying ? '확인 중…' : '확인' }}
            </button>
          </form>

          <p v-if="gateMsg" :style="{ color: gateOk ? '#86efac' : '#fca5a5', marginTop: '8px' }">
            {{ gateMsg }}
          </p>
        </div>
      </div>
    </template>

    <!-- ✅ 2) 해제 상태: 전체 설정 폼 노출 -->
    <template v-else>
      <!-- 헤더 -->
      <div class="card header-card">
        <h1 class="title" style="margin:0">설정</h1>
        <p class="badge" style="margin-top:8px;font-size: 16px;">내 정보(이름·비밀번호·프로필 이미지) 관리</p>
      </div>

      <!-- 두 컬럼 레이아웃 -->
      <div class="grid">
        <!-- ◀ 왼쪽: 프로필 이미지 섹션 -->
        <div
          class="card compact-card profile-card"
          @dragover.prevent
          @drop.prevent
        >
          <h3 class="section-title">프로필 이미지</h3>

          <div class="avatar-wrap pretty">
            <div class="avatar-frame">
              <div class="ring"></div>
              <div class="avatar lg hoverable">
                <img v-if="avatarUrl" :src="avatarUrl" alt="프로필" />
                <div v-else class="empty-avatar">{{ initials }}</div>
              </div>
            </div>
          </div>

          <!-- ⬇ 파일선택 → 안내문구(가운데) → 버튼들(업로드/삭제) -->
          <div class="upload-col">
            <!-- 드롭존 + 클릭 파일선택 -->
            <label class="file-center dropzone">
              <input
                class="file-input"
                type="file"
                accept="image/png,image/jpeg"
                @change="onPickImage"
              />
              <div class="dz-inner">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 16V4m0 12l-4-4m4 4l4-4M6 20h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="file-text">{{ pickedFile ? pickedFile.name : '파일 선택 또는 드래그 앤 드롭' }}</span>
              </div>
            </label>

            <!-- 안내문구: 중앙 정렬, 파일선택 바로 아래 -->
            <div class="help-note">
              <small class="muted">PNG/JPEG, 최대 2MB</small>
              <p v-if="imgMsg" :style="{ color: imgOk ? '#86efac' : '#fca5a5' }">{{ imgMsg }}</p>
            </div>

            <!-- 버튼들 (업로드/삭제 나란히) -->
            <div class="btn-row">
              <button class="btn" :disabled="imgUploading" @click="uploadImage">
                {{ imgUploading ? '업로드 중…' : '업로드' }}
              </button>
              <button class="btn danger" :disabled="imgRemoving" @click="removeImage">
                {{ imgRemoving ? '삭제 중…' : '삭제' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ▶ 오른쪽: 이름 + 비밀번호 -->
        <div class="stack-col">
          <!-- 표시 이름 -->
          <div class="card">
            <h3 class="section-title">표시 이름 변경</h3>
            <form @submit.prevent="saveName" class="stack">
              <input class="input" v-model.trim="username" type="text" placeholder="표시 이름(최대 100자)" />
              <button class="btn" :disabled="nameSaving">{{ nameSaving ? '저장 중…' : '저장' }}</button>
            </form>
            <p v-if="nameMsg" :style="{ color: nameOk ? '#86efac' : '#fca5a5', marginTop: '8px' }">{{ nameMsg }}</p>
          </div>

          <!-- 비밀번호 변경 -->
          <div class="card">
            <h3 class="section-title">비밀번호 변경</h3>
            <form @submit.prevent="changePassword" class="stack">
              <!-- 현재 비밀번호 -->
              <div class="pw-field">
                <input
                  class="input"
                  v-model.trim="currentPassword"
                  :type="showCurrent ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="현재 비밀번호"
                />
                <button class="icon-btn" type="button" @click="showCurrent=!showCurrent" :aria-pressed="showCurrent">
                  <span v-if="showCurrent">🙈</span><span v-else>👁️</span>
                </button>
              </div>

              <!-- 새 비밀번호 + 정책 안내 -->
              <div class="pw-field">
                <input
                  class="input"
                  v-model.trim="newPassword"
                  :type="showNew ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="8자 이상 / 특수문자 허용 / 2종류 이상"
                  @input="recalcPolicy"
                />
                <button class="icon-btn" type="button" @click="showNew=!showNew" :aria-pressed="showNew">
                  <span v-if="showNew">🙈</span><span v-else>👁️</span>
                </button>
              </div>

              <!-- 정책 체크리스트 -->
              <ul class="policy">
                <li><i :class="okLen ? 'ok' : 'neutral'"></i>길이 8자 이상 (최대 64자)</li>
                <li><i :class="okKinds ? 'ok' : 'neutral'"></i>영문 대/소문자/숫자 중 <b>2종류 이상</b></li>
                <li><i :class="okNoSeq ? 'ok' : 'neutral'"></i>연속된 문자/숫자열 <b>3자리 이상 금지</b></li>
                <li><i :class="okNoKeyboard ? 'ok' : 'neutral'"></i>키보드 연속열(qwe, asd, zxc, 123 등) <b>금지</b></li>
                <li><i class="always"></i>특수문자 사용 가능</li>
              </ul>

              <!-- 새 비밀번호 확인 -->
              <div class="pw-field">
                <input
                  class="input"
                  v-model.trim="newPassword2"
                  :type="showNew2 ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="새 비밀번호 확인"
                />
                <button class="icon-btn" type="button" @click="showNew2=!showNew2" :aria-pressed="showNew2">
                  <span v-if="showNew2">🙈</span><span v-else>👁️</span>
                </button>
              </div>

              <button class="btn" :disabled="pwLoading || !canSubmitPw">
                {{ pwLoading ? '변경 중…' : '변경' }}
              </button>
            </form>
            <p v-if="pwMsg" :style="{color: pwOk ? '#86efac' : '#fca5a5', marginTop:'8px'}">{{ pwMsg }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import api from '@/api/http'

/* 상태 */
const me = ref(null)
const verified = ref(false)

/* ─ 비번 확인 ─ */
const gatePassword = ref('')
const verifying = ref(false)
const gateMsg = ref('')
const gateOk = ref(false)

async function doVerify () {
  gateMsg.value = ''; gateOk.value = false
  if (!gatePassword.value) { gateMsg.value = '비밀번호를 입력해 주세요.'; return }
  verifying.value = true
  try {
    await api.post('/users/me/verify-password', { password: gatePassword.value })
    verified.value = true
    gateOk.value = true
    gateMsg.value = '확인되었습니다.'
    await fetchMe()
    await loadAvatar()
  } catch (e) {
    gateMsg.value = e?.response?.data?.reason === 'BAD_PASSWORD'
      ? '비밀번호가 올바르지 않습니다.'
      : '확인 중 오류가 발생했습니다.'
  } finally {
    gatePassword.value = ''
    verifying.value = false
  }
}

/* ─ 내 정보 ─ */
const username = ref('')
async function fetchMe () {
  const { data } = await api.get('/users/me')
  me.value = data
  username.value = data?.username || ''
}
const initials = computed(() => {
  const s = (me.value?.username || me.value?.userid || 'U').toUpperCase()
  return s.slice(0, 2)
})

/* ─ 프로필 이미지 ─ */
const avatarUrl = ref('')
let objectUrl = ''
let pickedFile = null
const imgUploading = ref(false)
const imgRemoving = ref(false)
const imgMsg = ref('')
const imgOk = ref(false)

async function loadAvatar () {
  cleanupObjectUrl()
  try {
    const res = await api.get('/users/me/profile-image', { responseType: 'blob' })
    objectUrl = URL.createObjectURL(res.data)
    avatarUrl.value = objectUrl
  } catch { avatarUrl.value = '' }
}
function onPickImage (e) {
  imgMsg.value = ''; imgOk.value = false
  const f = e.target.files?.[0]; pickedFile = null
  if (!f) return
  if (!/image\/(png|jpeg)/i.test(f.type)) { imgMsg.value = 'PNG 또는 JPEG만 업로드 가능합니다.'; return }
  if (f.size > 2 * 1024 * 1024) { imgMsg.value = '최대 2MB까지 업로드할 수 있습니다.'; return }
  pickedFile = f
  const r = new FileReader(); r.onload = () => { avatarUrl.value = r.result }; r.readAsDataURL(f)
}
async function uploadImage () {
  if (!pickedFile) { imgMsg.value = '파일을 선택해 주세요.'; imgOk.value = false; return }
  imgUploading.value = true; imgMsg.value = ''; imgOk.value = false
  try {
    const fd = new FormData(); fd.append('file', pickedFile)
    await api.post('/users/me/profile-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    imgOk.value = true; imgMsg.value = '업로드 완료.'; await loadAvatar()
  } catch { imgMsg.value = '업로드 실패.' }
  finally { imgUploading.value = false }
}
async function removeImage () {
  imgRemoving.value = true; imgMsg.value = ''; imgOk.value = false
  try {
    await api.delete('/users/me/profile-image')
    avatarUrl.value = ''
    cleanupObjectUrl()
    imgOk.value = true; imgMsg.value = '삭제 완료.'
  } catch { imgMsg.value = '삭제 실패.' }
  finally { imgRemoving.value = false }
}
function cleanupObjectUrl () {
  if (objectUrl) { try { URL.revokeObjectURL(objectUrl) } catch {} ; objectUrl = '' }
}
onBeforeUnmount(() => cleanupObjectUrl())

/* ─ 이름 변경 ─ */
const nameSaving = ref(false)
const nameMsg = ref('')
const nameOk = ref(false)
async function saveName () {
  nameMsg.value = ''; nameOk.value = false
  const val = (username.value || '').trim()
  if (!val) { nameMsg.value = '이름을 입력해 주세요.'; return }
  if (val.length > 100) { nameMsg.value = '최대 100자까지 가능합니다.'; return }
  nameSaving.value = true
  try {
    await api.put('/users/me/name', { username: val })
    nameOk.value = true; nameMsg.value = '저장되었습니다.'
    await fetchMe()
  } catch (e) {
    nameMsg.value = e?.response?.data?.reason || '저장 실패'
  } finally { nameSaving.value = false }
}

/* ─ 비밀번호 변경 ─ */
const currentPassword = ref('')
const newPassword = ref('')
const newPassword2 = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const showNew2 = ref(false)
const pwLoading = ref(false)
const pwMsg = ref('')
const pwOk = ref(false)

/* 정책 체크 */
const okLen = ref(false)
const okKinds = ref(false)
const okNoSeq = ref(true)
const okNoKeyboard = ref(true)

function recalcPolicy () {
  const s = newPassword.value || ''
  okLen.value = s.length >= 8 && s.length <= 64

  const hasLower = /[a-z]/.test(s)
  const hasUpper = /[A-Z]/.test(s)
  const hasDigit = /\d/.test(s)
  const kinds = [hasLower, hasUpper, hasDigit].filter(Boolean).length
  okKinds.value = kinds >= 2

  okNoSeq.value = !hasSequentialRun(s, 3)
  okNoKeyboard.value = !hasKeyboardRun(s.toLowerCase(), 3)
}
function hasSequentialRun(str, n) {
  if (str.length < n) return false
  for (let i = 0; i <= str.length - n; i++) {
    let asc = true, desc = true
    for (let j = 1; j < n; j++) {
      const a = str.charCodeAt(i + j - 1)
      const b = str.charCodeAt(i + j)
      if (b !== a + 1) asc = false
      if (b !== a - 1) desc = false
      if (!asc && !desc) break
    }
    if (asc || desc) return true
  }
  return false
}
const rows = ['`1234567890-=','qwertyuiop[]\\','asdfghjkl;\'','zxcvbnm,./']
function hasKeyboardRun(s, n) {
  if (s.length < n) return false
  const all = rows.concat(rows.map(r=>[...r].reverse().join('')))
  for (const r of all) {
    for (let i = 0; i <= r.length - n; i++) {
      const seg = r.slice(i, i + n)
      if (s.includes(seg)) return true
    }
  }
  return false
}

const canSubmitPw = computed(() =>
  currentPassword.value &&
  newPassword.value &&
  newPassword2.value &&
  newPassword.value === newPassword2.value &&
  okLen.value && okKinds.value && okNoSeq.value && okNoKeyboard.value
)

async function changePassword () {
  pwMsg.value = ''; pwOk.value = false
  if (!canSubmitPw.value) { pwMsg.value = '비밀번호 정책을 확인해 주세요.'; return }
  pwLoading.value = true
  try {
    await api.post('/users/me/password', { currentPassword: currentPassword.value, newPassword: newPassword.value })
    pwOk.value = true; pwMsg.value = '비밀번호가 변경되었습니다. 다시 로그인해야 할 수 있습니다.'
    currentPassword.value = ''; newPassword.value = ''; newPassword2.value = ''
    okLen.value = okKinds.value = true; okNoSeq.value = okNoKeyboard.value = true
  } catch (e) {
    const reason = e?.response?.data?.reason
    if (reason === 'BAD_CURRENT_PASSWORD') pwMsg.value = '현재 비밀번호가 올바르지 않습니다.'
    else if (reason === 'PASSWORD_POLICY_VIOLATION') pwMsg.value = e?.response?.data?.message || '비밀번호 정책 위반'
    else if (reason === 'SAME_AS_OLD') pwMsg.value = '이전 비밀번호와 동일합니다.'
    else pwMsg.value = '변경 실패. 현재 비밀번호 또는 정책을 확인하세요.'
  } finally { pwLoading.value = false }
}
</script>

<style scoped>
/* 페이지 컨테이너 */
.settings { display:flex; flex-direction:column; gap:12px; }
.header-card{ position:sticky; top:0; z-index:1; }

/* 잠금 화면 전용 센터링 */
.center{ min-height:60vh; display:grid; place-items:center; padding:16px; }
.gate-only{ width:min(520px, 92vw); }

/* 레이아웃 */
.grid{
  display:grid;
  grid-template-columns: 1fr 1.2fr;
  gap:12px;
}
.stack-col{ display:flex; flex-direction:column; gap:12px; }

/* 공통 UI */
.card{ background:#0f1627; border:1px solid #1b2744; border-radius:12px; padding:12px; }
.compact-card{ padding:10px 12px; }
.title{ margin:0 0 6px; font-size:24px; font-weight:900; }
.section-title{ margin:0 0 8px; font-weight:900; }
.badge{ display:inline-block; padding:4px 10px; border:1px solid #253252; border-radius:999px; color:#94a3b8; }
.muted{ color:#8fa0bf; }
.stack{ display:flex; flex-direction:column; gap:10px; }
.input{
  background:#0b1324; border:1px solid #253252; color:#e5e7eb;
  border-radius:10px; padding:10px 12px; min-width:260px;
}
.btn{
  background:linear-gradient(135deg, #06b6d4, #4f46e5); color:#fff;
  border:1px solid transparent; border-radius:10px; padding:10px 12px; cursor:pointer; font-weight:800;
}
.btn.danger{ background:linear-gradient(135deg, #ef4444, #f59e0b); }

/* ───────── 프로필 카드 미려화 ───────── */
.profile-card{ overflow:hidden; position:relative; }

.avatar-wrap.pretty{ display:grid; place-items:center; margin:8px 0 18px; }
.avatar-frame{
  position:relative;
  inline-size:180px; block-size:180px;
  display:grid; place-items:center;
}
.avatar-frame .ring{
  position:absolute; inset:0;
  border-radius:999px;
  background: conic-gradient(from 220deg,
    #60a5fa 0%, #22d3ee 25%, #a78bfa 50%, #60a5fa 100%);
  filter: blur(6px) saturate(120%);
  opacity:.35;
  transition: opacity .25s ease, filter .25s ease;
}
.avatar-frame:hover .ring{ opacity:.55; filter: blur(8px) saturate(140%); }

.avatar{ inline-size:80px; block-size:80px; display:grid; place-items:center; }
.avatar.lg{
  inline-size:160px; block-size:160px;
  border-radius:999px; overflow:hidden;
  background:#111c33;
  border:1px solid #243352;
  box-shadow: 0 10px 24px rgba(0,0,0,.35), inset 0 0 0 6px rgba(17, 24, 39, .6);
  backdrop-filter: blur(2px);
}
.avatar.hoverable{ transition: transform .25s ease; }
.avatar.hoverable:hover{ transform: translateY(-2px) scale(1.02); }

.avatar img{ width:100%; height:100%; object-fit:cover; display:block; }
.empty-avatar{ color:#d3defa; font-weight:900; font-size:30px; }

/* 업로드 세로 컬럼 */
.upload-col{
  display:flex; flex-direction:column; gap:10px; align-items:center;
  margin-bottom:6px;
}
/* 드롭존 + 파일 선택 */
.file-center{
  position:relative;
  display:flex; align-items:center; justify-content:center;
  width:100%; max-width:360px;
  min-height:48px;
  padding: 10px 14px;
  border:1.5px dashed #2b3b66; border-radius:12px;
  background:#0b1324; color:#e5e7eb; cursor:pointer;
}
.file-center.dropzone{ transition: border-color .2s ease, background .2s ease, box-shadow .2s ease; }
.file-center.dropzone:hover{
  border-color:#3b82f6; background:#0c1530; box-shadow:0 0 0 3px rgba(59,130,246,.15);
}
.dz-inner{ display:flex; gap:10px; align-items:center; justify-content:center; color:#a5b4fc; }
.dz-inner svg{ opacity:.9; }

.file-input{ position:absolute; inset:0; opacity:0; cursor:pointer; }
.file-text{
  pointer-events:none; user-select:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  max-width: calc(100% - 8px); text-align:center;
}

/* 안내문구: 중앙 정렬 + 아래쪽 여백 */
.help-note{
  display:flex; flex-direction:column; align-items:center; gap:6px;
  margin-top:6px; margin-bottom:8px;  /* ← 파일선택과 버튼 사이 간격 */
  min-height: 22px;
}

/* 버튼들 나란히 */
.btn-row{
  display:flex; gap:10px; justify-content:center; width:100%; max-width:360px;
}
.btn-row .btn{ flex: 1 1 0; }

/* 비밀번호 필드/아이콘 */
.pw-field{ position:relative; }
.icon-btn{
  position:absolute; right:8px; top:50%; transform:translateY(-50%);
  border:none; background:transparent; color:#cbd5e1; cursor:pointer; font-size:18px; padding:2px 4px;
}

/* 정책 리스트 */
.policy{ list-style:none; margin:6px 0 0; padding:8px 10px; border:1px solid #223054; border-radius:10px; background:#0b1324; }
.policy li{ display:flex; align-items:center; gap:8px; padding:4px 0; color:#c9d5ff; font-size:14px; }
.policy i{ inline-size:18px; block-size:18px; border-radius:999px; display:inline-grid; place-items:center; font-style:normal; border:1px solid #2b3b66; }
.policy i.ok{ background:#064e3b; color:#86efac; border-color:#065f46; }
.policy i.ok::before{ content:'✔'; font-size:12px; }
.policy i.neutral{ background:#111827; color:#94a3b8; }
.policy i.neutral::before{ content:'•'; font-size:12px; }
.policy i.always{ background:#12203f; color:#93c5fd; border-color:#233153; }
.policy i.always::before{ content:'ℹ'; font-size:12px; }

/* 반응형 */
@media (max-width: 860px){
  .grid{ grid-template-columns: 1fr; }
}
</style>
