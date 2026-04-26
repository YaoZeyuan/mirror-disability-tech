<script setup lang="ts">
import type { ThemeSection as ThemeSectionType } from '@/data/siteContent'

defineProps<{
  section: ThemeSectionType
  tone?: 'plain' | 'mist'
}>()
</script>

<template>
  <section :id="section.id" class="theme-section" :class="`theme-section--${tone ?? 'plain'}`">
    <div class="theme-section__wave" aria-hidden="true"></div>
    <div class="theme-section__inner">
      <header class="theme-section__header">
        <h2>{{ section.title }}</h2>
        <div class="theme-section__line"></div>
      </header>

      <div class="theme-section__body">
        <p v-if="section.lead" class="theme-section__lead">{{ section.lead }}</p>
        <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
      </div>

      <div class="theme-section__actions">
        <RouterLink v-for="action in section.cta" :key="action.label" class="theme-section__button" :to="action.href">
          {{ action.label }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.theme-section {
  position: relative;
  padding: 72px 0 88px;
  border-bottom: 1px solid rgba(16, 16, 16, 0.08);
}

.theme-section--mist {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(243, 243, 243, 0.98)),
    var(--surface);
}

.theme-section--plain {
  background: rgba(247, 247, 244, 0.92);
}

.theme-section__wave {
  position: absolute;
  left: 0;
  top: -1px;
  width: 100%;
  height: 40px;
  background:
    radial-gradient(circle at 30px 0, transparent 31px, rgba(255, 255, 255, 0.95) 32px) 0 0 / 120px 100% repeat-x;
  opacity: 0.7;
}

.theme-section__inner {
  width: min(920px, calc(100% - 48px));
  margin: 0 auto;
}

.theme-section__header h2 {
  margin: 0;
  color: var(--accent);
  font-family: var(--font-display);
  font-size: clamp(2.7rem, 5vw, 5.1rem);
  font-weight: 800;
  letter-spacing: 0.3em;
}

.theme-section__line {
  width: min(100%, 640px);
  height: 2px;
  margin-top: 14px;
  background: linear-gradient(90deg, var(--accent), rgba(29, 103, 205, 0.1));
}

.theme-section__body {
  margin-top: 44px;
  display: grid;
  gap: 20px;
}

.theme-section__body p {
  margin: 0;
  color: #202020;
  font-size: clamp(1rem, 1.2vw, 1.15rem);
  line-height: 1.95;
  text-align: justify;
}

.theme-section__lead {
  color: #505050;
  font-style: italic;
}

.theme-section__actions {
  display: grid;
  gap: 16px;
  justify-content: center;
  margin-top: 52px;
}

.theme-section__button {
  min-width: min(100%, 420px);
  padding: 16px 26px;
  border: 2px solid rgba(16, 16, 16, 0.45);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 24px rgba(16, 16, 16, 0.04);
  text-align: center;
  font-family: var(--font-display);
  font-size: 1.05rem;
  letter-spacing: 0.08em;
}

.theme-section__button:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-2px);
}

@media (max-width: 860px) {
  .theme-section {
    padding: 54px 0 70px;
  }

  .theme-section__inner {
    width: min(100%, calc(100% - 32px));
  }

  .theme-section__header h2 {
    letter-spacing: 0.16em;
  }
}
</style>
