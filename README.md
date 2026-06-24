# Shadow Panel · 部署与使用教程站

[Shadow Panel](.) 是对 [Trojan Panel](https://trojanpanel.github.io/) 的轻量化重写：单二进制 + SQLite 起步、HTTPS REST 取代无 TLS gRPC，并**原生支持 socks/https 上游与 dialer-proxy 链式出站**，让面板能直接对接 IP 代理站提供的节点。

本仓库是它的**教程与部署文档站**，使用 **Vue 3 + Vite + Tailwind v4 + shadcn 风格组件** 构建。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Vue 3 (`<script setup>`) |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS v4 (`@tailwindcss/vite`) |
| 组件 | shadcn 设计语言（`cva` + `clsx` + `tailwind-merge` 手写组件，代码自持） |
| 图标 | lucide-vue-next |
| 路由 | vue-router 4 |

> shadcn 的理念是「组件代码归你所有」，因此 `src/components/ui/*` 是按 shadcn 设计语言手写的组件，而非外部依赖。

## 开发

```bash
pnpm install
pnpm dev      # 本地开发 http://localhost:5173
pnpm build    # 产物输出到 dist/
pnpm preview  # 预览构建产物
```

## 目录结构

```
src/
├── App.vue              # 外壳：顶栏 + 侧边栏 + 移动抽屉 + 主题切换
├── main.js              # 入口
├── style.css           # Tailwind v4 + shadcn 主题 token（明/暗）
├── nav.js              # 文档侧边栏结构（分组与顺序）
├── router/             # 路由（每个文档页一个懒加载路由）
├── lib/utils.js        # cn() class 合并工具
├── composables/
│   └── useTheme.js     # 明暗主题
├── components/
│   ├── DocPage.vue     # 文档页容器（标题 + 导语 + 上一页/下一页）
│   ├── Prose.vue       # 正文排版样式
│   ├── CodeBlock.vue   # 带复制按钮的代码块
│   ├── Callout.vue     # info/warning/tip/success 提示块
│   ├── Logo.vue
│   └── ui/             # shadcn 风格基础组件 Button/Badge/Card
└── views/              # 文档页面
    ├── Intro.vue           # 首页（Hero + 特性 + CTA）
    ├── Why.vue             # 为什么重写
    ├── Architecture.vue    # 系统架构
    ├── QuickStart.vue      # 快速开始
    ├── Deploy.vue          # 生产部署
    ├── Protocols.vue       # 协议支持 + 底层内核版本与升级建议
    ├── Nodes.vue           # 节点管理
    ├── DialerProxy.vue     # 上游代理 / Dialer-Proxy（核心）
    ├── IpProxy.vue         # 对接 IP 代理站
    ├── Migrate.vue         # 从 Trojan Panel 迁移
    └── Faq.vue             # 常见问题
```

## 内容要点

- **为什么重写**：旧版依赖重（MariaDB + Redis + 无 TLS gRPC + 4 仓库）、出站硬编码 `freedom` 直连、无法对接 IP 代理站、不支持 dialer-proxy。
- **上游代理 / Dialer**：基于 Xray-core `outbound` + `streamSettings.sockopt.dialerProxy`，支持简单上游与多级链式出站。
- **底层内核**：使用最新内核（Xray-core v26.x、Hysteria2 v2.9.x、sing-box v1.13.x、NaiveProxy 跟随 Chromium），淘汰已 EOL 的 Trojan-Go。

## 许可证

文档内容与代码用于 Shadow Panel 项目教学用途。
