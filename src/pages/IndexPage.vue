<script setup lang="ts">
import HeroSection from '@/components/site/HeroSection.vue'
import SiteFooter from '@/components/site/SiteFooter.vue'
import SiteHeader from '@/components/site/SiteHeader.vue'
import ThemeSection from '@/components/site/ThemeSection.vue'
import { footerContent, heroContent, homepageSections, navigationGroups, siteMeta } from '@/data/siteContent'

const activeLabel = ref('首页')

function syncActiveLabel() {
  if (typeof window === 'undefined') {
    return
  }

  const checkpoints = [
    { id: 'open-futures', label: '开源未来' },
    { id: 'hidden-figures', label: '隐藏人物 II' },
    { id: 'unrestricted-bodyminds', label: '无限身心' },
  ]

  const probeY = window.innerHeight * 0.28

  for (const checkpoint of checkpoints) {
    const element = document.getElementById(checkpoint.id)
    if (!element) {
      continue
    }

    const rect = element.getBoundingClientRect()
    if (rect.top <= probeY) {
      activeLabel.value = checkpoint.label
      return
    }
  }

  activeLabel.value = '首页'
}

onMounted(() => {
  syncActiveLabel()
  window.addEventListener('scroll', syncActiveLabel, { passive: true })
  window.addEventListener('resize', syncActiveLabel)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncActiveLabel)
  window.removeEventListener('resize', syncActiveLabel)
})

useHead({
  title: siteMeta.title,
})
</script>

<template>
  <div class="home-page">
    <SiteHeader :groups="navigationGroups" :active-label="activeLabel" />
    <HeroSection :content="heroContent" />
    <ThemeSection :section="homepageSections[0]" tone="mist" />
    <ThemeSection :section="homepageSections[1]" tone="plain" />
    <ThemeSection :section="homepageSections[2]" tone="mist" />
    <SiteFooter :content="footerContent" />
  </div>
</template>

<style scoped>
.home-page {
  overflow-x: clip;
}
</style>
