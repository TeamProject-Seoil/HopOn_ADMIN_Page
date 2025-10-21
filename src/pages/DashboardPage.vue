<template>
  <div class="stack">
    <div class="card">
      <h2 style="margin:0 0 8px">환영합니다 👋</h2>
      <p style="color:var(--muted);margin:0">
        이 영역엔 관리용 위젯을 배치하세요. (예: 신규 드라이버 승인 건수, 최근 접속, 시스템 상태 등)
      </p>
    </div>

    <div class="card">
      <h3 style="margin:0 0 8px">빠른 작업</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <router-link class="btn-ghost" :to="{name:'users'}">새 계정 만들기</router-link>
        <router-link class="btn-ghost" :to="{name:'drivers'}">드라이버 승인 대기</router-link>
        <router-link class="btn-ghost" :to="{name:'settings'}">시스템 설정</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>
