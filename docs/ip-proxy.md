---
title: 对接 IP 代理站
---

# 对接 IP 代理站

把 IP 代理站给的 socks5 / https 节点，5 分钟接入 Shadow Panel 做出口。

IP 代理站（住宅 IP / 数据中心 IP / 动态轮换）提供大量干净出口 IP，广泛用于反检测、本地化测试和高匿名访问。
Shadow Panel 的每个节点都支持「上游出站」配置：用户流量经你部署的代理节点进入后，通过指定的 socks5 或 http(s) 上游出口落地，出口 IP 即为 IP 代理站分配的 IP，而不是你的服务器 IP。

## 你会拿到什么

购买 IP 代理站服务后，通常会得到以下格式的凭据。常见两种类型：

| 类型 | 示例凭据 | 说明 |
|---|---|---|
| socks5 | `proxy.example.com:1080:u123:p456` | 格式 `host:port:user:pass`；支持 TCP，部分服务商支持 UDP |
| https (CONNECT) | `https://u123:p456@proxy.example.com:8443` | 标准 HTTP CONNECT 隧道，仅 TCP，不支持 UDP；兼容性广泛 |
| IP 白名单 socks5 | `proxy.example.com:1080`（无密码） | 在代理服务商后台填写节点服务器 IP 完成授权，无需用户名密码 |

部分服务商额外提供「国家/城市/ISP 选择」参数，通过在端口或 URL 路径中附加参数实现，具体格式参考对应服务商文档。

## 步骤一：测试上游可用

在正式接入之前，先从**节点服务器**（即运行 shadow-agent 的那台机器）上测试上游是否可用，确认出口 IP 是预期的代理 IP。

```bash title="测试 socks5 上游"
# 通过 socks5 查出口 IP（-v 可看握手过程）
curl --socks5-hostname user:pass@proxy.example.com:1080 https://api.ipify.org
# 期望输出：上游代理分配给你的出口 IP，如 203.0.113.42
```

```bash title="测试 https 上游"
# 通过 https(CONNECT) 代理查出口 IP
curl -x https://user:pass@proxy.example.com:8443 https://api.ipify.org
```

::: tip 从节点服务器测试
务必在运行 shadow-agent 的服务器上执行上面的命令，而不是本机。上游代理通常会做 IP 白名单检查，只允许已授权的服务器 IP 连接。
:::

## 步骤二：在节点上配置上游

进入 Shadow Panel 管理后台 → 节点列表 → 编辑目标节点 → 滚动到底部「上游代理 / Dialer」配置区，填入以下字段：

- **上游协议**：选 `socks5` 或 `http`（对应 https CONNECT）。
- **上游地址**：填服务商提供的 host，如 `proxy.example.com`。
- **上游端口**：如 `1080`（socks5）或 `8443`（https）。
- **用户名 / 密码**：填服务商颁发的凭据；IP 白名单模式留空。
- **模式**：通常选「简单上游（outbound routing）」即可；多级链式场景选「dialer-proxy」。

保存后，Panel 通过 HTTPS REST 将更新后的完整配置下发给 Agent，Agent 重新生成内核配置文件并热重载进程。以下是 Shadow Panel 为 Xray-core 节点生成的配置示意（简单上游模式）：

```json title="Xray-core：简单上游（outbound routing）"
{
  "inbounds": [
    {
      "tag": "user-in",
      "port": 443,
      "protocol": "vless",
      "settings": { "clients": [{ "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }] },
      "streamSettings": { "network": "tcp", "security": "tls" }
    }
  ],
  "outbounds": [
    {
      "tag": "upstream",
      "protocol": "socks",
      "settings": {
        "servers": [{
          "address": "proxy.example.com",
          "port": 1080,
          "users": [{ "user": "u123", "pass": "p456" }]
        }]
      }
    },
    { "tag": "direct", "protocol": "freedom" }
  ],
  "routing": {
    "rules": [
      { "type": "field", "inboundTag": ["user-in"], "outboundTag": "upstream" }
    ]
  }
}
```

如需多级链式（如先经一台中转服务器，再经住宅 socks5 落地），可选 dialer-proxy 模式，Panel 将生成如下结构：

```json title="Xray-core：dialer-proxy 链式"
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
        "servers": [{
          "address": "proxy.example.com",
          "port": 1080,
          "users": [{ "user": "u123", "pass": "p456" }]
        }]
      }
    }
  ]
}
```

::: tip 其他内核的写法
sing-box 使用 `detour` 字段链式出站；Hysteria2 服务端支持 `outbounds` 配置 socks5/http 出口并配合 ACL 分流；NaiveProxy(Caddy forward_proxy) 支持 `upstream` 参数做链式。Shadow Panel 会根据节点协议自动生成对应内核格式，无需手动编写。详细说明参阅
[上游出站 & dialer-proxy](./dialer-proxy.md) 页。
:::

## 步骤三：验证出口 IP

配置生效后，使用客户端连接该节点，再查询出口 IP。返回的 IP 应为 IP 代理站分配的出口地址，而不是节点服务器的公网 IP。

```bash title="验证出口 IP"
# 方法一：连上节点后直接查出口 IP
curl https://api.ipify.org
# 或带详细地理信息
curl https://ipinfo.io/json

# 方法二：在节点服务器上模拟（验证上游连通性）
curl --socks5-hostname user:pass@proxy.example.com:1080 https://ipinfo.io/json
```

若出口 IP 仍是节点服务器 IP，检查：上游配置是否已保存并下发（节点列表看状态是否 **running**）；上游凭据是否正确；节点服务器到上游代理的网络是否通（参考步骤一）。

## 进阶：出口分流与轮换

以下场景可进一步发挥 IP 代理站的价值：

- **不同节点配不同上游 IP**：在面板中创建多个节点（可同一台 Agent），分别绑定不同的上游出口，实现「节点 A → 美国 IP、节点 B → 日本 IP」的多出口分配。
- **动态住宅轮换端点**：住宅代理服务商通常提供「会话端口」（固定同一出口 IP）和「轮换端口」（每次新连接分配不同 IP）两种端点，按业务需要选择。
- **按用户/套餐分流**：高级套餐用户的节点绑定优质住宅 IP 上游，普通套餐节点绑定数据中心 IP 上游，通过节点权限控制可见性。
- **多级链式**：第一跳经你的 VPS 隐藏服务器真实 IP，第二跳经住宅 socks5 落地，利用 dialer-proxy 实现两层出站，兼顾连接速度与出口匿名性。

```bash title="会话端口与轮换端口示意"
# 住宅代理通常提供「会话端口」和「轮换端口」
# 会话端口（同一端口保持同一出口 IP，适合需要 IP 稳定的场景）
proxy.example.com:30001   # session-id=abc123

# 轮换端口（每次新连接分配不同 IP，适合高匿名爬取）
proxy.example.com:30002   # rotate on every connection
```

## 常见问题

::: warning https / socks5 上游不支持 UDP
绝大多数 IP 代理站提供的 socks5 / https 上游**不支持 UDP**。Hysteria2 和 TUIC 依赖 QUIC（UDP），经不支持 UDP 的上游后将无法正常建立连接。建议将上游出站配置在 TCP 类协议的节点上（VLESS / Trojan / Shadowsocks over TCP），Hysteria2 节点仍使用直连出口。
:::

| 问题 | 排查方向 |
|---|---|
| 上游需要 IP 白名单授权，但连接被拒 | 确认已在代理服务商控制台把节点服务器的公网 IP 加入白名单。如节点服务器有多个出口 IP（如 IPv4 + IPv6），需全部加入。 |
| 延迟明显叠加 | 正常现象：用户→节点延迟 + 节点→上游代理延迟会叠加。建议选地理位置距离用户和目标站点较近的上游节点，减少绕路。 |
| UDP 流量走不通 | 上游代理不支持 UDP（见上方 Callout）。将需要 UDP 的协议节点（Hysteria2 等）的上游出站设为空（直连），仅在 TCP 协议节点上启用上游。 |
| 认证失败（407 / auth error） | 检查用户名密码是否含特殊字符（`@` / `:` 等），如有需 URL 编码后填入；确认凭据未过期或超出并发配额。 |
| 出口 IP 未变，仍是服务器 IP | 检查节点配置是否已成功下发（Agent 状态 running）；用步骤一的 curl 命令从服务器直接测上游，排除网络不通。 |
| 代理速度慢，带宽达不到预期 | IP 代理站（尤其住宅 IP）通常对单连接带宽有限制。可在不同时段测试，或联系服务商确认套餐带宽上限。 |
