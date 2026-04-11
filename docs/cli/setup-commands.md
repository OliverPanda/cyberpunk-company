---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `cyberpunk-company run`

One-command bootstrap and start:

```sh
pnpm cyberpunk-company run
```

Does:

1. Auto-onboards if config is missing
2. Runs `cyberpunk-company doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
pnpm cyberpunk-company run --instance dev
```

## `cyberpunk-company onboard`

Interactive first-time setup:

```sh
pnpm cyberpunk-company onboard
```

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
pnpm cyberpunk-company onboard --run
```

Non-interactive defaults + immediate start (opens browser on server listen):

```sh
pnpm cyberpunk-company onboard --yes
```

## `cyberpunk-company doctor`

Health checks with optional auto-repair:

```sh
pnpm cyberpunk-company doctor
pnpm cyberpunk-company doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration
- Storage configuration
- Missing key files

## `cyberpunk-company configure`

Update configuration sections:

```sh
pnpm cyberpunk-company configure --section server
pnpm cyberpunk-company configure --section secrets
pnpm cyberpunk-company configure --section storage
```

## `cyberpunk-company env`

Show resolved environment configuration:

```sh
pnpm cyberpunk-company env
```

## `cyberpunk-company allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
pnpm cyberpunk-company allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.cyberpunk-company/instances/default/config.json` |
| Database | `~/.cyberpunk-company/instances/default/db` |
| Logs | `~/.cyberpunk-company/instances/default/logs` |
| Storage | `~/.cyberpunk-company/instances/default/data/storage` |
| Secrets key | `~/.cyberpunk-company/instances/default/secrets/master.key` |

Override with:

```sh
CYBERPUNK_HOME=/custom/home CYBERPUNK_INSTANCE_ID=dev pnpm cyberpunk-company run
```

Or pass `--data-dir` directly on any command:

```sh
pnpm cyberpunk-company run --data-dir ./tmp/cyberpunk-company-dev
pnpm cyberpunk-company doctor --data-dir ./tmp/cyberpunk-company-dev
```
