<script setup>
import { computed } from 'vue'
import { Info, TriangleAlert, Lightbulb, CircleCheck } from 'lucide-vue-next'

const props = defineProps({
  type: { type: String, default: 'info' }, // info | warning | tip | success
  title: { type: String, default: '' },
})

const styles = {
  info: {
    icon: Info,
    wrap: 'border-sky-500/30 bg-sky-500/5',
    ic: 'text-sky-400',
  },
  warning: {
    icon: TriangleAlert,
    wrap: 'border-amber-500/30 bg-amber-500/5',
    ic: 'text-amber-400',
  },
  tip: {
    icon: Lightbulb,
    wrap: 'border-violet-500/30 bg-violet-500/5',
    ic: 'text-violet-400',
  },
  success: {
    icon: CircleCheck,
    wrap: 'border-emerald-500/30 bg-emerald-500/5',
    ic: 'text-emerald-400',
  },
}

const s = computed(() => styles[props.type] || styles.info)
</script>

<template>
  <div :class="['my-5 flex gap-3 rounded-xl border px-4 py-3.5', s.wrap]">
    <component :is="s.icon" :class="['mt-0.5 h-5 w-5 shrink-0', s.ic]" />
    <div class="min-w-0 text-sm leading-relaxed text-foreground/90">
      <p v-if="title" class="mb-1 font-semibold text-foreground">{{ title }}</p>
      <slot />
    </div>
  </div>
</template>
