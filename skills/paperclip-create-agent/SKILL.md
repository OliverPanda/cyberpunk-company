---
name: cyberpunk-company-create-agent
description: >
  Create new agents in Cyberpunk Company with governance-aware hiring. Use when you need
  to inspect adapter configuration options, compare existing agent configs,
  draft a new agent prompt/config, and submit a hire request.
---

# Cyberpunk Company Create Agent Skill

Use this skill when you are asked to hire/create an agent.

## Preconditions

You need either:

- board access, or
- agent permission `can_create_agents=true` in your company

If you do not have this permission, escalate to your CEO or board.

## Workflow

1. Confirm identity and company context.

```sh
curl -sS "$CYBERPUNK_API_URL/api/agents/me" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY"
```

2. Discover available adapter configuration docs for this Cyberpunk Company instance.

```sh
curl -sS "$CYBERPUNK_API_URL/llms/agent-configuration.txt" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY"
```

3. Read adapter-specific docs (example: `claude_local`).

```sh
curl -sS "$CYBERPUNK_API_URL/llms/agent-configuration/claude_local.txt" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY"
```

4. Compare existing agent configurations in your company.

```sh
curl -sS "$CYBERPUNK_API_URL/api/companies/$CYBERPUNK_COMPANY_ID/agent-configurations" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY"
```

5. Discover allowed agent icons and pick one that matches the role.

```sh
curl -sS "$CYBERPUNK_API_URL/llms/agent-icons.txt" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY"
```

6. Draft the new hire config:
- role/title/name
- icon (required in practice; use one from `/llms/agent-icons.txt`)
- reporting line (`reportsTo`)
- adapter type
- optional `desiredSkills` from the company skill library when this role needs installed skills on day one
- adapter and runtime config aligned to this environment
- capabilities
- run prompt in adapter config (`promptTemplate` where applicable) — **every promptTemplate MUST include the following language rule block**:

  ```
  ## 回复规则

  - 默认使用中文回复，除非董事会、任务内容或外部接口明确要求使用其他语言。
  - 写评论、状态更新、计划说明和交接内容时，优先使用简洁中文。
  - 保留代码、命令、路径、API 名称和其他必须保持原样的技术标识。
  ```

- source issue linkage (`sourceIssueId` or `sourceIssueIds`) when this hire came from an issue

7. Submit hire request.

```sh
curl -sS -X POST "$CYBERPUNK_API_URL/api/companies/$CYBERPUNK_COMPANY_ID/agent-hires" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CTO",
    "role": "cto",
    "title": "Chief Technology Officer",
    "icon": "crown",
    "reportsTo": "<ceo-agent-id>",
    "capabilities": "Owns technical roadmap, architecture, staffing, execution",
    "desiredSkills": ["vercel-labs/agent-browser/agent-browser"],
    "adapterType": "codex_local",
    "adapterConfig": {"cwd": "/abs/path/to/repo", "model": "o4-mini"},
    "runtimeConfig": {"heartbeat": {"enabled": true, "intervalSec": 300, "wakeOnDemand": true}},
    "sourceIssueId": "<issue-id>"
  }'
```

8. Handle governance state:
- if response has `approval`, hire is `pending_approval`
- monitor and discuss on approval thread
- when the board approves, you will be woken with `CYBERPUNK_APPROVAL_ID`; read linked issues and close/comment follow-up

```sh
curl -sS "$CYBERPUNK_API_URL/api/approvals/<approval-id>" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY"

curl -sS -X POST "$CYBERPUNK_API_URL/api/approvals/<approval-id>/comments" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"body":"## CTO hire request submitted\n\n- Approval: [<approval-id>](/approvals/<approval-id>)\n- Pending agent: [<agent-ref>](/agents/<agent-url-key-or-id>)\n- Source issue: [<issue-ref>](/issues/<issue-identifier-or-id>)\n\nUpdated prompt and adapter config per board feedback."}'
```

If the approval already exists and needs manual linking to the issue:

```sh
curl -sS -X POST "$CYBERPUNK_API_URL/api/issues/<issue-id>/approvals" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"approvalId":"<approval-id>"}'
```

After approval is granted, run this follow-up loop:

```sh
curl -sS "$CYBERPUNK_API_URL/api/approvals/$CYBERPUNK_APPROVAL_ID" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY"

curl -sS "$CYBERPUNK_API_URL/api/approvals/$CYBERPUNK_APPROVAL_ID/issues" \
  -H "Authorization: Bearer $CYBERPUNK_API_KEY"
```

For each linked issue, either:
- close it if approval resolved the request, or
- comment in markdown with links to the approval and next actions.

## Quality Bar

Before sending a hire request:

- if the role needs skills, make sure they already exist in the company library or install them first using the Cyberpunk Company company-skills workflow
- Reuse proven config patterns from related agents where possible.
- Set a concrete `icon` from `/llms/agent-icons.txt` so the new hire is identifiable in org and task views.
- Avoid secrets in plain text unless required by adapter behavior.
- Ensure reporting line is correct and in-company.
- Ensure prompt is role-specific and operationally scoped.
- If board requests revision, update payload and resubmit through approval flow.

For endpoint payload shapes and full examples, read:
`skills/cyberpunk-company-create-agent/references/api-reference.md`
