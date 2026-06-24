<script setup>
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  Rocket,
  Network,
  Layers,
  ShieldCheck,
  Gauge,
  Boxes,
  Terminal,
} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import CodeBlock from '@/components/CodeBlock.vue'

const features = [
  {
    icon: Network,
    title: '原生上游代理',
    desc: '每个节点可直接挂 socks5 / http(s) 上游或 dialer-proxy 链式出站，IP 代理站的节点拿来即用。',
  },
  {
    icon: Layers,
    title: '四协议内核',
    desc: 'Xray、Trojan-Go、Hysteria2、NaiveProxy 统一纳管，配置模板化、进程自托管。',
  },
  {
    icon: Boxes,
    title: '极简依赖',
    desc: '单进程 + SQLite 即可起步，去掉 MariaDB / Redis / gRPC 三件套的运维负担。',
  },
  {
    icon: ShieldCheck,
    title: '多用户与配额',
    desc: '流量配额、到期时间、限速、IP 限制、黑名单，多租户能力开箱即用。',
  },
  {
    icon: Gauge,
    title: '实时看板',
    desc: '节点在线状态、上下行流量、服务器负载，一屏掌握。',
  },
  {
    icon: Terminal,
    title: '一键脚本',
    desc: '一条命令完成面板与节点部署，支持 amd64 / arm64。',
  },
]

const protocols = ['Xray', 'Trojan-Go', 'Hysteria2', 'NaiveProxy']
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden border-b border-border">
      <div class="absolute inset-0 bg-grid opacity-[0.4]" />
      <div
        class="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      <div class="relative mx-auto max-w-4xl px-6 py-20 text-center lg:py-28">
        <Badge variant="outline" class="mx-auto mb-5 backdrop-blur">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          下一代 Trojan Panel · 更轻、更通
        </Badge>
        <h1
          class="mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-6xl"
        >
          为代理而生的<br class="hidden sm:block" />
          <span
            class="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
            >多用户管理面板</span
          >
        </h1>
        <p
          class="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground"
        >
          Shadow Panel 是对 Trojan Panel 的轻量化重写。支持
          Xray / Trojan-Go / Hysteria / NaiveProxy，并<strong
            class="text-foreground"
            >原生支持 socks/https 上游与 dialer-proxy 链式代理</strong
          >—— 让你能直接对接 IP 代理站提供的节点。
        </p>
        <div
          class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button as="a" size="lg" href="#" class="w-full sm:w-auto">
            <RouterLink to="/quickstart" class="flex items-center gap-2">
              <Rocket class="h-4 w-4" /> 快速开始
            </RouterLink>
          </Button>
          <Button
            variant="outline"
            size="lg"
            as="div"
            class="w-full sm:w-auto"
          >
            <RouterLink to="/dialer-proxy" class="flex items-center gap-2">
              上游代理指南 <ArrowRight class="h-4 w-4" />
            </RouterLink>
          </Button>
        </div>

        <div
          class="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          <span class="text-sm text-muted-foreground">支持协议：</span>
          <Badge v-for="p in protocols" :key="p" variant="secondary">{{
            p
          }}</Badge>
        </div>
      </div>
    </section>

    <!-- Quick install -->
    <section class="mx-auto max-w-3xl px-6 pt-14">
      <h2 class="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-primary">
        一条命令起步
      </h2>
      <p class="mb-5 text-center text-muted-foreground">
        在干净的 Linux 服务器上执行，即可拉起面板与节点核心。
      </p>
      <CodeBlock
        lang="bash"
        filename="install.sh"
        :code="'bash <(curl -fsSL https://get.shadow-panel.dev)'"
      />
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-6xl px-6 py-16">
      <div class="mb-10 text-center">
        <h2 class="text-3xl font-bold tracking-tight text-foreground">
          为什么选择 Shadow Panel
        </h2>
        <p class="mx-auto mt-3 max-w-2xl text-muted-foreground">
          保留 Trojan Panel 的多用户能力，砍掉冗余依赖，补上最关键的上游代理短板。
        </p>
      </div>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="f in features"
          :key="f.title"
          class="group p-6 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
        >
          <div
            class="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
          >
            <component :is="f.icon" class="h-5 w-5" />
          </div>
          <h3 class="mb-1.5 font-semibold text-foreground">{{ f.title }}</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            {{ f.desc }}
          </p>
        </Card>
      </div>
    </section>

    <!-- CTA -->
    <section class="mx-auto max-w-4xl px-6 pb-20">
      <Card
        class="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-10 text-center"
      >
        <div
          class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
        />
        <h2 class="relative text-2xl font-bold text-foreground">
          准备好接入 IP 代理站节点了吗？
        </h2>
        <p class="relative mx-auto mt-3 max-w-xl text-muted-foreground">
          跟随上游代理 / Dialer 指南，五分钟把 socks5 / https 节点接入你的面板。
        </p>
        <div class="relative mt-6 flex justify-center">
          <Button size="lg" as="div">
            <RouterLink to="/ip-proxy" class="flex items-center gap-2">
              对接 IP 代理站 <ArrowRight class="h-4 w-4" />
            </RouterLink>
          </Button>
        </div>
      </Card>
    </section>
  </div>
</template>
