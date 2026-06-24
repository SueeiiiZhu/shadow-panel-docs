<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'

const xrayOutboundSimple = `{
  "outbounds": [
    {
      "tag": "upstream",
      "protocol": "socks",
      "settings": {
        "servers": [
          {
            "address": "proxy.example.com",
            "port": 1080,
            "users": [{ "user": "u123", "pass": "p456" }]
          }
        ]
      }
    },
    { "tag": "direct", "protocol": "freedom" }
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

const xrayDialerProxy = `{
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
            "users": [{ "user": "u123", "pass": "p456" }]
          }
        ]
      }
    }
  ]
}`

const singboxOutbound = `{
  "outbounds": [
    {
      "tag": "proxy-out",
      "type": "vless",
      "server": "my-server.example.com",
      "server_port": 443,
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "flow": "xtls-rprx-vision",
      "tls": { "enabled": true, "server_name": "my-server.example.com" },
      "detour": "upstream-socks5"
    },
    {
      "tag": "upstream-socks5",
      "type": "socks",
      "server": "proxy.example.com",
      "server_port": 1080,
      "username": "u123",
      "password": "p456"
    },
    { "tag": "direct", "type": "direct" }
  ]
}`

const hysteria2Outbound = `# hysteria2 服务端 outbounds（ACL 分流）
outbounds:
  - name: direct
    type: direct
  - name: upstream
    type: socks5
    socks5:
      addr: proxy.example.com:1080
      username: u123
      password: p456

acl:
  inline:
    - direct(all)
    # 将特定流量转发到上游 socks5
    # - upstream(geoip:cn)`
</script>

<template>
  <DocPage
    eyebrow="使用"
    title="协议支持"
    lead="Xray-core / Hysteria2 / NaiveProxy / sing-box —— 用最新底层内核，淘汰 EOL 的 Trojan-Go。"
  >
    <p>
      Shadow Panel 以「用最新、淘汰停更」为选型理念，统一纳管四套底层内核：
      <strong>Xray-core</strong>（VLESS / VMess / Trojan / Shadowsocks 全家桶）、
      <strong>Hysteria2</strong>（QUIC/UDP 高性能抗封锁）、
      <strong>NaiveProxy</strong>（Chromium 网络栈伪装 HTTP/2 CONNECT）、
      <strong>sing-box</strong>（现代统一多协议内核）。
      旧版 Trojan-Go 已于 2021 年停更（EOL），Shadow Panel 不再内置，建议迁移至
      Xray-core 的 <code>trojan inbound</code> 或 sing-box 替代方案。
      每个节点均可额外挂载 socks5 / http(s) 上游出站或 <code>dialerProxy</code> 链式出站，
      让用户流量经 IP 代理站落地，而非直接暴露服务器 IP。
    </p>

    <h2>协议总览</h2>
    <table>
      <thead>
        <tr>
          <th>协议 / 内核</th>
          <th>传输</th>
          <th>适用场景</th>
          <th>TLS / 证书</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Xray-core — VLESS + Vision / Reality</td>
          <td>TCP / XTLS</td>
          <td>抗探测、TLS 伪装</td>
          <td>Reality（无需域名证书）</td>
          <td>推荐首选；Reality 可无域名部署</td>
        </tr>
        <tr>
          <td>Xray-core — VMess</td>
          <td>TCP / WebSocket / gRPC</td>
          <td>CDN 过渡场景</td>
          <td>可选 TLS</td>
          <td>兼容性强；不推荐新建纯 VMess 节点</td>
        </tr>
        <tr>
          <td>Xray-core — Trojan</td>
          <td>TCP / WebSocket</td>
          <td>替代 Trojan-Go</td>
          <td>需域名 TLS 证书</td>
          <td>完全替代已 EOL 的 Trojan-Go</td>
        </tr>
        <tr>
          <td>Xray-core — Shadowsocks</td>
          <td>TCP / UDP</td>
          <td>兼容老客户端</td>
          <td>无（加密内建）</td>
          <td>建议配合混淆；推荐 2022 新格式</td>
        </tr>
        <tr>
          <td>Hysteria2</td>
          <td>QUIC / UDP</td>
          <td>高带宽、高丢包环境</td>
          <td>需 TLS 证书</td>
          <td>抗 QoS 封锁；取代已弃用的 Hysteria v1</td>
        </tr>
        <tr>
          <td>NaiveProxy（Caddy forward_proxy）</td>
          <td>HTTP/2 CONNECT</td>
          <td>强伪装、住宅 IP 出口</td>
          <td>需域名 TLS 证书</td>
          <td>Chromium 网络栈，流量特征极低</td>
        </tr>
        <tr>
          <td>sing-box（统一多协议）</td>
          <td>TCP / UDP / QUIC 等</td>
          <td>多协议统一管理</td>
          <td>依协议而定</td>
          <td>推荐引入；支持 detour 链式出站</td>
        </tr>
        <tr>
          <td>
            Trojan-Go
            <Badge variant="warning">EOL</Badge>
          </td>
          <td>TCP / WebSocket</td>
          <td>——</td>
          <td>需域名 TLS 证书</td>
          <td>2021 年停更，不再内置，建议迁移</td>
        </tr>
      </tbody>
    </table>

    <h2>底层内核版本与升级建议</h2>
    <p>
      下表对比旧版 Trojan Panel 钉住的内核版本与 2026-06 最新版，说明每个内核的当前状态。
      Shadow Panel 在初始化安装时会自动拉取最新稳定版二进制。
    </p>

    <Callout type="warning" title="Trojan-Go 已 EOL，Xray v1.8.0 落后约 3 年">
      Trojan-Go 最后一个 release 为 2021-09-26 的 v0.10.6，此后仓库虽未归档，但
      2021 年后无任何新版本，2024-07 后基本停止维护，社区已将其视为 EOL。
      旧版 Trojan Panel 钉住的 Xray-core v1.8.0（2023 年）落后当前 v26.x 约 3 年，
      缺少 XHTTP、最新 Reality 改进、Vision 优化等重要特性，强烈建议升级。
    </Callout>

    <table>
      <thead>
        <tr>
          <th>内核</th>
          <th>trojanpanel 钉住的旧版</th>
          <th>最新版（2026-06）</th>
          <th>状态 / 说明</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Xray-core</td>
          <td>
            <Badge variant="warning">v1.8.0（2023）</Badge>
          </td>
          <td>
            <Badge variant="success">v26.6.22</Badge>
          </td>
          <td>落后约 3 年；缺 XHTTP / 新版 Reality / Vision 改进</td>
        </tr>
        <tr>
          <td>Trojan-Go</td>
          <td>
            <Badge variant="warning">v0.10.6（2021，EOL）</Badge>
          </td>
          <td>
            <Badge variant="warning">v0.10.6（仍是最后一版）</Badge>
          </td>
          <td>已 EOL；建议迁移至 Xray-core trojan inbound 或 sing-box</td>
        </tr>
        <tr>
          <td>Hysteria</td>
          <td>
            <Badge variant="warning">v1（已弃用）</Badge>
          </td>
          <td>
            <Badge variant="success">Hysteria2 app/v2.9.2</Badge>
          </td>
          <td>官方已全面转向 Hysteria2；v1 协议不再维护</td>
        </tr>
        <tr>
          <td>NaiveProxy</td>
          <td>
            <Badge variant="secondary">forwardproxy@naive（滚动）</Badge>
          </td>
          <td>
            <Badge variant="success">v149.0.7827.114-1</Badge>
          </td>
          <td>跟随 Chromium 149；Shadow Panel 拉取最新 tag</td>
        </tr>
        <tr>
          <td>sing-box</td>
          <td>
            <Badge variant="outline">未使用</Badge>
          </td>
          <td>
            <Badge variant="success">v1.13.13</Badge>
          </td>
          <td>推荐引入；v1.14.0-alpha 开发中；统一承载多协议</td>
        </tr>
      </tbody>
    </table>

    <p>Shadow Panel 针对上述差距的五条升级建议：</p>
    <ol>
      <li>
        <strong>Xray-core 升级到 v26.x 最新日期版（如 v26.6.22）</strong>，
        获得 XHTTP、Reality 最新改进、Vision 流控优化与更强的抗探测能力。
      </li>
      <li>
        <strong>全面采用 Hysteria2（app/v2.9.2），移除 Hysteria v1</strong>。
        官方已明确放弃 v1 协议，v2 协议在握手、拥塞控制和性能上均有质的提升。
      </li>
      <li>
        <strong>废弃 Trojan-Go（EOL），改用 Xray-core 的 <code>trojan inbound</code> 或 sing-box</strong>。
        现有 Trojan-Go 节点配置可直接平移，用户客户端无感知。
      </li>
      <li>
        <strong>引入 sing-box v1.13.13 作为现代统一内核</strong>，
        统一承载 VLESS+Vision、Trojan、Shadowsocks、Hysteria2、TUIC 等协议，
        减少多进程维护负担；其 <code>detour</code> 字段原生支持链式出站。
      </li>
      <li>
        <strong>NaiveProxy 跟随 Chromium 最新 tag</strong>（当前 v149.0.7827.114-1），
        确保 HTTP/2 CONNECT 伪装特征与最新浏览器一致，避免指纹差异被识别。
      </li>
    </ol>

    <h2>选型建议</h2>
    <p>根据不同使用场景，建议优先选择如下内核与协议：</p>

    <Card class="p-5">
      <ul>
        <li>
          <strong>追求极限性能 + 抗封锁（高带宽 / 高丢包线路）</strong>：
          首选 <strong>Hysteria2</strong>（QUIC/UDP，天然抗 QoS），
          可配合 socks5 上游出站指向住宅 IP 代理站落地。
        </li>
        <li>
          <strong>追求稳健通用 + 最强隐蔽性</strong>：
          首选 <strong>Xray-core VLESS + Vision / Reality</strong>，
          Reality 无需域名证书即可达到 TLS 伪装；
          <code>dialerProxy</code> 字段支持链式出站，是多级代理链的最佳选择。
        </li>
        <li>
          <strong>需要统一管理多种协议、多个节点</strong>：
          引入 <strong>sing-box</strong>，一个进程承载所有协议，
          通过 <code>detour</code> 配置链式出站，配置文件结构清晰，易于模板化管理。
        </li>
        <li>
          <strong>流量伪装要求极高（住宅 IP + HTTP/2 CONNECT）</strong>：
          使用 <strong>NaiveProxy</strong>，借助 Chromium 网络栈生成的流量特征，
          搭配住宅 IP 代理节点作为 <code>upstream</code>，可达到极低检测率。
        </li>
        <li>
          <strong>已有 Trojan-Go 节点需迁移</strong>：
          直接切换至 Xray-core <code>trojan inbound</code> 或 sing-box <code>trojan</code> 入站，
          客户端配置不变，无需通知用户更换。
          Trojan-Go <Badge variant="warning">EOL</Badge> 不接受安全补丁，请尽快迁移。
        </li>
      </ul>
    </Card>

    <h2>上游出站配置示例</h2>
    <p>
      Shadow Panel 在节点配置界面提供「上游出站」字段，保存后自动注入到对应内核的配置模板中。
      以下为各内核的典型配置片段，供参考。
    </p>

    <h3>Xray-core — 简单上游（routing 路由到 socks5）</h3>
    <p>
      将 <code>user-in</code> 入站标签的所有流量路由到名为 <code>upstream</code>
      的 socks5 出站，用户流量从代理站 IP 出口。
    </p>
    <CodeBlock lang="json" filename="xray-outbound-simple.json" :code="xrayOutboundSimple" />

    <h3>Xray-core — dialerProxy 链式出站</h3>
    <p>
      <code>sockopt.dialerProxy</code> 指向另一个 outbound 的 <code>tag</code>，
      使 <code>proxy</code> 出站的底层 TCP 连接经 <code>upstream</code> 建立。
      适合多级链式场景（如先连中转服务器、再经住宅 socks5 落地）。
    </p>
    <CodeBlock lang="json" filename="xray-dialer-proxy.json" :code="xrayDialerProxy" />

    <Callout type="info" title="http(s) 上游同样支持">
      将上述示例中的 <code>"protocol": "socks"</code> 改为 <code>"protocol": "http"</code>，
      即可对接 http / https 上游代理。<code>settings.servers</code> 结构相同，
      填写 address、port 与 users 认证信息即可。
    </Callout>

    <h3>sing-box — detour 链式出站</h3>
    <p>
      sing-box 通过 <code>detour</code> 字段指定上游出站 tag，语义与 Xray-core 的
      <code>dialerProxy</code> 等价，但写法更简洁。
    </p>
    <CodeBlock lang="json" filename="singbox-outbound.json" :code="singboxOutbound" />

    <h3>Hysteria2 — outbounds + ACL 分流</h3>
    <p>
      Hysteria2 服务端配置支持 <code>outbounds</code> + <code>acl</code> 字段，
      可将特定流量转发到 socks5 / http 上游，其余流量直连。
    </p>
    <CodeBlock lang="yaml" filename="hysteria2-outbound.yaml" :code="hysteria2Outbound" />

    <Callout type="tip" title="NaiveProxy upstream 参数">
      NaiveProxy（Caddy <code>forward_proxy</code> 插件）通过 Caddyfile 的
      <code>upstream socks5://user:pass@proxy.example.com:1080</code> 参数做链式出站，
      Shadow Panel 节点配置中填写上游 URI，面板自动写入 Caddyfile 并重载进程。
    </Callout>
  </DocPage>
</template>
