---
title: 上游代理 / Dialer-Proxy
---

# 上游代理 / Dialer-Proxy

Shadow Panel 的核心新能力：让节点的出站经 socks5 / http(s) 上游或多级链式代理走出去。

旧版 Trojan Panel 的节点出站配置中，`outbounds` 永远只有一条 `{"protocol":"freedom"}`，用户流量只能从节点服务器的本机 IP 直连目标。`NodeAddDto` 的 gRPC 结构里也没有任何 outbound / dialer / socks / 上游代理字段，无法对接 IP 代理站。

Shadow Panel 在节点模型中增加了可选的「上游出站」字段。每个节点可以独立配置一个 socks5 / http(s) 上游，Panel 将其自动合成进该节点内核（Xray-core / sing-box / Hysteria2 / NaiveProxy）的出站配置，用户流量从该节点进入后，经指定的上游代理 IP 落地，而不是从节点服务器 IP 直接出去。

## 两种模式

### A) 简单上游（outbound routing）

将来自用户 inbound（`inboundTag: ["user-in"]`）的流量，通过路由规则整体转发到一个 `socks` 或 `http` outbound。该 outbound 指向 IP 代理站的 socks5 / http(s) 地址，所有流量经该出口 IP 落地。适合**单级代理落地**场景，配置最简单，对接住宅 IP / 数据中心 IP 轮换池时首选此模式。

### B) dialer-proxy 链式

保留某个 outbound 的协议语义，但通过 `streamSettings.sockopt.dialerProxy` 指定另一个 outbound 的 `tag`，使前者的底层 TCP 连接经后者建立。适合**多级链式**场景，例如先经中转服务器（第一跳），再经住宅 socks5 出口（第二跳）落地；也适合在保留 VLESS / Trojan 等出站协议特性的同时，将底层连接绕到指定出口 IP。

## 配置示例 · 简单上游（socks5）

用户从 `user-in` inbound 进来的流量，经路由规则转发到 `upstream` outbound，以 `u123` / `p456` 认证后经 `proxy.example.com:1080` 出口落地。

```json title="xray-outbound.json"
{
  "outbounds": [
    {
      "tag": "upstream",
      "protocol": "socks",
      "settings": {
        "servers": [
          {
            "address": "proxy.example.com",
            "port": 1080,
            "users": [
              { "user": "u123", "pass": "p456" }
            ]
          }
        ]
      }
    },
    {
      "tag": "direct",
      "protocol": "freedom"
    }
  ],
  "routing": {
    "rules": [
      {
        "type": "field",
        "inboundTag": ["user-in"],
        "outboundTag": "upstream"
      }
    ]
  }
}
```

## 配置示例 · dialer-proxy 链式

`proxy` outbound 的 `sockopt.dialerProxy` 设为 `"upstream"`，其底层 TCP 连接将通过 `upstream`（socks5）建立。两个 outbound 的 `tag` 必须唯一且互相对应。

```json title="xray-dialer.json"
{
  "outbounds": [
    {
      "tag": "proxy",
      "protocol": "freedom",
      "streamSettings": {
        "sockopt": {
          "dialerProxy": "upstream"
        }
      }
    },
    {
      "tag": "upstream",
      "protocol": "socks",
      "settings": {
        "servers": [
          {
            "address": "proxy.example.com",
            "port": 1080,
            "users": [
              { "user": "u123", "pass": "p456" }
            ]
          }
        ]
      }
    }
  ]
}
```

## http(s) 上游

将 `protocol` 从 `"socks"` 改为 `"http"`，其余结构（`settings.servers` 的 `address` / `port` / `users`）保持不变。适用于只提供 http(s) CONNECT 代理接口的 IP 代理站。

```json title="xray-http-upstream.json"
{
  "outbounds": [
    {
      "tag": "upstream",
      "protocol": "http",
      "settings": {
        "servers": [
          {
            "address": "proxy.example.com",
            "port": 3128,
            "users": [
              { "user": "u123", "pass": "p456" }
            ]
          }
        ]
      }
    }
  ]
}
```

## 在面板里怎么填

在节点编辑页的「上游代理 / Dialer」区域，按以下步骤配置：

1. **启用上游出站**：勾选「启用上游代理」开关，表单展开。
2. **选择模式**：
   - 「简单上游」—— 流量整体路由到 socks5 / http(s) 出口（推荐大多数场景）。
   - 「dialer-proxy 链式」—— 保留出站协议，底层连接经上游建立（多级链式场景）。
3. **选择协议类型**：`socks5` 或 `http`。
4. **填写上游地址**：依次填入 地址（域名或 IP）、端口、用户名、密码。若上游无需认证，用户名与密码留空。
5. **保存**：Panel 将上游配置合成进目标节点内核的 `outbounds`（以及路由规则），通过 `HTTPS REST` 下发给 Agent，Agent 热重载内核进程后立即生效。

::: tip 无需手写 JSON
管理后台表单填写完毕后，Panel 在后端自动拼装正确的 outbound 结构并写入内核配置文件，无需管理员手动编辑 JSON。
:::

## 各内核支持矩阵

| 内核 | 简单上游（socks5/http） | dialer-proxy 链式 | 备注 |
|---|---|---|---|
| **Xray-core** | <Badge type="tip" text="支持" /> | <Badge type="tip" text="支持" /> | 通过 `outbounds` + `routing.rules`；`sockopt.dialerProxy` 支持多级链式，能力最完整 |
| **sing-box** | <Badge type="tip" text="支持" /> | <Badge type="tip" text="支持" /> | 通过 outbound 的 `detour` 字段实现链式；支持 socks5 / http outbound |
| **Hysteria2** | <Badge type="tip" text="支持" /> | <Badge type="danger" text="不支持" /> | 服务端 `outbounds` 支持 `direct` / `socks5` / `http`，配合 ACL 规则分流；无 dialerProxy 概念 |
| **NaiveProxy** | <Badge type="tip" text="支持" /> | <Badge type="danger" text="不支持" /> | Caddy `forward_proxy` 插件的 `upstream` 参数，支持单级 http(s) / socks5 链式 |
| **Trojan-Go** | <Badge type="warning" text="有限" /> | <Badge type="danger" text="不支持" /> | 出站能力弱；项目已 EOL（最后 release 2021-09），不建议依赖其出站配置 |

::: warning 上游稳定性与限速
当上游为住宅 IP 或数据中心 socks5 代理时，其稳定性、带宽上限和延迟由提供商决定，可能低于节点服务器自身带宽。建议在节点配置中同步设置合理的限速，避免上游成为瓶颈导致用户体验下降。同时注意代理商的并发连接数限制，高并发场景下可能需要多个上游节点轮转。
:::

::: tip 出口 IP 分流
可以为不同节点配置不同的上游，实现出口 IP 分流：例如，针对流媒体解锁场景的节点使用住宅 IP 上游，针对低延迟场景的节点使用直连（不配置上游），针对隐私场景的节点使用不同地区的 IP 代理站——所有节点在同一个 Panel 实例中统一管理，互不干扰。
:::
