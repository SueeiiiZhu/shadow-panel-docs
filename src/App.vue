<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X, Moon, Sun, Github, Send } from 'lucide-vue-next'
import { nav } from '@/nav'
import { useTheme } from '@/composables/useTheme'
import Logo from '@/components/Logo.vue'

const route = useRoute()
const { theme, toggle } = useTheme()
const mobileOpen = ref(false)

watch(
  () => route.path,
  () => (mobileOpen.value = false),
)
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Top bar -->
    <header
      class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl"
    >
      <div class="flex h-16 items-center gap-4 px-4 lg:px-6">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent lg:hidden"
          aria-label="菜单"
          @click="mobileOpen = !mobileOpen"
        >
          <component :is="mobileOpen ? X : Menu" class="h-5 w-5" />
        </button>

        <RouterLink to="/" class="flex items-center gap-2.5">
          <Logo class="h-8 w-8" />
          <span class="text-[15px] font-bold tracking-tight text-foreground"
            >Shadow Panel</span
          >
          <span
            class="hidden rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline"
            >Docs</span
          >
        </RouterLink>

        <div class="ml-auto flex items-center gap-1">
          <a
            href="https://t.me/"
            target="_blank"
            rel="noopener"
            class="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
            aria-label="Telegram"
          >
            <Send class="h-[18px] w-[18px]" />
          </a>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener"
            class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="GitHub"
          >
            <Github class="h-[18px] w-[18px]" />
          </a>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="切换主题"
            @click="toggle"
          >
            <component
              :is="theme === 'dark' ? Sun : Moon"
              class="h-[18px] w-[18px]"
            />
          </button>
        </div>
      </div>
    </header>

    <div class="mx-auto flex w-full max-w-[88rem]">
      <!-- Sidebar (desktop) -->
      <aside
        class="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-border px-4 py-7 lg:block"
      >
        <nav class="space-y-7">
          <div v-for="group in nav" :key="group.title">
            <p
              class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
            >
              {{ group.title }}
            </p>
            <ul class="space-y-0.5">
              <li v-for="item in group.items" :key="item.to">
                <RouterLink
                  :to="item.to"
                  class="flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors"
                  :class="
                    route.path === item.to
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  "
                >
                  {{ item.label }}
                  <span
                    v-if="item.badge"
                    class="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                    >{{ item.badge }}</span
                  >
                </RouterLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- Mobile drawer -->
      <Transition name="fade">
        <div
          v-if="mobileOpen"
          class="fixed inset-0 z-40 bg-black/50 lg:hidden"
          @click="mobileOpen = false"
        />
      </Transition>
      <Transition name="slide">
        <aside
          v-if="mobileOpen"
          class="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 overflow-y-auto border-r border-border bg-background px-4 py-7 lg:hidden"
        >
          <nav class="space-y-7">
            <div v-for="group in nav" :key="group.title">
              <p
                class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
              >
                {{ group.title }}
              </p>
              <ul class="space-y-0.5">
                <li v-for="item in group.items" :key="item.to">
                  <RouterLink
                    :to="item.to"
                    class="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors"
                    :class="
                      route.path === item.to
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    "
                  >
                    {{ item.label }}
                    <span
                      v-if="item.badge"
                      class="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                      >{{ item.badge }}</span
                    >
                  </RouterLink>
                </li>
              </ul>
            </div>
          </nav>
        </aside>
      </Transition>

      <!-- Content -->
      <main class="min-w-0 flex-1">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
        <footer
          class="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground lg:px-10"
        >
          Shadow Panel · 轻量级多用户代理面板 · 文档以
          <span class="text-foreground">Vue 3 + Vite + shadcn</span> 构建
        </footer>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}
</style>
