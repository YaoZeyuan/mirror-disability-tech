<script setup lang="ts">
import SiteFooter from '@/components/site/SiteFooter.vue'
import SiteHeader from '@/components/site/SiteHeader.vue'
import { footerContent, navigationGroups, siteMeta } from '@/data/siteContent'
import { teamsPageContent } from '@/data/teamsContent'
import { resolveMirroredAsset } from '@/utils/mirrorAsset'

useHead({
  title: `${teamsPageContent.title} | ${siteMeta.title}`,
})
</script>

<template>
  <div class="teams-page">
    <SiteHeader :groups="navigationGroups" active-label="策展团队" />

    <main class="teams-page__main">
      <section class="teams-page__hero">
        <div class="teams-page__hero-frame">
          <h1>{{ teamsPageContent.title }}</h1>
        </div>
      </section>

      <section class="teams-page__section teams-page__section--dark">
        <div class="teams-page__container">
          <header class="teams-page__section-header teams-page__section-header--light">
            <h2>{{ teamsPageContent.teamTitle }}</h2>
            <div class="teams-page__rule"></div>
          </header>

          <div class="teams-page__bio-list">
            <article v-for="member in teamsPageContent.teamMembers" :key="member.name" class="teams-page__bio-card">
              <p>
                <strong>{{ member.name }}</strong>，{{ member.bio }}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section class="teams-page__section teams-page__section--light">
        <div class="teams-page__container">
          <header class="teams-page__section-header">
            <h2>{{ teamsPageContent.advisorTitle }}</h2>
            <div class="teams-page__rule"></div>
          </header>

          <div class="teams-page__advisory-grid">
            <article v-for="group in teamsPageContent.advisoryGroups" :key="group.title" class="teams-page__advisory-card">
              <h3>{{ group.title }}</h3>
              <ul>
                <li v-for="entry in group.entries" :key="`${group.title}-${entry.name}`">
                  <strong>{{ entry.name }}</strong>
                  <span>{{ entry.bio }}</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section class="teams-page__section teams-page__section--white">
        <div class="teams-page__container">
          <header class="teams-page__section-header">
            <h2>{{ teamsPageContent.organizationsTitle }}</h2>
            <div class="teams-page__rule"></div>
          </header>

          <div class="teams-page__org-grid">
            <a
              v-for="organization in teamsPageContent.organizations"
              :key="organization.name"
              class="teams-page__org-card"
              :href="organization.href"
              target="_blank"
              rel="noreferrer noopener"
            >
              <img :src="resolveMirroredAsset(organization.logo)" :alt="organization.name" loading="lazy" />
              <h3>{{ organization.name }}</h3>
              <p v-if="organization.englishName">{{ organization.englishName }}</p>
            </a>
          </div>
        </div>
      </section>
    </main>

    <SiteFooter :content="footerContent" />
  </div>
</template>

<style scoped>
.teams-page {
  min-height: 100vh;
  background: #efefef;
}

.teams-page__main {
  padding-bottom: 0;
}

.teams-page__hero {
  padding: 82px 24px 46px;
  background: #efefef;
}

.teams-page__hero-frame {
  width: min(100%, 980px);
  margin: 0 auto;
  padding: 28px 36px;
  border: 3px solid #1d67cd;
  background: #fff;
}

.teams-page__hero h1 {
  margin: 0;
  color: #111;
  font-family: var(--font-futura);
  font-size: clamp(42px, 7vw, 70px);
  font-weight: 700;
  letter-spacing: 0.88em;
  line-height: 1;
  text-align: center;
  text-indent: 0.88em;
}

.teams-page__section {
  padding: 72px 24px 88px;
}

.teams-page__section--dark {
  background: #111;
  color: #fff;
}

.teams-page__section--light {
  background: #e8e8e8;
}

.teams-page__section--white {
  background: #f7f7f4;
}

.teams-page__container {
  width: min(100%, 980px);
  margin: 0 auto;
}

.teams-page__section-header {
  margin-bottom: 38px;
}

.teams-page__section-header h2 {
  margin: 0;
  color: #111;
  font-family: var(--font-futura);
  font-size: clamp(30px, 5vw, 36px);
  font-weight: 400;
  letter-spacing: 0.08em;
  text-align: center;
}

.teams-page__section-header--light h2 {
  color: #fff;
}

.teams-page__rule {
  width: 100%;
  max-width: 600px;
  height: 2px;
  margin: 16px auto 0;
  background: #1d67cd;
}

.teams-page__bio-list {
  display: grid;
  gap: 22px;
}

.teams-page__bio-card p,
.teams-page__advisory-card li,
.teams-page__org-card p {
  margin: 0;
  font-size: 20px;
  line-height: 1.9;
}

.teams-page__bio-card p {
  color: rgba(255, 255, 255, 0.94);
  text-align: justify;
}

.teams-page__advisory-grid {
  display: grid;
  gap: 24px;
}

.teams-page__advisory-card {
  padding: 28px 30px 30px;
  border: 1px solid rgba(16, 16, 16, 0.08);
  background: rgba(255, 255, 255, 0.66);
}

.teams-page__advisory-card h3 {
  margin: 0 0 12px;
  color: #1d67cd;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
}

.teams-page__advisory-card ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.teams-page__advisory-card li {
  display: grid;
  gap: 2px;
  color: #111;
}

.teams-page__advisory-card span {
  display: block;
}

.teams-page__org-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px;
}

.teams-page__org-card {
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 14px;
  min-height: 100%;
  padding: 28px 18px 26px;
  border: 1px solid rgba(16, 16, 16, 0.08);
  background: #fff;
  text-align: center;
}

.teams-page__org-card img {
  width: auto;
  max-width: min(100%, 220px);
  height: 126px;
  object-fit: contain;
}

.teams-page__org-card h3 {
  margin: 0;
  color: #111;
  font-size: 20px;
  line-height: 1.5;
}

.teams-page__org-card p {
  color: #575757;
  font-size: 18px;
  line-height: 1.65;
}

@media (max-width: 860px) {
  .teams-page__hero {
    padding: 48px 16px 28px;
  }

  .teams-page__hero-frame {
    padding: 24px 18px;
  }

  .teams-page__hero h1 {
    font-size: 34px;
    letter-spacing: 0.34em;
    text-indent: 0.34em;
  }

  .teams-page__section {
    padding: 52px 16px 64px;
  }

  .teams-page__bio-card p,
  .teams-page__advisory-card li,
  .teams-page__org-card p {
    font-size: 17px;
    line-height: 1.75;
  }

  .teams-page__advisory-card {
    padding: 22px 18px;
  }

  .teams-page__org-grid {
    grid-template-columns: 1fr;
  }
}
</style>
