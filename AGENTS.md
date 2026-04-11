# AGENTS.md

供本仓库中的人类与 AI 贡献者协作时参考的说明。

## 1. 目标

Cyberpunk Company 是 AI 智能体公司的控制平面。
当前的实现目标是 V1，定义见 `doc/SPEC-implementation.md`。

## 2. 优先阅读

在开始修改之前，请按以下顺序阅读：

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` 是长期产品背景文档。
`doc/SPEC-implementation.md` 是面向 V1 的具体实现契约。

## 3. 仓库结构

- `server/`：Express REST API 与编排服务
- `ui/`：React + Vite 的董事会 UI
- `packages/db/`：Drizzle schema、迁移与 DB 客户端
- `packages/shared/`：共享类型、常量、校验器与 API 路径常量
- `packages/adapters/`：各类智能体适配器实现（Claude、Codex、Cursor 等）
- `packages/adapter-utils/`：共享适配器工具
- `packages/plugins/`：插件系统相关包
- `doc/`：运维与产品文档

## 4. 开发环境（自动数据库）

在开发环境中，将 `DATABASE_URL` 留空即可使用内嵌 PGlite。

```sh
pnpm install
pnpm dev
```

启动后：

- API：`http://localhost:3100`
- UI：`http://localhost:3100`（开发模式下由 API 服务通过 middleware 提供）

快速检查：

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

重置本地开发数据库：

```sh
rm -rf data/pglite
pnpm dev
```

## 5. 核心工程规则

1. 变更必须保持 company 作用域。
每个领域实体都应属于某个 company，并且路由与服务层必须强制执行 company 边界。

2. 保持契约同步。
如果你修改了 schema 或 API 行为，必须同步更新所有受影响层：
- `packages/db` 的 schema 与导出
- `packages/shared` 的类型、常量与校验器
- `server` 的路由与服务
- `ui` 的 API 客户端与页面

3. 保持控制平面的核心不变量。
- 单一 assignee 任务模型
- issue checkout 的原子语义
- 受治理动作的审批门禁
- 预算硬上限触发自动暂停
- 所有修改操作都要记录 activity log

4. 不要在未被要求时整体替换战略文档。
优先做增量更新，并保持 `doc/SPEC.md` 与 `doc/SPEC-implementation.md` 一致。

5. 计划文档必须带日期并集中管理。
新的计划文档应放在 `doc/plans/` 下，并使用 `YYYY-MM-DD-slug.md` 命名。

## 6. 数据库变更流程

当你修改数据模型时：

1. 编辑 `packages/db/src/schema/*.ts`
2. 确保新表从 `packages/db/src/schema/index.ts` 导出
3. 生成迁移：

```sh
pnpm db:generate
```

4. 验证编译：

```sh
pnpm -r typecheck
```

说明：
- `packages/db/drizzle.config.ts` 会从 `dist/schema/*.js` 读取编译后的 schema
- `pnpm db:generate` 会先编译 `packages/db`

## 7. 交付前验证

在宣称完成之前，必须运行以下完整检查：

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

如果有任何步骤无法运行，必须明确说明未运行什么，以及原因。

## 8. API 与鉴权要求

- 基础路径：`/api`
- 董事会访问被视为完整控制权限的操作员上下文
- 智能体访问使用 Bearer API key（`agent_api_keys`），并以哈希形式存储
- 智能体 key 不得访问其他 company

新增端点时：

- 应用 company 访问检查
- 强制执行 actor 权限（board vs agent）
- 对所有修改操作写入 activity log
- 返回一致的 HTTP 错误码（`400/401/403/404/409/422/500`）

## 9. UI 要求

- 保持路由与导航和当前 API 能力一致
- 对 company 作用域页面使用 company selection context
- 明确展示失败，不要静默吞掉 API 错误

## 10. 完成定义

当且仅当以下条件全部满足时，变更才算完成：

1. 行为符合 `doc/SPEC-implementation.md`
2. typecheck、tests 与 build 全部通过
3. db/shared/server/ui 之间的契约保持同步
4. 行为或命令有变化时，相关文档已更新
