# Paperclip V2 演进规范

状态：当前系统实现全景  
日期：2026-04-11  
读者：产品、工程以及智能体集成作者  
输入来源：`SPEC.md`、`SPEC-implementation.md`、当前 monorepo 代码库

---

## 1. 文档角色

`SPEC.md` 是长期产品规范。`SPEC-implementation.md` 是 V1 实现契约。

本文件记录系统从 V1 基线到当前实际实现的 **全部演进**。它既是现状文档，也是后续迭代的起点。

当三份文件冲突时，以本文件为准（它反映最新代码库）。

---

## 2. 演进概览

V1 规范定义了一个以 company/agent/task 为核心的控制平面。实际演进远超 V1 范围，主要增量如下：

| 领域 | V1 状态 | 当前状态 |
|---|---|---|
| 插件系统 | 明确排除在 V1 范围外 | 完整实现：运行时、SDK、Job调度、Webhook、UI Bridge |
| 智能体适配器 | process + http 两种 | 7+ 种适配器（Claude/Codex/Cursor/Gemini/OpenCode/Pi/OpenClaw） |
| 公司技能系统 | 未定义 | 完整实现：技能创建、导入、扫描、同步 |
| 循环任务（Routines） | 未定义 | 完整实现：Cron调度、Webhook触发、并发策略 |
| 文档系统 | Schema 级别定义 | 完整实现：版本追踪、修订历史、工作流键 |
| 公司可移植性 | 概念设计（§21） | 完整实现：导入/导出、冲突策略、Dry-run |
| 标签系统 | 未定义 | 完整实现 |
| 工作产出物 | 未定义 | 完整实现：产出物追踪、审查状态 |
| 执行工作空间 | 概念级别 | 完整实现：工作空间生命周期、运行时服务、清理策略 |
| 权限授予系统 | 简单矩阵 | 完整实现：Principal 权限授予、细粒度能力控制 |
| 实时事件 | 明确排除在 V1 范围外 | 部分实现：Live Events、SSE 就绪 |

---

## 3. 插件系统

### 3.1 设计理念

插件系统将 Paperclip 从封闭控制平面升级为 **可扩展平台**。插件可以注册新的适配器类型、挂接生命周期事件、贡献 UI 组件、暴露自定义工具，并运行后台作业。

### 3.2 插件生命周期

```
installed → ready ↔ error
              ↓
         upgrade_pending → ready
              ↓
         uninstalled
```

- `installed`：插件已安装但尚未就绪
- `ready`：正常运行中
- `error`：运行时错误，可恢复
- `upgrade_pending`：等待升级完成
- `uninstalled`：已卸载

### 3.3 核心子系统

| 子系统 | 职责 |
|---|---|
| Plugin Registry | 插件注册、发现与元数据管理 |
| Plugin Lifecycle | 安装、启用、禁用、升级、卸载 |
| Plugin Loader | 从 npm 或本地路径加载插件包 |
| Plugin Manifest Validator | 验证插件清单的完整性与兼容性 |
| Plugin Worker Manager | 沙箱化工作进程管理 |
| Plugin Runtime Sandbox | 运行时隔离与安全边界 |
| Plugin Host Services | 宿主端服务注入 |
| Plugin Event Bus | 事件发布与订阅 |
| Plugin Job Scheduler | Cron 作业调度 |
| Plugin Job Store | 作业持久化 |
| Plugin Job Coordinator | 作业协调与去重 |
| Plugin Tool Registry | 工具注册与发现 |
| Plugin Tool Dispatcher | 工具调用分发 |
| Plugin Config Validator | 配置验证 |
| Plugin Secrets Handler | 密钥管理 |
| Plugin State Store | 插件状态持久化 |
| Plugin Stream Bus | SSE 流传输 |
| Plugin Log Retention | 日志保留策略 |

### 3.4 UI Bridge

插件可以通过 UI Bridge 与前端交互：

- `getData`：从插件获取数据供 UI 渲染
- `performAction`：从 UI 触发插件动作
- `SSE streaming`：插件向 UI 推送实时数据
- `UI Contributions`：插件注册全局工具栏按钮、页面等

### 3.5 Webhook 处理

- 入站 Webhook 路由自动路由到目标插件
- Webhook 投递追踪（投递状态、重试）
- 密钥签名验证

### 3.6 工具系统

插件可以注册自定义工具供智能体使用：

- 工具通过 Plugin Tool Registry 注册
- 智能体通过 API 发现可用工具
- 工具调用带上下文传递

### 3.7 数据模型

| 表 | 用途 |
|---|---|
| `plugins` | 插件注册与元数据 |
| `pluginConfig` | 插件配置存储 |
| `pluginState` | 插件运行时状态 |
| `pluginEntities` | 插件实体注册 |
| `pluginJobs` | 定时作业定义 |
| `pluginJobRuns` | 作业执行历史 |
| `pluginWebhookDeliveries` | Webhook 投递追踪 |
| `pluginCompanySettings` | 按公司的插件设置 |
| `pluginLogs` | 插件日志 |

---

## 4. 智能体适配器体系

### 4.1 适配器类型

V1 仅定义了 `process` 和 `http` 两种。当前系统支持：

| 适配器 | 机制 | 说明 |
|---|---|---|
| `claude_local` | 本地 Claude CLI 进程 | 最常用的本地智能体适配器 |
| `codex_local` | 本地 Codex CLI 进程 | OpenAI Codex 集成 |
| `cursor_local` | Cursor IDE 桥接 | Cursor 编辑器集成 |
| `gemini_local` | 本地 Gemini 进程 | Google Gemini 集成 |
| `opencode_local` | 本地 OpenCode 进程 | OpenCode 集成 |
| `pi_local` | 本地 Pi 进程 | Pi 模型集成 |
| `openclaw_gateway` | OpenClaw 网关 API | 托管式 OpenClaw 智能体 |
| `hermes_local` | 本地 Hermes 进程 | Hermes 智能体集成 |
| `process` | 通用子进程 | 任意 shell 命令 |
| `http` | HTTP 请求 | 外部 webhook |

### 4.2 适配器接口（不变）

```ts
interface AgentAdapter {
  invoke(agent: Agent, context: InvocationContext): Promise<InvokeResult>;
  status(run: HeartbeatRun): Promise<RunStatus>;
  cancel(run: HeartbeatRun): Promise<void>;
}
```

### 4.3 适配器公共工具层

`packages/adapter-utils` 提供所有适配器共享的功能：

- Heartbeat 协议实现
- 上下文格式化
- 任务会话管理
- 环境变量注入（`PAPERCLIP_*` 系列环境变量）

### 4.4 唤醒机制

智能体可以通过四种方式被唤醒：

| 触发源 | 说明 |
|---|---|
| `timer` | 定时间隔调度 |
| `assignment` | 任务分配/Checkout 时 |
| `on_demand` | 手动唤醒（UI 按钮 / API） |
| `automation` | 系统自动触发 |

当智能体已在运行时，新的唤醒请求会被合并（coalesce），不会启动重复的 run。

---

## 5. 公司技能系统

### 5.1 概念

技能是可复用的知识包，教会智能体如何与特定系统或领域交互。技能以 Markdown 格式定义（`SKILL.md`），包含规则、API 引用和工作流指南。

### 5.2 技能类型

| 类型 | 说明 |
|---|---|
| 本地技能 | 由智能体或用户直接创建 |
| 导入技能 | 从项目工作空间导入 |
| 扫描发现技能 | 从项目代码库自动发现 |

### 5.3 技能生命周期

- **创建**：通过 API 或 UI 创建技能定义
- **导入**：从现有项目扫描并导入
- **同步**：将技能分配给智能体（`POST /api/agents/{agentId}/skills/sync`）
- **更新**：修改技能定义文件
- **删除**：移除技能

### 5.4 技能与智能体的关系

- 智能体可以拥有多个技能
- 技能在 heartbeat 时通过上下文注入
- `desiredSkills` 可以在创建智能体时一并指定

### 5.5 数据模型

`companySkills` 表：按公司追踪技能的身份、状态与关联文件。

---

## 6. 循环任务系统（Routines）

### 6.1 概念

Routines 是周期性执行的任务定义。与一次性 Issues 不同，Routines 按照配置的调度策略反复生成并执行。

### 6.2 调度与触发

| 触发方式 | 说明 |
|---|---|
| Cron 表达式 | 标准 5 字段 cron 调度 |
| Webhook | 外部系统通过签名 webhook 触发 |
| 手动 | 通过 API 或 UI 手动触发 |

### 6.3 并发策略

| 策略 | 说明 |
|---|---|
| `sequential` | 等待当前 run 完成后再启动下一个 |
| `parallel` | 允许多个 run 同时执行 |
| `abort-previous` | 取消正在运行的 run，启动新的 |

### 6.4 错过执行策略

| 策略 | 说明 |
|---|---|
| `skip` | 跳过错过的执行 |
| `catch-up` | 补执行所有错过的时间点 |
| `replace-all` | 用一次执行替代所有错过的 |

### 6.5 Webhook 安全

- 触发器密钥自动轮换
- 请求签名验证
- 每个触发器独立密钥

### 6.6 数据模型

| 表 | 用途 |
|---|---|
| `routines` | 循环任务定义（标题、描述、指派人） |
| `routineTriggers` | 触发器配置（cron、webhook） |
| `routineRuns` | 执行历史 |

---

## 7. 文档系统

### 7.1 概念

Issue Documents 是附着在任务上的结构化文档，用于记录计划、设计、分析、笔记等长文本内容。区别于评论（短交流），文档是可持续编辑和版本追踪的知识载体。

### 7.2 核心特性

- **工作流键**：每个文档通过 `key`（如 `plan`、`design`、`notes`）与 Issue 关联
- **版本追踪**：每次修改生成新的 revision，完整历史可查
- **格式支持**：当前支持 Markdown
- **多文档**：单个 Issue 可以附着多个不同键的文档
- **创建者追踪**：记录创建和最后修改者（智能体或用户）

### 7.3 API 契约

| 端点 | 说明 |
|---|---|
| `GET /issues/:id/documents` | 列出 Issue 的所有文档 |
| `GET /issues/:id/documents/:key` | 获取指定文档 |
| `PUT /issues/:id/documents/:key` | 创建或更新文档 |
| `GET /issues/:id/documents/:key/revisions` | 获取文档修订历史 |
| `DELETE /issues/:id/documents/:key` | 删除文档 |

### 7.4 数据模型

| 表 | 用途 |
|---|---|
| `documents` | 文档主体（标题、格式、最新正文） |
| `documentRevisions` | 只追加的修订历史 |
| `issueDocuments` | Issue 与文档的关联映射（含工作流键） |

---

## 8. 公司可移植性

### 8.1 概念

公司可移植性允许将整个公司的配置、组织结构、项目和任务导出为可移植的 Markdown 包，并支持导入到新环境或已有公司中。

### 8.2 包结构

```
COMPANY.md              # 公司定义（vendor-neutral）
.paperclip.yaml         # Paperclip 特定保真信息（sidecar）
agents/
  <slug>/AGENTS.md      # 智能体定义
teams/
  <slug>/TEAM.md        # 团队定义
projects/
  <slug>/PROJECT.md     # 项目定义
  <slug>/tasks/
    <slug>/TASK.md      # 项目任务
tasks/
  <slug>/TASK.md        # 独立任务
skills/
  <slug>/SKILL.md       # 技能定义
```

### 8.3 导出行为

- 输出干净、vendor-neutral 的 Markdown 包
- 附带 `.paperclip.yaml` sidecar 保存 Paperclip 特定元数据
- 生成组织架构 SVG 图
- 移除环境相关路径（`cwd`、本地指令文件路径）
- 保留可移植的项目工作空间元数据（`repoUrl`、refs）
- **永不导出密钥值**；环境变量仅以声明形式报告
- 项目和任务是按需导出内容（非默认）
- 周期性任务使用 `recurring: true` 标记

### 8.4 导入行为

| 特性 | 说明 |
|---|---|
| 目标模式 | 创建新公司 / 导入到已有公司 |
| 冲突策略 | `rename`、`skip`、`replace` |
| Dry-run 预览 | 导入前预览变更 |
| 工作空间重映射 | 可移植 key 映射到目标本地 workspace |
| Heartbeat 暂停 | 导入后自动关闭定时 heartbeat，防止隐式执行 |
| 循环任务转换 | `recurring: true` 的任务导入为 Routines |
| GitHub ref 警告 | 对未固定的 ref 发出警告但不阻塞 |
| 事务性 | 原子化导入，失败时完整回滚 |

### 8.5 安全导入（CEO 安全路由）

- `POST /api/companies/{companyId}/imports/preview`
- `POST /api/companies/{companyId}/imports/apply`
- 现有公司导入为非破坏性
- 冲突解决不允许 `replace`（仅 `rename` 或 `skip`）
- Issues 始终创建为新任务
- CEO 智能体可以使用安全路由创建新公司

---

## 9. 标签系统

### 9.1 概念

标签（Labels）提供对 Issues 的分类和过滤能力。标签在公司级别定义，可应用于任意数量的 Issues。

### 9.2 特性

- 标签名称 + 颜色
- 多对多关系（一个 Issue 可有多个标签）
- 按标签过滤 Issues
- 公司作用域隔离

### 9.3 数据模型

| 表 | 用途 |
|---|---|
| `labels` | 标签定义（名称、颜色、公司 ID） |
| `issueLabels` | Issue 与标签的多对多映射 |

---

## 10. 工作产出物系统

### 10.1 概念

工作产出物（Work Products）追踪智能体在执行任务过程中产生的可交付物。产出物可以是代码变更、文档、部署、预览环境等。

### 10.2 核心特性

- **类型与提供者**：按类型（如 code、document、deployment）和提供者分类
- **状态追踪**：产出物自身的完成状态
- **审查状态**：是否已审查、审查结果
- **健康监控**：产出物的运行时健康状态
- **主产出物**：每个 Issue 可以指定一个主产出物
- **外部 ID**：映射到外部系统的标识符
- **关联执行工作空间**：产出物与执行环境的关联

### 10.3 数据模型

`issueWorkProducts` 表：

| 字段 | 说明 |
|---|---|
| `type` | 产出物类型 |
| `provider` | 提供者标识 |
| `status` | 当前状态 |
| `reviewState` | 审查状态 |
| `healthStatus` | 健康状态 |
| `isPrimary` | 是否为主产出物 |
| `externalId` | 外部系统 ID |
| `metadata` | 扩展元数据（JSON） |

---

## 11. 执行工作空间

### 11.1 概念

执行工作空间（Execution Workspaces）是智能体实际执行工作的隔离环境。每个项目可以有多个执行工作空间，工作空间管理代码克隆、环境配置、运行时服务和清理。

### 11.2 工作空间生命周期

```
created → active → archived
                     ↓
               cleanup_failed
```

### 11.3 核心特性

| 特性 | 说明 |
|---|---|
| 项目工作空间策略 | 每个项目定义工作空间创建与复用策略 |
| 运行时服务管理 | 容器/进程的生命周期管理 |
| 环境变量处理 | 工作空间级别的环境配置 |
| 服务发现 | 工作空间内服务的发现与访问 |
| 清理策略 | 可配置的拆除命令与清理流程 |
| Issue 关联 | 工作空间与 Issue 的关联管理 |

### 11.4 项目工作空间策略

项目可以定义 `executionWorkspacePolicy`，控制：

- 工作空间创建策略（按任务创建 / 复用已有）
- 拆除命令
- 工作空间复用条件

### 11.5 数据模型

| 表 | 用途 |
|---|---|
| `executionWorkspaces` | 执行工作空间定义 |
| `projectWorkspaces` | 项目与工作空间的关联 |
| `workspaceRuntimeServices` | 运行时服务状态 |
| `workspaceOperations` | 工作空间操作记录 |

---

## 12. 权限与访问控制

### 12.1 概念

V2 权限系统从 V1 的简单矩阵演进为基于 **Principal 权限授予** 的细粒度能力控制系统。

### 12.2 权限模型

```
Principal (用户 / 智能体 / 系统)
  └── Permission Grant
        ├── action (如 agents:create, tasks:assign)
        ├── scope (company)
        └── conditions (可选)
```

### 12.3 权限类别

| 类别 | 说明 |
|---|---|
| Board 权限 | 完整读写权限，包括治理操作 |
| Agent 权限 | 范围化的 API 访问（自身任务、公司上下文） |
| Instance Admin | 实例级别管理员覆盖 |
| 委托权限 | 通过 `principalPermissionGrants` 授予的额外能力 |

### 12.4 认证机制

| 机制 | 用途 |
|---|---|
| Board Session | 人类操作员的 session 认证 |
| Agent API Key | 智能体的 Bearer token（hash 存储） |
| Agent JWT | 短生命周期的运行时 JWT |
| Board API Key | 面向 API 的 Board 认证 |
| CLI Auth Challenge | CLI 工具的认证握手 |

### 12.5 数据模型

| 表 | 用途 |
|---|---|
| `principalPermissionGrants` | 权限授予记录 |
| `boardApiKeys` | Board API 密钥 |
| `cliAuthChallenges` | CLI 认证挑战 |
| `agentApiKeys` | 智能体 API 密钥 |

---

## 13. 审批系统（扩展）

### 13.1 V1 基线

V1 支持两种审批类型：`hire_agent` 和 `approve_ceo_strategy`。

### 13.2 V2 扩展

- **审批评论**：审批流程中的独立评论系统
- **修订请求**：`revision_requested` 状态，允许请求者修改后重新提交
- **Issue 审批**：任务级别的审批工作流
- **审批历史**：完整的审批决策追踪

### 13.3 审批状态机

```
pending → approved
       → rejected
       → revision_requested → pending (重新提交)
       → cancelled
```

### 13.4 数据模型

| 表 | 用途 |
|---|---|
| `approvals` | 审批请求 |
| `approvalComments` | 审批评论 |
| `issueApprovals` | 任务级别的审批关联 |

---

## 14. 成本与预算系统（扩展）

### 14.1 V1 基线

V1 支持 company/agent 两级预算、成本事件写入和硬上限自动暂停。

### 14.2 V2 扩展

#### 14.2.1 三级预算层级

| 层级 | 说明 |
|---|---|
| Company | 公司月度总预算 |
| Agent | 智能体月度预算 |
| Project | 项目预算（可选） |

#### 14.2.2 预算策略

`budgetPolicies` 表支持可配置的预算规则：

- 消费限额定义
- 执行策略（软提醒 / 硬停止）
- 限额周期配置

#### 14.2.3 预算事件

`budgetIncidents` 表追踪预算违规事件：

- 超支事件记录
- 事件解决追踪
- 暂停/恢复触发

#### 14.2.4 财务事件

`financeEvents` 表支持超出 token 成本的财务追踪（为未来扩展预留）。

---

## 15. Issue 管理（扩展）

### 15.1 V1 基线

V1 定义了 Issue 的基本 CRUD、状态机、原子 Checkout 和评论系统。

### 15.2 V2 扩展特性

| 特性 | 说明 |
|---|---|
| 阅读状态追踪 | 追踪每个用户/智能体对每个 Issue 的阅读状态 |
| 收件箱归档 | 允许归档不再需要关注的 Issue |
| Issue 审批 | 任务级别的审批工作流 |
| 工作产出物关联 | Issue 与可交付物的关联 |
| 文档附着 | 结构化文档（plan、design 等） |
| 文件附件 | 二进制文件上传与关联 |
| 目标回退 | `issue-goal-fallback` 自动推导 Issue 的目标关联 |
| 分配唤醒 | 任务分配时自动唤醒目标智能体 |
| Checkout 唤醒 | Checkout 事件触发通知 |
| 祖先追踪 | Issue 层级链路的高效查询 |
| 搜索 | 全文搜索（标题、标识符、描述、评论） |
| Heartbeat 上下文 | `GET /issues/:id/heartbeat-context` 紧凑上下文端点 |

### 15.3 数据模型（新增表）

| 表 | 用途 |
|---|---|
| `issueReadStates` | 阅读状态追踪 |
| `issueInboxArchives` | 收件箱归档 |
| `issueWorkProducts` | 工作产出物关联 |
| `issueDocuments` | 文档关联 |
| `issueAttachments` | 文件附件关联 |
| `issueApprovals` | 任务审批 |
| `issueLabels` | 标签关联 |

---

## 16. 智能体管理（扩展）

### 16.1 V2 扩展特性

| 特性 | 说明 |
|---|---|
| 指令系统 | Markdown 格式的智能体指令（`AGENTS.md`），支持路径配置 |
| 权限管理 | 细粒度的智能体权限配置 |
| 任务会话 | 追踪智能体的任务执行会话 |
| 唤醒请求 | 智能体唤醒请求队列与合并 |
| 运行时状态 | 持久化的运行时状态（session ID、token 用量） |
| 配置修订 | 智能体配置的版本追踪 |
| 入职资产 | 按角色自定义的入职材料 |
| OpenClaw 集成 | OpenClaw 邀请与入职流程 |
| 短名称冲突检测 | URL-safe 短名称的唯一性校验 |

### 16.2 数据模型（新增表）

| 表 | 用途 |
|---|---|
| `agentTaskSessions` | 任务执行会话 |
| `agentWakeupRequests` | 唤醒请求队列 |
| `agentRuntimeState` | 运行时状态持久化 |
| `agentConfigRevisions` | 配置修订历史 |

---

## 17. 仪表盘与可观测性

### 17.1 Dashboard 聚合

`GET /api/companies/{companyId}/dashboard` 返回：

- 智能体状态摘要（active/running/paused/error 计数）
- 任务状态摘要（open/in_progress/blocked/done 计数）
- 当月累计支出与预算利用率
- 预算告警与事件
- 暂停的智能体/项目计数
- 待处理审批计数

### 17.2 侧边栏徽标

实时徽标系统，显示：

- 可操作的审批数量
- 失败的 Heartbeat Run 数量
- 加入请求数量
- 未读的相关 Issue 数量

### 17.3 Activity Log

- 覆盖所有实体的修改操作
- 支持按公司、实体类型、时间范围过滤
- 结构化 JSON 详情

---

## 18. 实时事件系统

### 18.1 当前状态

- `live-events` 服务提供全局事件发布
- Plugin Stream Bus 支持 SSE
- WebSocket 架构就绪但未完全暴露

### 18.2 事件类型

- 智能体状态变更
- 任务状态变更
- Heartbeat Run 开始/完成
- 审批状态变更
- 预算事件
- 插件事件

---

## 19. 项目与工作空间管理

### 19.1 项目工作空间

每个项目可以关联多个工作空间：

- **本地工作空间**：`cwd` 指定本地目录
- **远程仓库**：`repoUrl` 指定 Git 仓库
- **混合模式**：同时指定 `cwd` 和 `repoUrl`

### 19.2 工作空间策略

项目可以定义执行工作空间策略：

- 工作空间创建规则
- 工作空间复用条件
- 清理策略

---

## 20. OpenClaw 集成

### 20.1 概念

OpenClaw 是外部的智能体运行时。Paperclip 通过 `openclaw_gateway` 适配器与 OpenClaw 集成。

### 20.2 入职流程

1. CEO 智能体调用 `POST /api/companies/{companyId}/openclaw/invite-prompt` 生成邀请提示
2. Board 将提示粘贴到 OpenClaw
3. OpenClaw 提交加入请求
4. Board 审批加入请求
5. 新智能体完成 API Key 申领和技能安装

### 20.3 权限

- 仅 Board 用户（具有邀请权限）和 CEO 智能体可以调用邀请生成端点

---

## 21. 实例设置与 LLM 管理

### 21.1 实例设置

`GET/POST /api/instance-settings` 管理系统级配置：

- 公司级自定义
- 实例默认值
- 环境基础配置

### 21.2 LLM 提供者发现

`GET /api/llms` 端点用于发现可用的 LLM 提供者和模型。

---

## 22. 文件存储与附件

### 22.1 存储后端

| 后端 | 说明 |
|---|---|
| `local_disk` | 本地磁盘存储（默认） |
| `s3` | S3 兼容对象存储 |

### 22.2 附件工作流

1. 通过 `POST /api/companies/{companyId}/issues/{issueId}/attachments` 上传（multipart）
2. Asset 元数据写入 `assets` 表
3. 关联关系写入 `issueAttachments` 表
4. 通过 `GET /api/attachments/{attachmentId}/content` 获取内容

### 22.3 安全

- 内容类型验证
- SHA256 校验和
- 公司作用域隔离
- 创建者追踪

---

## 23. 搜索

### 23.1 Issue 搜索

`GET /api/companies/{companyId}/issues?q=search+term` 支持：

- 标题匹配（最高优先级）
- 标识符匹配
- 描述匹配
- 评论匹配
- 可与其他过滤器组合（`status`、`assigneeAgentId`、`projectId`、`labelId`）

---

## 24. 数据模型完整清单

以下是当前系统的全部数据表（相比 V1 规范新增的用 ✦ 标记）：

### 核心实体
- `companies`
- `agents`
- `agentApiKeys`
- `goals`
- `projects`
- `issues`
- `issueComments`

### 治理
- `approvals`
- ✦ `approvalComments`
- ✦ `issueApprovals`

### 成本与预算
- `costEvents`
- ✦ `budgetPolicies`
- ✦ `budgetIncidents`
- ✦ `financeEvents`

### 运行时
- `heartbeatRuns`
- ✦ `agentTaskSessions`
- ✦ `agentWakeupRequests`
- ✦ `agentRuntimeState`
- ✦ `agentConfigRevisions`

### 文档与附件
- ✦ `documents`
- ✦ `documentRevisions`
- ✦ `issueDocuments`
- `assets`
- `issueAttachments`

### 工作空间
- ✦ `executionWorkspaces`
- ✦ `projectWorkspaces`
- ✦ `workspaceRuntimeServices`
- ✦ `workspaceOperations`

### 插件
- ✦ `plugins`
- ✦ `pluginConfig`
- ✦ `pluginState`
- ✦ `pluginEntities`
- ✦ `pluginJobs`
- ✦ `pluginJobRuns`
- ✦ `pluginWebhookDeliveries`
- ✦ `pluginCompanySettings`
- ✦ `pluginLogs`

### 技能与标签
- ✦ `companySkills`
- ✦ `labels`
- ✦ `issueLabels`

### 循环任务
- ✦ `routines`
- ✦ `routineTriggers`
- ✦ `routineRuns`

### 工作产出物
- ✦ `issueWorkProducts`

### Issue 扩展
- ✦ `issueReadStates`
- ✦ `issueInboxArchives`

### 权限
- ✦ `principalPermissionGrants`
- ✦ `boardApiKeys`
- ✦ `cliAuthChallenges`

### 密钥管理
- `companySecrets`
- `companySecretVersions`

### 审计
- `activityLog`

### 认证（Better Auth 管理）
- `users`
- `sessions`

---

## 25. 架构原则（延续 + 新增）

### 延续自 V1

1. **运行时无关**：Paperclip 编排，不执行
2. **Company 作用域**：所有实体严格隔离
3. **任务即通信**：所有沟通流经 tasks + comments
4. **工作追溯目标**：分层管理，无孤立任务
5. **Board 治理**：人类保持控制
6. **问题可见**：审计与可观测，不静默自愈
7. **原子所有权**：单一指派、原子 Checkout
8. **渐进部署**：本地起步，云端就绪

### V2 新增

9. **平台可扩展**：通过插件系统扩展能力，核心保持精简
10. **适配器生态**：从 2 种到 7+ 种适配器，覆盖主流 AI 运行时
11. **知识可复用**：技能系统让智能体知识可共享和标准化
12. **公司可移植**：完整的导入/导出支持公司模板化和复制
13. **循环自动化**：Routines 系统支持周期性工作的自动化
14. **产出物追踪**：从任务管理延伸到交付物管理
15. **工作空间隔离**：执行环境的生命周期管理

---

## 26. 反需求（更新）

V1 反需求仍然成立，新增以下约束：

- **不是 CI/CD 系统**：工作空间管理服务于智能体执行，不是构建管道
- **不是代码托管**：只追踪工作空间引用，不存储代码仓库
- **不是文件系统**：文档系统面向工作流文档，不是通用文件管理
- **插件不是微服务**：插件在宿主进程内运行，不是独立部署单元
- **技能不是训练**：技能是运行时上下文注入，不是模型微调

---

## 27. 与 V1 规范的差异摘要

| V1 规范声明 | 当前实际 |
|---|---|
| "插件框架不在 V1 范围内" | 已完整实现，含 SDK、运行时、UI Bridge |
| "仅 process + http 适配器" | 7+ 种内建适配器 |
| "实时传输优化延期" | Live Events 已实现，SSE 就绪 |
| "简单权限矩阵" | Principal 权限授予系统 |
| "预算仅 company + agent 两级" | 三级预算（company/agent/project） |
| "审批仅 pending/approved/rejected" | 增加 revision_requested 和审批评论 |
| "标签/依赖图延期" | 标签系统已实现 |
| "公司可移植包为概念设计" | 最大的服务实现（165KB） |

---

## 28. 未来方向（基于当前架构的自然延伸）

1. **分布式执行**：跨主机的工作进程调度
2. **多 Board 治理**：多成员董事会，投票机制
3. **ClipHub 市场**：公共的公司模板市场
4. **知识库插件**：基于插件系统的知识管理
5. **高级搜索**：向量搜索与语义检索
6. **WebSocket 实时推送**：从 SSE 升级到 WebSocket
7. **插件市场**：插件的发现、安装与评价
8. **跨公司协作**：公司间的任务委派与计费

---

## 29. 上下文管理与缓存优化

基于 Claude Code v2.1.88 源码分析（详见 `CLAUDE_CODE_ARCHITECTURE_ANALYSIS.md`），本章节定义 Paperclip 的上下文管理架构方向。

### 29.1 设计理念

智能体每次 heartbeat 消耗的 token 是平台运营的核心成本驱动因素。上下文管理的目标是：**在不损失任务完成质量的前提下，最小化每次 heartbeat 的 token 消耗。**

核心原则：
- **稳定上下文应被缓存**：角色定义、行为准则、流程说明等不应每次重新处理
- **增量优于全量**：heartbeat 应只消费自上次有效执行以来的变化
- **渐进压缩优于硬截断**：上下文超限时应分级降级，而非直接丢弃
- **缓存效率可度量**：平台应跟踪并优化 prompt cache hit rate

### 29.2 上下文分层模型

Paperclip 将智能体上下文分为四层，每层有不同的缓存特性：

| 层级 | 内容 | 缓存特性 | 更新频率 |
|------|------|----------|----------|
| L0: 角色层 | 身份、职责、行为准则、核心规则 | 跨 heartbeat 可缓存（静态区） | 极低（仅指令文件变更时） |
| L1: 技能层 | Paperclip Skill、API 文档、流程说明 | 跨 session 可缓存 | 低（技能更新时） |
| L2: 任务层 | 当前任务状态、祖先链、项目目标 | 跨同任务 heartbeat 可缓存 | 中（任务状态变更时） |
| L3: 运行层 | 唤醒原因、新评论、审批状态 | 不可缓存（每次 heartbeat 变化） | 高（每次 heartbeat） |

### 29.3 适配器缓存接口（规划）

```typescript
interface ContextBudgeter {
  /** 估算各层 token 数 */
  estimateTokens(context: HeartbeatContext): LayerTokenEstimate;
  
  /** 当总 token 超出预算时，按层级降级 */
  applyBudget(context: HeartbeatContext, budgetTokens: number): BudgetedContext;
  
  /** 报告缓存效率 */
  reportCacheMetrics(runUsage: RunUsage): CacheMetrics;
}

interface CacheMetrics {
  cacheHitRate: number;        // cachedInputTokens / totalInputTokens
  staticZoneTokens: number;    // L0 + L1 估算
  dynamicZoneTokens: number;   // L2 + L3 估算
  volatilityScore: number;     // 动态区占比，越低越好
}
```

### 29.4 Session Carry-Forward 摘要模板

Session rotation 时生成的结构化摘要应包含以下段落（参考 Claude Code 的 9 段 compact 模板）：

1. **Primary Objective**：当前任务的核心目标
2. **Work Completed**：本 session 完成的工作项
3. **Key Decisions**：做出的关键技术/产品决策
4. **Files & Artifacts**：创建或修改的文件/产出物
5. **Errors & Resolutions**：遇到的错误及修复方式
6. **Pending Tasks**：未完成的子任务
7. **Blockers**：当前阻塞项及需要谁解除
8. **Recommended Next Action**：建议的下一步操作

生成摘要时应使用 scratchpad 模式：先在 `<analysis>` 标签中推理分析，再在 `<summary>` 标签中输出结构化摘要。`<analysis>` 内容不进入最终 carry-forward context。

### 29.5 缓存效率度量

`costService` 应新增以下计算指标：

- `cacheHitRate`：按 agent 维度的月度缓存命中率
- `contextVolatility`：动态区 token 占总 token 的比例
- `sessionReuseRate`：session 复用率（按唤醒源分类）

Dashboard 应展示缓存效率趋势，并在 `cacheHitRate < 0.2` 时生成告警。

### 29.6 与现有系统的关系

- **Token Optimization Plan**（`doc/plans/2026-03-13-TOKEN-OPTIMIZATION-PLAN.md`）中的 Phase 1-6 是执行路径，本章节是架构约束
- **Session Compaction**（`adapter-utils/session-compaction.ts`）中的 `evaluateSessionCompaction()` 应实现 §29.4 的摘要模板
- **Heartbeat Context API**（`GET /api/issues/:id/heartbeat-context`）已实现 L2/L3 的紧凑获取，未来应支持 L0/L1 的缓存指示
