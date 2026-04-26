<script setup lang="ts">
import type { NavigationGroup } from '@/data/siteContent'

defineProps<{
  groups: NavigationGroup[]
}>()
</script>

<template>
  <div class="site-shell">
    <div class="promo-bar">
      <span class="promo-bar__brand">WIX</span>
      <span class="promo-bar__copy">本网站原站由 Wix 搭建，此处仅用于 Vue 复刻研究。</span>
      <a class="promo-bar__button" href="https://www.wix.com/" target="_blank" rel="noreferrer">立即体验</a>
    </div>

    <header class="header">
      <RouterLink class="header__mark" to="/">首页</RouterLink>
      <nav class="header__nav" aria-label="站点导航">
        <div v-for="group in groups" :key="group.label" class="nav-group">
          <RouterLink class="nav-group__link" :to="group.href">{{ group.label }}</RouterLink>
          <div v-if="group.children?.length" class="nav-group__panel">
            <RouterLink
              v-for="child in group.children"
              :key="child.label"
              class="nav-group__child"
              :to="child.href"
            >
              {{ child.label }}
            </RouterLink>
          </div>
        </div>
      </nav>
      <div class="header__locale">中文</div>
    </header>
  </div>
</template>

<style scoped>
.site-shell {
  position: sticky;
  top: 0;
  z-index: 30;
  backdrop-filter: blur(14px);
}

.promo-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 32px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.9);
  font-size: 12px;
}

.promo-bar__brand {
  font-weight: 800;
  letter-spacing: 0.12em;
}

.promo-bar__copy {
  color: var(--muted);
}

.promo-bar__button {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--accent);
  color: white;
}

.header {
  display: grid;
  grid-template-columns: 96px 1fr 72px;
  gap: 20px;
  align-items: center;
  padding: 14px 28px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.86);
}

.header__mark,
.header__locale {
  font-size: 13px;
  letter-spacing: 0.12em;
}

.header__nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.nav-group {
  position: relative;
}

.nav-group__link {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 14px;
  letter-spacing: 0.08em;
}

.nav-group__link:hover,
.nav-group__link.router-link-active {
  color: var(--accent);
  background: var(--accent-soft);
}

.nav-group__panel {
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  display: grid;
  gap: 6px;
  width: 260px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: var(--shadow-soft);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(6px);
}

.nav-group:hover .nav-group__panel,
.nav-group:focus-within .nav-group__panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.nav-group__child {
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.nav-group__child:hover {
  background: #f4f7ff;
  color: var(--ink);
}

.header__locale {
  justify-self: end;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: white;
}

@media (max-width: 860px) {
  .site-shell {
    position: static;
  }

  .promo-bar {
    flex-wrap: wrap;
  }

  .header {
    grid-template-columns: 1fr;
    justify-items: center;
    padding: 16px;
  }

  .header__locale {
    justify-self: center;
  }

  .nav-group__panel {
    position: static;
    width: min(100%, 320px);
    margin-top: 4px;
    opacity: 1;
    pointer-events: auto;
    transform: none;
    box-shadow: none;
  }
}
</style>
