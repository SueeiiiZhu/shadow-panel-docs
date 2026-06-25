# Trojan Panel 分析报告 与 Shadow Panel 重写设计

> 调研日期：2026-06-24 · 资料来源：<https://trojanpanel.github.io/> 与 `trojanpanel/` 源码（install-script / trojan-panel / trojan-panel-core / trojan-panel-ui）。

## 一、Trojan Panel 现状分析

### 1.1 组成（4 个分离仓库）

| 组件 | 技术栈 | 职责 |
| --- | --- | --- |
| `install-script` | Bash + docker-compose | 一键部署（联机/单机） |
| `trojan-panel` | Go 1.19 + Gin + gendry(手写 SQL) | 后端控制面：认证(JWT+Casbin)、用户/节点/订阅/看板 |
| `trojan-panel-core` | Go 1.20 + Gin + gRPC | 节点核心：进程管理器，生成内核配置并 `os/exec` 拉起 |
| `trojan-panel-ui` | Vue 2.6 + Element UI 2.15 | 管理后台前端 |

### 1.2 部署与中间件

`docker-compose.yml` 实际拉起 **6 个容器**：`caddy` + `mariadb`(10.7) + `redis`(6.2) + `trojan-panel` + `trojan-panel-ui` + `trojan-panel-core`，全部 `network_mode: host`。

### 1.3 通信与存储

- **Panel → Core**：gRPC（`insecure.NewCredentials()`，**无 TLS**），JWT 放 metadata，连 `nodeServerIp:grpcPort`(默认 8100)。接口：`AddNode/RemoveNode/RemoveAccount/GetNodeState/GetNodeServerState/GetNodeServerInfo`。
- **账号数据共享**：Panel 与 Core **共用同一个 MySQL**，Core 直接读写 `account` 表（`pass/hash/download/upload`），不经 gRPC 传账号。
- **缓存/锁**：Redis（token、分布式锁 redsync）。
- Core 每 50s 定时：差量同步账号、累加各内核流量回 MySQL。

### 1.4 协议建模

- `node` 主表 + 协议分表：`node_xray` / `node_trojan_go` / `node_hysteria` / `node_hysteria2`；`node_server` 存服务器 IP+gRPC 端口。
- `node_type` 枚举：`1=Xray 2=TrojanGo 3=Hysteria 4=NaiveProxy 5=Hysteria2`。
- Core 为每个内核生成 JSON 配置文件 → `bin/{kernel}/config/config-{apiPort}.json`，`apiPort = port + 30000`。
- NaiveProxy = Caddy + `forward_proxy`，用户经 Caddy Admin API 动态增删。

### 1.5 关键短板（重写动机）

1. **出站只能直连**：Xray 默认模板 `outbounds` 恒为 `[{"protocol":"freedom"}]`；gRPC 的 `NodeAddDto` **没有任何 outbound / dialer / socks / 上游代理字段**。Trojan-Go / Hysteria / Hysteria2 模板同样无出站代理配置。
2. **无法对接 IP 代理站**：拿到的 socks5 / https 节点**无处可填**，用户流量只能从落地机本机 IP 出去。
3. **不支持 dialer-proxy 链式出站**。
4. **依赖重、耦合高**：MariaDB + Redis + 无 TLS gRPC + 4 个分离仓库 + 6 容器，部署运维门槛高。

## 二、底层内核版本差距（2026-06 实测）

| 内核 | trojanpanel 钉住 | 最新版（2026-06） | 状态 |
| --- | --- | --- | --- |
| Xray-core | **v1.8.0**（2023） | **v26.x 日期版**（如 v26.6.22 / v26.3.27） | 落后约 3 年，缺 XHTTP / 最新 Reality / Vision 改进 |
| Trojan-Go | v0.10.6（2021-09） | v0.10.6（仍是最后一版） | **EOL**，2021 后无 release |
| Hysteria | v1 + 旧 hysteria2 | **Hysteria2 `app/v2.9.2`**（2026-05） | v1 已弃用，官方全面转 v2 |
| NaiveProxy | `forwardproxy@naive`(Caddy 插件) | **v149.0.7827.114-1**（2026-06） | 跟随 Chromium 149 |
| sing-box | 未使用 | **v1.13.13** 稳定（v1.14.0-alpha） | 推荐引入的现代统一内核 |

**升级建议**：① Xray-core → v26.x 最新；② 全面 Hysteria2、移除 v1；③ 废弃 Trojan-Go（EOL），改用 Xray trojan inbound 或 sing-box；④ 引入 sing-box 统一承载 VLESS/Vision、Trojan、Shadowsocks、Hysteria2、TUIC，简化多二进制；⑤ NaiveProxy 跟随 Chromium 最新 tag。

## 三、Shadow Panel 重写设计

### 3.1 目标

更轻（少依赖）、更通（原生上游/dialer-proxy）、更新（最新内核）。

### 3.2 架构

```
管理员 ──HTTPS:443──> Caddy (自动 ACME 证书 + 反向代理)
                         │  443 → 127.0.0.1:8080
                         ▼
                    shadow-panel (控制面, 本地 :8080)
                    │  · 单二进制内嵌 Vue 后台
                    │  · SQLite 默认存储（可选 MySQL）
                    │  · 认证/用户/节点/订阅/看板
                    │
                    ├─HTTPS REST + per-agent token─> shadow-agent #1 (:8443) + Caddy(发证)
                    └─HTTPS REST + per-agent token─> shadow-agent #2 (:8443) + Caddy(发证)
                                                       │ 生成内核配置 / 启停进程 / 上报流量
                                                       │ TLS 证书复用本机 Caddy 自动签发的 crt/key
                                                       ▼
                                   Xray-core · Hysteria2 · NaiveProxy · sing-box
                                                       │
                                          出站：直连  或  上游 socks5/https / dialer-proxy 链式
                                                       ▼
                                                   目标站点
```

**TLS 方案**：不自建 ACME，统一交给 **Caddy**（静态二进制，启动即自动向 Let's Encrypt / ZeroSSL 申请并续期免费正式证书）。面板侧 Caddy 反代 `127.0.0.1:8080` 并在 443 终止 TLS；节点侧每台落地机也跑一个 Caddy，为节点域名自动签发证书并托管伪装站，`shadow-agent` 直接复用 Caddy 证书存储中的 `crt/key` 喂给各内核（NaiveProxy 本身即 Caddy + `forward_proxy`，天然集成）。证书续期全程由 Caddy 自动完成，无需手动维护。

### 3.3 与 Trojan Panel 的关键差异

| 维度 | Trojan Panel | Shadow Panel |
| --- | --- | --- |
| 二进制/仓库 | 4 仓库 / 6 容器 | 2 个单二进制（panel + agent） |
| 存储 | MariaDB + Redis | SQLite 默认（可选 MySQL） |
| Panel↔节点通信 | 无 TLS gRPC + 共享 MySQL | HTTPS REST + per-agent token |
| TLS 证书 | 各内核/Caddy 各自零散管理 | 统一 Caddy 自动签发+续期，内核复用其 crt/key |
| 出站 | 硬编码 `freedom` 直连 | 每节点可配 上游 socks/https + dialer-proxy |
| 对接 IP 代理站 | ❌ | ✅ |
| 内核版本 | Xray v1.8.0 / Trojan-Go EOL / Hysteria v1 | Xray v26.x / Hysteria2 / sing-box / 弃用 Trojan-Go |

### 3.4 核心新能力：上游代理 / dialer-proxy

基于 Xray-core 的 `outbound` + `streamSettings.sockopt.dialerProxy`：

- **简单上游**：节点出站直接设为 `socks`/`http` 指向 IP 代理站端点，用户流量经该出口 IP 出网。
- **dialer-proxy 链式**：保留某出站协议，但其底层 TCP 连接经另一个 `outbound`（`sockopt.dialerProxy` 引用其 tag）建立，实现多级落地。

详见教程站 `上游代理 / Dialer-Proxy` 与 `对接 IP 代理站` 两页。

---

*本文档随教程站一同维护，作为重写的需求与设计依据。*
