---
title: 协议支持
---

# 协议支持

Xray-core / Hysteria2 / NaiveProxy / sing-box —— 用最新底层内核，淘汰 EOL 的 Trojan-Go。

Shadow Panel 以「用最新、淘汰停更」为选型理念，统一纳管四套底层内核：
**Xray-core**（VLESS / VMess / Trojan / Shadowsocks 全家桶）、
**Hysteria2**（QUIC/UDP 高性能抗封锁）、
**NaiveProxy**（Chromium 网络栈伪装 HTTP/2 CONNECT）、
**sing-box**（现代统一多协议内核）。
旧版 Trojan-Go 已于 2021 年停更（EOL），Shadow Panel 不再内置，建议迁移至
Xray-core 的 `trojan inbound` 或 sing-box 替代方案。
每个节点均可额外挂载 socks5 / http(s) 上游出站或 `dialerProxy` 链式出站，
让用户流量经 IP 代理站落地，而非直接暴露服务器 IP。

## 协议总览

| 协议 / 内核 | 传输 | 适用场景 | TLS / 证书 | 备注 |
|---|---|---|---|---|
| Xray-core — VLESS + Vision / Reality | TCP / XTLS | 抗探测、TLS 伪装 | Reality（无需域名证书） | 推荐首选；Reality 可无域名部署 |
| Xray-core — VMess | TCP / WebSocket / gRPC | CDN 过渡场景 | 可选 TLS | 兼容性强；不推荐新建纯 VMess 节点 |
| Xray-core — Trojan | TCP / WebSocket | 替代 Trojan-Go | 需域名 TLS 证书 | 完全替代已 EOL 的 Trojan-Go |
| Xray-core — Shadowsocks | TCP / UDP | 兼容老客户端 | 无（加密内建） | 建议配合混淆；推荐 2022 新格式 |
| Hysteria2 | QUIC / UDP | 高带宽、高丢包环境 | 需 TLS 证书 | 抗 QoS 封锁；取代已弃用的 Hysteria v1 |
| NaiveProxy（Caddy forward_proxy） | HTTP/2 CONNECT | 强伪装、住宅 IP 出口 | 需域名 TLS 证书 | Chromium 网络栈，流量特征极低 |
| sing-box（统一多协议） | TCP / UDP / QUIC 等 | 多协议统一管理 | 依协议而定 | 推荐引入；支持 detour 链式出站 |
| Trojan-Go <Badge type="warning" text="EOL" /> | TCP / WebSocket | —— | 需域名 TLS 证书 | 2021 年停更，不再内置，建议迁移 |

## 底层内核版本与升级建议

下表对比旧版 Trojan Panel 钉住的内核版本与 2026-06 最新版，说明每个内核的当前状态。
Shadow Panel 在初始化安装时会自动拉取最新稳定版二进制。

::: warning Trojan-Go 已 EOL，Xray v1.8.0 落后约 3 年
Trojan-Go 最后一个 release 为 2021-09-26 的 v0.10.6，此后仓库虽未归档，但
2021 年后无任何新版本，2024-07 后基本停止维护，社区已将其视为 EOL。
旧版 Trojan Panel 钉住的 Xray-core v1.8.0（2023 年）落后当前 v26.x 约 3 年，
缺少 XHTTP、最新 Reality 改进、Vision 优化等重要特性，强烈建议升级。
:::

| 内核 | trojanpanel 钉住的旧版 | 最新版（2026-06） | 状态 / 说明 |
|---|---|---|---|
| Xray-core | <Badge type="warning" text="v1.8.0（2023）" /> | <Badge type="tip" text="v26.6.22" /> | 落后约 3 年；缺 XHTTP / 新版 Reality / Vision 改进 |
| Trojan-Go | <Badge type="warning" text="v0.10.6（2021，EOL）" /> | <Badge type="warning" text="v0.10.6（仍是最后一版）" /> | 已 EOL；建议迁移至 Xray-core trojan inbound 或 sing-box |
| Hysteria | <Badge type="warning" text="v1（已弃用）" /> | <Badge type="tip" text="Hysteria2 app/v2.9.2" /> | 官方已全面转向 Hysteria2；v1 协议不再维护 |
| NaiveProxy | <Badge type="tip" text="forwardproxy@naive（滚动）" /> | <Badge type="tip" text="v149.0.7827.114-1" /> | 跟随 Chromium 149；Shadow Panel 拉取最新 tag |
| sing-box | <Badge type="tip" text="未使用" /> | <Badge type="tip" text="v1.13.13" /> | 推荐引入；v1.14.0-alpha 开发中；统一承载多协议 |

Shadow Panel 针对上述差距的五条升级建议：

1. **Xray-core 升级到 v26.x 最新日期版（如 v26.6.22）**，
   获得 XHTTP、Reality 最新改进、Vision 流控优化与更强的抗探测能力。
2. **全面采用 Hysteria2（app/v2.9.2），移除 Hysteria v1**。
   官方已明确放弃 v1 协议，v2 协议在握手、拥塞控制和性能上均有质的提升。
3. **废弃 Trojan-Go（EOL），改用 Xray-core 的 `trojan inbound` 或 sing-box**。
   现有 Trojan-Go 节点配置可直接平移，用户客户端无感知。
4. **引入 sing-box v1.13.13 作为现代统一内核**，
   统一承载 VLESS+Vision、Trojan、Shadowsocks、Hysteria2、TUIC 等协议，
   减少多进程维护负担；其 `detour` 字段原生支持链式出站。
5. **NaiveProxy 跟随 Chromium 最新 tag**（当前 v149.0.7827.114-1），
   确保 HTTP/2 CONNECT 伪装特征与最新浏览器一致，避免指纹差异被识别。

## 选型建议

根据不同使用场景，建议优先选择如下内核与协议：

- **追求极限性能 + 抗封锁（高带宽 / 高丢包线路）**：
  首选 **Hysteria2**（QUIC/UDP，天然抗 QoS），
  可配合 socks5 上游出站指向住宅 IP 代理站落地。
- **追求稳健通用 + 最强隐蔽性**：
  首选 **Xray-core VLESS + Vision / Reality**，
  Reality 无需域名证书即可达到 TLS 伪装；
  `dialerProxy` 字段支持链式出站，是多级代理链的最佳选择。
- **需要统一管理多种协议、多个节点**：
  引入 **sing-box**，一个进程承载所有协议，
  通过 `detour` 配置链式出站，配置文件结构清晰，易于模板化管理。
- **流量伪装要求极高（住宅 IP + HTTP/2 CONNECT）**：
  使用 **NaiveProxy**，借助 Chromium 网络栈生成的流量特征，
  搭配住宅 IP 代理节点作为 `upstream`，可达到极低检测率。
- **已有 Trojan-Go 节点需迁移**：
  直接切换至 Xray-core `trojan inbound` 或 sing-box `trojan` 入站，
  客户端配置不变，无需通知用户更换。
  Trojan-Go <Badge type="warning" text="EOL" /> 不接受安全补丁，请尽快迁移。

## 上游出站配置示例

Shadow Panel 在节点配置界面提供「上游出站」字段，保存后自动注入到对应内核的配置模板中。
以下为各内核的典型配置片段，供参考。

### Xray-core — 简单上游（routing 路由到 socks5）

将 `user-in` 入站标签的所有流量路由到名为 `upstream`
的 socks5 出站，用户流量从代理站 IP 出口。

::: code-group
```json [xray-outbound-simple.json]
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
            "users": [{ "user": "u123", "pass": "p456" }]
          }
        ]
      }
    },
    { "tag": "direct", "protocol": "freedom" }
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
:::

### Xray-core — dialerProxy 链式出站

`sockopt.dialerProxy` 指向另一个 outbound 的 `tag`，
使 `proxy` 出站的底层 TCP 连接经 `upstream` 建立。
适合多级链式场景（如先连中转服务器、再经住宅 socks5 落地）。

::: code-group
```json [xray-dialer-proxy.json]
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
            "users": [{ "user": "u123", "pass": "p456" }]
          }
        ]
      }
    }
  ]
}
```
:::

::: tip http(s) 上游同样支持
将上述示例中的 `"protocol": "socks"` 改为 `"protocol": "http"`，
即可对接 http / https 上游代理。`settings.servers` 结构相同，
填写 address、port 与 users 认证信息即可。
:::

### sing-box — detour 链式出站

sing-box 通过 `detour` 字段指定上游出站 tag，语义与 Xray-core 的
`dialerProxy` 等价，但写法更简洁。

::: code-group
```json [singbox-outbound.json]
{
  "outbounds": [
    {
      "tag": "proxy-out",
      "type": "vless",
      "server": "my-server.example.com",
      "server_port": 443,
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "flow": "xtls-rprx-vision",
      "tls": { "enabled": true, "server_name": "my-server.example.com" },
      "detour": "upstream-socks5"
    },
    {
      "tag": "upstream-socks5",
      "type": "socks",
      "server": "proxy.example.com",
      "server_port": 1080,
      "username": "u123",
      "password": "p456"
    },
    { "tag": "direct", "type": "direct" }
  ]
}
```
:::

### Hysteria2 — outbounds + ACL 分流

Hysteria2 服务端配置支持 `outbounds` + `acl` 字段，
可将特定流量转发到 socks5 / http 上游，其余流量直连。

::: code-group
```yaml [hysteria2-outbound.yaml]
# hysteria2 服务端 outbounds（ACL 分流）
outbounds:
  - name: direct
    type: direct
  - name: upstream
    type: socks5
    socks5:
      addr: proxy.example.com:1080
      username: u123
      password: p456

acl:
  inline:
    - direct(all)
    # 将特定流量转发到上游 socks5
    # - upstream(geoip:cn)
```
:::

::: tip NaiveProxy upstream 参数
NaiveProxy（Caddy `forward_proxy` 插件）通过 Caddyfile 的
`upstream socks5://user:pass@proxy.example.com:1080` 参数做链式出站，
Shadow Panel 节点配置中填写上游 URI，面板自动写入 Caddyfile 并重载进程。
:::
