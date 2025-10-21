<template>
  <div class="stack">
    <div class="card">
      <h2 style="margin:0">사용자 관리</h2>
      <p class="badge" style="margin-top:8px">관리자가 다른 계정을 생성/관리하는 화면</p>
    </div>

    <div class="card">
      <h3 style="margin:0 0 12px">새 계정 생성</h3>
      <form @submit.prevent="createUser" class="stack" style="max-width:520px">
        <input class="input" v-model.trim="form.userid" placeholder="새 ID (영문/숫자)"/>
        <input class="input" v-model="form.password" type="password" placeholder="비밀번호 (8자 이상)"/>
        <input class="input" v-model.trim="form.username" placeholder="표시 이름 (선택)"/>
        <select class="input" v-model="form.role">
          <option value="ROLE_USER">ROLE_USER</option>
          <option value="ROLE_DRIVER">ROLE_DRIVER</option>
          <option value="ROLE_ADMIN">ROLE_ADMIN</option>
        </select>
        <button class="btn" :disabled="loading">생성</button>
      </form>
      <p v-if="message" :style="{color:messageColor,marginTop:'8px'}">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import api from '@/api/http'

const form = reactive({
  userid: '',
  password: '',
  username: '',
  role: 'ROLE_USER',
})
const loading = ref(false)
const message = ref('')
const messageColor = ref('var(--muted)')

const createUser = async () => {
  message.value = ''
  loading.value = true
  try {
    const { data } = await api.post('/auth/register', {
      userid: form.userid,
      password: form.password,
      username: form.username || null,
      role: form.role,
    })
    message.value = `생성 완료: ${data.userid}`
    messageColor.value = '#86efac'
  } catch (e) {
    message.value = '생성 실패. 중복 또는 정책 위반을 확인하세요.'
    messageColor.value = '#fca5a5'
  } finally {
    loading.value = false
  }
}
</script>
