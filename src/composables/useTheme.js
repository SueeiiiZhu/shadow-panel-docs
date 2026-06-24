import { ref } from 'vue'

const theme = ref('dark')

function apply(value) {
  const root = document.documentElement
  if (value === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  try {
    localStorage.setItem('sp-theme', value)
  } catch {
    /* ignore */
  }
}

export function initTheme() {
  let saved = 'dark'
  try {
    saved = localStorage.getItem('sp-theme') || 'dark'
  } catch {
    /* ignore */
  }
  theme.value = saved
  apply(saved)
}

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    apply(theme.value)
  }
  return { theme, toggle }
}
