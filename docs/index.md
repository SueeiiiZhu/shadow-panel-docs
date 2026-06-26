---
layout: home
title: 首页

hero:
  name: Shadow Panel
  text: 轻量化多协议代理面板
  tagline: 单二进制起步 · 原生支持 socks/https 上游与 dialer-proxy 链式出站
  actions:
    - theme: brand
      text: 快速开始
      link: /quick-start
    - theme: alt
      text: 上游代理指南
      link: /dialer-proxy

features:
  - icon: 🔌
    title: 原生上游代理
    details: 每个节点可直接挂 socks5 / http(s) 上游或 dialer-proxy 链式出站，IP 代理站的节点拿来即用。
  - icon: 🧩
    title: 最新四内核
    details: Xray-core v26 / Hysteria2 / sing-box / NaiveProxy 统一纳管，淘汰已 EOL 的 Trojan-Go。
  - icon: 🪶
    title: 极简依赖
    details: 单进程 + SQLite 即可起步，去掉 MariaDB / Redis / gRPC 三件套的运维负担。
  - icon: 👥
    title: 多用户与配额
    details: 流量配额、到期时间、限速、IP 限制、黑名单，多租户能力开箱即用。
  - icon: 📊
    title: 实时看板
    details: 节点在线状态、上下行流量、服务器负载，一屏掌握。
  - icon: ⚡
    title: 一键脚本
    details: 一条命令完成面板与节点部署，支持 amd64 / arm64。
---
