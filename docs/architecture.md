---
title: 系统架构
---

# 系统架构

控制面 Panel + 数据面 Agent 两层，HTTPS REST 串联，SQLite 起步。

## 总览

Shadow Panel 采用两层架构：**控制面 shadow-panel**（下称 Panel）负责所有管理逻辑，**数据面 shadow-agent**（下称 Agent）部署在每台代理服务器上，负责生成内核配置并管理内核进程。两者之间通过 `HTTPS REST` + 每 Agent 独立 bearer token 通信，无需共享数据库。

::: code-group
```text [架构总览]
管理员 (浏览器)
     │  HTTPS :443
     ▼
┌────────────────────────────────────────┐
│            Caddy（反向代理）             │
│   自动 ACME 证书 · 443 → 127.0.0.1:8080  │
└───────────────┬────────────────────────┘
                ▼
┌────────────────────────────────────────┐
│         shadow-panel  :8080(本地)       │
│  内嵌 Vue 管理后台 · SQLite(默认)/MySQL │
│  认证 / 用户 / 节点 / 订阅 / 看板       │
└───────────────┬────────────────────────┘
                │  HTTPS REST + Bearer Token
       ┌────────┴─────────┐
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│ shadow-agent│    │ shadow-agent│   …更多节点服务器
│  :8443      │    │  :8443      │
│ Caddy(发证) │    │ Caddy(发证) │
└──────┬──────┘    └──────┬──────┘
       │                  │
  生成配置 / 启停进程    生成配置 / 启停进程
  （复用 Caddy 证书）    （复用 Caddy 证书）
       │                  │
  ┌────┴────────────┐      ┌────┴─────────────┐
  │ Xray-core       │      │ Hysteria2         │
  │ Hysteria2       │      │ sing-box          │
  │ NaiveProxy      │      │ NaiveProxy        │
  │ sing-box        │      └────────┬──────────┘
  └────────┬────────┘               │
           │                        │
     出站（直连 或 上游 socks5/https）
           │                        │
           ▼                        ▼
        目标站点                  目标站点
```
:::

## 控制面 Panel

Panel 是一个**单文件二进制**，内嵌已编译好的 Vue 3 管理后台，无需单独部署前端服务器。启动后默认监听本地 `127.0.0.1:8080` 提供管理界面和 REST API，由前置的 **Caddy** 反向代理在 `:443` 终止 TLS 并自动签发证书。

- **认证**：JWT 签发与验证，支持 RBAC 权限控制。
- **用户管理**：流量配额、到期时间、限速、设备/IP 限制、黑名单。
- **节点管理**：注册 Agent、下发节点配置（协议、端口、域名、上游代理）。
- **订阅**：生成分享链接，输出 Clash / sing-box 订阅格式。
- **看板**：汇聚各 Agent 心跳上报的流量与在线状态。

存储默认使用 `SQLite`，适合单机快速起步；可通过配置切换为 MySQL，满足多实例高可用需求。Panel 本身无状态，所有持久化数据均在数据库中，方便水平扩展。

## 数据面 Agent

Agent 是部署在每台代理服务器上的**单文件二进制**，在 `:8443` 提供 HTTPS API。Agent 不直接访问数据库，所有配置均由 Panel 通过 REST 下发。

- **生成内核配置**：根据 Panel 下发的节点参数，渲染 Xray-core / Hysteria2 / NaiveProxy / sing-box 所需的 JSON/YAML 配置文件。
- **启停内核进程**：通过 `os/exec` 管理内核子进程的生命周期（启动、重启、停止）。
- **上报流量与状态**：定期向 Panel 心跳上报各节点的入/出站流量字节数与在线用户数。

Agent 向 Panel 发起心跳（**Agent 主动推**），Panel 无需主动连接 Agent，适合 Agent 位于 NAT 或防火墙后的场景。每个 Agent 持有唯一 bearer token，token 由 Panel 在注册时颁发，可随时吊销。

## Panel 与 Agent 通信

通信协议为 **HTTPS REST**，每个请求在 `Authorization: Bearer <token>` 头中携带 Agent 专属 token。以下为核心端点示意：

| 方向 | 方法 + 路径 | 用途 |
|---|---|---|
| Agent → Panel | `POST /api/agents/register` | Agent 首次注册，Panel 颁发 token |
| Panel → Agent | `PUT /api/nodes/:id/config` | Panel 下发节点配置（协议参数 + 上游出站） |
| Agent → Panel | `POST /api/agents/heartbeat` | 心跳：上报流量字节数与节点在线状态 |
| Panel → Agent | `GET /api/nodes/:id/stats` | Panel 主动拉取单节点实时流量统计 |
| Panel → Agent | `POST /api/nodes/:id/restart` | Panel 触发内核进程重启 |

与旧版 Trojan Panel 的「**无 TLS gRPC + 共享 MySQL**」方案相比：

- 旧版 gRPC 通道不加密（明文传输节点配置与账号信息），Shadow Panel 所有通信走 HTTPS，传输层默认加密。
- 旧版 Agent 直连 Panel 侧 MySQL，意味着数据库端口必须对所有 Agent 服务器开放；Shadow Panel 中 Agent 只需能访问 Panel 经 Caddy 暴露的 `:443` HTTPS 端口，数据库完全隔离在 Panel 内部。
- 旧版多 Agent 共用同一个数据库账号，权限边界模糊；Shadow Panel 每 Agent 独立 token，随时可单独吊销，不影响其他 Agent。

::: tip 为什么选 REST 而非 gRPC
REST over HTTPS 相比 gRPC 有三个实际优势：其一，**更易调试**——`curl` / Postman 即可模拟请求，无需 grpcurl 或 .proto 文件；其二，**更易穿透**——标准 HTTPS(443/8443) 几乎所有云厂商防火墙和 CDN 均默认放行，gRPC 的 HTTP/2 帧有时会被中间件拦截；其三，**TLS 开箱即用**——前置 Caddy 即可自动签发并续期标准 HTTPS 证书，REST 直接复用，gRPC 需额外配置 TLS credentials，在生产环境中更易出错。
:::

## 与 Trojan Panel 架构对比

| 维度 | Trojan Panel（旧） | Shadow Panel（新） |
|---|---|---|
| 仓库 / 组件数 | 4 个仓库（install-script / backend / core / UI），部署需逐一维护 | 2 个单文件二进制（panel + agent），UI 内嵌于 panel |
| Panel ↔ Agent 通信 | 无 TLS 明文 gRPC | HTTPS REST + 每 Agent 独立 bearer token |
| 账号数据传递 | Agent 直连共享 MySQL，账号从库中轮询同步 | Panel 通过 REST 下发配置；Agent 无需访问数据库 |
| 存储依赖 | MariaDB/MySQL + Redis（缓存 + 分布式锁） | SQLite（默认）或 MySQL；无需 Redis |
| 传输层 TLS | Panel ↔ Agent 明文；数据库连接依赖网络隔离 | 全链路 HTTPS，Caddy 自动签发并续期证书 |
| 上游出站 / 代理链 | 全部硬编码直连，无法配置上游 socks5/https | 每节点可配置 upstream dialer（socks5 / http），支持多级链式出站 |
| 支持内核 | Xray-core v1.8.0 / Trojan-Go(EOL) / Hysteria v1 / NaiveProxy | Xray-core v26.x / Hysteria2 / NaiveProxy / sing-box |
