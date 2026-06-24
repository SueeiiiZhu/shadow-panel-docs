import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'intro', component: () => import('@/views/Intro.vue'), meta: { title: '介绍' } },
  { path: '/why', component: () => import('@/views/Why.vue'), meta: { title: '为什么重写' } },
  { path: '/architecture', component: () => import('@/views/Architecture.vue'), meta: { title: '系统架构' } },
  { path: '/quickstart', component: () => import('@/views/QuickStart.vue'), meta: { title: '快速开始' } },
  { path: '/deploy', component: () => import('@/views/Deploy.vue'), meta: { title: '生产部署' } },
  { path: '/protocols', component: () => import('@/views/Protocols.vue'), meta: { title: '协议支持' } },
  { path: '/nodes', component: () => import('@/views/Nodes.vue'), meta: { title: '节点管理' } },
  { path: '/dialer-proxy', component: () => import('@/views/DialerProxy.vue'), meta: { title: '上游代理 / Dialer' } },
  { path: '/ip-proxy', component: () => import('@/views/IpProxy.vue'), meta: { title: '对接 IP 代理站' } },
  { path: '/migrate', component: () => import('@/views/Migrate.vue'), meta: { title: '迁移' } },
  { path: '/faq', component: () => import('@/views/Faq.vue'), meta: { title: '常见问题' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, top: 80 }
    return { top: 0 }
  },
})
