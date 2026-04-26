<script setup lang="ts">
import type { NavigationGroup } from '@/data/siteContent'

defineProps<{
  groups: NavigationGroup[]
  previewOpenLabel?: string
}>()
</script>

<template>
  <div class="site-shell">
    <div class="promo-bar">
      <span class="promo-bar__brand">WIX</span>
      <span class="promo-bar__divider"></span>
      <span class="promo-bar__copy">本網站是在 Wix 建立。您也來建立網站吧！</span>
      <a class="promo-bar__button" href="https://www.wix.com/" target="_blank" rel="noreferrer">立即開始</a>
    </div>

    <header class="header">
      <div class="header__utility">
        <button class="header__locale" type="button" aria-label="Language Selector: 中文">
          <span class="header__flag">🇨🇳</span>
          <span>中文</span>
          <span class="header__caret"></span>
        </button>
      </div>

      <nav class="header__nav" aria-label="站点导航">
        <div
          v-for="group in groups"
          :key="group.label"
          class="nav-group"
          :class="{ 'nav-group--preview-open': previewOpenLabel === group.label }"
        >
          <RouterLink class="nav-group__link" :class="{ 'nav-group__link--home': group.label === '首页' }" :to="group.href">
            {{ group.label }}
          </RouterLink>
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
    </header>
  </div>
</template>

<style scoped>
.site-shell {
  position: sticky;
  top: 0;
  z-index: 30;
}

.promo-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 59px;
  padding: 0 16px;
  border-bottom: 1px solid #5e97ff;
  background: #f2f2f2;
  font-family: var(--font-body);
  font-size: 12px;
}

.promo-bar__brand {
  font-family: var(--font-display);
  font-size: 33px;
  line-height: 1;
  letter-spacing: 0.02em;
}

.promo-bar__divider {
  width: 1px;
  height: 25px;
  background: rgba(0, 0, 0, 0.28);
}

.promo-bar__copy {
  color: #253247;
  font-size: 16px;
}

.promo-bar__button {
  padding: 8px 32px;
  border: 1px solid #116dff;
  border-radius: 999px;
  color: #116dff;
  background: transparent;
  font-size: 14px;
}

.header {
  position: relative;
  height: 194px;
  border-bottom: 1px solid #d7d7d7;
  background: white;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.18);
}

.header__utility {
  position: absolute;
  top: 41px;
  right: calc((100vw - 980px) / 2 + 8px);
}

.header__locale {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: 133px;
  height: 45px;
  padding: 0 16px;
  border: 1px solid #9b9b9b;
  background: white;
  font-family: var(--font-body);
  font-size: 16px;
}

.header__flag {
  font-size: 22px;
  line-height: 1;
}

.header__caret {
  width: 10px;
  height: 10px;
  margin-left: auto;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-2px);
}

.header__nav {
  display: flex;
  justify-content: center;
  gap: 78px;
  padding-top: 127px;
}

.nav-group {
  position: relative;
}

.nav-group__link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 126px;
  height: 65px;
  padding: 0 5px;
  color: #000;
  font-family: var(--font-futura);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
}

.nav-group__link--home {
  color: rgb(199, 167, 80);
}

.nav-group__panel {
  position: absolute;
  left: 0;
  top: 65px;
  display: grid;
  gap: 8px;
  width: 263px;
  padding: 9px 14px 10px;
  background: white;
  opacity: 0;
  pointer-events: none;
  transform: translateY(0);
}

.nav-group:hover .nav-group__panel,
.nav-group:focus-within .nav-group__panel,
.nav-group--preview-open .nav-group__panel {
  opacity: 1;
  pointer-events: auto;
}

.nav-group:hover .nav-group__link,
.nav-group:focus-within .nav-group__link,
.nav-group--preview-open .nav-group__link {
  color: #1d67cd;
}

.nav-group__child {
  padding: 0;
  color: #000;
  font-family: var(--font-futura);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.7;
}

@media (max-width: 860px) {
  .site-shell {
    position: static;
  }

  .promo-bar {
    flex-wrap: wrap;
    padding: 10px 16px;
  }

  .header {
    height: auto;
    padding: 20px 16px 12px;
  }

  .header__utility {
    position: static;
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }

  .header__nav {
    flex-wrap: wrap;
    gap: 8px 16px;
    padding-top: 0;
  }

  .nav-group__link {
    min-width: auto;
    height: 48px;
  }

  .nav-group__panel {
    position: static;
    width: min(263px, 90vw);
  }
}
</style>
