<script setup lang="ts">
import type { FooterContent } from '@/data/siteContent'

defineProps<{
  content: FooterContent
}>()
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <h2>{{ content.title }}</h2>
      <p v-for="item in content.items" :key="item">{{ item }}</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: #050505;
  color: white;
}

.footer__inner {
  width: min(920px, calc(100% - 48px));
  margin: 0 auto;
  padding: 44px 0 56px;
}

.footer h2 {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 2vw, 2.2rem);
  letter-spacing: 0.06em;
}

.footer p {
  margin: 8px 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 15px;
  line-height: 1.8;
}

@media (max-width: 860px) {
  .footer__inner {
    width: min(100%, calc(100% - 32px));
  }
}
</style>
