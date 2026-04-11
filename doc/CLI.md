# CLI Reference

Cyberpunk Company CLI now supports both:

- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Base Usage

Use repo script in development:

```sh
pnpm cyberpunk-company --help
```

First-time local bootstrap + run:

```sh
pnpm cyberpunk-company run
```

Choose local instance:

```sh
pnpm cyberpunk-company run --instance dev
```

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `cyberpunk-company onboard` and `cyberpunk-company configure --section server` set deployment mode in config
- runtime can override mode with `CYBERPUNK_DEPLOYMENT_MODE`
- `cyberpunk-company run` and `cyberpunk-company doctor` do not yet expose a direct `--mode` flag

Target behavior (planned) is documented in `doc/DEPLOYMENT-MODES.md` section 5.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
pnpm cyberpunk-company allowed-hostname dotta-macbook-pro
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.cyberpunk-company`:

```sh
pnpm cyberpunk-company run --data-dir ./tmp/cyberpunk-company-dev
pnpm cyberpunk-company issue list --data-dir ./tmp/cyberpunk-company-dev
```

## Context Profiles

Store local defaults in `~/.cyberpunk-company/context.json`:

```sh
pnpm cyberpunk-company context set --api-base http://localhost:3100 --company-id <company-id>
pnpm cyberpunk-company context show
pnpm cyberpunk-company context list
pnpm cyberpunk-company context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
pnpm cyberpunk-company context set --api-key-env-var-name CYBERPUNK_API_KEY
export CYBERPUNK_API_KEY=...
```

## Company Commands

```sh
pnpm cyberpunk-company company list
pnpm cyberpunk-company company get <company-id>
pnpm cyberpunk-company company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
pnpm cyberpunk-company company delete PAP --yes --confirm PAP
pnpm cyberpunk-company company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- Deletion is server-gated by `CYBERPUNK_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `CYBERPUNK_COMPANY_ID`), not another company.

## Issue Commands

```sh
pnpm cyberpunk-company issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
pnpm cyberpunk-company issue get <issue-id-or-identifier>
pnpm cyberpunk-company issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
pnpm cyberpunk-company issue update <issue-id> [--status in_progress] [--comment "..."]
pnpm cyberpunk-company issue comment <issue-id> --body "..." [--reopen]
pnpm cyberpunk-company issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
pnpm cyberpunk-company issue release <issue-id>
```

## Agent Commands

```sh
pnpm cyberpunk-company agent list --company-id <company-id>
pnpm cyberpunk-company agent get <agent-id>
pnpm cyberpunk-company agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

`agent local-cli` is the quickest way to run local Claude/Codex manually as a Cyberpunk Company agent:

- creates a new long-lived agent API key
- installs missing Cyberpunk Company skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `CYBERPUNK_API_URL`, `CYBERPUNK_COMPANY_ID`, `CYBERPUNK_AGENT_ID`, and `CYBERPUNK_API_KEY`

Example for shortname-based local setup:

```sh
pnpm cyberpunk-company agent local-cli codexcoder --company-id <company-id>
pnpm cyberpunk-company agent local-cli claudecoder --company-id <company-id>
```

## Approval Commands

```sh
pnpm cyberpunk-company approval list --company-id <company-id> [--status pending]
pnpm cyberpunk-company approval get <approval-id>
pnpm cyberpunk-company approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
pnpm cyberpunk-company approval approve <approval-id> [--decision-note "..."]
pnpm cyberpunk-company approval reject <approval-id> [--decision-note "..."]
pnpm cyberpunk-company approval request-revision <approval-id> [--decision-note "..."]
pnpm cyberpunk-company approval resubmit <approval-id> [--payload '{"...":"..."}']
pnpm cyberpunk-company approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm cyberpunk-company activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard Commands

```sh
pnpm cyberpunk-company dashboard get --company-id <company-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
pnpm cyberpunk-company heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Default local instance root is `~/.cyberpunk-company/instances/default`:

- config: `~/.cyberpunk-company/instances/default/config.json`
- embedded db: `~/.cyberpunk-company/instances/default/db`
- logs: `~/.cyberpunk-company/instances/default/logs`
- storage: `~/.cyberpunk-company/instances/default/data/storage`
- secrets key: `~/.cyberpunk-company/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
CYBERPUNK_HOME=/custom/home CYBERPUNK_INSTANCE_ID=dev pnpm cyberpunk-company run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm cyberpunk-company configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
