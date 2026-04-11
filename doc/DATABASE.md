# 数据库

Cyberpunk Company 通过 [Drizzle ORM](https://orm.drizzle.team/) 使用 PostgreSQL。数据库有三种运行方式，从最简单到最接近生产环境依次如下。

## 1. 内嵌 PostgreSQL：零配置

如果你不设置 `DATABASE_URL`，服务端会自动启动一个内嵌 PostgreSQL 实例，并管理本地数据目录。

```sh
pnpm dev
```

就是这样。首次启动时，服务端会：

1. 创建 `~/.cyberpunk-company/instances/default/db/` 目录用于存储
2. 确保 `cyberpunk-company` 数据库存在
3. 对空数据库自动运行迁移
4. 开始提供服务

数据会持久化在 `~/.cyberpunk-company/instances/default/db/` 中，并跨重启保留。若要重置本地开发数据，删除该目录即可。

如果你需要手动应用待执行迁移，请运行：

```sh
pnpm db:migrate
```

当 `DATABASE_URL` 未设置时，这个命令会作用于当前激活的 Cyberpunk Company config/instance 所对应的内嵌 PostgreSQL 实例。

这种模式非常适合本地开发和一键安装。

Docker 说明：Docker quickstart 镜像默认也使用内嵌 PostgreSQL。持久化 `/cyberpunk-company` 可以在容器重启之间保留数据库状态（见 `doc/DOCKER.md`）。

## 2. 本地 PostgreSQL（Docker）

如果你想在本地运行完整 PostgreSQL 服务，可以使用仓库自带的 Docker Compose：

```sh
docker compose up -d
```

这会在 `localhost:5432` 启动 PostgreSQL 17。然后设置连接串：

```sh
cp .env.example .env
# .env 已包含：
# DATABASE_URL=postgres://cyberpunk-company:cyberpunk-company@localhost:5432/cyberpunk-company
```

运行迁移（等迁移生成功能修复后），或者使用 `drizzle-kit push`：

```sh
DATABASE_URL=postgres://cyberpunk-company:cyberpunk-company@localhost:5432/cyberpunk-company \
  npx drizzle-kit push
```

启动服务端：

```sh
pnpm dev
```

## 3. 托管 PostgreSQL（Supabase）

在生产环境中，建议使用托管 PostgreSQL 服务。[Supabase](https://supabase.com/) 是一个带免费额度的不错选择。

### 设置

1. 在 [database.new](https://database.new) 创建项目
2. 进入 **Project Settings > Database > Connection string**
3. 复制 URI，并把密码占位符替换成你的数据库密码

### 连接串

Supabase 提供两种连接模式：

**直连**（5432 端口）：用于迁移和一次性脚本：

```text
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**通过 Supavisor 连接池**（6543 端口）：用于应用运行：

```text
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 配置

在 `.env` 中设置 `DATABASE_URL`：

```sh
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

如果使用连接池（6543 端口），`postgres` 客户端必须关闭 prepared statements。更新 `packages/db/src/client.ts`：

```ts
export function createDb(url: string) {
  const sql = postgres(url, { prepare: false });
  return drizzlePg(sql, { schema });
}
```

### 推送 schema

```sh
# schema 变更请使用直连（5432 端口）
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@...5432/postgres \
  npx drizzle-kit push
```

### 免费额度限制

- 500 MB 数据库存储
- 200 个并发连接
- 项目 1 周无活动后会暂停

当前详情请查看 [Supabase pricing](https://supabase.com/pricing)。

## 在不同模式间切换

数据库模式由 `DATABASE_URL` 控制：

| `DATABASE_URL` | 模式 |
|---|---|
| 未设置 | 内嵌 PostgreSQL（`~/.cyberpunk-company/instances/default/db/`） |
| `postgres://...localhost...` | 本地 Docker PostgreSQL |
| `postgres://...supabase.com...` | 托管 Supabase |

无论使用哪种模式，你的 Drizzle schema（`packages/db/src/schema/`）都保持不变。

## 密钥存储

Cyberpunk Company 会把密钥元数据和版本存放在：

- `company_secrets`
- `company_secret_versions`

对于本地/默认安装，当前 provider 是 `local_encrypted`：

- 密钥内容会使用本地主密钥做静态加密。
- 默认密钥文件：`~/.cyberpunk-company/instances/default/secrets/master.key`（如果不存在会自动创建）。
- CLI 配置位置：`~/.cyberpunk-company/instances/default/config.json` 中的 `secrets.localEncrypted.keyFilePath`。

可选覆盖方式：

- `CYBERPUNK_SECRETS_MASTER_KEY`（32 字节密钥，可使用 base64、hex 或原始 32 字符串）
- `CYBERPUNK_SECRETS_MASTER_KEY_FILE`（自定义密钥文件路径）

用于阻止新增内联敏感环境变量的严格模式：

```sh
CYBERPUNK_SECRETS_STRICT_MODE=true
```

你也可以通过以下命令设置严格模式和 provider 默认值：

```sh
pnpm cyberpunk-company configure --section secrets
```

内联密钥迁移命令：

```sh
pnpm secrets:migrate-inline-env --apply
```
