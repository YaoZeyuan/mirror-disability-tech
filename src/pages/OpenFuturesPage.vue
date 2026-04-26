<script setup lang="ts">
import SiteFooter from '@/components/site/SiteFooter.vue'
import SiteHeader from '@/components/site/SiteHeader.vue'
import { footerContent, navigationGroups, siteMeta } from '@/data/siteContent'
import { openFuturesPageContent } from '@/data/openFuturesContent'
import { resolveMirroredAsset } from '@/utils/mirrorAsset'

const showcaseVideoRefs = ref<Array<HTMLVideoElement | null>>([])

const setShowcaseVideoRef = (element: Element | ComponentPublicInstance | null, index: number) => {
  showcaseVideoRefs.value[index] = element instanceof HTMLVideoElement ? element : null
}

const playVideo = async (index: number) => {
  const video = showcaseVideoRefs.value[index]
  if (!video) {
    return
  }

  video.muted = true

  try {
    await video.play()
  } catch {
    // Ignore autoplay rejections and keep the poster visible.
  }
}

const resetVideo = (index: number) => {
  const video = showcaseVideoRefs.value[index]
  if (!video) {
    return
  }

  video.pause()
  video.currentTime = 0
}

useHead({
  title: `${openFuturesPageContent.title} | ${siteMeta.title}`,
})
</script>

<template>
  <div class="open-futures-page">
    <SiteHeader :groups="navigationGroups" active-label="开源未来" />

    <main class="open-futures-page__main">
      <section class="open-futures-page__hero">
        <div class="open-futures-page__container">
          <div class="open-futures-page__hero-frame">
            <h1>{{ openFuturesPageContent.title }}</h1>
          </div>
          <p class="open-futures-page__intro">{{ openFuturesPageContent.intro }}</p>
        </div>
      </section>

      <section class="open-futures-page__showcase">
        <div class="open-futures-page__container open-futures-page__video-grid">
          <article v-for="(entry, index) in openFuturesPageContent.videos" :key="entry.title" class="open-futures-page__video-card">
            <header class="open-futures-page__card-header">
              <h2>{{ entry.title }}</h2>
              <p v-if="entry.note">{{ entry.note }}</p>
            </header>

            <div class="open-futures-page__video-frame" @mouseenter="playVideo(index)" @mouseleave="resetVideo(index)">
              <video
                :ref="(element) => setShowcaseVideoRef(element, index)"
                :poster="resolveMirroredAsset(entry.poster)"
                :src="resolveMirroredAsset(entry.video)"
                playsinline
                loop
                muted
                preload="metadata"
              />
            </div>

            <div class="open-futures-page__card-copy">
              <p v-for="line in entry.summary" :key="line">{{ line }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="open-futures-page__resources">
        <div class="open-futures-page__container open-futures-page__resource-grid">
          <a
            v-for="resource in openFuturesPageContent.resources"
            :key="resource.title + resource.href"
            class="open-futures-page__resource-card"
            :href="resource.href"
            target="_blank"
            rel="noreferrer noopener"
          >
            <img :src="resolveMirroredAsset(resource.image)" :alt="resource.imageAlt" loading="lazy" />
            <p>{{ resource.title }}</p>
            <strong v-if="resource.subtitle">{{ resource.subtitle }}</strong>
          </a>
        </div>
      </section>

      <section class="open-futures-page__article">
        <div class="open-futures-page__container open-futures-page__article-grid">
          <div class="open-futures-page__article-video">
            <video
              :poster="resolveMirroredAsset(openFuturesPageContent.articleVideo.poster)"
              :src="resolveMirroredAsset(openFuturesPageContent.articleVideo.video)"
              controls
              playsinline
              preload="metadata"
            />
            <p>{{ openFuturesPageContent.articleVideo.title }}</p>
          </div>

          <div class="open-futures-page__participation">
            <p v-for="paragraph in openFuturesPageContent.participation.body" :key="paragraph" class="open-futures-page__paragraph">
              {{ paragraph }}
            </p>
            <p class="open-futures-page__prompt">分享内容如：</p>
            <ul>
              <li v-for="topic in openFuturesPageContent.participation.topics" :key="topic">{{ topic }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="open-futures-page__form-section">
        <div class="open-futures-page__container">
          <form class="open-futures-page__form" @submit.prevent>
            <label>
              <span>姓名</span>
              <input type="text" placeholder="姓名" />
            </label>
            <label>
              <span>所在地</span>
              <input type="text" placeholder="所在地" />
            </label>
            <label>
              <span>自我介绍（不超过100字）</span>
              <textarea rows="4" maxlength="100" placeholder="自我介绍（不超过100字）"></textarea>
            </label>
            <label>
              <span>留言内容（不超过800字）</span>
              <textarea rows="9" maxlength="800" placeholder="留言内容（不超过800字）"></textarea>
            </label>
            <button type="submit">提交</button>
          </form>
          <p class="open-futures-page__form-note">投稿表单的后端尚未迁移，这里先保留原页面版式与输入结构。</p>
        </div>
      </section>
    </main>

    <SiteFooter :content="footerContent" />
  </div>
</template>

<style scoped>
.open-futures-page {
  min-height: 100vh;
  background: #efefef;
}

.open-futures-page__container {
  width: min(100%, 980px);
  margin: 0 auto;
}

.open-futures-page__hero {
  padding: 82px 24px 36px;
}

.open-futures-page__hero-frame {
  padding: 28px 36px;
  border: 3px solid #1d67cd;
  background: #fff;
}

.open-futures-page__hero h1 {
  margin: 0;
  font-family: var(--font-futura);
  font-size: clamp(42px, 7vw, 70px);
  font-weight: 700;
  letter-spacing: 0.88em;
  line-height: 1;
  text-align: center;
  text-indent: 0.88em;
}

.open-futures-page__intro {
  margin: 28px 0 0;
  color: #111;
  font-size: 20px;
  line-height: 1.9;
}

.open-futures-page__showcase,
.open-futures-page__resources,
.open-futures-page__article,
.open-futures-page__form-section {
  padding: 36px 24px 54px;
}

.open-futures-page__video-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
}

.open-futures-page__video-card,
.open-futures-page__resource-card,
.open-futures-page__form {
  background: #fff;
}

.open-futures-page__video-card {
  padding: 24px;
}

.open-futures-page__card-header h2,
.open-futures-page__resource-card p,
.open-futures-page__article-video p {
  margin: 0;
  color: #111;
  font-size: 22px;
  line-height: 1.5;
}

.open-futures-page__card-header p {
  margin: 6px 0 0;
  color: #8b0000;
  font-size: 16px;
}

.open-futures-page__video-frame {
  margin-top: 16px;
  background: #ddd;
}

.open-futures-page__video-frame video,
.open-futures-page__article-video video {
  display: block;
  width: 100%;
  height: auto;
  background: #111;
}

.open-futures-page__card-copy {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.open-futures-page__card-copy p,
.open-futures-page__paragraph,
.open-futures-page__participation li,
.open-futures-page__form label,
.open-futures-page__form-note {
  margin: 0;
  color: #222;
  font-size: 18px;
  line-height: 1.85;
}

.open-futures-page__resource-grid,
.open-futures-page__article-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
}

.open-futures-page__resource-card {
  display: grid;
  gap: 14px;
  align-content: start;
  padding: 24px;
  text-align: center;
}

.open-futures-page__resource-card img {
  width: 100%;
  height: 320px;
  object-fit: cover;
}

.open-futures-page__resource-card strong {
  color: #111;
  font-size: 22px;
  line-height: 1.5;
}

.open-futures-page__article-video {
  display: grid;
  gap: 14px;
}

.open-futures-page__participation {
  padding: 22px 24px;
  background: rgba(255, 255, 255, 0.66);
}

.open-futures-page__prompt {
  margin: 18px 0 10px;
  color: #111;
  font-size: 20px;
  text-decoration: underline;
}

.open-futures-page__participation ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 22px;
}

.open-futures-page__form {
  display: grid;
  gap: 18px;
  padding: 28px;
}

.open-futures-page__form label {
  display: grid;
  gap: 8px;
}

.open-futures-page__form span {
  font-size: 18px;
}

.open-futures-page__form input,
.open-futures-page__form textarea {
  width: 100%;
  border: 1px solid rgba(16, 16, 16, 0.16);
  border-radius: 0;
  padding: 14px 16px;
  font: inherit;
  background: #fafafa;
}

.open-futures-page__form button {
  width: 180px;
  padding: 12px 24px;
  border: 1px solid #111;
  background: #fff;
  color: #111;
  font: inherit;
  font-size: 18px;
}

.open-futures-page__form-note {
  margin-top: 14px;
  color: #666;
}

@media (max-width: 860px) {
  .open-futures-page__hero {
    padding: 48px 16px 28px;
  }

  .open-futures-page__hero-frame {
    padding: 24px 18px;
  }

  .open-futures-page__hero h1 {
    font-size: 34px;
    letter-spacing: 0.34em;
    text-indent: 0.34em;
  }

  .open-futures-page__intro,
  .open-futures-page__card-copy p,
  .open-futures-page__paragraph,
  .open-futures-page__participation li,
  .open-futures-page__form label,
  .open-futures-page__form-note {
    font-size: 16px;
    line-height: 1.75;
  }

  .open-futures-page__showcase,
  .open-futures-page__resources,
  .open-futures-page__article,
  .open-futures-page__form-section {
    padding: 24px 16px 38px;
  }

  .open-futures-page__video-grid,
  .open-futures-page__resource-grid,
  .open-futures-page__article-grid {
    grid-template-columns: 1fr;
  }

  .open-futures-page__video-card,
  .open-futures-page__resource-card,
  .open-futures-page__form,
  .open-futures-page__participation {
    padding: 18px;
  }

  .open-futures-page__resource-card img {
    height: auto;
  }
}
</style>
