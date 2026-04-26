<script setup lang="ts">
import { archivedPageTitles, loadArchivedPageDocument, type ArchivedPageKey } from '@/data/archivedPages'

const route = useRoute()
const iframeRef = useTemplateRef<HTMLIFrameElement>('iframeRef')
const frameHeight = ref(1200)
const isLoading = ref(true)
const pageDocument = ref('')

const pageKey = computed(() => String(route.name ?? '') as ArchivedPageKey)

const pageTitle = computed(() => archivedPageTitles[pageKey.value] ?? '页面')

const loadDocument = async () => {
  isLoading.value = true
  pageDocument.value = await loadArchivedPageDocument(pageKey.value)
  isLoading.value = false
}

const syncHeightFromIframe = () => {
  const iframe = iframeRef.value
  if (!iframe?.contentDocument) {
    return
  }

  const nextHeight = Math.max(
    iframe.contentDocument.documentElement?.scrollHeight ?? 0,
    iframe.contentDocument.body?.scrollHeight ?? 0,
  )

  if (nextHeight > 0) {
    frameHeight.value = nextHeight
  }
}

const onMessage = (event: MessageEvent) => {
  const payload = event.data

  if (typeof payload !== 'object' || payload === null || payload.type !== 'archived-page-height') {
    return
  }

  if (typeof payload.height === 'number' && Number.isFinite(payload.height) && payload.height > 0) {
    frameHeight.value = payload.height
  }
}

const onLoad = () => {
  syncHeightFromIframe()
}

useHead({
  title: () => `${pageTitle.value} | 多元宇宙：残障、科技与共建未来`,
})

onMounted(() => {
  window.addEventListener('message', onMessage)
  void loadDocument()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})

watch(pageKey, () => {
  frameHeight.value = 1200
  void loadDocument()
})
</script>

<template>
  <main class="archived-page">
    <div v-if="isLoading" class="archived-page__loading">加载页面中…</div>
    <iframe
      v-show="!isLoading"
      ref="iframeRef"
      class="archived-page__frame"
      :title="pageTitle"
      :srcdoc="pageDocument"
      :style="{ height: `${frameHeight}px` }"
      @load="onLoad"
    />
  </main>
</template>

<style scoped>
.archived-page {
  min-height: 100vh;
  background: #fff;
}

.archived-page__loading {
  display: grid;
  place-items: center;
  min-height: 100vh;
  color: #555;
  font-family: var(--font-body);
  font-size: 16px;
}

.archived-page__frame {
  display: block;
  width: 100%;
  border: 0;
  background: #fff;
}
</style>
