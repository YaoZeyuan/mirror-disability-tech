<script setup lang="ts">
import type { HeroContent } from '@/data/siteContent'

defineProps<{
  content: HeroContent
}>()
</script>

<template>
  <section class="hero">
    <div class="hero__stage">
      <img class="hero__left-image" :src="content.leftImage" alt="" aria-hidden="true" />
      <div class="hero__clock" aria-hidden="true"></div>
      <img class="hero__accent" :src="content.centerAccentImage" alt="" aria-hidden="true" />
      <img class="hero__right-image" :src="content.heroImage" alt="" aria-hidden="true" />

      <div class="hero__content">
        <p class="hero__eyebrow">{{ content.eyebrow }}</p>
        <h1 class="hero__title">{{ content.title }}</h1>
      </div>

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
  min-height: 796px;
  background:
    radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 0.92), rgba(233, 239, 246, 0.86) 45%, rgba(221, 228, 236, 0.96));
}

.hero__stage {
  position: absolute;
  inset: 0;
}

.hero__left-image,
.hero__right-image,
.hero__accent,
.hero__clock,
.hero__content,
.hero__support {
  position: absolute;
}

.hero__left-image {
  left: calc((100vw - 980px) / 2 - 808px);
  top: 50px;
  width: 815px;
  height: 795px;
}

.hero__clock {
  left: calc((100vw - 980px) / 2 + 192px);
  top: 163px;
  width: 596px;
  height: 596px;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, rgba(226, 226, 221, 0.82) 0 23%, transparent 24%),
    repeating-conic-gradient(from 0deg, rgba(29, 103, 205, 0.82) 0deg 1deg, transparent 1deg 30deg);
  mask: radial-gradient(circle, transparent 0 41%, rgba(0, 0, 0, 1) 42% 46%, transparent 47%);
  opacity: 0.16;
}

.hero__accent {
  left: calc((100vw - 980px) / 2 + 372px);
  top: 343px;
  width: 235px;
  height: 236px;
  opacity: 0.34;
  filter: saturate(0.65);
}

.hero__right-image {
  left: calc((100vw - 980px) / 2 + 988px);
  top: 81px;
  width: 786px;
  height: 764px;
}

.hero__content {
  left: calc((100vw - 980px) / 2 + 124px);
  top: 364px;
  z-index: 1;
  width: 877px;
}

.hero__eyebrow {
  margin: 0;
  font-family: var(--font-display);
  font-size: 50px;
  letter-spacing: 0.1em;
  line-height: 1.2;
}

.hero__title {
  margin: 5px 0 0;
  font-family: var(--font-display);
  font-size: 70px;
  font-weight: 800;
  letter-spacing: 0.1em;
  line-height: 1.2;
}

.hero__support {
  left: calc((100vw - 980px) / 2 + 264px);
  top: 734px;
  display: grid;
  gap: 4px;
  justify-items: center;
  width: 450px;
}

.hero__support p {
  margin: 0;
  color: rgba(16, 16, 16, 0.42);
  font-size: 16px;
}

.hero__support img {
  width: 436px;
  height: 65px;
}

@media (max-width: 860px) {
  .hero {
    min-height: 620px;
  }

  .hero__left-image {
    left: -420px;
    top: 120px;
    width: 520px;
    height: auto;
  }

  .hero__clock {
    left: 50%;
    top: 140px;
    width: min(88vw, 430px);
    height: min(88vw, 430px);
    transform: translateX(-50%);
  }

  .hero__accent {
    left: 50%;
    top: 280px;
    width: 164px;
    height: 165px;
    transform: translateX(-50%);
  }

  .hero__right-image {
    right: -180px;
    left: auto;
    top: 180px;
    width: 430px;
    height: auto;
  }

  .hero__content {
    left: 24px;
    top: 250px;
    width: calc(100% - 48px);
  }

  .hero__eyebrow {
    font-size: 30px;
  }

  .hero__title {
    font-size: 44px;
    line-height: 1.15;
  }

  .hero__support {
    left: 50%;
    top: auto;
    bottom: 32px;
    width: min(436px, calc(100% - 40px));
    transform: translateX(-50%);
  }

  .hero__support img {
    width: 100%;
    height: auto;
  }
}
</style>
