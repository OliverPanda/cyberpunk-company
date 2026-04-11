---
title: CLI Overview
summary: CLI installation and setup
---

The Cyberpunk Company CLI handles instance setup, diagnostics, and control-plane operations.

## Usage

```sh
pnpm cyberpunk-company --help
```

## Global Options

All commands support:

| Flag | Description |
|------|-------------|
| `--data-dir <path>` | Local Cyberpunk Company data root (isolates from `~/.cyberpunk-company`) |
| `--api-base <url>` | API base URL |
| `--api-key <token>` | API authentication token |
| `--context <path>` | Context file path |
| `--profile <name>` | Context profile name |
| `--json` | Output as JSON |

Company-scoped commands also accept `--company-id <id>`.

For clean local instances, pass `--data-dir` on the command you run:

```sh
pnpm cyberpunk-company run --data-dir ./tmp/cyberpunk-company-dev
```

## Context Profiles

Store defaults to avoid repeating flags:

```sh
# Set defaults
pnpm cyberpunk-company context set --api-base http://localhost:3100 --company-id <id>

# View current context
pnpm cyberpunk-company context show

# List profiles
pnpm cyberpunk-company context list

# Switch profile
pnpm cyberpunk-company context use default
```

To avoid storing secrets in context, use an env var:

```sh
pnpm cyberpunk-company context set --api-key-env-var-name CYBERPUNK_API_KEY
export CYBERPUNK_API_KEY=...
```

Context is stored at `~/.cyberpunk-company/context.json`.

## Command Categories

The CLI has two categories:

1. **[Setup commands](/cli/setup-commands)** — instance bootstrap, diagnostics, configuration
2. **[Control-plane commands](/cli/control-plane-commands)** — issues, agents, approvals, activity
