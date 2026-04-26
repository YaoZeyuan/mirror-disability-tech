<script setup lang="ts">
import type { HeroContent } from '@/data/siteContent'

defineProps<{
  content: HeroContent
}>()
</script>

<template>
  <section class="hero">
    <div class="hero__backdrop">
      <img class="hero__image" :src="content.heroImage" alt="多元宇宙首页主视觉" />
    </div>
    <div class="hero__clock" aria-hidden="true"></div>
    <div class="hero__figure hero__figure--left" aria-hidden="true"></div>
    <div class="hero__figure hero__figure--right" aria-hidden="true"></div>

    <div class="hero__content">
      <p class="hero__eyebrow">{{ content.eyebrow }}</p>
      <h1 class="hero__title">{{ content.title }}</h1>

      <div class="hero__support">
        <p>{{ content.supportText }}</p>
        <img :src="content.logoImage" alt="清华大学科学博物馆与麻省理工学院博物馆 logo" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  min-height: min(88vh, 940px);
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(240, 242, 247, 0.92));
}

.hero__backdrop {
  position: absolute;
  inset: 0;
}

.hero__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.9;
  filter: saturate(0.9);
}

.hero__clock {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(56vw, 620px);
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -48%);
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.9) 0 18%, transparent 19%),
    repeating-conic-gradient(from 0deg, rgba(29, 103, 205, 0.55) 0deg 1.5deg, transparent 1.5deg 15deg);
  mask: radial-gradient(circle, transparent 0 58%, black 59% 61%, transparent 62%);
  opacity: 0.8;
}

.hero__figure {
  position: absolute;
  top: 18%;
  width: 62px;
  height: 126px;
  background: var(--ink);
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  opacity: 0.95;
}

.hero__figure--left {
  left: 3%;
  mask-image: radial-gradient(circle at 50% 12%, black 0 18%, transparent 19%), linear-gradient(black, black),
    linear-gradient(black, black), linear-gradient(black, black), linear-gradient(black, black);
  mask-size: 24px 24px, 12px 58px, 10px 52px, 10px 52px, 42px 10px;
  mask-position: center 0, center 26px, 20px 74px, 42px 74px, center 42px;
}

.hero__figure--right {
  right: 3%;
  top: 26%;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  mask-image:
    radial-gradient(circle at 68% 18%, black 0 12%, transparent 13%),
    radial-gradient(circle at 28% 82%, black 0 10%, transparent 11%),
    radial-gradient(circle at 72% 78%, black 0 10%, transparent 11%),
    radial-gradient(circle at 50% 58%, transparent 0 22%, black 23% 38%, transparent 39%);
}

.hero__content {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  min-height: inherit;
  padding: 160px 24px 88px;
  text-align: center;
}

.hero__eyebrow {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3vw, 3.25rem);
  letter-spacing: 0.16em;
}

.hero__title {
  margin: 0.3em 0 1.4em;
  font-family: var(--font-display);
  font-size: clamp(2.75rem, 5vw, 5.6rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1.08;
}

.hero__support {
  display: grid;
  gap: 12px;
  justify-items: center;
}

.hero__support p {
  margin: 0;
  color: rgba(16, 16, 16, 0.5);
  font-size: 15px;
  letter-spacing: 0.08em;
}

.hero__support img {
  width: min(360px, 76vw);
}

@media (max-width: 860px) {
  .hero {
    min-height: auto;
  }

  .hero__content {
    padding-top: 112px;
    padding-bottom: 56px;
  }

  .hero__clock {
    width: min(78vw, 420px);
  }
}
</style>
