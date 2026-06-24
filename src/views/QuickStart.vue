<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'

const installPanel = `bash <(curl -fsSL https://get.shadow-panel.dev)`

const installAgent = `# 在代理服务器上执行
bash <(curl -fsSL https://get.shadow-panel.dev/agent)

# 安装完成后，用 Panel 颁发的 token 注册并启动
shadow-agent --panel https://panel.example.com:8080 --token <AGENT_TOKEN>`
</script>

<template>
  <DocPage eyebrow="部署" title="快速开始" lead="一台干净的 Linux 服务器，五分钟拉起面板、加节点、建用户、拿订阅。">

    <h2>环境要求</h2>
    <ul>
      <li>操作系统：Linux x86_64 或 arm64，内核 ≥ 4.9</li>
      <li>内存：≥ 1 GB（Panel + Agent 同机部署建议 ≥ 2 GB）</li>
      <li>可选：一个域名 + TLS 证书（可使用 Let's Encrypt；纯 IP 访问时面板使用自签证书）</li>
      <li>
        防火墙放行端口：
        <ul>
          <li><code>8080/tcp</code> — Panel 管理后台 HTTPS</li>
          <li><code>8443/tcp</code> — Agent API（Panel 与 Agent 之间通信）</li>
          <li>各代理节点监听端口（由节点配置决定，例如 <code>443</code>、<code>8388</code> 等）</li>
        </ul>
      </li>
    </ul>

    <h2>安装 Panel</h2>
    <p>
      在你的控制面板服务器上，以 <code>root</code> 或具备 <code>sudo</code> 权限的用户执行一行安装脚本：
    </p>
    <CodeBlock lang="bash" filename="panel-server" :code="installPanel" />
    <p>
      脚本会自动下载 <code>shadow-panel</code> 二进制、写入 systemd 服务并启动。安装完成后，终端输出中会打印首次登录的随机管理员密码，例如：
    </p>
    <blockquote>
      <p><strong>Admin password:</strong> <code>Xk7qR2mNpY9w</code>（请立即保存，仅显示一次）</p>
    </blockquote>
    <p>Panel 默认监听 <code>0.0.0.0:8080</code>，数据存储使用内嵌 SQLite，无需额外数据库。</p>

    <Callout type="info" title="查看启动日志">
      如果终端输出滚过了，可用 <code>journalctl -u shadow-panel -n 50</code> 重新查看密码与启动状态。
    </Callout>

    <h2>首次登录</h2>
    <ol>
      <li>浏览器访问 <code>https://&lt;你的服务器IP&gt;:8080</code>（自签证书时需信任或跳过浏览器警告）。</li>
      <li>使用用户名 <code>admin</code> 和安装时生成的随机密码登录。</li>
      <li>进入「系统设置 → 账户安全」，立即修改管理员密码并保存。</li>
    </ol>

    <h2>部署一个 Agent（节点服务器）</h2>
    <p>
      每台代理服务器需要单独安装 <code>shadow-agent</code>，并向 Panel 注册以获得管理权限。
    </p>
    <ol>
      <li>在 Panel 管理后台进入「Agent 管理 → 新建 Agent」，填写备注名称，Panel 会生成一个专属 <strong>AGENT_TOKEN</strong>，复制备用。</li>
      <li>在代理服务器上运行以下命令安装并注册：</li>
    </ol>
    <CodeBlock lang="bash" filename="agent-server" :code="installAgent" />
    <p>
      Agent 启动后会主动向 Panel 发送 HTTPS 心跳（默认每 30 秒一次），Panel 列表中该 Agent 状态变为「在线」即表示注册成功。Agent API 监听 <code>0.0.0.0:8443</code>，Panel 通过此端口下发节点配置并拉取流量数据。
    </p>

    <Callout type="warning" title="Token 安全">
      AGENT_TOKEN 相当于该节点的访问凭证，请勿公开。每个 Agent 使用独立 token，吊销单个 token 不影响其他节点。
    </Callout>

    <h2>添加第一个节点</h2>
    <ol>
      <li>在 Panel 管理后台进入「节点管理 → 新建节点」。</li>
      <li>
        <strong>选择 Agent</strong>：从下拉列表中选择刚刚注册成功的 Agent（显示为「在线」状态）。
      </li>
      <li>
        <strong>选择协议</strong>：推荐选择 <code>Xray / VLESS + Vision</code>（现代 TLS 伪装，性能最佳）；也可选择 <code>Hysteria2</code> 或 <code>sing-box</code> 协议族。
      </li>
      <li>
        <strong>填写配置</strong>：
        <ul>
          <li>监听端口（例如 <code>443</code>）</li>
          <li>域名（如已配置 TLS 证书，填入对应域名；否则填服务器 IP）</li>
          <li>协议专属参数（如 Reality PublicKey、SNI 等，可点击「自动生成」填充默认值）</li>
        </ul>
      </li>
      <li>点击「保存」——Panel 随即通过 HTTPS 将配置下发给 Agent，Agent 生成内核配置文件并拉起对应子进程，节点状态变为「运行中」。</li>
    </ol>

    <Callout type="tip" title="多节点批量部署">
      同一台 Agent 服务器可托管多个节点（不同端口 / 不同协议），每个节点独立管理、独立下发配置。
    </Callout>

    <h2>创建用户并拿订阅</h2>
    <ol>
      <li>进入「用户管理 → 新建用户」，填写用户名、设置流量配额与到期时间后保存。</li>
      <li>
        点击该用户行末的「订阅」按钮，Panel 会生成：
        <ul>
          <li><strong>分享链接</strong>：可直接导入 v2rayN、NekoBox 等客户端。</li>
          <li><strong>Clash 订阅地址</strong>：复制后粘贴到 Clash Verge / Clash Meta 等客户端的「订阅管理」。</li>
          <li><strong>sing-box 订阅地址</strong>：用于 sing-box 客户端或 SFA（sing-box for Android）。</li>
        </ul>
      </li>
      <li>将订阅地址或分享链接发给用户，导入客户端即可连接。</li>
    </ol>

    <Callout type="success" title="部署完成">
      至此，你已完成最小可用部署：Panel 一台 + Agent 一台 + 节点一个 + 用户一个。后续可继续添加更多 Agent、节点和用户。
    </Callout>

    <Callout type="tip" title="对接 IP 代理站（落地 IP 替换）">
      如需让用户流量经过住宅 IP 代理站或中转服务器出去，请阅读「上游代理 / Dialer 配置」文档，了解如何为节点配置 <code>outbound</code> 上游或 <code>dialerProxy</code> 链式出站。
    </Callout>

  </DocPage>
</template>
