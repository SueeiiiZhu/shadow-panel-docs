<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'
import Badge from '@/components/ui/Badge.vue'

const deliveryFlow = `Panel 保存节点
  │
  └─► POST /agents/{id}/nodes  （Panel 内部触发下发）
        │
        └─► Panel → Agent  HTTPS REST
              POST https://<agent-host>:8443/nodes
              Authorization: Bearer <agent-token>
              Content-Type: application/json
              { "protocol": "xray", "port": 443, "domain": "node1.example.com", ... }
                │
                └─► Agent 收到请求
                      │
                      ├─► 生成 /etc/shadow-agent/xray/config.json
                      │
                      ├─► 启动 / 热重载内核进程（os/exec）
                      │
                      └─► 回报状态  200 OK { "status": "running", "pid": 12345 }`
</script>

<template>
  <DocPage eyebrow="使用" title="节点管理" lead="一个节点 = 一台 Agent(服务器) + 一种协议 + 一份配置（含可选上游出站）。">

    <h2>节点模型</h2>
    <p>
      每个节点记录在 Panel 数据库中，包含该节点所属的 Agent、要启动的代理协议、监听端口与域名，以及协议专属参数。
      节点还可以附加一份可选的「上游出站 / dialer-proxy」配置，使用户流量经指定的 socks5 或 http(s) 代理出口落地，而不是直接从服务器 IP 出去。
    </p>

    <table>
      <thead>
        <tr>
          <th>字段</th>
          <th>类型</th>
          <th>说明</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>name</code></td>
          <td>string</td>
          <td>节点显示名称，用于管理后台和订阅列表</td>
        </tr>
        <tr>
          <td><code>agent_id</code></td>
          <td>string</td>
          <td>所属 Agent（服务器）的 ID；Agent 在 Panel 注册后颁发唯一 bearer token</td>
        </tr>
        <tr>
          <td><code>protocol</code></td>
          <td>enum</td>
          <td>内核协议：<code>xray</code> / <code>hysteria2</code> / <code>naive</code> / <code>singbox</code></td>
        </tr>
        <tr>
          <td><code>port</code></td>
          <td>integer</td>
          <td>内核对外监听端口，由管理员分配，无固定偏移</td>
        </tr>
        <tr>
          <td><code>domain</code></td>
          <td>string</td>
          <td>TLS SNI / 证书域名；NaiveProxy 和 Hysteria2 必填</td>
        </tr>
        <tr>
          <td><code>priority</code></td>
          <td>integer</td>
          <td>订阅排序权重，数值越小越靠前</td>
        </tr>
        <tr>
          <td><code>upstream</code></td>
          <td>object?</td>
          <td>可选上游出站配置（socks5 / http / dialer-proxy），详见「上游出站」页</td>
        </tr>
        <tr>
          <td><code>status</code></td>
          <td>enum</td>
          <td><code>running</code> / <code>stopped</code> / <code>error</code>；由 Agent 心跳上报，Panel 只读展示</td>
        </tr>
      </tbody>
    </table>

    <h2>创建节点</h2>
    <ol>
      <li><strong>选择 Agent</strong>：从已注册的 Agent 列表中选取目标服务器。Agent 需提前完成注册并处于在线状态。</li>
      <li><strong>选择协议</strong>：从 <code>xray</code>、<code>hysteria2</code>、<code>naive</code>、<code>singbox</code> 中选一。选定后表单动态渲染该协议的专属参数（如 Xray 的 inbound 类型、Reality 公私钥等）。</li>
      <li><strong>填写参数</strong>：端口、域名、TLS 证书路径、协议专属字段，以及可选的上游出站。</li>
      <li><strong>保存</strong>：Panel 将节点配置持久化到数据库，并通过 HTTPS REST 下发给目标 Agent（<code>POST https://&lt;agent-host&gt;:8443/nodes</code>，Authorization 使用该 Agent 的 bearer token）。Agent 收到后生成内核配置文件并启动/热重载进程，随后回报运行状态。</li>
    </ol>

    <Callout type="info" title="证书管理（复用 Caddy）">
      节点服务器上的 <strong>Caddy</strong> 负责自动申请并续期 Let's Encrypt / ZeroSSL 证书。在节点配置中填写域名后，Agent 直接复用 Caddy 证书目录下的
      <code>.crt</code> / <code>.key</code> 文件（默认 <code>/var/lib/caddy/.../certificates/...</code>）写入内核配置，无需手动上传，也不必让内核自行签发——证书续期完全交给 Caddy。
    </Callout>

    <h2>配置下发链路</h2>
    <p>
      下图以文本流程图展示从 Panel 保存节点到内核进程上线的完整链路。与旧版 Trojan Panel 使用无 TLS 的 gRPC 下发不同，Shadow Panel 全程通过 HTTPS REST（Agent 默认端口 <code>8443</code>）加 bearer token 认证，无需在节点服务器上暴露额外的 gRPC 端口，也不再依赖共享 MySQL 传递账号数据。
    </p>

    <CodeBlock lang="text" filename="配置下发链路" :code="deliveryFlow" />

    <table>
      <thead>
        <tr>
          <th>对比项</th>
          <th>旧版 Trojan Panel</th>
          <th>Shadow Panel</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>下发协议</td>
          <td>无 TLS 的 gRPC（明文）</td>
          <td>HTTPS REST + bearer token</td>
        </tr>
        <tr>
          <td>账号同步</td>
          <td>共享同一个 MySQL 实例</td>
          <td>Panel API 推送，Agent 本地缓存</td>
        </tr>
        <tr>
          <td>Agent 端口</td>
          <td>apiPort = inboundPort + 30000</td>
          <td>固定 <code>8443</code>，可自定义</td>
        </tr>
        <tr>
          <td>认证方式</td>
          <td>无（内网隔离）</td>
          <td>每个 Agent 独立 bearer token</td>
        </tr>
      </tbody>
    </table>

    <h2>编辑与优先级</h2>
    <p>
      在节点列表点击「编辑」可修改任意字段。保存后 Panel 重新下发完整配置，Agent 热重载对应内核进程（不重启 Agent 进程本身），已建立的连接在内核支持热重载时保持不断线。
    </p>
    <p>
      <strong>优先级</strong>（<code>priority</code>）决定该节点在订阅列表中的排序。数值越小越靠前，适合把低延迟或高带宽节点置顶。同一 Agent 下的多个节点可以独立设置优先级。
    </p>

    <h2>在线状态</h2>
    <p>
      Agent 每隔 50 秒向 Panel 发送心跳，携带所有节点的运行状态（<code>running</code> / <code>stopped</code> / <code>error</code>）和流量统计增量。Panel 管理后台节点列表实时展示状态徽章：
    </p>
    <ul>
      <li><Badge variant="success">running</Badge> — 内核进程正常运行，接受用户连接。</li>
      <li><Badge variant="secondary">stopped</Badge> — 进程已停止，通常由管理员手动停止触发。</li>
      <li><Badge variant="destructive">error</Badge> — 进程异常退出，Agent 会附带最后一段 stderr 日志，便于排查。</li>
    </ul>
    <p>
      若 Agent 心跳超时（默认 3 分钟未上报），Panel 将该 Agent 下所有节点标记为 <strong>离线</strong>，订阅下发时自动跳过这些节点。
    </p>

    <h2>删除节点</h2>
    <p>
      删除节点时，Panel 先向 Agent 发送 <code>DELETE /nodes/{node_id}</code> 请求，Agent 停止并清理对应的内核进程和配置文件，确认成功后 Panel 再从数据库中移除记录。若 Agent 不可达（离线），Panel 会标记为「待清理」，Agent 重新上线时自动完成清理。
    </p>

    <Callout type="warning" title="删除不可撤销">
      删除节点后，该节点的所有协议专属配置（含密钥、证书路径）将被永久移除。如需暂停服务，建议使用「停止」而非「删除」。
    </Callout>

    <h2>上游出站入口</h2>
    <p>
      每个节点的编辑页底部有「上游代理 / Dialer」配置区，支持为该节点指定一个 socks5 或 http(s) 上游出口。启用后，用户从该节点进入的流量将经由指定的上游代理 IP 落地，而不是直接从节点服务器 IP 出去。这是对接 IP 代理站（住宅 IP / 机房 IP 轮换）的标准入口。
    </p>
    <p>
      上游出站支持两种模式：
    </p>
    <ul>
      <li><strong>简单上游（outbound routing）</strong>：将用户流量整体路由到一个 socks5 / http(s) 出站，适合单级代理落地。</li>
      <li><strong>dialer-proxy 链式</strong>：保留原出站协议语义，仅将底层 TCP 连接经另一个 outbound 建立，支持多级链式（如先经中转服务器，再经住宅 socks5 出口）。</li>
    </ul>

    <Callout type="tip" title="详细配置">
      上游出站的完整参数说明、Xray-core <code>dialerProxy</code> / sing-box <code>detour</code> / Hysteria2 <code>outbounds</code> / NaiveProxy <code>upstream</code> 各内核写法，以及对接 IP 代理站的实战示例，请参阅
      <a href="/dialer-proxy">上游出站 &amp; dialer-proxy</a> 页。
    </Callout>

  </DocPage>
</template>
