<!-- src/components/AdminSidebar.vue (예시 파일명) -->
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
      <span></span><span>회원 승인 관리</span>
    </router-link>

    <!-- ✅ 공지사항 메뉴 추가 -->
    <router-link :to="{name:'notices'}" active-class="active">
      <span></span><span>공지사항 관리</span>
    </router-link>

    <router-link :to="{name:'inquiries'}" active-class="active">
      <span></span><span>문의 관리</span>
    </router-link>

    <router-link :to="{name:'settings'}" active-class="active">
      <span>⚙️</span><span>설정</span>
    </router-link>
  </aside>
</template>

<script setup>
// 필요 시 props/emits 추가 가능
</script>

<style scoped>
.sidebar{
  display:flex; flex-direction:column; gap:2px;
}
.sidebar a{
  display:flex; align-items:center; gap:8px;
  padding:8px 10px; border-radius:8px; color:var(--text);
  text-decoration:none;
}
.sidebar a.active{ background:#1a2540; }
</style>
