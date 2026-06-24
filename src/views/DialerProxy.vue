<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'
import Badge from '@/components/ui/Badge.vue'

const outboundSimple = `{
  "outbounds": [
    {
      "tag": "upstream",
      "protocol": "socks",
      "settings": {
        "servers": [
          {
            "address": "proxy.example.com",
            "port": 1080,
            "users": [
              { "user": "u123", "pass": "p456" }
            ]
          }
        ]
      }
    },
    {
      "tag": "direct",
      "protocol": "freedom"
    }
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
}`

const outboundDialer = `{
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
            "users": [
              { "user": "u123", "pass": "p456" }
            ]
          }
        ]
      }
    }
  ]
}`

const outboundHttp = `{
  "outbounds": [
    {
      "tag": "upstream",
      "protocol": "http",
      "settings": {
        "servers": [
          {
            "address": "proxy.example.com",
            "port": 3128,
            "users": [
              { "user": "u123", "pass": "p456" }
            ]
          }
        ]
      }
    }
  ]
}`
</script>

<template>
  <DocPage
    eyebrow="使用"
    title="上游代理 / Dialer-Proxy"
    lead="Shadow Panel 的核心新能力：让节点的出站经 socks5 / http(s) 上游或多级链式代理走出去。"
  >

    <p>
      旧版 Trojan Panel 的节点出站配置中，<code>outbounds</code> 永远只有一条
      <code>{"protocol":"freedom"}</code>，用户流量只能从节点服务器的本机 IP 直连目标。
      <code>NodeAddDto</code> 的 gRPC 结构里也没有任何 outbound / dialer / socks / 上游代理字段，
      无法对接 IP 代理站。
    </p>
    <p>
      Shadow Panel 在节点模型中增加了可选的「上游出站」字段。每个节点可以独立配置一个
      socks5 / http(s) 上游，Panel 将其自动合成进该节点内核（Xray-core / sing-box / Hysteria2 / NaiveProxy）
      的出站配置，用户流量从该节点进入后，经指定的上游代理 IP 落地，而不是从节点服务器 IP 直接出去。
    </p>

    <h2>两种模式</h2>

    <h3>A) 简单上游（outbound routing）</h3>
    <p>
      将来自用户 inbound（<code>inboundTag: ["user-in"]</code>）的流量，通过路由规则整体转发到一个
      <code>socks</code> 或 <code>http</code> outbound。该 outbound 指向 IP 代理站的 socks5 / http(s) 地址，
      所有流量经该出口 IP 落地。适合<strong>单级代理落地</strong>场景，配置最简单，对接住宅 IP / 数据中心
      IP 轮换池时首选此模式。
    </p>

    <h3>B) dialer-proxy 链式</h3>
    <p>
      保留某个 outbound 的协议语义，但通过 <code>streamSettings.sockopt.dialerProxy</code> 指定另一个
      outbound 的 <code>tag</code>，使前者的底层 TCP 连接经后者建立。适合<strong>多级链式</strong>场景，
      例如先经中转服务器（第一跳），再经住宅 socks5 出口（第二跳）落地；也适合在保留 VLESS / Trojan 等
      出站协议特性的同时，将底层连接绕到指定出口 IP。
    </p>

    <h2>配置示例 · 简单上游（socks5）</h2>
    <p>
      用户从 <code>user-in</code> inbound 进来的流量，经路由规则转发到 <code>upstream</code> outbound，
      以 <code>u123</code> / <code>p456</code> 认证后经 <code>proxy.example.com:1080</code> 出口落地。
    </p>
    <CodeBlock lang="json" filename="xray-outbound.json" :code="outboundSimple" />

    <h2>配置示例 · dialer-proxy 链式</h2>
    <p>
      <code>proxy</code> outbound 的 <code>sockopt.dialerProxy</code> 设为 <code>"upstream"</code>，
      其底层 TCP 连接将通过 <code>upstream</code>（socks5）建立。
      两个 outbound 的 <code>tag</code> 必须唯一且互相对应。
    </p>
    <CodeBlock lang="json" filename="xray-dialer.json" :code="outboundDialer" />

    <h2>http(s) 上游</h2>
    <p>
      将 <code>protocol</code> 从 <code>"socks"</code> 改为 <code>"http"</code>，
      其余结构（<code>settings.servers</code> 的 <code>address</code> / <code>port</code> / <code>users</code>）
      保持不变。适用于只提供 http(s) CONNECT 代理接口的 IP 代理站。
    </p>
    <CodeBlock lang="json" filename="xray-http-upstream.json" :code="outboundHttp" />

    <h2>在面板里怎么填</h2>
    <p>在节点编辑页的「上游代理 / Dialer」区域，按以下步骤配置：</p>
    <ol>
      <li><strong>启用上游出站</strong>：勾选「启用上游代理」开关，表单展开。</li>
      <li>
        <strong>选择模式</strong>：
        <ul>
          <li>「简单上游」—— 流量整体路由到 socks5 / http(s) 出口（推荐大多数场景）。</li>
          <li>「dialer-proxy 链式」—— 保留出站协议，底层连接经上游建立（多级链式场景）。</li>
        </ul>
      </li>
      <li>
        <strong>选择协议类型</strong>：<code>socks5</code> 或 <code>http</code>。
      </li>
      <li>
        <strong>填写上游地址</strong>：依次填入 地址（域名或 IP）、端口、用户名、密码。
        若上游无需认证，用户名与密码留空。
      </li>
      <li>
        <strong>保存</strong>：Panel 将上游配置合成进目标节点内核的 <code>outbounds</code>（以及路由规则），
        通过 <code>HTTPS REST</code> 下发给 Agent，Agent 热重载内核进程后立即生效。
      </li>
    </ol>

    <Callout type="info" title="无需手写 JSON">
      管理后台表单填写完毕后，Panel 在后端自动拼装正确的 outbound 结构并写入内核配置文件，
      无需管理员手动编辑 JSON。
    </Callout>

    <h2>各内核支持矩阵</h2>
    <table>
      <thead>
        <tr>
          <th>内核</th>
          <th>简单上游（socks5/http）</th>
          <th>dialer-proxy 链式</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Xray-core</strong></td>
          <td><Badge variant="success">支持</Badge></td>
          <td><Badge variant="success">支持</Badge></td>
          <td>通过 <code>outbounds</code> + <code>routing.rules</code>；<code>sockopt.dialerProxy</code> 支持多级链式，能力最完整</td>
        </tr>
        <tr>
          <td><strong>sing-box</strong></td>
          <td><Badge variant="success">支持</Badge></td>
          <td><Badge variant="success">支持</Badge></td>
          <td>通过 outbound 的 <code>detour</code> 字段实现链式；支持 socks5 / http outbound</td>
        </tr>
        <tr>
          <td><strong>Hysteria2</strong></td>
          <td><Badge variant="success">支持</Badge></td>
          <td><Badge variant="secondary">不支持</Badge></td>
          <td>服务端 <code>outbounds</code> 支持 <code>direct</code> / <code>socks5</code> / <code>http</code>，配合 ACL 规则分流；无 dialerProxy 概念</td>
        </tr>
        <tr>
          <td><strong>NaiveProxy</strong></td>
          <td><Badge variant="success">支持</Badge></td>
          <td><Badge variant="secondary">不支持</Badge></td>
          <td>Caddy <code>forward_proxy</code> 插件的 <code>upstream</code> 参数，支持单级 http(s) / socks5 链式</td>
        </tr>
        <tr>
          <td><strong>Trojan-Go</strong></td>
          <td><Badge variant="warning">有限</Badge></td>
          <td><Badge variant="secondary">不支持</Badge></td>
          <td>出站能力弱；项目已 EOL（最后 release 2021-09），不建议依赖其出站配置</td>
        </tr>
      </tbody>
    </table>

    <Callout type="warning" title="上游稳定性与限速">
      当上游为住宅 IP 或数据中心 socks5 代理时，其稳定性、带宽上限和延迟由提供商决定，
      可能低于节点服务器自身带宽。建议在节点配置中同步设置合理的限速，避免上游成为瓶颈导致用户体验下降。
      同时注意代理商的并发连接数限制，高并发场景下可能需要多个上游节点轮转。
    </Callout>

    <Callout type="tip" title="出口 IP 分流">
      可以为不同节点配置不同的上游，实现出口 IP 分流：例如，针对流媒体解锁场景的节点使用
      住宅 IP 上游，针对低延迟场景的节点使用直连（不配置上游），针对隐私场景的节点使用
      不同地区的 IP 代理站——所有节点在同一个 Panel 实例中统一管理，互不干扰。
    </Callout>

  </DocPage>
</template>
