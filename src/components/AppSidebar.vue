<template>
  <aside class="sidebar">
    <div style="padding:6px 10px;color:var(--muted);font-size:12px">NAVIGATION</div>
    <router-link :to="{name:'dashboard'}" active-class="active">
      <span></span><span>대시보드</span>
    </router-link>
    <router-link :to="{name:'users'}" active-class="active">
      <span></span><span>사용자 관리</span>
    </router-link>
    <router-link :to="{name:'drivers'}" active-class="active">
      <span></span><span>기사 관리</span>
    </router-link>
    <router-link :to="{name:'settings'}" active-class="active">
      <span>⚙️</span><span>설정</span>
    </router-link>
  </aside>
</template>

<script setup>
</script>
<style>
</style>
