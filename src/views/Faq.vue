<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'
const dialerProxyXray = `{
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
}`

const singboxDetour = `{
  "outbounds": [
    { "type": "direct", "tag": "direct-out",
      "detour": "upstream" },
    { "type": "socks", "tag": "upstream",
      "server": "proxy.example.com", "server_port": 1080,
      "username": "u123", "password": "p456" }
  ]
}`

const hysteria2Outbound = `# Hysteria2 服务端 outbounds（config.yaml）
outbounds:
  - name: socks5-upstream
    type: socks5
    socks5:
      addr: proxy.example.com:1080
      username: u123
      password: p456

acl:
  inline:
    - outbound(socks5-upstream) all`

const naiveproxyUpstream = `{
  "handler": "forward_proxy",
  "hide_ip": true,
  "hide_via": true,
  "upstream": "socks5://u123:p456@proxy.example.com:1080"
}`
</script>

<template>
  <DocPage
    eyebrow="参考"
    title="常见问题"
    lead="部署、存储、内核、上游代理与协议的高频问题。"
  >

    <h2>为什么默认用 SQLite？能换成 MySQL 吗？</h2>
    <p>
      SQLite 是单文件数据库，shadow-panel 二进制内置驱动，启动时自动创建 <code>panel.db</code>，无需额外安装任何服务，真正做到零依赖起步。对于管理数十台节点、数百用户的典型个人或小团队场景，SQLite 的性能完全充裕，且备份只需复制一个文件。
    </p>
    <p>
      当满足以下任意条件时，建议切换到 MySQL：
    </p>
    <ul>
      <li>需要多个 Panel 实例并发写入同一数据源（SQLite 不支持跨进程高并发写）。</li>
      <li>用户量超过数千、流量记录行数达到千万级别，需要独立数据库做性能调优。</li>
      <li>已有 MySQL 基础设施，希望统一运维。</li>
    </ul>
    <p>
      切换方式：在 shadow-panel 的配置文件中将 <code>db.driver</code> 设为 <code>mysql</code> 并填写 DSN，重启即可；现有数据可通过导出工具迁移。
    </p>

    <h2>一定要域名和 TLS 证书吗？</h2>
    <p>
      取决于所选协议：
    </p>
    <ul>
      <li><strong>VLESS + XTLS-Reality</strong>：不需要自有域名和证书，Reality 借用目标网站的 TLS 指纹完成握手，可在没有域名的 IP 上直接部署。</li>
      <li><strong>Hysteria2</strong>：需要 TLS，但可使用自签证书（需客户端配置 <code>insecure: true</code> 或固定指纹），也可用真实域名 + ACME 自动签发。</li>
      <li><strong>VLESS / VMESS + TLS</strong>、<strong>Trojan（via Xray-core）</strong>、<strong>NaiveProxy</strong>：均需要有效的 TLS 证书；NaiveProxy 强依赖真实域名，因为 Caddy 需要通过 ACME 自动签发证书。</li>
      <li><strong>sing-box</strong>：各协议要求与上述保持一致，Reality 入站同样可免域名。</li>
    </ul>
    <Callout type="tip" title="推荐做法">
      如果你没有域名，首选 VLESS + Reality；有域名则用 Hysteria2（ACME 自签）或 Trojan via Xray-core + 真实证书，客户端兼容性更广。
    </Callout>

    <h2>dialer-proxy 支持所有内核和协议吗？</h2>
    <p>
      不同内核的支持程度有差异，以下是实际情况：
    </p>
    <table>
      <thead>
        <tr>
          <th>内核</th>
          <th>上游出站能力</th>
          <th>链式写法</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Xray-core v26.x</td>
          <td>outbound socks / http(s)，路由绑定</td>
          <td><code>sockopt.dialerProxy</code>，最完整</td>
        </tr>
        <tr>
          <td>sing-box v1.13.x</td>
          <td>outbound socks / http(s) / direct</td>
          <td><code>detour</code> 字段，链式支持</td>
        </tr>
        <tr>
          <td>Hysteria2</td>
          <td>服务端 <code>outbounds</code> 配置 socks5 / http / direct + ACL 分流</td>
          <td>仅单级，无多级链式</td>
        </tr>
        <tr>
          <td>NaiveProxy (Caddy)</td>
          <td><code>forward_proxy upstream</code> 参数</td>
          <td>单级上游，无 dialer-proxy 概念</td>
        </tr>
        <tr>
          <td>Trojan-Go</td>
          <td>出站能力弱，已 EOL（2021 停更）</td>
          <td>不建议依赖，请迁移到 Xray-core trojan inbound 或 sing-box</td>
        </tr>
      </tbody>
    </table>
    <p>
      Shadow Panel 在节点配置中统一抽象了 <code>upstream</code> 字段，shadow-agent 在生成各内核配置时会按上表自动翻译为对应格式；Trojan-Go 不在支持矩阵内。
    </p>
    <CodeBlock lang="json" filename="xray-dialer-proxy.json" :code="dialerProxyXray" />
    <CodeBlock lang="json" filename="sing-box-detour.json" :code="singboxDetour" />
    <CodeBlock lang="yaml" filename="hysteria2-outbounds.yaml" :code="hysteria2Outbound" />
    <CodeBlock lang="json" filename="naiveproxy-upstream.json" :code="naiveproxyUpstream" />

    <h2>上游 socks5 节点不支持 UDP，会影响哪些协议？</h2>
    <p>
      socks5 标准支持 UDP ASSOCIATE，但大多数 IP 代理站的 socks5 出口<strong>仅提供 TCP</strong>。这对不同传输协议的影响如下：
    </p>
    <ul>
      <li><strong>基于 TCP 的协议</strong>（VLESS over TCP/WS/gRPC、Trojan、NaiveProxy）：完全正常，上游 socks5 纯 TCP 即可。</li>
      <li><strong>基于 QUIC / UDP 的协议</strong>（Hysteria2、TUIC via sing-box）：服务端到上游出口这段路依赖 UDP 转发，若上游 socks5 不支持 UDP，则流量无法经由上游出口落地，会回落到直连或报错。</li>
      <li><strong>Reality / XTLS-Vision</strong>：传输层走 TCP，上游 socks5 兼容。</li>
    </ul>
    <Callout type="warning" title="Hysteria2 + TCP-only socks5 上游">
      如果上游 socks5 节点不支持 UDP，请勿将 Hysteria2 节点配置为走该上游出口；可改用 HTTP 代理上游（HTTP CONNECT 也是 TCP），或换用支持 UDP 的上游节点，或对该节点单独配置直连。
    </Callout>

    <h2>为什么淘汰 Trojan-Go？</h2>
    <p>
      Trojan-Go 最后一个正式 Release 是 <strong>v0.10.6</strong>，发布于 <strong>2021 年 9 月</strong>。此后仓库虽未正式归档，但 2024 年 7 月之后基本停止更新，社区普遍视为 EOL（End of Life）。具体风险包括：
    </p>
    <ul>
      <li>长期未合并安全修复，依赖库版本老旧。</li>
      <li>不支持 Xray-core v26.x 带来的新特性（XHTTP、最新 Reality 改进、Vision 流控优化）。</li>
      <li>出站代理能力弱，无法支持 <code>dialerProxy</code> 链式场景。</li>
      <li>客户端生态逐渐不再维护 Trojan-Go 专属配置格式。</li>
    </ul>
    <p>
      Shadow Panel 的迁移路径：原有 Trojan 协议节点改用 <strong>Xray-core trojan inbound</strong> 或 <strong>sing-box trojan inbound</strong>，协议语义完全兼容，客户端无感。
    </p>

    <h2>Xray-core 应该用哪个版本？</h2>
    <p>
      Shadow Panel 跟随 <strong>Xray-core v26.x</strong>（2026 年日期版本号，如 v26.6.22）的最新 Release。与旧版 trojan-panel 钉住的 <strong>v1.8.0</strong>（2023 年发布）相比，v26.x 带来的关键改进包括：
    </p>
    <ul>
      <li><strong>XHTTP</strong>：基于 HTTP/1.1 / HTTP/2 / HTTP/3 的通用流传输，适合反代伪装。</li>
      <li><strong>最新 Reality 改进</strong>：uTLS 指纹更新、握手优化、更好的抗探测能力。</li>
      <li><strong>Vision 流控优化</strong>：XTLS-Vision 在 v1.8.0 之后持续迭代，旧版不包含。</li>
      <li><strong>Go module 路径</strong>：<code>github.com/xtls/xray-core</code>，可直接引入最新版。</li>
    </ul>
    <Callout type="info" title="版本号说明">
      Xray-core 自 2025 年起采用日期版本号（<code>v年.月.日</code>），不再使用语义版本；v26.x 是 2026 年的最新主线。
    </Callout>

    <h2>该选 Hysteria2 还是 VLESS+Reality？</h2>
    <p>
      两者定位不同，选择依据如下：
    </p>
    <table>
      <thead>
        <tr>
          <th>场景</th>
          <th>推荐</th>
          <th>原因</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>高丢包 / 弱网（移动网络、国际专线抖动大）</td>
          <td>Hysteria2</td>
          <td>基于 QUIC，内置拥塞控制（BBR/Brutal），弱网下吞吐量优势显著</td>
        </tr>
        <tr>
          <td>需要抗深度包检测（DPI）或流量特征伪装</td>
          <td>VLESS + XTLS-Reality</td>
          <td>复用目标网站 TLS 指纹，流量与正常 HTTPS 无法区分</td>
        </tr>
        <tr>
          <td>稳定宽带、优先兼容性</td>
          <td>VLESS + TCP / WS + TLS</td>
          <td>客户端生态最广，TCP 路径成熟</td>
        </tr>
        <tr>
          <td>无域名裸 IP 部署</td>
          <td>VLESS + Reality</td>
          <td>不需要自有域名和证书</td>
        </tr>
        <tr>
          <td>需要接上游 socks5（IP 代理站）</td>
          <td>TCP 类协议优先</td>
          <td>多数 IP 代理站 socks5 不支持 UDP，Hysteria2 慎用</td>
        </tr>
      </tbody>
    </table>

    <h2>Panel 和 Agent 必须部署在同一台机器上吗？</h2>
    <p>
      不必。Shadow Panel 的设计前提就是 Panel 与 Agent 分离：
    </p>
    <ul>
      <li><strong>shadow-panel</strong>（控制面）：通常部署在一台管理机或轻量云服务器上，对外暴露 HTTPS 管理后台（默认端口 <code>8080</code>）。</li>
      <li><strong>shadow-agent</strong>（数据面）：部署在每一台代理服务器上，监听 HTTPS REST API（默认端口 <code>8443</code>），向 Panel 注册后接受配置下发、上报流量与心跳。</li>
    </ul>
    <p>
      Panel 与 Agent 之间通过 <strong>HTTPS REST + 每个 Agent 独立 Bearer Token</strong> 通信，token 可单独吊销，不影响其他节点。理论上可以管理任意数量的 Agent，只要 Panel 能通过网络访问到 Agent 的 <code>8443</code> 端口即可。
    </p>
    <Callout type="tip" title="同机单节点部署">
      如果只有一台服务器，Panel 和 Agent 可以同机运行，监听不同端口，互不干扰。
    </Callout>

    <h2>旧版 gRPC 无 TLS 有什么安全问题？新版如何改进？</h2>
    <p>
      旧版 trojan-panel 的 Panel ↔ Core 通信采用<strong>无 TLS 的明文 gRPC</strong>，存在以下安全隐患：
    </p>
    <ul>
      <li>通信内容（节点配置、账号列表、流量数据）在网络上明文传输，中间人可截获和篡改。</li>
      <li>没有 per-agent 的访问控制，任何能到达 gRPC 端口的客户端均可发送请求。</li>
      <li>Core 还需要直连 Panel 所在机器的 MySQL，数据库端口需要在网络层开放，暴露面更大。</li>
    </ul>
    <p>
      Shadow Panel 的改进：
    </p>
    <ul>
      <li>Panel ↔ Agent 通信全程走 <strong>HTTPS（TLS 加密）</strong>，链路无明文。</li>
      <li>每个 Agent 注册时生成独立的 <strong>Bearer Token</strong>，Panel 按 token 识别和鉴权；吊销单个 Agent 的 token 不影响其他 Agent。</li>
      <li>Agent 主动向 Panel 拉取配置和账号数据，Panel 无需暴露数据库端口给 Agent 所在机器。</li>
    </ul>

    <h2>怎么对接 IP 代理站的 socks5 / https 节点？</h2>
    <p>
      在节点配置页面找到「上游出站（Upstream）」字段，填写 IP 代理站提供的节点地址即可：
    </p>
    <ul>
      <li><strong>协议</strong>：选择 <code>socks5</code> 或 <code>http</code>（对应 http/https 代理）。</li>
      <li><strong>地址与端口</strong>：填写代理站提供的 <code>host:port</code>。</li>
      <li><strong>认证</strong>：填写用户名和密码（如代理站要求）。</li>
    </ul>
    <p>
      保存后，shadow-agent 会在下次同步时重新生成该节点的内核配置，自动注入对应的 <code>outbounds</code> 条目和路由规则，用户流量将经由指定上游 IP 出口落地。详细配置示例和多级链式写法请参阅「对接 IP 代理站」页面。
    </p>
    <Callout type="info" title="支持的内核">
      上游出站配置目前支持 Xray-core（最完整，含 <code>dialerProxy</code> 链式）、sing-box（<code>detour</code> 链式）、Hysteria2（服务端 <code>outbounds</code>）、NaiveProxy（<code>upstream</code> 参数）。Trojan-Go 不在支持范围内。
    </Callout>

    <h2>如何升级 shadow-panel 或 shadow-agent？数据如何备份？</h2>
    <p>
      升级流程非常简单，因为两者都是单文件二进制：
    </p>
    <ol>
      <li>从 Release 页面下载对应平台的新版二进制。</li>
      <li>停止正在运行的进程（<code>systemctl stop shadow-panel</code> / <code>systemctl stop shadow-agent</code>）。</li>
      <li>用新文件替换旧文件（路径不变）。</li>
      <li>启动进程，新版自动执行数据库迁移（如有 schema 变更）。</li>
    </ol>
    <p>
      数据备份：
    </p>
    <ul>
      <li><strong>SQLite</strong>：备份 <code>panel.db</code> 单文件即可，可用 <code>cp</code> 或 <code>sqlite3 panel.db .dump</code> 导出 SQL。建议在停止进程后备份，或使用 SQLite 的 WAL 模式在线热备。</li>
      <li><strong>MySQL</strong>：使用 <code>mysqldump</code> 定期导出，与常规 MySQL 备份流程相同。</li>
      <li><strong>Agent 侧</strong>：Agent 本身无持久状态（配置由 Panel 下发，内核进程临时文件在 <code>/tmp</code>），无需单独备份；仅需保存 Agent 的 token 凭证文件。</li>
    </ul>

    <h2>支持 IPv6、多用户流量配额和限速吗？</h2>
    <p>
      均支持：
    </p>
    <ul>
      <li><strong>IPv6</strong>：shadow-panel 和 shadow-agent 均支持 IPv6 监听；Xray-core 和 sing-box 的 inbound 可绑定 IPv6 地址，出站也支持 IPv6 直连或通过上游路由。</li>
      <li><strong>多用户流量配额</strong>：每个用户可设置总流量上限（上行 + 下行合计），超出后账号自动暂停，流量重置周期可按月或自定义。</li>
      <li><strong>限速</strong>：支持对单个用户设置上行 / 下行速率上限（单位 Mbps），由 shadow-agent 在生成内核配置时注入对应限速参数。</li>
      <li><strong>设备 / IP 限制</strong>：可设置同一账号允许的最大同时在线 IP 数，超出时新连接被拒绝或挤掉最早的连接。</li>
      <li><strong>黑名单</strong>：支持对用户账号手动封禁，也支持基于异常行为的自动触发规则。</li>
    </ul>
  </DocPage>
</template>
