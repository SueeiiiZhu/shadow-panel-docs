// 文档导航结构（侧边栏分组 + 顺序）
export const nav = [
  {
    title: '开始',
    items: [
      { to: '/', label: '介绍' },
      { to: '/why', label: '为什么重写' },
      { to: '/architecture', label: '系统架构' },
    ],
  },
  {
    title: '部署',
    items: [
      { to: '/quickstart', label: '快速开始' },
      { to: '/deploy', label: '生产部署' },
    ],
  },
  {
    title: '使用',
    items: [
      { to: '/protocols', label: '协议支持' },
      { to: '/nodes', label: '节点管理' },
      { to: '/dialer-proxy', label: '上游代理 / Dialer', badge: '核心' },
      { to: '/ip-proxy', label: '对接 IP 代理站' },
    ],
  },
  {
    title: '参考',
    items: [
      { to: '/migrate', label: '从 Trojan Panel 迁移' },
      { to: '/faq', label: '常见问题' },
    ],
  },
]

// 扁平顺序，用于上一页 / 下一页
export const flat = nav.flatMap((g) => g.items)
