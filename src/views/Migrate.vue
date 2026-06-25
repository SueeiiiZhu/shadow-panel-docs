<script setup>
import DocPage from '@/components/DocPage.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import Callout from '@/components/Callout.vue'
const sqlDump = `# 导出 account 表（仅保留迁移所需字段）
mysqldump \\
  --host=127.0.0.1 \\
  --user=trojanpanel \\
  --password \\
  --no-create-info \\
  --skip-triggers \\
  trojanpanel account \\
  > dump.sql`

const sqlInspect = `-- 查看旧表结构，确认字段名称
DESCRIBE account;

-- 典型导出字段：
--   id, username, password (bcrypt hash),
--   quota (bytes), expire_time (unix ts),
--   download, upload, status, created_at`

const importCmd = `# Shadow Panel 一键导入（将旧账号映射到新用户模型）
shadow-panel import --from-trojanpanel dump.sql

# 可选参数
#   --default-role  user        # 导入后角色，默认 user
#   --quota-unit    bytes       # 流量单位，默认 bytes
#   --dry-run                   # 预览，不写库`

const certReuse = `# 旧节点证书目录示例（Trojan Panel 默认路径）
/tpdata/trojan-panel-core/certs/<domain>/fullchain.pem
/tpdata/trojan-panel-core/certs/<domain>/privkey.pem

# Shadow Agent 只需在节点配置中填写绝对路径即可复用
# 无需重新申请，Let's Encrypt 证书 90 天有效期不受影响`
</script>

<template>
  <DocPage
    eyebrow="参考"
    title="从 Trojan Panel 迁移"
    lead="账号、节点、证书平滑迁移，并顺手补上 dialer-proxy 与最新内核。"
  >

    <!-- ───────────────────────────────── 迁移总览 ───────────────────────────────── -->
    <h2>迁移总览</h2>
    <p>
      Shadow Panel 是对 Trojan Panel 的轻量化重写，两者在概念上高度对应，但架构做了大幅简化：
      数据库从 MariaDB + Redis 精简为 SQLite（可选 MySQL），节点核心从多进程 gRPC 管理改为
      shadow-agent 单二进制 + HTTPS REST，权限模型也从 Casbin 换成内置角色。
      大多数数据可通过脚本或手动重建完成迁移，停机窗口通常在 30 分钟以内。
    </p>

    <table>
      <thead>
        <tr>
          <th>Trojan Panel 概念</th>
          <th>Shadow Panel 对应</th>
          <th>迁移方式</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>account</code> 表</td>
          <td>用户（User）</td>
          <td>mysqldump 导出 → <code>shadow-panel import</code></td>
        </tr>
        <tr>
          <td><code>node</code> + <code>node_xray</code> / <code>node_trojan_go</code> 等分表</td>
          <td>统一 <code>node</code>（含协议专属配置 JSON）</td>
          <td>手动按旧参数在新面板重建</td>
        </tr>
        <tr>
          <td><code>node_server</code>（宿主机记录）</td>
          <td>Agent（shadow-agent 实例）</td>
          <td>每台服务器部署 shadow-agent，面板注册生成 token</td>
        </tr>
        <tr>
          <td>无 TLS gRPC（Panel → Core）</td>
          <td>HTTPS REST + Bearer Token（Panel ↔ Agent）</td>
          <td>架构替换，无数据迁移</td>
        </tr>
        <tr>
          <td>MariaDB + Redis</td>
          <td>SQLite（默认）或 MySQL</td>
          <td>账号数据通过 import 命令转换</td>
        </tr>
        <tr>
          <td>Casbin RBAC</td>
          <td>内置角色（admin / user）</td>
          <td>导入时通过 <code>--default-role</code> 指定</td>
        </tr>
      </tbody>
    </table>

    <Callout type="info" title="并行运行">
      迁移期间旧栈和新栈可以在不同端口同时运行，建议先在测试账号上验证，再批量切换。
      详见下方「回滚」章节。
    </Callout>

    <!-- ───────────────────────────────── 迁移账号数据 ───────────────────────────────── -->
    <h2>迁移账号数据</h2>
    <p>
      旧 <code>account</code> 表存储了用户名、bcrypt 密码哈希、流量配额、到期时间、已用流量等核心字段。
      迁移思路是先用 <code>mysqldump</code> 导出该表的 INSERT 数据，再交给 Shadow Panel 的
      <code>import</code> 子命令完成字段映射和写入。密码哈希无需重新计算，可直接复用。
    </p>

    <h3>第一步：检查旧表结构</h3>
    <CodeBlock lang="sql" filename="inspect.sql" :code="sqlInspect" />

    <h3>第二步：导出 account 表</h3>
    <CodeBlock lang="bash" filename="export.sh" :code="sqlDump" />

    <h3>第三步：导入 Shadow Panel</h3>
    <CodeBlock lang="bash" filename="import.sh" :code="importCmd" />

    <Callout type="warning" title="流量字段单位">
      Trojan Panel 在不同版本中流量字段单位存在差异（部分版本用 MB，部分用 bytes）。
      导入前请用 <code>SELECT MAX(upload + download) FROM account</code> 估算量级，
      再通过 <code>--quota-unit</code> 参数显式指定，避免配额被误缩放。
    </Callout>

    <p>
      导入完成后，登录 Shadow Panel 管理后台 → 用户列表，确认账号数量与旧面板一致，
      并抽查几条记录的配额和到期时间是否正确。
    </p>

    <!-- ───────────────────────────────── 迁移节点 ───────────────────────────────── -->
    <h2>迁移节点</h2>
    <p>
      节点配置不提供自动迁移工具，因为旧版分表结构（<code>node_xray</code>、
      <code>node_hysteria</code> 等）与新版统一 JSON 模型差异较大，手动重建反而更可靠。
      操作步骤如下：
    </p>
    <ol>
      <li>
        在旧面板记录每个节点的：协议类型、监听端口、域名、TLS 证书路径、协议专属参数
        （如 Xray 的 <code>uuid</code>、VLESS 的 <code>flow</code>、Reality 的公私钥等）。
      </li>
      <li>
        在 Shadow Panel 中为对应服务器注册 Agent，获得 bearer token 并部署 shadow-agent。
      </li>
      <li>
        按记录的参数在新面板逐条创建节点，协议、端口、域名与旧节点保持一致，用户连接配置无需更改。
      </li>
      <li>
        <strong>证书可直接复用</strong>，将旧路径下的 <code>fullchain.pem</code> /
        <code>privkey.pem</code> 填入新节点的 TLS 配置先行过渡；待节点上的 <strong>Caddy</strong>
        为同一域名签发证书后，再把节点切到「证书来源 = Caddy」，后续续期即交由 Caddy 自动完成。
      </li>
    </ol>

    <CodeBlock lang="bash" filename="cert-paths.sh" :code="certReuse" />

    <Callout type="tip" title="端口不变，用户无感">
      只要协议、端口、域名、TLS 指纹与旧节点一致，已有客户端订阅无需更新，用户可无感切换。
    </Callout>

    <!-- ───────────────────────────────── 内核升级 ───────────────────────────────── -->
    <h2>内核升级</h2>
    <p>
      迁移是一次难得的内核整体升级机会。旧版 Trojan Panel 钉住的内核普遍已过时，
      建议在部署 shadow-agent 时同步安装最新版本：
    </p>
    <ul>
      <li>
        <strong>Xray-core</strong>：从 v1.8.0（2023）升级到 v26.x（2026），
        获得 XHTTP、最新 Reality 改进、Vision 优化等新特性。
      </li>
      <li>
        <strong>Hysteria v1 → Hysteria2</strong>：Hysteria v1 官方已弃用，
        旧节点需重建为 Hysteria2（协议不兼容，客户端同步更新）。
      </li>
      <li>
        <strong>Trojan-Go 节点</strong>：Trojan-Go 自 2021 年后基本停更，社区视为 EOL。
        迁移时应将其改建为 Xray-core 的 <code>trojan</code> inbound，
        或用 sing-box 统一承载（sing-box v1.13.13 稳定版支持 trojan、VLESS、Shadowsocks、Hysteria2、TUIC）。
      </li>
      <li>
        <strong>sing-box</strong>（可选）：作为现代统一内核引入，可替代多个独立二进制，
        减少服务器上需要维护的进程数量。
      </li>
    </ul>

    <Callout type="warning" title="Trojan-Go 节点必须重建">
      Trojan-Go 与 Xray-core trojan inbound 在 TLS 握手和多路复用实现上存在差异。
      改建后客户端需同步更换为支持标准 trojan 的客户端配置，不能直接沿用旧 Trojan-Go 连接参数。
    </Callout>

    <!-- ───────────────────────────────── 新增能力 ───────────────────────────────── -->
    <h2>迁移后的新增能力</h2>
    <p>
      完成迁移后，Shadow Panel 的节点模型支持为每个节点配置<strong>上游代理 / dialer-proxy 出站</strong>，
      这是旧版 Trojan Panel 完全不具备的能力。典型使用场景：
    </p>
    <ul>
      <li>
        将用户出站流量经由 socks5 / http(s) IP 代理站节点转发，实现住宅 IP 落地，
        绕过目标站点的数据中心 IP 封锁。
      </li>
      <li>
        配置多级链式代理（如先经中转服务器、再经住宅 socks5 落地），
        使用 Xray-core 的 <code>sockopt.dialerProxy</code> 实现出站链式绑定。
      </li>
      <li>
        为高价值节点单独指定上游出口，其余节点继续直连，按节点粒度灵活控制出口 IP。
      </li>
    </ul>
    <p>
      具体配置方法请参阅
      <strong>「上游代理配置」</strong>和<strong>「dialer-proxy 链式出站」</strong>两页文档。
    </p>

    <!-- ───────────────────────────────── 回滚 ───────────────────────────────── -->
    <h2>回滚与并行运行</h2>
    <Callout type="tip" title="建议分批切换，保留旧栈并行">
      迁移期间不必立即停掉 Trojan Panel。旧栈监听原端口（如 443、8080），
      新栈在不同端口启动（如 Shadow Panel 管理后台 8080 → 可改为 18080，
      节点端口保持不变但通过新 Agent 托管）。测试账号验证通过后，
      再逐批将用户流量切换到新节点，最后停止旧进程。
    </Callout>
    <p>回滚步骤：</p>
    <ol>
      <li>
        旧 Docker Compose 栈保持 <code>docker compose stop</code>（不 <code>down</code>），
        MariaDB 数据卷不删除，随时可以 <code>docker compose start</code> 恢复。
      </li>
      <li>
        如需回滚，重启旧栈，将 DNS 或客户端订阅切回旧节点地址即可，
        旧用户数据未被破坏，账号仍然有效。
      </li>
      <li>
        确认新栈稳定运行 72 小时以上、无用户投诉后，再清理旧容器和数据卷。
      </li>
    </ol>

    <Callout type="info" title="证书续期注意">
      旧栈通常由其自带 Caddy 容器（或 acme.sh）管理证书；迁移到 Shadow Panel 后，
      证书续期统一交给新栈节点上的 <strong>Caddy</strong>。确认新 Caddy 已为节点域名签发证书、
      且内核已指向 Caddy 的证书目录后，再停用旧续期任务，避免旧证书到期后 TLS 握手失败。
    </Callout>

  </DocPage>
</template>
