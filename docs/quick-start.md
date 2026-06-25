---
title: 快速开始
---

# 快速开始

一台干净的 Linux 服务器，五分钟拉起面板、加节点、建用户、拿订阅。

## 环境要求

- 操作系统：Linux x86_64 或 arm64，内核 ≥ 4.9
- 内存：≥ 1 GB（Panel + Agent 同机部署建议 ≥ 2 GB）
- 建议：一个解析到本机的域名（用于 Caddy 自动签发 Let's Encrypt 证书，无需手动申请；纯 IP 访问时回退自签证书）
- 防火墙放行端口：
  - `80/tcp` + `443/tcp` — Caddy 反向代理（ACME 证书签发 + Panel 管理后台 HTTPS）
  - `8443/tcp` — Agent API（Panel 与 Agent 之间通信）
  - 各代理节点监听端口（由节点配置决定，例如 `443`、`8388` 等）

## 安装 Panel

在你的控制面板服务器上，以 `root` 或具备 `sudo` 权限的用户执行一行安装脚本：

::: code-group
```bash [panel-server]
bash <(curl -fsSL https://get.shadow-panel.dev)
```
:::

脚本会自动下载 `shadow-panel` 二进制、安装并配置 **Caddy**（自动申请 TLS 证书 + 反向代理）、写入 systemd 服务并启动。安装过程会提示你输入面板域名。安装完成后，终端输出中会打印首次登录的随机管理员密码，例如：

> **Admin password:** `Xk7qR2mNpY9w`（请立即保存，仅显示一次）

Panel 默认监听本地 `127.0.0.1:8080`，由 Caddy 在 `:443` 终止 TLS 并反向代理；数据存储使用内嵌 SQLite，无需额外数据库。

::: tip 查看启动日志
如果终端输出滚过了，可用 `journalctl -u shadow-panel -n 50` 重新查看密码与启动状态。
:::

## 首次登录

1. 浏览器访问 `https://panel.example.com`（你在安装时填写的域名，Caddy 已自动签发受信任证书；若用纯 IP 则需跳过浏览器自签警告）。
2. 使用用户名 `admin` 和安装时生成的随机密码登录。
3. 进入「系统设置 → 账户安全」，立即修改管理员密码并保存。

## 部署一个 Agent（节点服务器）

每台代理服务器需要单独安装 `shadow-agent`，并向 Panel 注册以获得管理权限。

1. 在 Panel 管理后台进入「Agent 管理 → 新建 Agent」，填写备注名称，Panel 会生成一个专属 **AGENT_TOKEN**，复制备用。
2. 在代理服务器上运行以下命令安装并注册：

::: code-group
```bash [agent-server]
# 在代理服务器上执行
bash <(curl -fsSL https://get.shadow-panel.dev/agent)

# 安装完成后，用 Panel 颁发的 token 注册并启动
shadow-agent --panel https://panel.example.com --token <AGENT_TOKEN>
```
:::

Agent 启动后会主动向 Panel 发送 HTTPS 心跳（默认每 30 秒一次），Panel 列表中该 Agent 状态变为「在线」即表示注册成功。Agent API 监听 `0.0.0.0:8443`，Panel 通过此端口下发节点配置并拉取流量数据。

::: warning Token 安全
AGENT_TOKEN 相当于该节点的访问凭证，请勿公开。每个 Agent 使用独立 token，吊销单个 token 不影响其他节点。
:::

## 添加第一个节点

1. 在 Panel 管理后台进入「节点管理 → 新建节点」。
2. **选择 Agent**：从下拉列表中选择刚刚注册成功的 Agent（显示为「在线」状态）。
3. **选择协议**：推荐选择 `Xray / VLESS + Vision`（现代 TLS 伪装，性能最佳）；也可选择 `Hysteria2` 或 `sing-box` 协议族。
4. **填写配置**：
   - 监听端口（例如 `443`）
   - 域名（如已配置 TLS 证书，填入对应域名；否则填服务器 IP）
   - 协议专属参数（如 Reality PublicKey、SNI 等，可点击「自动生成」填充默认值）
5. 点击「保存」——Panel 随即通过 HTTPS 将配置下发给 Agent，Agent 生成内核配置文件并拉起对应子进程，节点状态变为「运行中」。

::: tip 多节点批量部署
同一台 Agent 服务器可托管多个节点（不同端口 / 不同协议），每个节点独立管理、独立下发配置。
:::

## 创建用户并拿订阅

1. 进入「用户管理 → 新建用户」，填写用户名、设置流量配额与到期时间后保存。
2. 点击该用户行末的「订阅」按钮，Panel 会生成：
   - **分享链接**：可直接导入 v2rayN、NekoBox 等客户端。
   - **Clash 订阅地址**：复制后粘贴到 Clash Verge / Clash Meta 等客户端的「订阅管理」。
   - **sing-box 订阅地址**：用于 sing-box 客户端或 SFA（sing-box for Android）。
3. 将订阅地址或分享链接发给用户，导入客户端即可连接。

::: tip 部署完成
至此，你已完成最小可用部署：Panel 一台 + Agent 一台 + 节点一个 + 用户一个。后续可继续添加更多 Agent、节点和用户。
:::

::: tip 对接 IP 代理站（落地 IP 替换）
如需让用户流量经过住宅 IP 代理站或中转服务器出去，请阅读「上游代理 / Dialer 配置」文档，了解如何为节点配置 `outbound` 上游或 `dialerProxy` 链式出站。
:::
