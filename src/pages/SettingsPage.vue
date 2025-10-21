<template>
  <div class="stack">
    <div class="card">
      <h2 style="margin:0">설정</h2>
      <p class="badge" style="margin-top:8px">내 비밀번호 변경 등</p>
    </div>

    <div class="card" style="max-width:520px">
      <h3 style="margin:0 0 12px">비밀번호 변경</h3>
      <form @submit.prevent="changePassword" class="stack">
        <input class="input" v-model="currentPassword" type="password" placeholder="현재 비밀번호"/>
        <input class="input" v-model="newPassword" type="password" placeholder="새 비밀번호 (정책 준수)"/>
        <button class="btn" :disabled="loading">변경</button>
      </form>
      <p v-if="message" :style="{color: messageColor, marginTop:'8px'}">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api/http'

const currentPassword = ref('')
const newPassword = ref('')
const message = ref('')
const messageColor = ref('var(--muted)')
const loading = ref(false)

const changePassword = async () => {
  loading.value = true
  message.value = ''
  try {
    await api.post('/users/me/password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    message.value = '비밀번호가 변경되었습니다. 다시 로그인하세요.'
    messageColor.value = '#86efac'
  } catch (e) {
    message.value = '변경 실패. 현재 비밀번호 또는 정책을 확인하세요.'
    messageColor.value = '#fca5a5'
  } finally {
    loading.value = false
  }
}
</script>
