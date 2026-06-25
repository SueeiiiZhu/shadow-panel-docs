# Shadow Panel · 部署与使用教程站

[Shadow Panel](https://trojanpanel.github.io/) 是对 [Trojan Panel](https://trojanpanel.github.io/) 的轻量化重写：单二进制 + SQLite 起步、HTTPS REST 取代无 TLS gRPC、Caddy 自动签发 TLS 证书，并**原生支持 socks/https 上游与 dialer-proxy 链式出站**，让面板能直接对接 IP 代理站提供的节点。

本仓库是它的**教程与部署文档站**，使用 **VuePress 2**（默认主题）构建，内容为 markdown。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | VuePress 2 (`2.0.0-rc`) |
| 打包 | `@vuepress/bundler-vite` |
| 主题 | `@vuepress/theme-default` |
| 搜索 | `@vuepress/plugin-search`（本地全文搜索） |
| 内容 | Markdown（`docs/*.md`） |

## 开发

```bash
pnpm install
pnpm docs:dev     # 本地开发，默认 http://localhost:8080
pnpm docs:build   # 产物输出到 docs/.vuepress/dist/
```

## 目录结构

```
docs/
├── .vuepress/
│   ├── config.js         # 站点配置：导航 / 侧边栏 / 搜索
│   └── public/           # 静态资源（favicon 等）
├── README.md             # 首页（home 布局：介绍）
├── why.md                # 为什么重写
├── architecture.md       # 系统架构
├── quick-start.md        # 快速开始
├── deploy.md             # 生产部署（含 Caddy 自动 TLS）
├── protocols.md          # 协议支持 + 底层内核版本与升级建议
├── nodes.md              # 节点管理
├── dialer-proxy.md       # 上游代理 / Dialer-Proxy（核心）
├── ip-proxy.md           # 对接 IP 代理站
├── migrate.md            # 从 Trojan Panel 迁移
└── faq.md                # 常见问题
```

> 侧边栏分组与顺序在 `docs/.vuepress/config.js` 的 `sidebar` 中维护。

## 内容要点

- **为什么重写**：旧版依赖重（MariaDB + Redis + 无 TLS gRPC + 4 仓库）、出站硬编码 `freedom` 直连、无法对接 IP 代理站、不支持 dialer-proxy。
- **上游代理 / Dialer**：基于 Xray-core `outbound` + `streamSettings.sockopt.dialerProxy`，支持简单上游与多级链式出站。
- **底层内核**：使用最新内核（Xray-core v26.x、Hysteria2 v2.9.x、sing-box v1.13.x、NaiveProxy 跟随 Chromium），淘汰已 EOL 的 Trojan-Go。
- **TLS**：统一交给 Caddy 自动申请并续期免费正式证书 + 反向代理，内核复用其证书文件。

设计依据详见 [`ANALYSIS.md`](./ANALYSIS.md)。

## 许可证

文档内容与代码用于 Shadow Panel 项目教学用途。
