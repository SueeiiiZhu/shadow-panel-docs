import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn 经典 cn 工具：合并 class 并去重冲突 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
