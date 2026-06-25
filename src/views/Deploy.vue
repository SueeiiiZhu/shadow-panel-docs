<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'

const composeYaml = `version: "3.9"

services:
  shadow-panel:
    image: ghcr.io/shadow-panel/shadow-panel:latest
    container_name: shadow-panel
    restart: unless-stopped
    network_mode: host                # 仅监听 127.0.0.1:8080，TLS/公网交给 Caddy
    volumes:
      - ./data:/app/data              # SQLite 数据库持久化
    environment:
      - SP_LISTEN=127.0.0.1:8080      # 本地 HTTP，不直接对外
      # SP_ADMIN_PASS=change_me_now   # 首次启动管理员密码（建议改后删除）

  caddy:
    image: caddy:2                    # 自动 HTTPS：免费正式证书 + 自动续期 + 反向代理
    container_name: shadow-caddy
    restart: unless-stopped
    network_mode: host                # 绑定 80/443
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./caddy-data:/data            # 证书与 ACME 账号持久化（务必随机器备份）
      - ./caddy-config:/config

  # ── 可选：切换为 MySQL ──────────────────────────────────────
  # mysql:
  #   image: mysql:8.4
  #   restart: unless-stopped
  #   environment:
  #     MYSQL_ROOT_PASSWORD: strong_root_pass
  #     MYSQL_DATABASE: shadowpanel
  #     MYSQL_USER: sp
  #     MYSQL_PASSWORD: strong_sp_pass
  #   volumes:
  #     - ./mysql-data:/var/lib/mysql
  #
  # shadow-panel 追加环境变量：
  #   - SP_DB_DSN=sp:strong_sp_pass@tcp(127.0.0.1:3306)/shadowpanel?parseTime=true
  # ──────────────────────────────────────────────────────────────`

const caddyfilePanel = `# Caddyfile —— 面板服务器
# Caddy 启动后自动向 Let's Encrypt / ZeroSSL 申请并续期免费正式证书，无需任何额外配置
panel.example.com {
    reverse_proxy 127.0.0.1:8080
}`

const caddyfileNode = `# Caddyfile —— 节点服务器（自动签发证书 + 伪装站）
node.example.com {
    tls admin@example.com          # ACME 联系邮箱（可选）
    root * /var/www/decoy          # 伪装网站根目录
    file_server
}`

const certReusePath = `# Caddy 自动签发的证书文件路径（对应 ./caddy-data 卷）
# shadow-agent 在节点配置中选择「证书来源 = Caddy」并填入域名后，自动引用以下文件：
/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/node.example.com/node.example.com.crt
/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/node.example.com/node.example.com.key`

const downloadBash = `# 下载最新二进制（以 amd64 Linux 为例）
ARCH=amd64   # 或 arm64
VERSION=$(curl -fsSL https://api.github.com/repos/shadow-panel/shadow-panel/releases/latest \
  | grep '"tag_name"' | cut -d'"' -f4)
curl -fsSL "https://github.com/shadow-panel/shadow-panel/releases/download/\${VERSION}/shadow-panel_linux_\${ARCH}.tar.gz" \
  | tar -xz -C /usr/local/bin shadow-panel
chmod +x /usr/local/bin/shadow-panel

# 创建数据目录
mkdir -p /var/lib/shadow-panel

# 复制 systemd 单元文件（见下方）后启用
systemctl daemon-reload
systemctl enable --now shadow-panel`

const systemdUnit = `[Unit]
Description=Shadow Panel - Lightweight Proxy Management Panel
After=network.target

[Service]
Type=simple
User=nobody
Group=nobody
WorkingDirectory=/var/lib/shadow-panel
ExecStart=/usr/local/bin/shadow-panel \
  --data-dir /var/lib/shadow-panel \
  --listen 127.0.0.1:8080
Restart=on-failure
RestartSec=5
LimitNOFILE=65535
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target`

const agentInstallBash = `# 在落地机（节点服务器）上执行
ARCH=amd64
VERSION=$(curl -fsSL https://api.github.com/repos/shadow-panel/shadow-panel/releases/latest \
  | grep '"tag_name"' | cut -d'"' -f4)
curl -fsSL "https://github.com/shadow-panel/shadow-panel/releases/download/\${VERSION}/shadow-agent_linux_\${ARCH}.tar.gz" \
  | tar -xz -C /usr/local/bin shadow-agent
chmod +x /usr/local/bin/shadow-agent

# 向面板注册并获取 token（在面板后台「节点管理 → 新增节点」中生成）
PANEL_URL=https://panel.example.com
AGENT_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 写入 systemd 单元
cat > /etc/systemd/system/shadow-agent.service << 'EOF'
[Unit]
Description=Shadow Agent - Proxy Node Core
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/lib/shadow-agent
ExecStart=/usr/local/bin/shadow-agent \
  --panel-url PANEL_URL \
  --token AGENT_TOKEN \
  --api-port 8443
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sed -i "s|PANEL_URL|\${PANEL_URL}|g; s|AGENT_TOKEN|\${AGENT_TOKEN}|g" \
  /etc/systemd/system/shadow-agent.service

systemctl daemon-reload
systemctl enable --now shadow-agent`

const backupBash = `# 手动备份 SQLite 数据库
cp /var/lib/shadow-panel/shadow.db /backup/shadow.db.$(date +%Y%m%d-%H%M%S)

# 使用 SQLite 热备份（数据库运行中也安全）
sqlite3 /var/lib/shadow-panel/shadow.db ".backup /backup/shadow.db.$(date +%Y%m%d)"

# 定时备份（crontab -e）
# 0 3 * * * sqlite3 /var/lib/shadow-panel/shadow.db ".backup /backup/shadow.db.\$(date +\\%Y\\%m\\%d)" && \
#   find /backup -name 'shadow.db.*' -mtime +30 -delete`
</script>

<template>
  <DocPage
    eyebrow="部署"
    title="生产部署"
    lead="Docker Compose 与二进制两种方式，TLS 证书、反代、多节点与安全加固。"
  >

    <h2>Docker Compose 部署 Panel</h2>
    <p>
      推荐组合仅 <strong>两个</strong>服务：<code>shadow-panel</code>（内嵌管理后台 UI +
      SQLite，仅监听本地 <code>127.0.0.1:8080</code>）与 <code>caddy</code>（自动 HTTPS +
      反向代理）。对比旧版 Trojan Panel 需要 <strong>caddy + MariaDB + Redis + panel +
      ui + core</strong> 六个容器，依然大幅精简——去掉了 MariaDB、Redis 与独立 UI 容器。
    </p>

    <CodeBlock lang="yaml" filename="docker-compose.yml" :code="composeYaml" />

    <p>
      与之配套的 <code>Caddyfile</code>（与 compose 同目录）只需声明域名与反代目标，
      Caddy 即自动完成证书申请与续期：
    </p>

    <CodeBlock lang="text" filename="Caddyfile" :code="caddyfilePanel" />

    <Callout type="tip" title="启动步骤">
      将 <code>docker-compose.yml</code> 与 <code>Caddyfile</code> 放在同一目录，
      把 <code>panel.example.com</code> 改成你的实际域名（需提前解析到本机 IP），
      然后执行 <code>docker compose up -d</code>。Caddy 会在首次启动时自动签发证书，
      随后即可通过 <code>https://panel.example.com</code> 访问后台。
    </Callout>

    <p>
      需要高可用或已有 MySQL 实例时，取消注释 <code>mysql</code> 服务块，
      并将 <code>SP_DB_DSN</code> 填入对应的 DSN 字符串，面板会自动切换驱动。
    </p>

    <h2>二进制部署</h2>
    <p>
      不想使用 Docker 时，可直接下载预编译的静态二进制部署到任意 Linux 机器，
      通过 systemd 管理进程生命周期。
    </p>

    <CodeBlock lang="bash" filename="install-panel.sh" :code="downloadBash" />

    <p>将以下 systemd 单元文件保存到 <code>/etc/systemd/system/shadow-panel.service</code>：</p>

    <CodeBlock lang="ini" filename="shadow-panel.service" :code="systemdUnit" />

    <Callout type="info" title="用户权限与前置 Caddy">
      单元文件使用 <code>nobody</code> 用户运行，仅监听本地 <code>127.0.0.1:8080</code>
      （大于 1024，无需特权）。二进制部署同样在同机安装 <code>caddy</code>（一个静态二进制），
      由 Caddy 绑定 80/443 并反代到本地 8080——见下方「TLS 证书与反向代理」。
    </Callout>

    <h2>TLS 证书与反向代理（Caddy）</h2>
    <p>
      Shadow Panel 不再自建一套 ACME，而是<strong>统一交给 Caddy</strong>——目前最省心的免费
      正式证书方案：Caddy 是一个静态二进制，启动即自动向 Let's Encrypt / ZeroSSL 申请并
      <strong>自动续期</strong>免费证书，同时充当 HTTP 反向代理。Panel 只监听本地 HTTP，
      TLS 终结与公网入口全部由 Caddy 负责。
    </p>

    <h3>面板侧</h3>
    <p>
      用上文的 <code>Caddyfile</code> 反代到 <code>127.0.0.1:8080</code> 即可；域名解析到本机、
      放行 80/443 后，Caddy 自动完成签发与续期，无需任何手动操作。二进制部署时安装 Caddy
      并启用其 systemd 服务：<code>apt install caddy</code> 或下载官方静态二进制，
      将上文 <code>Caddyfile</code> 放到 <code>/etc/caddy/Caddyfile</code> 后
      <code>systemctl reload caddy</code>。
    </p>

    <h3>节点侧（内核复用 Caddy 证书）</h3>
    <p>
      在每台落地机也运行一个 Caddy，为节点域名自动签发证书，并顺带托管伪装站点；
      <code>shadow-agent</code> 直接<strong>复用 Caddy 证书存储里的 crt/key</strong> 提供给
      Xray / Hysteria2 等内核（NaiveProxy 本身即 Caddy + <code>forward_proxy</code>，天然集成）。
      在节点配置中选择「证书来源 = Caddy」并填入域名即可，无需手动上传或维护续期。
    </p>

    <CodeBlock lang="text" filename="Caddyfile（节点）" :code="caddyfileNode" />
    <CodeBlock lang="text" filename="证书路径" :code="certReusePath" />

    <Callout type="info" title="证书持久化">
      Caddy 的证书与 ACME 账号信息持久化在 <code>./caddy-data</code>（容器 <code>/data</code>）卷中，
      只要该目录随容器或机器一起备份，重启后无需重新签发，也不会触发 Let's Encrypt 速率限制。
    </Callout>

    <Callout type="tip" title="纯 IP 快速测试">
      没有域名、只想本地快速试用时，可让 Panel 直接以自签证书监听
      （<code>SP_TLS_SELF_SIGNED=true</code>），跳过 Caddy；浏览器需手动信任证书。
      生产环境仍建议用 Caddy + 真实域名。
    </Callout>

    <h2>多节点 Agent 部署</h2>
    <p>
      Shadow Panel 的数据面由独立的 <strong>shadow-agent</strong> 二进制承担。
      每台落地机（代理节点服务器）部署一个 shadow-agent 实例，
      Agent 之间互不依赖、也不直接互通，全部通过 HTTPS REST 与 Panel 对接，
      使用每节点独立的 bearer token 鉴权。
    </p>

    <p>部署流程：</p>
    <ol>
      <li>在面板后台「节点管理 → 新增节点」，填写节点名称，系统生成唯一 <code>AGENT_TOKEN</code>。</li>
      <li>登录目标落地机，执行下方脚本，将 <code>PANEL_URL</code> 和 <code>AGENT_TOKEN</code> 替换为实际值。</li>
      <li>Agent 启动后自动与 Panel 完成握手，心跳间隔默认 30 秒，流量统计每 60 秒上报一次。</li>
    </ol>

    <CodeBlock lang="bash" filename="install-agent.sh" :code="agentInstallBash" />

    <Callout type="tip" title="Agent API 端口">
      shadow-agent 默认监听 <code>:8443</code>（HTTPS），Panel 通过此端口下发配置指令。
      落地机防火墙只需开放 Agent 端口给 Panel 服务器的 IP，普通用户流量走节点协议端口
      （由节点配置决定），与管理通道完全隔离。
    </Callout>

    <h2>安全加固</h2>

    <h3>管理后台访问控制</h3>
    <ul>
      <li>Panel 仅监听 <code>127.0.0.1:8080</code>，不直接对外；在前置 Caddy 中用 <code>@admin remote_ip</code> 匹配并 <code>respond 403</code>，将后台限制为运维 IP 段或 VPN 内网。</li>
      <li>启用面板内置的 <strong>两步验证（TOTP）</strong>，防止管理员账号被暴力破解。</li>
      <li>Panel 服务不要直接暴露在公网；如必须公网访问，配置 Fail2ban 封锁失败登录 IP。</li>
    </ul>

    <h3>Agent Token 轮换</h3>
    <ul>
      <li>定期（建议每 90 天）在面板「节点管理」中重新生成 token，旧 token 立即失效。</li>
      <li>token 仅存于环境变量或 systemd 单元文件中，不要提交到版本控制。</li>
    </ul>

    <h3>内核进程网络隔离</h3>
    <ul>
      <li>
        Xray / Hysteria2 / NaiveProxy 等内核由 shadow-agent 管理，
        其 <strong>管理 API 接口</strong>（如 Xray GRPC API）应仅监听
        <code>127.0.0.1</code>，禁止对外暴露。Agent 生成的配置模板默认已做此限制。
      </li>
      <li>
        各内核的用户流量端口（如 443、8388 等）按需在防火墙放行，
        其余端口（管理 API、Agent API）仅对受信 IP 开放。
      </li>
    </ul>

    <h3>防火墙建议</h3>
    <table>
      <thead>
        <tr>
          <th>端口</th>
          <th>用途</th>
          <th>建议策略</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>80</code> / <code>443</code></td>
          <td>Caddy（TLS 终结 + 反代面板）</td>
          <td>公网开放（ACME 签发需要 80）</td>
        </tr>
        <tr>
          <td><code>127.0.0.1:8080</code></td>
          <td>Panel 后台（本地 HTTP，Caddy 反代）</td>
          <td>仅本机，不对外暴露</td>
        </tr>
        <tr>
          <td><code>8443</code></td>
          <td>Agent API（落地机）</td>
          <td>仅允许 Panel 服务器 IP 访问</td>
        </tr>
        <tr>
          <td>节点协议端口</td>
          <td>用户代理流量（如 443）</td>
          <td>公网开放</td>
        </tr>
        <tr>
          <td>其他所有端口</td>
          <td>—</td>
          <td>默认拒绝</td>
        </tr>
      </tbody>
    </table>

    <Callout type="warning" title="不要用 root 运行内核进程">
      shadow-agent 会以降权用户（默认 <code>nobody</code>）拉起内核子进程。
      生产环境务必确认 systemd 单元中 <code>User=</code> 非 root，并通过
      <code>AmbientCapabilities</code> 或 <code>CAP_NET_BIND_SERVICE</code>
      赋予绑定特权端口的能力，而非直接使用 root。
    </Callout>

    <h2>备份</h2>
    <p>
      Shadow Panel 使用 SQLite 单文件存储，所有数据（用户、节点、流量记录、配置）
      均在 <code>data/shadow.db</code> 一个文件中，备份极为简单。
    </p>

    <CodeBlock lang="bash" filename="backup.sh" :code="backupBash" />

    <Callout type="tip" title="Docker 环境备份">
      使用 Docker Compose 时，<code>shadow.db</code> 挂载在宿主机 <code>./data/shadow.db</code>，
      直接对宿主机路径执行 <code>cp</code> 或 <code>sqlite3 .backup</code> 即可，
      无需停止容器。建议同时备份 <code>./caddy-data/</code> 目录以保留 Caddy 的 ACME 账号与证书。
    </Callout>

    <p>
      对于高价值生产环境，可将定时备份脚本与对象存储（如 S3、Cloudflare R2）结合，
      实现异地容灾：使用 <code>rclone</code> 或 <code>aws s3 cp</code> 将备份文件
      定期上传至远端存储桶。
    </p>

  </DocPage>
</template>
