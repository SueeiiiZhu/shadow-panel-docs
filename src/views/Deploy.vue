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
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data          # SQLite 数据库与证书持久化
    environment:
      - SP_DOMAIN=panel.example.com   # 填写域名后自动签发 TLS 证书
      # SP_ADMIN_PASS=change_me_now  # 首次启动管理员密码（建议写死后删除）

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
  #   - SP_DB_DSN=sp:strong_sp_pass@tcp(mysql:3306)/shadowpanel?parseTime=true
  # ──────────────────────────────────────────────────────────────`

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
  --domain panel.example.com \
  --port 8080
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
      Shadow Panel 的 compose 文件只需一个服务即可完整运行。对比旧版 Trojan Panel
      需要 <strong>caddy + MariaDB + Redis + panel + ui + core</strong> 六个容器，
      Shadow Panel 将管理后台 UI 内嵌进单一二进制，并默认使用 SQLite 存储，
      彻底消除外部数据库与缓存依赖。
    </p>

    <CodeBlock lang="yaml" filename="docker-compose.yml" :code="composeYaml" />

    <Callout type="tip" title="启动步骤">
      将上述文件保存为 <code>docker-compose.yml</code>，修改 <code>SP_DOMAIN</code>
      为你的实际域名，然后执行 <code>docker compose up -d</code>。
      面板会在 <code>:8080</code> 监听，ACME 证书自动签发到 <code>./data/certs/</code>。
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

    <Callout type="info" title="用户权限">
      单元文件使用 <code>nobody</code> 用户运行，监听端口 8080（大于 1024 无需
      <code>CAP_NET_BIND_SERVICE</code>）。若需监听 443/80，保留
      <code>AmbientCapabilities</code> 行并确保内核支持 Ambient Capabilities。
    </Callout>

    <h2>TLS 证书</h2>
    <p>Shadow Panel 内置两种 TLS 方式，二选一：</p>

    <ul>
      <li>
        <strong>ACME 自动签发（推荐）</strong>：在配置或环境变量中填写
        <code>SP_DOMAIN=panel.example.com</code>，面板启动时通过 Let's Encrypt / ZeroSSL
        自动申请并续签证书，无需手动操作。域名必须解析到本机 IP，且 80 端口可被外网访问
        （ACME HTTP-01 challenge）。
      </li>
      <li>
        <strong>手动证书</strong>：将 <code>fullchain.pem</code> 与 <code>privkey.pem</code>
        放入 <code>/var/lib/shadow-panel/certs/</code>（Docker 对应 <code>./data/certs/</code>），
        并设置 <code>SP_TLS_CERT</code> / <code>SP_TLS_KEY</code> 指向对应路径。
      </li>
    </ul>

    <Callout type="info" title="证书存储">
      ACME 证书与账号信息持久化在数据目录 <code>data/certs/</code>，
      只要该目录随容器或机器一起备份，重启后无需重新签发。
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
      <li>将面板默认端口 8080 改为非常用端口，或通过 Nginx/Caddy 反代并限制来源 IP 段（<code>allow</code> / <code>deny</code>）。</li>
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
          <td><code>8080</code></td>
          <td>Panel 管理后台 HTTPS</td>
          <td>仅限运维 IP 或 VPN 内网访问</td>
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
      无需停止容器。建议同时备份 <code>./data/certs/</code> 目录以保留 ACME 账号与证书。
    </Callout>

    <p>
      对于高价值生产环境，可将定时备份脚本与对象存储（如 S3、Cloudflare R2）结合，
      实现异地容灾：使用 <code>rclone</code> 或 <code>aws s3 cp</code> 将备份文件
      定期上传至远端存储桶。
    </p>

  </DocPage>
</template>
