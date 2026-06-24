<script setup>
import { computed } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: { type: String, default: 'default' },
  class: { type: String, default: '' },
})

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-muted-foreground',
        success:
          'border-transparent bg-emerald-500/15 text-emerald-500',
        warning: 'border-transparent bg-amber-500/15 text-amber-500',
        destructive:
          'border-transparent bg-destructive/15 text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const classes = computed(() =>
  cn(badgeVariants({ variant: props.variant }), props.class),
)
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
