# Paperclip V1 实现规范

状态：首个版本（V1）的实现契约  
日期：2026-02-17  
读者：产品、工程以及智能体集成作者  
输入来源：`GOAL.md`、`PRODUCT.md`、`SPEC.md`、`DATABASE.md`、当前 monorepo 代码

## 1. 文档角色

`SPEC.md` 仍然是长期产品规范。  
本文件是面向实现、可直接构建的 V1 具体契约。  
当两者冲突时，V1 以 `SPEC-implementation.md` 为准。

## 2. V1 目标结果

Paperclip V1 必须为自治智能体提供完整的控制平面闭环：

1. 人类董事会创建 company 并定义 goals。
2. 董事会在组织树中创建和管理 agents。
3. Agents 通过 heartbeat 调用接收并执行 tasks。
4. 所有工作都通过 tasks/comments 被追踪，并具备审计可见性。
5. Token/成本使用情况可被上报，预算限制可以停止工作。
6. 董事会可以在任意位置介入（暂停 agent/task、覆盖决策）。

成功的标准是：一个操作员可以端到端运行一家小型 AI-native company，并始终保持清晰的可见性与控制力。

## 3. V1 的明确产品决策

这些决策用于在 V1 范围内关闭 `SPEC.md` 中尚未定案的问题。

| 主题 | V1 决策 |
|---|---|
| Tenancy | 单租户部署，多 company 数据模型 |
| Company model | Company 是一等对象；所有业务实体都带有 company 作用域 |
| Board | 每个部署仅有一个人类董事会操作员 |
| Org graph | 严格树形结构（`reports_to` 可为空作为根）；不支持多经理汇报 |
| Visibility | 董事会和同一 company 内所有 agents 完全可见 |
| Communication | 仅使用 tasks + comments（无独立聊天系统） |
| Task ownership | 单一 assignee；进入 `in_progress` 必须原子 checkout |
| Recovery | 不做自动重新分配；恢复工作保持手动且显式 |
| Agent adapters | 内建 `process` 和 `http` adapters |
| Auth | 人类鉴权依模式决定（当前代码中 `local_trusted` 隐式视为 board；`authenticated` 使用 sessions），agents 使用 API keys |
| Budget period | UTC 自然月窗口 |
| Budget enforcement | 软提醒 + 达到硬上限后自动暂停 |
| Deployment modes | 规范模型是 `local_trusted` + `authenticated`，并带有 `private/public` 暴露策略（见 `doc/DEPLOYMENT-MODES.md`） |

## 4. 当前基线（仓库快照）

截至 2026-02-17，仓库已包含：

- 基于 Node + TypeScript 的后端，提供 `agents`、`projects`、`goals`、`issues`、`activity` 的 REST CRUD
- React UI 页面，覆盖 dashboard/agents/projects/goals/issues 列表
- 通过 Drizzle 定义的 PostgreSQL schema；当 `DATABASE_URL` 未设置时使用内嵌 PostgreSQL 作为回退

V1 实现将在这个基础上，扩展为一个以 company 为中心、具备治理意识的控制平面。

## 5. V1 范围

## 5.1 包含在范围内

- Company 生命周期（create/list/get/update/archive）
- 与公司使命关联的目标层级
- 带有组织结构与 adapter 配置的 agent 生命周期
- 带有父子层级与 comments 的 task 生命周期
- 原子 checkout 和显式 task 状态流转
- 招聘与 CEO 战略提案的董事会审批
- Heartbeat 调用、状态追踪和取消
- 成本事件写入与汇总（agent/task/project/company）
- 预算设置与硬停止执行
- 董事会 Web UI：dashboard、org chart、tasks、agents、approvals、costs
- 面向 agent 的 API 契约（task 读写、heartbeat 上报、成本上报）
- 对所有修改操作可审计的 activity log

## 5.2 不包含在范围内（V1）

- 插件框架与第三方扩展 SDK
- 除模型/token 成本之外的收入/费用会计
- 知识库子系统
- 公共市场（ClipHub）
- 多董事会治理或细粒度人类权限系统
- 自动自愈编排（自动重分配/自动重试计划器）

## 6. 架构

## 6.1 运行时组件

- `server/`：REST API、auth、编排服务
- `ui/`：董事会操作界面
- `packages/db/`：Drizzle schema、迁移、DB client（Postgres）
- `packages/shared/`：共享 API 类型、校验器与常量

## 6.2 数据存储

- 主存储：PostgreSQL
- 本地默认：内嵌 PostgreSQL，路径 `~/.paperclip/instances/default/db`
- 可选本地类生产：Docker Postgres
- 可选托管：Supabase/Postgres 兼容服务
- 文件/对象存储：
  - 本地默认：`~/.paperclip/instances/default/data/storage`（`local_disk`）
  - 云端：S3 兼容对象存储（`s3`）

## 6.3 后台处理

服务端进程内的轻量 scheduler/worker 负责：

- heartbeat 触发检查
- 卡住 run 的检测
- 预算阈值检查

V1 不要求独立队列基础设施。

## 7. 规范数据模型（V1）

除非另有说明，所有核心表都包含 `id`、`created_at`、`updated_at`。

## 7.0 Auth 表

人类鉴权相关表（`users`、`sessions` 以及 provider 特定的 auth 产物）由所选 auth 库管理。本规范把它们视为必要依赖，并在需要用户归因的地方引用 `users.id`。

## 7.1 `companies`

- `id` uuid pk
- `name` text not null
- `description` text null
- `status` enum: `active | paused | archived`

不变量：每一条业务记录都且仅都属于一个 company。

## 7.2 `agents`

- `id` uuid pk
- `company_id` uuid fk `companies.id` not null
- `name` text not null
- `role` text not null
- `title` text null
- `status` enum: `active | paused | idle | running | error | terminated`
- `reports_to` uuid fk `agents.id` null
- `capabilities` text null
- `adapter_type` enum: `process | http`
- `adapter_config` jsonb not null
- `context_mode` enum: `thin | fat` default `thin`
- `budget_monthly_cents` int not null default 0
- `spent_monthly_cents` int not null default 0
- `last_heartbeat_at` timestamptz null

不变量：

- agent 与其 manager 必须属于同一个 company
- 汇报树中不能出现环
- `terminated` 状态的 agents 不能恢复

## 7.3 `agent_api_keys`

- `id` uuid pk
- `agent_id` uuid fk `agents.id` not null
- `company_id` uuid fk `companies.id` not null
- `name` text not null
- `key_hash` text not null
- `last_used_at` timestamptz null
- `revoked_at` timestamptz null

不变量：明文 key 只在创建时展示一次；数据库只存 hash。

## 7.4 `goals`

- `id` uuid pk
- `company_id` uuid fk not null
- `title` text not null
- `description` text null
- `level` enum: `company | team | agent | task`
- `parent_id` uuid fk `goals.id` null
- `owner_agent_id` uuid fk `agents.id` null
- `status` enum: `planned | active | achieved | cancelled`

不变量：每个 company 至少有一个根级别 `company` goal。

## 7.5 `projects`

- `id` uuid pk
- `company_id` uuid fk not null
- `goal_id` uuid fk `goals.id` null
- `name` text not null
- `description` text null
- `status` enum: `backlog | planned | in_progress | completed | cancelled`
- `lead_agent_id` uuid fk `agents.id` null
- `target_date` date null

## 7.6 `issues`（核心任务实体）

- `id` uuid pk
- `company_id` uuid fk not null
- `project_id` uuid fk `projects.id` null
- `goal_id` uuid fk `goals.id` null
- `parent_id` uuid fk `issues.id` null
- `title` text not null
- `description` text null
- `status` enum: `backlog | todo | in_progress | in_review | done | blocked | cancelled`
- `priority` enum: `critical | high | medium | low`
- `assignee_agent_id` uuid fk `agents.id` null
- `created_by_agent_id` uuid fk `agents.id` null
- `created_by_user_id` uuid fk `users.id` null
- `request_depth` int not null default 0
- `billing_code` text null
- `started_at` timestamptz null
- `completed_at` timestamptz null
- `cancelled_at` timestamptz null

不变量：

- 只能有一个 assignee
- 任务必须通过 `goal_id`、`parent_id` 或 project-goal 关联链路追溯到 company goal
- `in_progress` 必须有 assignee
- 终止态：`done | cancelled`

## 7.7 `issue_comments`

- `id` uuid pk
- `company_id` uuid fk not null
- `issue_id` uuid fk `issues.id` not null
- `author_agent_id` uuid fk `agents.id` null
- `author_user_id` uuid fk `users.id` null
- `body` text not null

## 7.8 `heartbeat_runs`

- `id` uuid pk
- `company_id` uuid fk not null
- `agent_id` uuid fk not null
- `invocation_source` enum: `scheduler | manual | callback`
- `status` enum: `queued | running | succeeded | failed | cancelled | timed_out`
- `started_at` timestamptz null
- `finished_at` timestamptz null
- `error` text null
- `external_run_id` text null
- `context_snapshot` jsonb null

## 7.9 `cost_events`

- `id` uuid pk
- `company_id` uuid fk not null
- `agent_id` uuid fk `agents.id` not null
- `issue_id` uuid fk `issues.id` null
- `project_id` uuid fk `projects.id` null
- `goal_id` uuid fk `goals.id` null
- `billing_code` text null
- `provider` text not null
- `model` text not null
- `input_tokens` int not null default 0
- `output_tokens` int not null default 0
- `cost_cents` int not null
- `occurred_at` timestamptz not null

不变量：每个事件都必须关联到 agent 和 company；rollup 仅通过聚合计算，绝不手工编辑。

## 7.10 `approvals`

- `id` uuid pk
- `company_id` uuid fk not null
- `type` enum: `hire_agent | approve_ceo_strategy`
- `requested_by_agent_id` uuid fk `agents.id` null
- `requested_by_user_id` uuid fk `users.id` null
- `status` enum: `pending | approved | rejected | cancelled`
- `payload` jsonb not null
- `decision_note` text null
- `decided_by_user_id` uuid fk `users.id` null
- `decided_at` timestamptz null

## 7.11 `activity_log`

- `id` uuid pk
- `company_id` uuid fk not null
- `actor_type` enum: `agent | user | system`
- `actor_id` uuid/text not null
- `action` text not null
- `entity_type` text not null
- `entity_id` uuid/text not null
- `details` jsonb null
- `created_at` timestamptz not null default now()

## 7.12 `company_secrets` + `company_secret_versions`

- 密钥值不得以内联形式存储在 `agents.adapter_config.env` 中。
- 智能体环境变量中的敏感值应该使用 secret ref。
- `company_secrets` 负责按 company 追踪密钥身份与 provider 元数据。
- `company_secret_versions` 负责按版本存储加密内容或引用内容。
- 本地部署默认 provider：`local_encrypted`。

操作策略：

- 配置读取 API 必须脱敏敏感明文值。
- Activity 与 approval payload 中不得持久化原始敏感值。
- 配置修订中可以保留脱敏占位符；对被脱敏字段而言，这种修订不可恢复。

## 7.13 必需索引

- `agents(company_id, status)`
- `agents(company_id, reports_to)`
- `issues(company_id, status)`
- `issues(company_id, assignee_agent_id, status)`
- `issues(company_id, parent_id)`
- `issues(company_id, project_id)`
- `cost_events(company_id, occurred_at)`
- `cost_events(company_id, agent_id, occurred_at)`
- `heartbeat_runs(company_id, agent_id, started_at desc)`
- `approvals(company_id, status, type)`
- `activity_log(company_id, created_at desc)`
- `assets(company_id, created_at desc)`
- `assets(company_id, object_key)` unique
- `issue_attachments(company_id, issue_id)`
- `company_secrets(company_id, name)` unique
- `company_secret_versions(secret_id, version)` unique

## 7.14 `assets` + `issue_attachments`

- `assets` 存储由 provider 支撑的对象元数据（不是内联字节）：
  - `id` uuid pk
  - `company_id` uuid fk not null
  - `provider` enum/text (`local_disk | s3`)
  - `object_key` text not null
  - `content_type` text not null
  - `byte_size` int not null
  - `sha256` text not null
  - `original_filename` text null
  - `created_by_agent_id` uuid fk null
  - `created_by_user_id` uuid/text fk null
- `issue_attachments` 负责把 assets 关联到 issues/comments：
  - `id` uuid pk
  - `company_id` uuid fk not null
  - `issue_id` uuid fk not null
  - `asset_id` uuid fk not null
  - `issue_comment_id` uuid fk null

## 7.15 `documents` + `document_revisions` + `issue_documents`

- `documents` 存储以文本编辑为中心的文档：
  - `id` uuid pk
  - `company_id` uuid fk not null
  - `title` text null
  - `format` text not null (`markdown`)
  - `latest_body` text not null
  - `latest_revision_id` uuid null
  - `latest_revision_number` int not null
  - `created_by_agent_id` uuid fk null
  - `created_by_user_id` uuid/text fk null
  - `updated_by_agent_id` uuid fk null
  - `updated_by_user_id` uuid/text fk null
- `document_revisions` 存储只追加的历史：
  - `id` uuid pk
  - `company_id` uuid fk not null
  - `document_id` uuid fk not null
  - `revision_number` int not null
  - `body` text not null
  - `change_summary` text null
- `issue_documents` 负责以稳定 workflow key 把文档关联到 issues：
  - `id` uuid pk
  - `company_id` uuid fk not null
  - `issue_id` uuid fk not null
  - `document_id` uuid fk not null
  - `key` text not null (`plan`, `design`, `notes`, etc.)

## 8. 状态机

## 8.1 Agent 状态

允许的流转：

- `idle -> running`
- `running -> idle`
- `running -> error`
- `error -> idle`
- `idle -> paused`
- `running -> paused`（需要走取消流程）
- `paused -> idle`
- `* -> terminated`（仅 board，可逆性：无）

## 8.2 Issue 状态

允许的流转：

- `backlog -> todo | cancelled`
- `todo -> in_progress | blocked | cancelled`
- `in_progress -> in_review | blocked | done | cancelled`
- `in_review -> in_progress | done | cancelled`
- `blocked -> todo | in_progress | cancelled`
- 终止态：`done`、`cancelled`

副作用：

- 进入 `in_progress` 时，如果 `started_at` 为空则填充
- 进入 `done` 时设置 `completed_at`
- 进入 `cancelled` 时设置 `cancelled_at`

## 8.3 Approval 状态

- `pending -> approved | rejected | cancelled`
- 做出决定后进入终止态

## 9. 鉴权与权限

## 9.1 Board 鉴权

- 面向人类操作员的 session 鉴权
- Board 对部署中的所有 companies 具备完整读写权限
- 每个 board 发起的修改都写入 `activity_log`

## 9.2 Agent 鉴权

- Bearer API key 绑定到一个 agent 和一个 company
- Agent key 权限范围：
  - 读取自己 company 的组织/任务/company 上下文
  - 读取并写入分配给自己的 tasks 与 comments
  - 为委派创建 tasks/comments
  - 上报 heartbeat 状态
  - 上报 cost events
- Agent 不能：
  - 绕过审批门禁
  - 直接修改全公司预算
  - 修改 auth/keys

## 9.3 权限矩阵（V1）

| Action | Board | Agent |
|---|---|---|
| Create company | yes | no |
| Hire/create agent | yes (direct) | request via approval |
| Pause/resume agent | yes | no |
| Create/update task | yes | yes |
| Force reassign task | yes | limited |
| Approve strategy/hire requests | yes | no |
| Report cost | yes | yes |
| Set company budget | yes | no |
| Set subordinate budget | yes | yes (manager subtree only) |

## 10. API 契约（REST）

所有端点都位于 `/api` 下，并返回 JSON。

## 10.1 Companies

- `GET /companies`
- `POST /companies`
- `GET /companies/:companyId`
- `PATCH /companies/:companyId`
- `PATCH /companies/:companyId/branding`
- `POST /companies/:companyId/archive`

## 10.2 Goals

- `GET /companies/:companyId/goals`
- `POST /companies/:companyId/goals`
- `GET /goals/:goalId`
- `PATCH /goals/:goalId`
- `DELETE /goals/:goalId`（可选软删除，硬删除仅限 board）

## 10.3 Agents

- `GET /companies/:companyId/agents`
- `POST /companies/:companyId/agents`
- `GET /agents/:agentId`
- `PATCH /agents/:agentId`
- `POST /agents/:agentId/pause`
- `POST /agents/:agentId/resume`
- `POST /agents/:agentId/terminate`
- `POST /agents/:agentId/keys`（创建 API key）
- `POST /agents/:agentId/heartbeat/invoke`

## 10.4 Tasks（Issues）

- `GET /companies/:companyId/issues`
- `POST /companies/:companyId/issues`
- `GET /issues/:issueId`
- `PATCH /issues/:issueId`
- `GET /issues/:issueId/documents`
- `GET /issues/:issueId/documents/:key`
- `PUT /issues/:issueId/documents/:key`
- `GET /issues/:issueId/documents/:key/revisions`
- `DELETE /issues/:issueId/documents/:key`
- `POST /issues/:issueId/checkout`
- `POST /issues/:issueId/release`
- `POST /issues/:issueId/comments`
- `GET /issues/:issueId/comments`
- `POST /companies/:companyId/issues/:issueId/attachments`（multipart upload）
- `GET /issues/:issueId/attachments`
- `GET /attachments/:attachmentId/content`
- `DELETE /attachments/:attachmentId`

### 10.4.1 原子 Checkout 契约

`POST /issues/:issueId/checkout` 请求：

```json
{
  "agentId": "uuid",
  "expectedStatuses": ["todo", "backlog", "blocked"]
}
```

服务端行为：

1. 使用单条 SQL update，并带条件 `WHERE id = ? AND status IN (?) AND (assignee_agent_id IS NULL OR assignee_agent_id = :agentId)`
2. 如果更新行数为 0，则返回 `409`，并附带当前 owner/status
3. 成功 checkout 时设置 `assignee_agent_id`、`status = in_progress` 和 `started_at`

## 10.5 Projects

- `GET /companies/:companyId/projects`
- `POST /companies/:companyId/projects`
- `GET /projects/:projectId`
- `PATCH /projects/:projectId`

## 10.6 Approvals

- `GET /companies/:companyId/approvals?status=pending`
- `POST /companies/:companyId/approvals`
- `POST /approvals/:approvalId/approve`
- `POST /approvals/:approvalId/reject`

## 10.7 Cost 与 Budgets

- `POST /companies/:companyId/cost-events`
- `GET /companies/:companyId/costs/summary`
- `GET /companies/:companyId/costs/by-agent`
- `GET /companies/:companyId/costs/by-project`
- `PATCH /companies/:companyId/budgets`
- `PATCH /agents/:agentId/budgets`

## 10.8 Activity 与 Dashboard

- `GET /companies/:companyId/activity`
- `GET /companies/:companyId/dashboard`

Dashboard payload 必须包含：

- active/running/paused/error agent 数量
- open/in-progress/blocked/done issue 数量
- 当月累计支出与预算利用率
- pending approvals 数量

## 10.9 错误语义

- `400` validation error
- `401` unauthenticated
- `403` unauthorized
- `404` not found
- `409` 状态冲突（checkout 冲突、非法状态流转）
- `422` 语义规则冲突
- `500` server error

## 11. Heartbeat 与 Adapter 契约

## 11.1 Adapter 接口

```ts
interface AgentAdapter {
  invoke(agent: Agent, context: InvocationContext): Promise<InvokeResult>;
  status(run: HeartbeatRun): Promise<RunStatus>;
  cancel(run: HeartbeatRun): Promise<void>;
}
```

## 11.2 Process Adapter

配置形状：

```json
{
  "command": "string",
  "args": ["string"],
  "cwd": "string",
  "env": {"KEY": "VALUE"},
  "timeoutSec": 900,
  "graceSec": 15
}
```

行为：

- 拉起子进程
- 把 stdout/stderr 流式写入 run logs
- 根据退出码或超时更新 run status
- 取消时先发送 SIGTERM，grace 期后再发送 SIGKILL

## 11.3 HTTP Adapter

配置形状：

```json
{
  "url": "https://...",
  "method": "POST",
  "headers": {"Authorization": "Bearer ..."},
  "timeoutMs": 15000,
  "payloadTemplate": {"agentId": "{{agent.id}}", "runId": "{{run.id}}"}
}
```

行为：

- 通过出站 HTTP 请求发起调用
- 2xx 代表已接受
- 非 2xx 视为调用失败
- 可选 callback endpoint 允许异步完成状态更新

## 11.4 上下文交付

- `thin`：只发送 ID 和指针；agent 自己通过 API 获取上下文
- `fat`：包含当前分配任务、goal 摘要、预算快照和近期 comments

## 11.5 Scheduler 规则

`adapter_config` 中的单 agent 调度字段：

- `enabled` boolean
- `intervalSec` integer（最小 30）
- `maxConcurrentRuns` 在 V1 中固定为 `1`

以下情况 scheduler 必须跳过调用：

- agent 处于 paused/terminated
- 已有活跃 run
- 已触达硬预算上限

## 12. 治理与审批流程

## 12.1 招聘

1. Agent 或 board 创建 `approval(type=hire_agent, status=pending, payload=agent draft)`。
2. Board 审批通过或拒绝。
3. 审批通过后，服务端创建 agent 行，并可选生成初始 API key。
4. 决策写入 `activity_log`。

Board 可以绕过请求流程，直接通过 UI 创建 agents；这种直接创建仍然必须被记录为治理动作。

## 12.2 CEO 战略审批

1. CEO 以 `approval(type=approve_ceo_strategy)` 提交战略提案。
2. Board 审核 payload（计划文本、初始组织结构、高层任务）。
3. 审批通过后，解锁 CEO 创建的委派工作所对应的执行状态。

在第一次战略审批通过前，CEO 只能草拟 tasks，不能把它们推进到活跃执行状态。

## 12.3 Board 覆盖

Board 可以在任意时刻：

- pause/resume/terminate 任意 agent
- 重新分配或取消任意 task
- 编辑 budgets 与 limits
- approve/reject/cancel 任意 pending approval

## 13. 成本与预算系统

## 13.1 预算层级

- company 月预算
- agent 月预算
- 可选 project 预算（如果已配置）

## 13.2 执行规则

- 默认软提醒阈值：80%
- 硬上限：达到 100% 时触发：
  - 把 agent 状态改为 `paused`
  - 阻止该 agent 发起新的 checkout/invocation
  - 发出高优先级 activity 事件

Board 可以通过提高预算或显式恢复 agent 来覆盖这个结果。

## 13.3 成本事件写入

`POST /companies/:companyId/cost-events` 请求体：

```json
{
  "agentId": "uuid",
  "issueId": "uuid",
  "provider": "openai",
  "model": "gpt-5",
  "inputTokens": 1234,
  "outputTokens": 567,
  "costCents": 89,
  "occurredAt": "2026-02-17T20:25:00Z",
  "billingCode": "optional"
}
```

校验：

- token 数量必须非负
- `costCents >= 0`
- 所有关联实体都要通过 company 所有权检查

## 13.4 Rollups

V1 允许在读取时执行聚合查询。  
如果查询延迟超过目标，后续可以再增加物化 rollup。

## 14. UI 要求（Board App）

V1 UI 路由：

- `/` dashboard
- `/companies` company list/create
- `/companies/:id/org` org chart and agent status
- `/companies/:id/tasks` task list/kanban
- `/companies/:id/agents/:agentId` agent detail
- `/companies/:id/costs` cost and budget dashboard
- `/companies/:id/approvals` pending/history approvals
- `/companies/:id/activity` audit/event stream

必需 UX 行为：

- 全局 company selector
- 快捷动作：pause/resume agent、create task、approve/reject request
- 原子 checkout 失败时要有 conflict toast
- 不允许静默后台失败；每个失败的 run 都必须在 UI 中可见

## 15. 运维要求

## 15.1 环境

- Node 20+
- `DATABASE_URL` 可选
- 若未设置，则自动使用 PGlite 并 push schema

## 15.2 迁移

- Drizzle migrations 是事实来源
- V1 升级路径中不允许原地破坏性迁移
- 需要提供从现有最小表结构迁移到 company-scoped schema 的迁移脚本

## 15.3 日志与审计

- 结构化日志（生产环境 JSON）
- 每个 API 调用都要有 request ID
- 每个修改都写入 `activity_log`

## 15.4 可靠性目标

- 标准 CRUD 在 1k tasks/company 条件下的 API p95 延迟低于 250 ms
- process adapter 的 heartbeat 调用确认时间低于 2 s
- 不允许丢失审批决策（事务化写入）

## 16. 安全要求

- 仅存储 hash 后的 agent API keys
- 在日志中脱敏密钥（`adapter_config`、auth headers、env vars）
- 为 board session 端点提供 CSRF 保护
- 对 auth 和 key-management 端点做速率限制
- 对每一次实体读取/修改都严格执行 company 边界检查

## 17. 测试策略

## 17.1 单元测试

- 状态流转守卫（agent、issue、approval）
- 预算执行规则
- adapter 调用/取消语义

## 17.2 集成测试

- 原子 checkout 冲突行为
- approval 到 agent 创建的完整流程
- cost 写入与 rollup 正确性
- run 活跃时执行 pause（先优雅取消，再强制 kill）

## 17.3 端到端测试

- board 创建 company -> 招聘 CEO -> 审批战略 -> CEO 收到工作
- agent 上报成本 -> 到达预算阈值 -> 自动 pause 生效
- 跨团队 task 委派且 request depth 增加

## 17.4 回归套件最低要求

只要以下任一项未通过，就阻塞 release candidate：

1. auth boundary tests
2. checkout race test
3. hard budget stop test
4. agent pause/resume test
5. dashboard summary consistency test

## 18. 交付计划

## Milestone 1：Company 核心与鉴权

- 为现有实体添加 `companies` 与 company 作用域
- 增加 board session auth 和 agent API keys
- 把现有 API routes 迁移到 company-aware 路径

## Milestone 2：Task 与治理语义

- 实现原子 checkout 端点
- 实现 issue comments 与生命周期守卫
- 实现 approvals 表以及 hire/strategy 工作流

## Milestone 3：Heartbeat 与 Adapter Runtime

- 实现 adapter 接口
- 交付带取消语义的 `process` adapter
- 交付带 timeout/error handling 的 `http` adapter
- 持久化 heartbeat runs 与 statuses

## Milestone 4：成本与预算控制

- 实现 cost events 写入
- 实现月度 rollup 与 dashboard
- 执行硬上限自动暂停

## Milestone 5：完成 Board UI

- 增加 company selector 与 org chart 视图
- 增加 approvals 与 cost 页面

## Milestone 6：加固与发布

- 完整 integration/e2e 套件
- 用于本地测试的 seed/demo company 模板
- release checklist 和文档更新

## 19. 验收标准（发布门禁）

只有全部满足以下条件时，V1 才算完成：

1. Board 用户可以创建多个 companies，并在它们之间切换。
2. 一个 company 至少能运行一个启用 heartbeat 的活跃 agent。
3. Task checkout 在并发 claim 时具备冲突安全性，并返回 `409`。
4. Agents 仅依靠 API keys 就能更新 tasks/comments 并上报 costs。
5. Board 能在 UI 中 approve/reject 招聘请求与 CEO 战略请求。
6. 预算硬上限会自动暂停 agent，并阻止新的 invocation。
7. Dashboard 能从实时 DB 数据中显示准确的数量与支出。
8. 每个修改动作都能在 activity log 中审计。
9. 应用默认可在内嵌 PostgreSQL 上运行，并支持通过 `DATABASE_URL` 使用外部 Postgres。

## 20. Post-V1 Backlog（明确延期）

- 插件架构
- 按团队定制更丰富的 workflow-state
- 超出 V1 最低要求的 milestones/labels/dependency graph 深度
- 实时传输优化（SSE/WebSockets）
- 公共模板市场集成（ClipHub）

## 21. Company 可移植包（V1 补充）

V1 支持通过可移植 package 契约进行 company import/export：

- 以 Markdown 为核心，根文件是 `COMPANY.md`
- 按约定进行隐式目录发现
- 使用 `.paperclip.yaml` sidecar 保存 Paperclip 特定保真信息
- 规范基础 package 保持 vendor-neutral，并与 `docs/companies/companies-spec.md` 对齐
- 通用约定：
  - `agents/<slug>/AGENTS.md`
  - `teams/<slug>/TEAM.md`
  - `projects/<slug>/PROJECT.md`
  - `projects/<slug>/tasks/<slug>/TASK.md`
  - `tasks/<slug>/TASK.md`
  - `skills/<slug>/SKILL.md`

V1 中 export/import 行为：

- export 输出一个干净、vendor-neutral 的 markdown package，并附带 `.paperclip.yaml`
- projects 和 starter tasks 是按需导出内容，而不是默认 package 内容
- 周期性 `TASK.md` 条目在基础 package 中使用 `recurring: true`，在 `.paperclip.yaml` 中使用 Paperclip routine fidelity
- Paperclip 在导入 recurring task package 时，会把它们导入为 routines，而不是降级成一次性 issues
- export 会移除环境相关路径（`cwd`、本地 instruction file path、内联 prompt 重复内容），同时保留可移植的 project repo/workspace 元数据，例如 `repoUrl`、refs 和 `.paperclip.yaml` 中键控的 workspace-policy 引用
- export 永不包含 secret values；环境变量输入只会以可移植声明形式报告
- import 支持目标模式：
  - 创建一个新 company
  - 导入到现有 company
- import 会重建导出的 project workspaces，并把可移植 workspace key 重新映射为目标本地 workspace id
- import 会强制关闭导入 agent 的 timer heartbeat，避免 package 在导入后隐式开始计划任务
- import 支持冲突策略：`rename`、`skip`、`replace`
- import 支持 apply 前 preview（dry-run）
- GitHub imports 对未固定 ref 给出警告，而不是阻塞
