---
title: 常见问题
---

# 常见问题

部署、存储、内核、上游代理与协议的高频问题。

## 为什么默认用 SQLite？能换成 MySQL 吗？

SQLite 是单文件数据库，shadow-panel 二进制内置驱动，启动时自动创建 `panel.db`，无需额外安装任何服务，真正做到零依赖起步。对于管理数十台节点、数百用户的典型个人或小团队场景，SQLite 的性能完全充裕，且备份只需复制一个文件。

当满足以下任意条件时，建议切换到 MySQL：

- 需要多个 Panel 实例并发写入同一数据源（SQLite 不支持跨进程高并发写）。
- 用户量超过数千、流量记录行数达到千万级别，需要独立数据库做性能调优。
- 已有 MySQL 基础设施，希望统一运维。

切换方式：在 shadow-panel 的配置文件中将 `db.driver` 设为 `mysql` 并填写 DSN，重启即可；现有数据可通过导出工具迁移。

## 一定要域名和 TLS 证书吗？

取决于所选协议：

- **VLESS + XTLS-Reality**：不需要自有域名和证书，Reality 借用目标网站的 TLS 指纹完成握手，可在没有域名的 IP 上直接部署。
- **Hysteria2**：需要 TLS，但可使用自签证书（需客户端配置 `insecure: true` 或固定指纹），也可用真实域名，由节点上的 Caddy 自动签发证书。
- **VLESS / VMESS + TLS**、**Trojan（via Xray-core）**、**NaiveProxy**：均需要有效的 TLS 证书与真实域名；证书统一由节点上的 **Caddy** 通过 ACME 自动签发并续期，各内核直接复用 Caddy 的证书文件。
- **sing-box**：各协议要求与上述保持一致，Reality 入站同样可免域名。

::: tip 推荐做法
如果你没有域名，首选 VLESS + Reality；有域名则用 Hysteria2 或 Trojan via Xray-core，配合 Caddy 自动签发的真实证书，客户端兼容性更广。
:::

## dialer-proxy 支持所有内核和协议吗？

不同内核的支持程度有差异，以下是实际情况：

| 内核 | 上游出站能力 | 链式写法 |
|---|---|---|
| Xray-core v26.x | outbound socks / http(s)，路由绑定 | `sockopt.dialerProxy`，最完整 |
| sing-box v1.13.x | outbound socks / http(s) / direct | `detour` 字段，链式支持 |
| Hysteria2 | 服务端 `outbounds` 配置 socks5 / http / direct + ACL 分流 | 仅单级，无多级链式 |
| NaiveProxy (Caddy) | `forward_proxy upstream` 参数 | 单级上游，无 dialer-proxy 概念 |
| Trojan-Go | 出站能力弱，已 EOL（2021 停更） | 不建议依赖，请迁移到 Xray-core trojan inbound 或 sing-box |

Shadow Panel 在节点配置中统一抽象了 `upstream` 字段，shadow-agent 在生成各内核配置时会按上表自动翻译为对应格式；Trojan-Go 不在支持矩阵内。

```json title="xray-dialer-proxy.json"
{
  "outbounds": [
    {
      "tag": "proxy",
      "protocol": "freedom",
      "streamSettings": {
        "sockopt": { "dialerProxy": "upstream" }
      }
    },
    {
      "tag": "upstream",
      "protocol": "socks",
      "settings": {
        "servers": [{ "address": "proxy.example.com", "port": 1080,
                       "users": [{ "user": "u123", "pass": "p456" }] }]
      }
    }
  ]
}
```

```json title="sing-box-detour.json"
{
  "outbounds": [
    { "type": "direct", "tag": "direct-out",
      "detour": "upstream" },
    { "type": "socks", "tag": "upstream",
      "server": "proxy.example.com", "server_port": 1080,
      "username": "u123", "password": "p456" }
  ]
}
```

```yaml title="hysteria2-outbounds.yaml"
# Hysteria2 服务端 outbounds（config.yaml）
outbounds:
  - name: socks5-upstream
    type: socks5
    socks5:
      addr: proxy.example.com:1080
      username: u123
      password: p456

acl:
  inline:
    - outbound(socks5-upstream) all
```

```json title="naiveproxy-upstream.json"
{
  "handler": "forward_proxy",
  "hide_ip": true,
  "hide_via": true,
  "upstream": "socks5://u123:p456@proxy.example.com:1080"
}
```

## 上游 socks5 节点不支持 UDP，会影响哪些协议？

socks5 标准支持 UDP ASSOCIATE，但大多数 IP 代理站的 socks5 出口**仅提供 TCP**。这对不同传输协议的影响如下：

- **基于 TCP 的协议**（VLESS over TCP/WS/gRPC、Trojan、NaiveProxy）：完全正常，上游 socks5 纯 TCP 即可。
- **基于 QUIC / UDP 的协议**（Hysteria2、TUIC via sing-box）：服务端到上游出口这段路依赖 UDP 转发，若上游 socks5 不支持 UDP，则流量无法经由上游出口落地，会回落到直连或报错。
- **Reality / XTLS-Vision**：传输层走 TCP，上游 socks5 兼容。

::: warning Hysteria2 + TCP-only socks5 上游
如果上游 socks5 节点不支持 UDP，请勿将 Hysteria2 节点配置为走该上游出口；可改用 HTTP 代理上游（HTTP CONNECT 也是 TCP），或换用支持 UDP 的上游节点，或对该节点单独配置直连。
:::

## 为什么淘汰 Trojan-Go？

Trojan-Go 最后一个正式 Release 是 **v0.10.6**，发布于 **2021 年 9 月**。此后仓库虽未正式归档，但 2024 年 7 月之后基本停止更新，社区普遍视为 EOL（End of Life）。具体风险包括：

- 长期未合并安全修复，依赖库版本老旧。
- 不支持 Xray-core v26.x 带来的新特性（XHTTP、最新 Reality 改进、Vision 流控优化）。
- 出站代理能力弱，无法支持 `dialerProxy` 链式场景。
- 客户端生态逐渐不再维护 Trojan-Go 专属配置格式。

Shadow Panel 的迁移路径：原有 Trojan 协议节点改用 **Xray-core trojan inbound** 或 **sing-box trojan inbound**，协议语义完全兼容，客户端无感。

## Xray-core 应该用哪个版本？

Shadow Panel 跟随 **Xray-core v26.x**（2026 年日期版本号，如 v26.6.22）的最新 Release。与旧版 trojan-panel 钉住的 **v1.8.0**（2023 年发布）相比，v26.x 带来的关键改进包括：

- **XHTTP**：基于 HTTP/1.1 / HTTP/2 / HTTP/3 的通用流传输，适合反代伪装。
- **最新 Reality 改进**：uTLS 指纹更新、握手优化、更好的抗探测能力。
- **Vision 流控优化**：XTLS-Vision 在 v1.8.0 之后持续迭代，旧版不包含。
- **Go module 路径**：`github.com/xtls/xray-core`，可直接引入最新版。

::: tip 版本号说明
Xray-core 自 2025 年起采用日期版本号（`v年.月.日`），不再使用语义版本；v26.x 是 2026 年的最新主线。
:::

## 该选 Hysteria2 还是 VLESS+Reality？

两者定位不同，选择依据如下：

| 场景 | 推荐 | 原因 |
|---|---|---|
| 高丢包 / 弱网（移动网络、国际专线抖动大） | Hysteria2 | 基于 QUIC，内置拥塞控制（BBR/Brutal），弱网下吞吐量优势显著 |
| 需要抗深度包检测（DPI）或流量特征伪装 | VLESS + XTLS-Reality | 复用目标网站 TLS 指纹，流量与正常 HTTPS 无法区分 |
| 稳定宽带、优先兼容性 | VLESS + TCP / WS + TLS | 客户端生态最广，TCP 路径成熟 |
| 无域名裸 IP 部署 | VLESS + Reality | 不需要自有域名和证书 |
| 需要接上游 socks5（IP 代理站） | TCP 类协议优先 | 多数 IP 代理站 socks5 不支持 UDP，Hysteria2 慎用 |

## Panel 和 Agent 必须部署在同一台机器上吗？

不必。Shadow Panel 的设计前提就是 Panel 与 Agent 分离：

- **shadow-panel**（控制面）：通常部署在一台管理机或轻量云服务器上，对外暴露 HTTPS 管理后台（默认端口 `8080`）。
- **shadow-agent**（数据面）：部署在每一台代理服务器上，监听 HTTPS REST API（默认端口 `8443`），向 Panel 注册后接受配置下发、上报流量与心跳。

Panel 与 Agent 之间通过 **HTTPS REST + 每个 Agent 独立 Bearer Token** 通信，token 可单独吊销，不影响其他节点。理论上可以管理任意数量的 Agent，只要 Panel 能通过网络访问到 Agent 的 `8443` 端口即可。

::: tip 同机单节点部署
如果只有一台服务器，Panel 和 Agent 可以同机运行，监听不同端口，互不干扰。
:::

## 旧版 gRPC 无 TLS 有什么安全问题？新版如何改进？

旧版 trojan-panel 的 Panel ↔ Core 通信采用**无 TLS 的明文 gRPC**，存在以下安全隐患：

- 通信内容（节点配置、账号列表、流量数据）在网络上明文传输，中间人可截获和篡改。
- 没有 per-agent 的访问控制，任何能到达 gRPC 端口的客户端均可发送请求。
- Core 还需要直连 Panel 所在机器的 MySQL，数据库端口需要在网络层开放，暴露面更大。

Shadow Panel 的改进：

- Panel ↔ Agent 通信全程走 **HTTPS（TLS 加密）**，链路无明文。
- 每个 Agent 注册时生成独立的 **Bearer Token**，Panel 按 token 识别和鉴权；吊销单个 Agent 的 token 不影响其他 Agent。
- Agent 主动向 Panel 拉取配置和账号数据，Panel 无需暴露数据库端口给 Agent 所在机器。

## 怎么对接 IP 代理站的 socks5 / https 节点？

在节点配置页面找到「上游出站（Upstream）」字段，填写 IP 代理站提供的节点地址即可：

- **协议**：选择 `socks5` 或 `http`（对应 http/https 代理）。
- **地址与端口**：填写代理站提供的 `host:port`。
- **认证**：填写用户名和密码（如代理站要求）。

保存后，shadow-agent 会在下次同步时重新生成该节点的内核配置，自动注入对应的 `outbounds` 条目和路由规则，用户流量将经由指定上游 IP 出口落地。详细配置示例和多级链式写法请参阅「对接 IP 代理站」页面。

::: tip 支持的内核
上游出站配置目前支持 Xray-core（最完整，含 `dialerProxy` 链式）、sing-box（`detour` 链式）、Hysteria2（服务端 `outbounds`）、NaiveProxy（`upstream` 参数）。Trojan-Go 不在支持范围内。
:::

## 如何升级 shadow-panel 或 shadow-agent？数据如何备份？

升级流程非常简单，因为两者都是单文件二进制：

1. 从 Release 页面下载对应平台的新版二进制。
2. 停止正在运行的进程（`systemctl stop shadow-panel` / `systemctl stop shadow-agent`）。
3. 用新文件替换旧文件（路径不变）。
4. 启动进程，新版自动执行数据库迁移（如有 schema 变更）。

数据备份：

- **SQLite**：备份 `panel.db` 单文件即可，可用 `cp` 或 `sqlite3 panel.db .dump` 导出 SQL。建议在停止进程后备份，或使用 SQLite 的 WAL 模式在线热备。
- **MySQL**：使用 `mysqldump` 定期导出，与常规 MySQL 备份流程相同。
- **Agent 侧**：Agent 本身无持久状态（配置由 Panel 下发，内核进程临时文件在 `/tmp`），无需单独备份；仅需保存 Agent 的 token 凭证文件。

## 支持 IPv6、多用户流量配额和限速吗？

均支持：

- **IPv6**：shadow-panel 和 shadow-agent 均支持 IPv6 监听；Xray-core 和 sing-box 的 inbound 可绑定 IPv6 地址，出站也支持 IPv6 直连或通过上游路由。
- **多用户流量配额**：每个用户可设置总流量上限（上行 + 下行合计），超出后账号自动暂停，流量重置周期可按月或自定义。
- **限速**：支持对单个用户设置上行 / 下行速率上限（单位 Mbps），由 shadow-agent 在生成内核配置时注入对应限速参数。
- **设备 / IP 限制**：可设置同一账号允许的最大同时在线 IP 数，超出时新连接被拒绝或挤掉最早的连接。
- **黑名单**：支持对用户账号手动封禁，也支持基于异常行为的自动触发规则。
