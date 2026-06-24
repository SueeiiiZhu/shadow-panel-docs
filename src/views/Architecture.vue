<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'
const asciiDiagram = `
管理员 (浏览器)
     │  HTTPS :8080
     ▼
┌────────────────────────────────────────┐
│           shadow-panel                 │
│  内嵌 Vue 管理后台 · SQLite(默认)/MySQL │
│  认证 / 用户 / 节点 / 订阅 / 看板       │
└───────────────┬────────────────────────┘
                │  HTTPS REST + Bearer Token
       ┌────────┴─────────┐
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│ shadow-agent│    │ shadow-agent│   …更多节点服务器
│  :8443      │    │  :8443      │
└──────┬──────┘    └──────┬──────┘
       │                  │
  生成配置 / 启停进程    生成配置 / 启停进程
       │                  │
  ┌────┴────────────┐      ┌────┴─────────────┐
  │ Xray-core       │      │ Hysteria2         │
  │ Hysteria2       │      │ sing-box          │
  │ NaiveProxy      │      │ NaiveProxy        │
  │ sing-box        │      └────────┬──────────┘
  └────────┬────────┘               │
           │                        │
     出站（直连 或 上游 socks5/https）
           │                        │
           ▼                        ▼
        目标站点                  目标站点
`.trim()

</script>

<template>
  <DocPage
    eyebrow="开始"
    title="系统架构"
    lead="控制面 Panel + 数据面 Agent 两层，HTTPS REST 串联，SQLite 起步。"
  >

    <h2>总览</h2>
    <p>
      Shadow Panel 采用两层架构：<strong>控制面 shadow-panel</strong>（下称 Panel）负责所有管理逻辑，
      <strong>数据面 shadow-agent</strong>（下称 Agent）部署在每台代理服务器上，负责生成内核配置并管理内核进程。
      两者之间通过 <code>HTTPS REST</code> + 每 Agent 独立 bearer token 通信，无需共享数据库。
    </p>
    <CodeBlock lang="text" filename="架构总览" :code="asciiDiagram" />

    <h2>控制面 Panel</h2>
    <p>
      Panel 是一个<strong>单文件二进制</strong>，内嵌已编译好的 Vue 3 管理后台，无需单独部署前端服务器。
      启动后在 <code>:8080</code> 提供 HTTPS 管理界面和 REST API。
    </p>
    <ul>
      <li><strong>认证</strong>：JWT 签发与验证，支持 RBAC 权限控制。</li>
      <li><strong>用户管理</strong>：流量配额、到期时间、限速、设备/IP 限制、黑名单。</li>
      <li><strong>节点管理</strong>：注册 Agent、下发节点配置（协议、端口、域名、上游代理）。</li>
      <li><strong>订阅</strong>：生成分享链接，输出 Clash / sing-box 订阅格式。</li>
      <li><strong>看板</strong>：汇聚各 Agent 心跳上报的流量与在线状态。</li>
    </ul>
    <p>
      存储默认使用 <code>SQLite</code>，适合单机快速起步；可通过配置切换为 MySQL，满足多实例高可用需求。
      Panel 本身无状态，所有持久化数据均在数据库中，方便水平扩展。
    </p>

    <h2>数据面 Agent</h2>
    <p>
      Agent 是部署在每台代理服务器上的<strong>单文件二进制</strong>，在 <code>:8443</code> 提供 HTTPS API。
      Agent 不直接访问数据库，所有配置均由 Panel 通过 REST 下发。
    </p>
    <ul>
      <li><strong>生成内核配置</strong>：根据 Panel 下发的节点参数，渲染 Xray-core / Hysteria2 / NaiveProxy / sing-box 所需的 JSON/YAML 配置文件。</li>
      <li><strong>启停内核进程</strong>：通过 <code>os/exec</code> 管理内核子进程的生命周期（启动、重启、停止）。</li>
      <li><strong>上报流量与状态</strong>：定期向 Panel 心跳上报各节点的入/出站流量字节数与在线用户数。</li>
    </ul>
    <p>
      Agent 向 Panel 发起心跳（<strong>Agent 主动推</strong>），Panel 无需主动连接 Agent，适合 Agent 位于 NAT 或防火墙后的场景。
      每个 Agent 持有唯一 bearer token，token 由 Panel 在注册时颁发，可随时吊销。
    </p>

    <h2>Panel 与 Agent 通信</h2>
    <p>
      通信协议为 <strong>HTTPS REST</strong>，每个请求在 <code>Authorization: Bearer &lt;token&gt;</code> 头中携带 Agent 专属 token。
      以下为核心端点示意：
    </p>
    <table>
      <thead>
        <tr>
          <th>方向</th>
          <th>方法 + 路径</th>
          <th>用途</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Agent → Panel</td>
          <td><code>POST /api/agents/register</code></td>
          <td>Agent 首次注册，Panel 颁发 token</td>
        </tr>
        <tr>
          <td>Panel → Agent</td>
          <td><code>PUT /api/nodes/:id/config</code></td>
          <td>Panel 下发节点配置（协议参数 + 上游出站）</td>
        </tr>
        <tr>
          <td>Agent → Panel</td>
          <td><code>POST /api/agents/heartbeat</code></td>
          <td>心跳：上报流量字节数与节点在线状态</td>
        </tr>
        <tr>
          <td>Panel → Agent</td>
          <td><code>GET /api/nodes/:id/stats</code></td>
          <td>Panel 主动拉取单节点实时流量统计</td>
        </tr>
        <tr>
          <td>Panel → Agent</td>
          <td><code>POST /api/nodes/:id/restart</code></td>
          <td>Panel 触发内核进程重启</td>
        </tr>
      </tbody>
    </table>
    <p>
      与旧版 Trojan Panel 的「<strong>无 TLS gRPC + 共享 MySQL</strong>」方案相比：
    </p>
    <ul>
      <li>旧版 gRPC 通道不加密（明文传输节点配置与账号信息），Shadow Panel 所有通信走 HTTPS，传输层默认加密。</li>
      <li>旧版 Agent 直连 Panel 侧 MySQL，意味着数据库端口必须对所有 Agent 服务器开放；Shadow Panel 中 Agent 只需能访问 Panel 的 <code>:8080</code> HTTPS 端口，数据库完全隔离在 Panel 内部。</li>
      <li>旧版多 Agent 共用同一个数据库账号，权限边界模糊；Shadow Panel 每 Agent 独立 token，随时可单独吊销，不影响其他 Agent。</li>
    </ul>

    <Callout type="tip" title="为什么选 REST 而非 gRPC">
      REST over HTTPS 相比 gRPC 有三个实际优势：
      其一，<strong>更易调试</strong>——<code>curl</code> / Postman 即可模拟请求，无需 grpcurl 或 .proto 文件；
      其二，<strong>更易穿透</strong>——标准 HTTPS(443/8443) 几乎所有云厂商防火墙和 CDN 均默认放行，gRPC 的 HTTP/2 帧有时会被中间件拦截；
      其三，<strong>TLS 开箱即用</strong>——REST 直接复用标准 HTTPS 证书体系，gRPC 需额外配置 TLS credentials，在生产环境中更易出错。
    </Callout>

    <h2>与 Trojan Panel 架构对比</h2>
    <table>
      <thead>
        <tr>
          <th>维度</th>
          <th>Trojan Panel（旧）</th>
          <th>Shadow Panel（新）</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>仓库 / 组件数</td>
          <td>4 个仓库（install-script / backend / core / UI），部署需逐一维护</td>
          <td>2 个单文件二进制（panel + agent），UI 内嵌于 panel</td>
        </tr>
        <tr>
          <td>Panel ↔ Agent 通信</td>
          <td>无 TLS 明文 gRPC</td>
          <td>HTTPS REST + 每 Agent 独立 bearer token</td>
        </tr>
        <tr>
          <td>账号数据传递</td>
          <td>Agent 直连共享 MySQL，账号从库中轮询同步</td>
          <td>Panel 通过 REST 下发配置；Agent 无需访问数据库</td>
        </tr>
        <tr>
          <td>存储依赖</td>
          <td>MariaDB/MySQL + Redis（缓存 + 分布式锁）</td>
          <td>SQLite（默认）或 MySQL；无需 Redis</td>
        </tr>
        <tr>
          <td>传输层 TLS</td>
          <td>Panel ↔ Agent 明文；数据库连接依赖网络隔离</td>
          <td>全链路 HTTPS，证书自管理</td>
        </tr>
        <tr>
          <td>上游出站 / 代理链</td>
          <td>全部硬编码直连，无法配置上游 socks5/https</td>
          <td>每节点可配置 upstream dialer（socks5 / http），支持多级链式出站</td>
        </tr>
        <tr>
          <td>支持内核</td>
          <td>Xray-core v1.8.0 / Trojan-Go(EOL) / Hysteria v1 / NaiveProxy</td>
          <td>Xray-core v26.x / Hysteria2 / NaiveProxy / sing-box</td>
        </tr>
      </tbody>
    </table>

  </DocPage>
</template>
