<script setup>
import { ref, computed } from 'vue'
import { Check, Copy } from 'lucide-vue-next'

const props = defineProps({
  code: { type: String, required: true },
  lang: { type: String, default: 'bash' },
  filename: { type: String, default: '' },
})

const copied = ref(false)
const display = computed(() => props.code.replace(/\n$/, ''))

async function copy() {
  try {
    await navigator.clipboard.writeText(display.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div
    class="group relative my-5 overflow-hidden rounded-xl border border-border bg-[hsl(240_10%_6%)] text-sm shadow-sm"
  >
    <div
      class="flex items-center justify-between border-b border-white/5 px-4 py-2"
    >
      <div class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-full bg-[#ff5f56]/80" />
        <span class="h-3 w-3 rounded-full bg-[#ffbd2e]/80" />
        <span class="h-3 w-3 rounded-full bg-[#27c93f]/80" />
        <span
          v-if="filename"
          class="ml-3 font-mono text-xs text-zinc-400"
          >{{ filename }}</span
        >
      </div>
      <div class="flex items-center gap-3">
        <span
          class="font-mono text-[11px] uppercase tracking-wider text-zinc-500"
          >{{ lang }}</span
        >
        <button
          class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
          @click="copy"
        >
          <component :is="copied ? Check : Copy" class="h-3.5 w-3.5" />
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
    </div>
    <pre
      class="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed text-zinc-100"
    ><code>{{ display }}</code></pre>
  </div>
</template>
