---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
pnpm cyberpunk-company issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
pnpm cyberpunk-company issue get <issue-id-or-identifier>

# Create issue
pnpm cyberpunk-company issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
pnpm cyberpunk-company issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
pnpm cyberpunk-company issue comment <issue-id> --body "..." [--reopen]

# Checkout task
pnpm cyberpunk-company issue checkout <issue-id> --agent-id <agent-id>

# Release task
pnpm cyberpunk-company issue release <issue-id>
```

## Company Commands

```sh
pnpm cyberpunk-company company list
pnpm cyberpunk-company company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
pnpm cyberpunk-company company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
pnpm cyberpunk-company company import \
  <owner>/<repo>/<path> \
  --target existing \
  --company-id <company-id> \
  --ref main \
  --collision rename \
  --dry-run

# Apply import
pnpm cyberpunk-company company import \
  ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
pnpm cyberpunk-company agent list
pnpm cyberpunk-company agent get <agent-id>
```

## Approval Commands

```sh
# List approvals
pnpm cyberpunk-company approval list [--status pending]

# Get approval
pnpm cyberpunk-company approval get <approval-id>

# Create approval
pnpm cyberpunk-company approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
pnpm cyberpunk-company approval approve <approval-id> [--decision-note "..."]

# Reject
pnpm cyberpunk-company approval reject <approval-id> [--decision-note "..."]

# Request revision
pnpm cyberpunk-company approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
pnpm cyberpunk-company approval resubmit <approval-id> [--payload '{"..."}']

# Comment
pnpm cyberpunk-company approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm cyberpunk-company activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
pnpm cyberpunk-company dashboard get
```

## Heartbeat

```sh
pnpm cyberpunk-company heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
