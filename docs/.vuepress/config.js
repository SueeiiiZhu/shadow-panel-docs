import { viteBundler } from '@vuepress/bundler-vite'
import { searchPlugin } from '@vuepress/plugin-search'
import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'Shadow Panel',
  description:
    '轻量化多协议代理面板 —— 两个单二进制、原生上游/dialer-proxy、最新内核、Caddy 自动 TLS。Trojan Panel 的轻量化重写。',

  head: [['link', { rel: 'icon', href: '/favicon.svg' }]],

  bundler: viteBundler(),

  theme: defaultTheme({
    logo: '/favicon.svg',
    // 顶部导航
    navbar: [
      { text: '介绍', link: '/' },
      { text: '指南', link: '/why.md' },
      { text: '部署', link: '/quick-start.md' },
      { text: '协议', link: '/protocols.md' },
      { text: '迁移', link: '/migrate.md' },
      { text: 'FAQ', link: '/faq.md' },
    ],
    // 侧边栏分组（顺序与原站一致）
    sidebar: [
      {
        text: '开始',
        collapsible: false,
        children: ['/README.md', '/why.md', '/architecture.md'],
      },
      {
        text: '部署',
        collapsible: false,
        children: ['/quick-start.md', '/deploy.md'],
      },
      {
        text: '使用',
        collapsible: false,
        children: ['/protocols.md', '/nodes.md', '/dialer-proxy.md', '/ip-proxy.md'],
      },
      {
        text: '参考',
        collapsible: false,
        children: ['/migrate.md', '/faq.md'],
      },
    ],
    // 关闭依赖外部仓库 / git 元数据的功能
    editLink: false,
    lastUpdated: false,
    contributors: false,
  }),

  plugins: [
    searchPlugin({
      locales: {
        '/': { placeholder: '搜索文档' },
      },
      maxSuggestions: 10,
    }),
  ],
})
