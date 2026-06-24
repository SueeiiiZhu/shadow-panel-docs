import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'

initTheme()

router.afterEach((to) => {
  const t = to.meta?.title
  document.title = t ? `${t} · Shadow Panel` : 'Shadow Panel · 部署与使用教程'
})

createApp(App).use(router).mount('#app')
