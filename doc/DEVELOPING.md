# 开发说明

这个项目可以在本地开发环境中完整运行，无需手动搭建 PostgreSQL。

## 部署模式

关于模式定义与预期 CLI 行为，请参见 `doc/DEPLOYMENT-MODES.md`。

当前实现状态：

- 规范模型：`local_trusted` 与 `authenticated`（支持 `private/public` 暴露）

## 前置要求

- Node.js 20+
- pnpm 9+

## 依赖锁文件策略

`pnpm-lock.yaml` 由 GitHub Actions 负责维护。

- 不要在 pull request 中提交 `pnpm-lock.yaml`
- 当 manifest 发生变化时，PR CI 会验证依赖解析
- 推送到 `master` 时，会使用 `pnpm install --lockfile-only --no-frozen-lockfile` 重新生成 `pnpm-lock.yaml`，必要时自动提交，然后再用 `--frozen-lockfile` 做验证

## 启动开发环境

在仓库根目录运行：

```sh
pnpm install
pnpm dev
```

这会启动：

- API 服务：`http://localhost:3100`
- UI：由 API 服务以开发 middleware 模式提供（与 API 同源）

`pnpm dev` 会以 watch 模式运行服务端，并在 workspace 包（包括 adapter 包）变化时自动重启。若要关闭文件监听，请使用 `pnpm dev:once`。

`pnpm dev:once` 现在会追踪后端相关文件变化与待执行迁移。当当前启动结果已过期时，board UI 会显示 `Restart required` 横幅。你也可以在 `Instance Settings > Experimental` 中启用带保护的自动重启，它会等待排队中或运行中的本地 agent run 完成后再重启开发服务。

Tailscale/private-auth 开发模式：

```sh
pnpm dev --tailscale-auth
```

这会以 `authenticated/private` 模式运行开发环境，并将服务绑定到 `0.0.0.0`，以支持私有网络访问。

允许附加私有主机名（例如自定义 Tailscale 主机名）：

```sh
pnpm cyberpunk-company allowed-hostname dotta-macbook-pro
```

## 一条命令本地运行

对于首次本地安装，你可以用一条命令完成初始化并启动：

```sh
pnpm cyberpunk-company run
```

`cyberpunk-company run` 会执行：

1. 如果缺少配置，则自动完成 onboarding
2. 执行启用修复能力的 `cyberpunk-company doctor`
3. 在检查通过后启动服务端

## Docker 快速开始（无需本地安装 Node）

在 Docker 中构建并运行 Cyberpunk Company：

```sh
docker build -t cyberpunk-company-local .
docker run --name cyberpunk-company \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e CYBERPUNK_HOME=/cyberpunk-company \
  -v "$(pwd)/data/docker-cyberpunk-company:/cyberpunk-company" \
  cyberpunk-company-local
```

或者使用 Compose：

```sh
docker compose -f docker-compose.quickstart.yml up --build
```

关于 API key 接线（`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`）和持久化细节，请参见 `doc/DOCKER.md`。

## 用于不受信任 PR 评审的 Docker

如果你需要一个专门面向评审的容器，并将 `codex`/`claude` 登录状态保存在 Docker volume 中，同时把 PR checkout 到隔离的 scratch workspace，请参见 `doc/UNTRUSTED-PR-REVIEW.md`。

## 开发环境中的数据库（自动处理）

在本地开发中，将 `DATABASE_URL` 留空即可。
服务端会自动使用内嵌 PostgreSQL，并把数据持久化到：

- `~/.cyberpunk-company/instances/default/db`

覆盖 home 与 instance：

```sh
CYBERPUNK_HOME=/custom/path CYBERPUNK_INSTANCE_ID=dev pnpm cyberpunk-company run
```

这种模式不需要 Docker 或外部数据库。

## 开发环境中的存储（自动处理）

在本地开发中，默认存储 provider 是 `local_disk`，上传的图片和附件会持久化到：

- `~/.cyberpunk-company/instances/default/data/storage`

配置存储 provider 与设置：

```sh
pnpm cyberpunk-company configure --section storage
```

## 默认智能体工作区

当某个本地 agent run 没有解析出 project/session workspace 时，Cyberpunk Company 会退回到实例根目录下的 agent home workspace：

- `~/.cyberpunk-company/instances/default/workspaces/<agent-id>`

在非默认配置下，这个路径同样遵循 `CYBERPUNK_HOME` 和 `CYBERPUNK_INSTANCE_ID`。

对于 `codex_local`，Cyberpunk Company 还会在实例根目录下按 company 管理一个 Codex home，并从共享 Codex 登录/配置目录（`$CODEX_HOME` 或 `~/.codex`）中进行初始化：

- `~/.cyberpunk-company/instances/default/companies/<company-id>/codex-home`

## Worktree 本地实例

当你在多个 git worktree 中开发时，不要让两个 Cyberpunk Company 服务同时指向同一个内嵌 PostgreSQL 数据目录。

正确做法是：为当前 worktree 创建 repo-local 的 Cyberpunk Company 配置，并为它创建一个隔离实例：

```sh
cyberpunk-company worktree init
# 或者一步同时创建 git worktree 并初始化：
pnpm cyberpunk-company worktree:make cyberpunk-company-pr-432
```

这个命令会：

- 在 `.cyberpunk-company/config.json` 和 `.cyberpunk-company/.env` 写入 repo-local 文件
- 在 `~/.cyberpunk-company-worktrees/instances/<worktree-id>/` 下创建隔离实例
- 当在一个 linked git worktree 中运行时，把当前生效的 git hooks 镜像到该 worktree 的私有 git 目录
- 选择一个可用的 app 端口和内嵌 PostgreSQL 端口
- 默认通过逻辑 SQL 快照，以 `minimal` 模式从当前生效的 Cyberpunk Company instance/config 进行 DB 初始化（如果存在 repo-local worktree config 则以它为准，否则使用默认 instance）

Seed 模式：

- `minimal`：保留 companies、projects、issues、comments、approvals 和 auth state 等核心应用状态，保留所有表的 schema，但省略 heartbeat runs、wake requests、activity logs、runtime services 和 agent session state 等较重的运行历史行数据
- `full`：对源实例做完整逻辑克隆
- `--no-seed`：创建一个空的隔离实例

执行 `worktree init` 之后，在该 worktree 中运行的服务端与 CLI 都会自动加载 repo-local 的 `.cyberpunk-company/.env`，因此 `pnpm dev`、`cyberpunk-company doctor` 和 `cyberpunk-company db:backup` 等常规命令都会自动作用于该 worktree 实例。

这个 repo-local env 还会设置：

- `CYBERPUNK_IN_WORKTREE=true`
- `CYBERPUNK_WORKTREE_NAME=<worktree-name>`
- `CYBERPUNK_WORKTREE_COLOR=<hex-color>`

服务端和 UI 会使用这些值做 worktree 专属品牌标记，例如顶部横幅和动态着色的 favicon。

如需显式打印 shell exports：

```sh
cyberpunk-company worktree env
# 或：
eval "$(cyberpunk-company worktree env)"
```

### Worktree CLI 参考

**`pnpm cyberpunk-company worktree init [options]`**：为当前 worktree 创建 repo-local config/env 和隔离实例。

| 选项 | 说明 |
|---|---|
| `--name <name>` | 用于派生 instance id 的显示名称 |
| `--instance <id>` | 显式指定隔离 instance id |
| `--home <path>` | worktree 实例的 home 根目录（默认：`~/.cyberpunk-company-worktrees`） |
| `--from-config <path>` | 用于 seed 的源 config.json |
| `--from-data-dir <path>` | 派生源配置时使用的源 CYBERPUNK_HOME |
| `--from-instance <id>` | 源 instance id（默认：`default`） |
| `--server-port <port>` | 期望使用的服务端端口 |
| `--db-port <port>` | 期望使用的内嵌 Postgres 端口 |
| `--seed-mode <mode>` | seed 配置：`minimal` 或 `full`（默认：`minimal`） |
| `--no-seed` | 跳过从源实例进行数据库 seed |
| `--force` | 替换已有的 repo-local config 与隔离实例数据 |

示例：

```sh
cyberpunk-company worktree init --no-seed
cyberpunk-company worktree init --seed-mode full
cyberpunk-company worktree init --from-instance default
cyberpunk-company worktree init --from-data-dir ~/.cyberpunk-company
cyberpunk-company worktree init --force
```

修复一个已经创建好的 repo-managed worktree，并从主默认安装重新 seed 它的隔离实例：

```sh
cd ~/.cyberpunk-company/worktrees/PAP-884-ai-commits-component
pnpm cyberpunk-company worktree init --force --seed-mode minimal \
  --name PAP-884-ai-commits-component \
  --from-config ~/.cyberpunk-company/instances/default/config.json
```

这个命令会重写 worktree-local 的 `.cyberpunk-company/config.json` 和 `.cyberpunk-company/.env`，在 `~/.cyberpunk-company-worktrees/instances/<worktree-id>/` 下重建隔离实例，同时保留 git worktree 的实际代码内容。

**`pnpm cyberpunk-company worktree:make <name> [options]`**：在 `~/NAME` 下创建一个 git worktree，并在其中初始化隔离的 Cyberpunk Company 实例。它把 `git worktree add` 与 `worktree init` 合并到一步中。

| 选项 | 说明 |
|---|---|
| `--start-point <ref>` | 新分支的基准远程引用（例如 `origin/main`） |
| `--instance <id>` | 显式指定隔离 instance id |
| `--home <path>` | worktree 实例的 home 根目录（默认：`~/.cyberpunk-company-worktrees`） |
| `--from-config <path>` | 用于 seed 的源 config.json |
| `--from-data-dir <path>` | 派生源配置时使用的源 CYBERPUNK_HOME |
| `--from-instance <id>` | 源 instance id（默认：`default`） |
| `--server-port <port>` | 期望使用的服务端端口 |
| `--db-port <port>` | 期望使用的内嵌 Postgres 端口 |
| `--seed-mode <mode>` | seed 配置：`minimal` 或 `full`（默认：`minimal`） |
| `--no-seed` | 跳过从源实例进行数据库 seed |
| `--force` | 替换已有的 repo-local config 与隔离实例数据 |

示例：

```sh
pnpm cyberpunk-company worktree:make cyberpunk-company-pr-432
pnpm cyberpunk-company worktree:make my-feature --start-point origin/main
pnpm cyberpunk-company worktree:make experiment --no-seed
```

**`pnpm cyberpunk-company worktree env [options]`**：打印当前 worktree-local Cyberpunk Company 实例的 shell exports。

| 选项 | 说明 |
|---|---|
| `-c, --config <path>` | 配置文件路径 |
| `--json` | 输出 JSON，而不是 shell exports |

示例：

```sh
pnpm cyberpunk-company worktree env
pnpm cyberpunk-company worktree env --json
eval "$(pnpm cyberpunk-company worktree env)"
```

对于项目执行 worktree，Cyberpunk Company 还可以在创建或复用隔离 git worktree 后，执行项目定义的 provision command。通过项目的执行工作区策略（`workspaceStrategy.provisionCommand`）进行配置。该命令会在派生出来的 worktree 中运行，并接收 `CYBERPUNK_WORKSPACE_*`、`CYBERPUNK_PROJECT_ID`、`CYBERPUNK_AGENT_ID` 和 `CYBERPUNK_ISSUE_*` 环境变量，以便每个仓库按自己的方式完成自举。

## 快速健康检查

在另一个终端中运行：

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

预期结果：

- `/api/health` 返回 `{"status":"ok"}`
- `/api/companies` 返回 JSON 数组

## 重置本地开发数据库

如果你想清空本地开发数据并重新开始：

```sh
rm -rf ~/.cyberpunk-company/instances/default/db
pnpm dev
```

## 可选：使用外部 Postgres

如果你设置了 `DATABASE_URL`，服务端会优先使用它，而不是内嵌 PostgreSQL。

## 自动数据库备份

Cyberpunk Company 可以按定时任务自动执行数据库备份。默认值为：

- 启用
- 每 60 分钟一次
- 保留 30 天
- 备份目录：`~/.cyberpunk-company/instances/default/data/backups`

可通过以下命令配置：

```sh
pnpm cyberpunk-company configure --section database
```

手动运行一次备份：

```sh
pnpm cyberpunk-company db:backup
# 或：
pnpm db:backup
```

环境变量覆盖项：

- `CYBERPUNK_DB_BACKUP_ENABLED=true|false`
- `CYBERPUNK_DB_BACKUP_INTERVAL_MINUTES=<minutes>`
- `CYBERPUNK_DB_BACKUP_RETENTION_DAYS=<days>`
- `CYBERPUNK_DB_BACKUP_DIR=/absolute/or/~/path`

## 开发环境中的密钥

智能体环境变量现在支持密钥引用。默认情况下，密钥值会使用本地加密进行存储，而在智能体配置中只持久化 secret ref。
