<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'
const xrayOutboundOld = `// Xray 默认出站模板（旧版 trojan-panel-core 硬编码）
{
  "outbounds": [
    { "protocol": "freedom" }
  ]
}`

const grpcDto = `// NodeAddDto（gRPC proto，旧版）
message NodeAddDto {
  int64  nodeId       = 1;
  string protocol     = 2;
  int32  port         = 3;
  string domain       = 4;
  // ... 协议专属字段 ...
  // ⚠️ 没有任何 outbound / upstream / socks / dialer 字段
}`

const xrayOutboundNew = `// Shadow Panel 节点配置（新版，支持上游出站）
{
  "inbounds": [ { "tag": "user-in", "port": 443, "protocol": "vless" } ],
  "outbounds": [
    {
      "tag": "upstream",
      "protocol": "socks",
      "settings": {
        "servers": [{ "address": "proxy.example.com", "port": 1080,
                       "users": [{ "user": "u123", "pass": "p456" }] }]
      }
    },
    { "tag": "direct", "protocol": "freedom" }
  ],
  "routing": {
    "rules": [{ "type": "field", "inboundTag": ["user-in"], "outboundTag": "upstream" }]
  }
}`
</script>

<template>
  <DocPage
    eyebrow="开始"
    title="为什么重写"
    lead="Trojan Panel 很强，但太重，且缺了最关键的上游代理能力。Shadow Panel 把它做轻、做通。"
  >
    <p>
      Trojan Panel 是一套功能完整的多用户代理面板，覆盖用户管理、流量配额、多协议内核（Xray / Trojan-Go / Hysteria / NaiveProxy）的统一纳管，社区积累了大量实践经验。然而，随着 IP 代理站接入场景的普及，它的三大结构性短板开始制约实际使用：<strong>运维依赖过重</strong>、<strong>无法对接 IP 代理站的上游节点</strong>、<strong>不支持链式出站（dialer-proxy）</strong>。Shadow Panel 正是针对这三点从零重写的产物。
    </p>

    <h2>痛点一：依赖与架构过重</h2>
    <p>
      Trojan Panel 由 4 个独立 Git 仓库组成，完整部署需要同时运行多个有状态服务：
    </p>
    <ul>
      <li><strong>MariaDB / MySQL</strong>——主数据库，存储用户、节点、流量记录；节点核心（core）也需要直连同一个数据库实例同步账号数据，形成跨机器的数据库暴露面。</li>
      <li><strong>Redis</strong>——缓存与分布式锁，即使单机部署也不可跳过。</li>
      <li><strong>无 TLS 的 gRPC</strong>——Panel 与 Core 之间走明文 gRPC 通信，链路无加密，部署在公网时存在安全隐患。</li>
      <li><strong>4 个分离仓库</strong>——install-script / trojan-panel / trojan-panel-core / trojan-panel-ui，版本对齐、升级、自定义构建成本高。</li>
    </ul>
    <p>
      对于只需要管理几台节点的个人或小团队，这套基础设施的初始配置和后续运维代价远超实际需求。
    </p>

    <Callout type="warning" title="旧版部署最低依赖">
      即便只有 1 台节点服务器，旧版也要求：MariaDB + Redis + gRPC 端口开放 + 4 个仓库同步构建。任意一个环节故障均会影响全部节点的账号同步与流量上报。
    </Callout>

    <h2>痛点二：无法对接 IP 代理站的 socks / https 节点</h2>
    <p>
      这是用户反馈最集中的痛点。IP 代理站通常以 <code>socks5://user:pass@host:port</code> 或 <code>https://user:pass@host:port</code> 的形式提供出口节点。要让代理服务器的出站流量经这些节点落地，需要在内核的 <code>outbounds</code> 里填写对应配置并通过路由规则绑定。
    </p>
    <p>
      旧版 trojan-panel-core 的做法是：为每种内核预置一套硬编码模板，其中 Xray 的 <code>outbounds</code> 永远只有一条 <code>freedom</code>（直连）：
    </p>
    <CodeBlock lang="jsonc" filename="xray-template-旧版.json" :code="xrayOutboundOld" />
    <p>
      更根本的问题在于 gRPC 的数据传输对象（DTO）层面——<code>NodeAddDto</code> 里根本没有上游代理相关字段：
    </p>
    <CodeBlock lang="protobuf" filename="node.proto（旧版片段）" :code="grpcDto" />
    <p>
      结果就是：无论 UI 侧想填什么，数据结构本身就没有这条路，socks5 / https 上游节点根本无处可填，所有用户流量只能从服务器本机 IP 直接出去。
    </p>
    <p>
      Shadow Panel 在节点模型里原生引入 <code>upstream</code> 字段，支持 socks5 / http(s) 上游配置，并在生成内核配置时自动注入对应的 <code>outbounds</code> 与路由规则：
    </p>
    <CodeBlock lang="jsonc" filename="xray-config-新版.json" :code="xrayOutboundNew" />

    <Callout type="success" title="新版改进">
      Shadow Panel 的节点配置原生包含 <code>upstream</code> 字段。填写 IP 代理站提供的 socks5 / https 节点地址后，shadow-agent 在生成 Xray-core 配置时会自动构建对应的 outbound 并绑定路由规则，无需手动改 JSON。
    </Callout>

    <h2>痛点三：不支持 dialer-proxy 链式出站</h2>
    <p>
      <code>dialerProxy</code> 是 Xray-core 提供的底层链式能力：一个出站协议的实际 TCP/UDP 连接可以经由另一个出站建立，从而实现「中转落地」或「多级代理」场景，例如先连一台中间跳板，再经住宅 socks5 出口落地，两跳的协议和认证各自独立。
    </p>
    <p>
      旧版 trojan-panel-core 的模板系统不支持生成含 <code>sockopt.dialerProxy</code> 的出站配置，也没有对应的数据模型。Shadow Panel 在节点配置中引入 dialer-proxy 链式字段，支持多出站有序链路，适应需要多级跳转的复杂网络场景。
    </p>

    <h2>Shadow Panel 的取舍</h2>
    <p>以下对比覆盖架构层面的核心差异：</p>
    <table>
      <thead>
        <tr>
          <th>维度</th>
          <th>Trojan Panel</th>
          <th>Shadow Panel</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>存储依赖</td>
          <td>MariaDB / MySQL（必须）+ Redis（必须）</td>
          <td>SQLite（默认，零依赖起步）；可选 MySQL</td>
        </tr>
        <tr>
          <td>Panel ↔ Agent 通信</td>
          <td>无 TLS 明文 gRPC</td>
          <td>HTTPS REST + 每 Agent 独立 Bearer Token</td>
        </tr>
        <tr>
          <td>账号数据同步</td>
          <td>Core 直连同一 MySQL 实例</td>
          <td>Agent 向 Panel 拉取，无数据库直连暴露</td>
        </tr>
        <tr>
          <td>上游代理（socks5 / https）</td>
          <td>不支持，outbound 硬编码 freedom</td>
          <td>原生支持，节点配置含 upstream 字段</td>
        </tr>
        <tr>
          <td>dialer-proxy 链式出站</td>
          <td>不支持</td>
          <td>支持，可配置多级链路</td>
        </tr>
        <tr>
          <td>内核版本</td>
          <td>Xray-core v1.8.0（2023）；Hysteria v1（已弃用）；Trojan-Go（EOL）</td>
          <td>Xray-core v26.x；Hysteria2 app/v2.9.2；sing-box v1.13.13；NaiveProxy v149.0.7827.114-1</td>
        </tr>
        <tr>
          <td>部署单元数量</td>
          <td>4 个仓库 + MariaDB + Redis</td>
          <td>2 个单文件二进制（shadow-panel + shadow-agent）</td>
        </tr>
      </tbody>
    </table>

    <h2>设计目标</h2>
    <p>Shadow Panel 的重写围绕以下目标展开：</p>
    <ul>
      <li><strong>轻量单二进制起步</strong>：shadow-panel 内嵌管理后台，SQLite 零依赖启动；shadow-agent 独立部署在每台节点服务器，无需共享数据库。</li>
      <li><strong>HTTPS REST 替代明文 gRPC</strong>：Panel 与 Agent 之间走加密 HTTPS，每个 Agent 持有独立 Bearer Token，吊销单节点凭证不影响其他节点。</li>
      <li><strong>原生上游出站支持</strong>：节点配置模型直接包含 upstream / dialer-proxy 字段，shadow-agent 生成内核配置时自动注入，无需用户手写 JSON。</li>
      <li><strong>对齐最新内核版本</strong>：Xray-core v26.x（支持 XHTTP / 最新 Reality）、Hysteria2 app/v2.9.2（移除 v1）、sing-box v1.13.13（统一多协议）、NaiveProxy v149.0.7827.114-1（跟随 Chromium 最新）。</li>
      <li><strong>保留完整多用户配额能力</strong>：流量配额、到期时间、限速、设备 / IP 限制、黑名单，多租户场景开箱即用。</li>
    </ul>
  </DocPage>
</template>
