<script setup lang="ts">
import { placeholderPages } from '@/data/siteContent'

const route = useRoute()

const pageContent = computed(() => {
  const slug = String(route.name ?? '')
  return (
    placeholderPages[slug] ?? {
      title: '页面建设中',
      description: '该页面暂未配置内容。',
    }
  )
})

useHead({
  title: () => `${pageContent.value.title} | 多元宇宙：残障、科技与共建未来`,
})
</script>

<template>
  <main class="placeholder">
    <div class="placeholder__card">
      <p class="placeholder__eyebrow">专题页占位</p>
      <h1>{{ pageContent.title }}</h1>
      <p>{{ pageContent.description }}</p>
      <div class="placeholder__actions">
        <RouterLink class="placeholder__link" to="/">返回首页</RouterLink>
      </div>
    </div>
  </main>
</template>

<style scoped>
.placeholder {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 32px;
  background:
    radial-gradient(circle at top, rgba(29, 103, 205, 0.16), transparent 30%),
    linear-gradient(180deg, #f8f8f8, #ececec);
}

.placeholder__card {
  width: min(720px, 100%);
  padding: 48px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow-soft);
}

.placeholder__eyebrow {
  margin: 0 0 10px;
  color: var(--accent);
  letter-spacing: 0.2em;
}

.placeholder h1 {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3.5rem);
}

.placeholder p {
  margin: 0;
  line-height: 1.85;
  color: #333;
}

.placeholder__actions {
  margin-top: 28px;
}

.placeholder__link {
  display: inline-block;
  padding: 14px 22px;
  border: 2px solid rgba(16, 16, 16, 0.3);
}
</style>
