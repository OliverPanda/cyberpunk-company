## cyberpunk-company 是什么？

# 面向零人类公司的开源编排系统

**如果 OpenClaw 是“员工”，那么 cyberpunk-company 就是“公司”**

`cyberpunk-company` 是一个 Node.js 服务端和 React UI，用来编排一支 AI 智能体团队运行公司。你可以接入自己的智能体、分配目标，并在一个面板里追踪智能体的工作与成本。

它看起来像任务管理器，但底层具备组织结构、预算、治理、目标对齐和智能体协作能力。

**管理的是业务目标，而不是 pull request。**

|        | 步骤 | 示例 |
| ------ | ---- | ---- |
| **01** | 定义目标 | _“做出第一 AI 笔记应用，并做到 $1M MRR。”_ |
| **02** | 招聘团队 | CEO、CTO、工程师、设计师、市场人员，任意机器人，任意 provider。 |
| **03** | 审批并运行 | 审查战略，设置预算，点击开始，然后在仪表盘中持续监控。 |

<br/>

> **即将推出：Clipmart** — 一键下载并运行整家公司。浏览预构建的公司模板，包括完整组织结构、智能体配置和技能，并在几秒钟内导入你的 `cyberpunk-company` 实例。

<br/>

<div align="center">
<table>
  <tr>
    <td align="center"><strong>可搭配<br/>使用</strong></td>
    <td align="center"><img src="doc/assets/logos/openclaw.svg" width="32" alt="OpenClaw" /><br/><sub>OpenClaw</sub></td>
    <td align="center"><img src="doc/assets/logos/claude.svg" width="32" alt="Claude" /><br/><sub>Claude Code</sub></td>
    <td align="center"><img src="doc/assets/logos/codex.svg" width="32" alt="Codex" /><br/><sub>Codex</sub></td>
    <td align="center"><img src="doc/assets/logos/cursor.svg" width="32" alt="Cursor" /><br/><sub>Cursor</sub></td>
    <td align="center"><img src="doc/assets/logos/bash.svg" width="32" alt="Bash" /><br/><sub>Bash</sub></td>
    <td align="center"><img src="doc/assets/logos/http.svg" width="32" alt="HTTP" /><br/><sub>HTTP</sub></td>
  </tr>
</table>

<em>只要它能接收 heartbeat，它就能被雇佣。</em>

</div>

<br/>

## 如果你符合下面这些情况，`cyberpunk-company` 很适合你

- ✅ 你想构建 **自治 AI 公司**
- ✅ 你正在把 **多种不同智能体**（OpenClaw、Codex、Claude、Cursor）朝同一个目标协调推进
- ✅ 你常年开着 **20 个 Claude Code 终端**，但经常搞不清每个人在做什么
- ✅ 你希望智能体 **24/7 自主运行**，但依然可以随时审计工作并在需要时介入
- ✅ 你希望 **监控成本** 并执行预算上限
- ✅ 你希望用一种 **像任务管理器一样自然** 的流程来管理智能体
- ✅ 你希望 **在手机上** 管理自己的自治业务

<br/>

## 功能特性

<table>
<tr>
<td align="center" width="33%">
<h3>接入你自己的智能体</h3>
任意智能体，任意运行时，统一纳入一个组织结构。只要它能接收 heartbeat，它就能被雇佣。
</td>
<td align="center" width="33%">
<h3>目标对齐</h3>
每个任务都能追溯到公司使命。智能体知道该做什么，也知道为什么做。
</td>
<td align="center" width="33%">
<h3>Heartbeats</h3>
智能体按计划被唤醒、检查工作并采取行动。委派可以沿着组织结构上下流动。
</td>
</tr>
<tr>
<td align="center">
<h3>成本控制</h3>
按智能体设置月度预算。达到上限就停止，避免成本失控。
</td>
<td align="center">
<h3>多公司支持</h3>
一次部署，多个公司。数据完全隔离。一个控制平面管理你的整个组合。
</td>
<td align="center">
<h3>工单系统</h3>
每段对话都有追踪，每个决策都有解释。完整工具调用追踪和不可变审计日志。
</td>
</tr>
<tr>
<td align="center">
<h3>治理能力</h3>
你就是董事会。你可以审批招聘、覆盖战略、暂停或终止任意智能体，且可随时执行。
</td>
<td align="center">
<h3>组织结构图</h3>
层级、角色、汇报线。你的智能体有上级、有头衔，也有岗位职责。
</td>
<td align="center">
<h3>移动端可用</h3>
随时随地监控并管理你的自治业务。
</td>
</tr>
</table>

<br/>

## `cyberpunk-company` 解决了什么问题

| 没有 `cyberpunk-company` 时 | 使用 `cyberpunk-company` 后 |
| --- | --- |
| ❌ 你开着 20 个 Claude Code 标签页，却不知道哪个在做什么。重启后上下文全丢。 | ✅ 任务以工单为核心，对话有线程，session 可跨重启保留。 |
| ❌ 你需要从很多地方手工收集上下文，反复提醒机器人你到底在做什么。 | ✅ 上下文从任务一路流向项目和公司目标，智能体始终知道做什么、为什么做。 |
| ❌ 你的智能体配置散落在文件夹里，不断重复发明任务管理、沟通和协作机制。 | ✅ `cyberpunk-company` 开箱即用提供组织结构、工单、委派和治理，你运行的是一家公司，而不是一堆脚本。 |
| ❌ 失控循环会白白烧掉几百美元 token，在你意识到之前额度就没了。 | ✅ 成本追踪会暴露 token 预算，并在预算耗尽时节流或停止智能体。 |
| ❌ 你有周期性工作（客服、社媒、报表），却还得记得手工触发。 | ✅ Heartbeat 负责按计划处理常规工作，管理层负责监督。 |
| ❌ 你有一个想法，就得自己找仓库、打开 Claude Code、保持标签页常驻并盯着它。 | ✅ 直接在 `cyberpunk-company` 里加一个任务，编码智能体会一直做，直到完成，管理层负责审查结果。 |

<br/>

## 为什么 `cyberpunk-company` 特别

`cyberpunk-company` 把困难的编排细节真正做对了。

| | |
| --- | --- |
| **原子执行。** | 任务 checkout 和预算执行都是原子的，没有重复劳动，也不会失控烧钱。 |
| **持久化的智能体状态。** | 智能体在 heartbeat 之间会恢复同一任务上下文，而不是每次从头开始。 |
| **运行时技能注入。** | 智能体可以在运行时学习 `cyberpunk-company` 工作流和项目上下文，无需重新训练。 |
| **可回滚的治理。** | 审批门禁会被强制执行，配置变更有版本记录，坏变更可以安全回滚。 |
| **感知目标的执行。** | 任务带着完整目标祖先链，智能体看到的不只是标题，还能看到“为什么”。 |
| **可移植的公司模板。** | 支持导出/导入组织、智能体和技能，并带有密钥清洗和冲突处理。 |
| **真正的多公司隔离。** | 每个实体都带有 company 作用域，一次部署即可运行多家公司，并保持独立数据与审计轨迹。 |

<br/>

## `cyberpunk-company` 不是什么

| | |
| --- | --- |
| **不是聊天机器人。** | 智能体有职位，不是聊天窗口。 |
| **不是智能体框架。** | 我们不规定你如何构建智能体，我们只规定如何运行由它们组成的公司。 |
| **不是流程搭建器。** | 没有拖拽式流水线。`cyberpunk-company` 建模的是公司，包含组织结构、目标、预算与治理。 |
| **不是 prompt 管理器。** | 智能体自带自己的 prompt、模型与运行时。`cyberpunk-company` 管理的是它们所处的组织。 |
| **不是单智能体工具。** | 这是给团队准备的。如果你只有一个智能体，也许不需要 `cyberpunk-company`；如果你有二十个，那你一定需要。 |
| **不是代码评审工具。** | `cyberpunk-company` 编排工作，不编排 pull request。请自带你的评审流程。 |

<br/>

## Quickstart

开源，自托管，不需要 `cyberpunk-company` 账号。

```bash
npx cyberpunk-company onboard --yes
```

或者手动运行：

```bash
git clone https://github.com/cyberpunk-company/cyberpunk-company.git
cd cyberpunk-company
pnpm install
pnpm dev
```

这会在 `http://localhost:3100` 启动 API 服务。内嵌 PostgreSQL 数据库会自动创建，无需额外配置。

> **要求：** Node.js 20+，pnpm 9.15+

<br/>

## FAQ

**一个典型部署长什么样？**  
在本地，一个 Node.js 进程会管理内嵌 Postgres 和本地文件存储。在线上环境中，你可以接入自己的 Postgres，并按你喜欢的方式部署。配置 projects、agents 和 goals，剩下的事情交给智能体。

如果你是 solo entrepreneur，可以用 Tailscale 在外访问 `cyberpunk-company`。等你需要时，再部署到例如 Vercel。

**我可以运行多个公司吗？**  
可以。一次部署可以运行不限数量的公司，并保持完整数据隔离。

**`cyberpunk-company` 和 OpenClaw、Claude Code 这类智能体有什么区别？**  
`cyberpunk-company` 是在“使用”这些智能体。它把它们编排成一家公司，赋予组织结构、预算、目标、治理与责任。

**为什么不直接把 OpenClaw 指到 Asana 或 Trello？**  
智能体编排里有很多细节，比如如何协调任务 checkout、如何维持 session、如何监控成本、如何建立治理，`cyberpunk-company` 专门处理这些问题。

（支持自带 ticket system 已在 Roadmap 中）

**智能体会持续运行吗？**  
默认情况下，智能体通过计划 heartbeat 和事件触发（任务分配、@ 提及）运行。你也可以接入类似 OpenClaw 这种持续运行的智能体。你负责提供智能体，`cyberpunk-company` 负责协调。

<br/>

## 开发

```bash
pnpm dev              # 完整开发环境（API + UI，watch 模式）
pnpm dev:once         # 不监听文件的完整开发模式
pnpm dev:server       # 仅服务端
pnpm build            # 构建全部
pnpm typecheck        # 类型检查
pnpm test:run         # 运行测试
pnpm db:generate      # 生成 DB 迁移
pnpm db:migrate       # 应用迁移
```

完整开发说明见 [doc/DEVELOPING.md](doc/DEVELOPING.md)。

<br/>

## Roadmap

- ✅ 插件系统（例如知识库、自定义 tracing、队列等）
- ✅ 接入 OpenClaw / claw 风格智能体员工
- ✅ companies.sh：导入和导出整家公司组织
- ✅ 更容易配置的 AGENTS.md
- ✅ Skills Manager
- ✅ Scheduled Routines
- ✅ 更好的预算系统
- ⚪ Artifacts & Deployments
- ⚪ CEO Chat
- ⚪ MAXIMIZER MODE
- ⚪ 多人类用户
- ⚪ 云端 / 沙箱智能体（例如 Cursor / e2b agents）
- ⚪ 云端部署
- ⚪ 桌面应用

<br/>

## 社区与插件

更多插件和资源请看 [awesome-cyberpunk-company](https://github.com/gsxdsm/awesome-cyberpunk-company)。

## 参与贡献

欢迎贡献。详情见 [contributing guide](CONTRIBUTING.md)。

<br/>

## 社区

- [Discord](https://discord.gg/m4HZY7xNG3) — 加入社区
- [GitHub Issues](https://github.com/cyberpunk-company/cyberpunk-company/issues) — Bug 与功能请求
- [GitHub Discussions](https://github.com/cyberpunk-company/cyberpunk-company/discussions) — 想法与 RFC

<br/>

## 许可证

MIT &copy; 2026 cyberpunk-company

## Star History

[![Star History Chart](https://api.star-history.com/image?repos=cyberpunk-company/cyberpunk-company&type=date&legend=top-left)](https://www.star-history.com/?repos=cyberpunk-company%2Fcyberpunk-company&type=date&legend=top-left)

<br/>

---

<p align="center">
  <img src="doc/assets/footer.jpg" alt="" width="720" />
</p>

<p align="center">
  <sub>基于 MIT 开源。为想经营公司而不是看管智能体的人而构建。</sub>
</p>
