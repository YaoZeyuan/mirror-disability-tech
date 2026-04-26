<script setup lang="ts">
import HeroSection from '@/components/site/HeroSection.vue'
import SiteFooter from '@/components/site/SiteFooter.vue'
import SiteHeader from '@/components/site/SiteHeader.vue'
import ThemeSection from '@/components/site/ThemeSection.vue'
import { footerContent, heroContent, homepageSections, navigationGroups, siteMeta } from '@/data/siteContent'

useHead({
  title: siteMeta.title,
})
</script>

<template>
  <div class="home-page">
    <SiteHeader :groups="navigationGroups" />
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
