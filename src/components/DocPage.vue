<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { flat } from '@/nav'
import Prose from './Prose.vue'

const props = defineProps({
  title: { type: String, required: true },
  lead: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
})

const route = useRoute()
const idx = computed(() => flat.findIndex((i) => i.to === route.path))
const prev = computed(() => (idx.value > 0 ? flat[idx.value - 1] : null))
const next = computed(() =>
  idx.value >= 0 && idx.value < flat.length - 1 ? flat[idx.value + 1] : null,
)
</script>

<template>
  <article class="mx-auto max-w-3xl px-6 py-10 lg:px-10">
    <header class="mb-8 border-b border-border pb-7">
      <p
        v-if="eyebrow"
        class="mb-2 text-sm font-medium tracking-wide text-primary"
      >
        {{ eyebrow }}
      </p>
      <h1
        class="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
      >
        {{ title }}
      </h1>
      <p v-if="lead" class="mt-3 text-lg leading-relaxed text-muted-foreground">
        {{ lead }}
      </p>
    </header>

    <Prose>
      <slot />
    </Prose>

    <nav
      class="mt-14 grid grid-cols-1 gap-3 border-t border-border pt-7 sm:grid-cols-2"
    >
      <RouterLink
        v-if="prev"
        :to="prev.to"
        class="group flex flex-col rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
      >
        <span
          class="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <ArrowLeft class="h-3.5 w-3.5" /> 上一页
        </span>
        <span class="mt-1 font-medium text-foreground group-hover:text-primary"
          >{{ prev.label }}</span
        >
      </RouterLink>
      <span v-else />
      <RouterLink
        v-if="next"
        :to="next.to"
        class="group flex flex-col items-end rounded-xl border border-border px-4 py-3 text-right transition-colors hover:border-primary/50 hover:bg-accent/40"
      >
        <span class="flex items-center gap-1 text-xs text-muted-foreground">
          下一页 <ArrowRight class="h-3.5 w-3.5" />
        </span>
        <span class="mt-1 font-medium text-foreground group-hover:text-primary"
          >{{ next.label }}</span
        >
      </RouterLink>
    </nav>
  </article>
</template>
