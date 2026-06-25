import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { hopeTheme } from 'vuepress-theme-hope'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'Shadow Panel',
  description:
    '轻量化多协议代理面板 —— 两个单二进制、原生上游/dialer-proxy、最新内核、Caddy 自动 TLS。Trojan Panel 的轻量化重写。',

  head: [['link', { rel: 'icon', href: '/favicon.svg' }]],

  bundler: viteBundler(),

  theme: hopeTheme({
    logo: '/favicon.svg',
    repo: undefined,
    docsDir: 'docs',

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

    // 页脚
    footer: 'Shadow Panel · 轻量化多协议代理面板',
    displayFooter: true,

    // 关闭依赖外部仓库 / git 元数据的功能
    editLink: false,
    lastUpdated: false,
    contributors: false,

    // markdown 增强（hint 容器 / 代码分组 / 选项卡等）
    markdown: {
      hint: true,
      tabs: true,
      codeTabs: true,
      align: true,
      tasklist: true,
      mark: true,
      sup: true,
      sub: true,
    },

    // 主题内置插件
    plugins: {
      // 本地全文搜索
      slimsearch: {
        indexContent: true,
        hotKeys: [{ key: 'k', ctrl: true }],
      },
    },
  }),
})
