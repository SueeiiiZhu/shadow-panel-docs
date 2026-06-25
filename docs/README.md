---
home: true
title: 首页
heroText: Shadow Panel
tagline: 为代理而生的多用户管理面板——原生支持 socks/https 上游与 dialer-proxy 链式代理
actions:
  - text: 快速开始
    link: ./quick-start.md
    type: primary
  - text: 上游代理指南
    link: ./dialer-proxy.md
    type: default
features:
  - title: 原生上游代理
    details: 每个节点可直接挂 socks5 / http(s) 上游或 dialer-proxy 链式出站，IP 代理站的节点拿来即用。
  - title: 最新四内核
    details: Xray-core v26 / Hysteria2 / sing-box / NaiveProxy 统一纳管，淘汰已 EOL 的 Trojan-Go；配置模板化、进程自托管。
  - title: 极简依赖
    details: 单进程 + SQLite 即可起步，去掉 MariaDB / Redis / gRPC 三件套的运维负担。
  - title: 多用户与配额
    details: 流量配额、到期时间、限速、IP 限制、黑名单，多租户能力开箱即用。
  - title: 实时看板
    details: 节点在线状态、上下行流量、服务器负载，一屏掌握。
  - title: 一键脚本
    details: 一条命令完成面板与节点部署，支持 amd64 / arm64。
---

`下一代 Trojan Panel · 更轻、更通`

Shadow Panel 是对 Trojan Panel 的轻量化重写。基于最新内核 Xray-core v26 / Hysteria2 / sing-box / NaiveProxy（淘汰已 EOL 的 Trojan-Go），并**原生支持 socks/https 上游与 dialer-proxy 链式代理**—— 让你能直接对接 IP 代理站提供的节点。

支持内核：`Xray-core` `Hysteria2` `sing-box` `NaiveProxy`

## 一条命令起步

在干净的 Linux 服务器上执行，即可拉起面板与节点核心。

```bash title="install.sh"
bash <(curl -fsSL https://get.shadow-panel.dev)
```

## 为什么选择 Shadow Panel

保留 Trojan Panel 的多用户能力，砍掉冗余依赖，补上最关键的上游代理短板。

## 准备好接入 IP 代理站节点了吗？

跟随上游代理 / Dialer 指南，五分钟把 socks5 / https 节点接入你的面板。

[对接 IP 代理站](./ip-proxy.md)
