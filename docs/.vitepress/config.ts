import { defineConfig } from 'vitepress'

// 部署在 GitHub Pages 项目页：https://sueeiiizhu.github.io/shadow-panel-docs/
// 自建域名或迁到用户页时改回 '/'。
const base = '/shadow-panel-docs/'

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: 'Shadow Panel',
  description:
    '轻量化多协议代理面板 —— 两个单二进制、原生上游/dialer-proxy、最新内核、Caddy 自动 TLS。Trojan Panel 的轻量化重写。',

  head: [['link', { rel: 'icon', href: `${base}favicon.svg` }]],

  lastUpdated: false,
  cleanUrls: true,
  metaChunk: true,

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: '指南', link: '/why', activeMatch: '/(why|architecture)' },
      { text: '部署', link: '/quick-start', activeMatch: '/(quick-start|deploy)' },
      { text: '协议', link: '/protocols' },
      { text: '上游代理', link: '/dialer-proxy' },
      { text: '迁移', link: '/migrate' },
      { text: 'FAQ', link: '/faq' },
    ],

    sidebar: [
      {
        text: '开始',
        items: [
          { text: '介绍', link: '/' },
          { text: '为什么重写', link: '/why' },
          { text: '系统架构', link: '/architecture' },
        ],
      },
      {
        text: '部署',
        items: [
          { text: '快速开始', link: '/quick-start' },
          { text: '生产部署（Caddy 自动 TLS）', link: '/deploy' },
        ],
      },
      {
        text: '使用',
        items: [
          { text: '协议支持与内核版本', link: '/protocols' },
          { text: '节点管理', link: '/nodes' },
          { text: '上游代理 / Dialer-Proxy', link: '/dialer-proxy' },
          { text: '对接 IP 代理站', link: '/ip-proxy' },
        ],
      },
      {
        text: '参考',
        items: [
          { text: '从 Trojan Panel 迁移', link: '/migrate' },
          { text: '常见问题', link: '/faq' },
        ],
      },
    ],

    // 本地全文搜索（minisearch），中文文案
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    footer: {
      message: '轻量化多协议代理面板 · Trojan Panel 的轻量化重写',
      copyright: 'Shadow Panel',
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },
})
