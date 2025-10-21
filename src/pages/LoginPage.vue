<template>
  <div class="card" style="width:360px">
    <h2 style="margin:0 0 12px">관리자 로그인</h2>
    <p class="badge" style="margin-bottom:12px">ADMIN_APP · WEB</p>

    <form @submit.prevent="onSubmit" class="stack">
      <input class="input" v-model="userid" placeholder="ID" autocomplete="username"/>
      <input class="input" v-model="password" type="password" placeholder="Password" autocomplete="current-password"/>
      <button class="btn" :disabled="auth.loading" style="width:100%">로그인</button>
    </form>

    <p v-if="error" style="color:#fca5a5;margin-top:10px">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const userid = ref('')
const password = ref('')
const error = ref('')

const onSubmit = async () => {
  error.value = ''
  try {
    await auth.login({ userid: userid.value, password: password.value })
    const to = route.query.redirect || '/'
    router.replace(to)
  } catch (e) {
    error.value = '로그인 실패. 아이디/비밀번호를 확인하세요.'
  }
}
</script>
