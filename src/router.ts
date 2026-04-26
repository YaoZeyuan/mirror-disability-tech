import IndexPage from '@/pages/IndexPage.vue'
import PlaceholderPage from '@/pages/PlaceholderPage.vue'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: IndexPage,
    meta: {
      title: '多元宇宙：残障、科技与共建未来',
    },
  },
  {
    path: '/unrestrictedbodyminds',
    name: 'unrestrictedbodyminds',
    component: PlaceholderPage,
    meta: {
      title: '无限身心',
    },
  },
  {
    path: '/hiddenfigures',
    name: 'hiddenfigures',
    component: PlaceholderPage,
    meta: {
      title: '隐藏人物 I',
    },
  },
  {
    path: '/hiddenfigures2',
    name: 'hiddenfigures2',
    component: PlaceholderPage,
    meta: {
      title: '隐藏人物 II',
    },
  },
  {
    path: '/openfutures',
    name: 'openfutures',
    component: PlaceholderPage,
    meta: {
      title: '开源未来',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
        top: 96,
        behavior: 'smooth',
      }
    }

    return { top: 0 }
  },
})

export default router
