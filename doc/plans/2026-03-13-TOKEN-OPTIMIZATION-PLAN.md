# Token Optimization Plan

Date: 2026-03-13  
Related discussion: https://github.com/paperclipai/paperclip/discussions/449

## Goal

Reduce token consumption materially without reducing agent capability, control-plane visibility, or task completion quality.

This plan is based on:

- the current V1 control-plane design
- the current adapter and heartbeat implementation
- the linked user discussion
- local runtime data from the default Paperclip instance on 2026-03-13

## Executive Summary

The discussion is directionally right about two things:

1. We should preserve session and prompt-cache locality more aggressively.
2. We should separate stable startup instructions from per-heartbeat dynamic context.

But that is not enough on its own.

After reviewing the code and local run data, the token problem appears to have four distinct causes:

1. **Measurement inflation on sessioned adapters.** Some token counters, especially for `codex_local`, appear to be recorded as cumulative session totals instead of per-heartbeat deltas.
2. **Avoidable session resets.** Task sessions are intentionally reset on timer wakes and manual wakes, which destroys cache locality for common heartbeat paths.
3. **Repeated context reacquisition.** The `paperclip` skill tells agents to re-fetch assignments, issue details, ancestors, and full comment threads on every heartbeat. The API does not currently offer efficient delta-oriented alternatives.
4. **Large static instruction surfaces.** Agent instruction files and globally injected skills are reintroduced at startup even when most of that content is unchanged and not needed for the current task.

The correct approach is:

1. fix telemetry so we can trust the numbers
2. preserve reuse where it is safe
3. make context retrieval incremental
4. add session compaction/rotation so long-lived sessions do not become progressively more expensive

## Validated Findings

### 1. Token telemetry is at least partly overstated today

Observed from the local default instance:

- `heartbeat_runs`: 11,360 runs between 2026-02-18 and 2026-03-13
- summed `usage_json.inputTokens`: `2,272,142,368,952`
- summed `usage_json.cachedInputTokens`: `2,217,501,559,420`

Those totals are not credible as true per-heartbeat usage for the observed prompt sizes.

Supporting evidence:

- `adapter.invoke.payload.prompt` averages were small:
  - `codex_local`: ~193 chars average, 6,067 chars max
  - `claude_local`: ~160 chars average, 1,160 chars max
- despite that, many `codex_local` runs report millions of input tokens
- one reused Codex session in local data spans 3,607 runs and recorded `inputTokens` growing up to `1,155,283,166`

Interpretation:

- for sessioned adapters, especially Codex, we are likely storing usage reported by the runtime as a **session total**, not a **per-run delta**
- this makes trend reporting, optimization work, and customer trust worse

This does **not** mean there is no real token problem. It means we need a trustworthy baseline before we can judge optimization impact.

### 2. Timer wakes currently throw away reusable task sessions

In `server/src/services/heartbeat.ts`, `shouldResetTaskSessionForWake(...)` returns `true` for:

- `wakeReason === "issue_assigned"`
- `wakeSource === "timer"`
- manual on-demand wakes

That means many normal heartbeats skip saved task-session resume even when the workspace is stable.

Local data supports the impact:

- `timer/system` runs: 6,587 total
- only 976 had a previous session
- only 963 ended with the same session

So timer wakes are the largest heartbeat path and are mostly not resuming prior task state.

### 3. We repeatedly ask agents to reload the same task context

The `paperclip` skill currently tells agents to do this on essentially every heartbeat:

- fetch assignments
- fetch issue details
- fetch ancestor chain
- fetch full issue comments

Current API shape reinforces that pattern:

- `GET /api/issues/:id/comments` returns the full thread
- there is no `since`, cursor, digest, or summary endpoint for heartbeat consumption
- `GET /api/issues/:id` returns full enriched issue context, not a minimal delta payload

This is safe but expensive. It forces the model to repeatedly consume unchanged information.

### 4. Static instruction payloads are not separated cleanly from dynamic heartbeat prompts

The user discussion suggested a bootstrap prompt. That is the right direction.

Current state:

- the UI exposes `bootstrapPromptTemplate`
- adapter execution paths do not currently use it
- several adapters prepend `instructionsFilePath` content directly into the per-run prompt or system prompt

Result:

- stable instructions are re-sent or re-applied in the same path as dynamic heartbeat content
- we are not deliberately optimizing for provider prompt caching

### 5. We inject more skill surface than most agents need

Local adapters inject repo skills into runtime skill directories.

Important `codex_local` nuance:

- Codex does not read skills directly from the active worktree.
- Paperclip discovers repo skills from the current checkout, then symlinks them into `$CODEX_HOME/skills` or `~/.codex/skills`.
- If an existing Paperclip skill symlink already points at another live checkout, the current implementation skips it instead of repointing it.
- This can leave Codex using stale skill content from a different worktree even after Paperclip-side skill changes land.
- That is both a correctness risk and a token-analysis risk, because runtime behavior may not reflect the instructions in the checkout being tested.

Current repo skill sizes:

- `skills/paperclip/SKILL.md`: 17,441 bytes
- `.agents/skills/create-agent-adapter/SKILL.md`: 31,832 bytes
- `skills/paperclip-create-agent/SKILL.md`: 4,718 bytes
- `skills/para-memory-files/SKILL.md`: 3,978 bytes

That is nearly 58 KB of skill markdown before any company-specific instructions.

Not all of that is necessarily loaded into model context every run, but it increases startup surface area and should be treated as a token budget concern.

## Principles

We should optimize tokens under these rules:

1. **Do not lose functionality.** Agents must still be able to resume work safely, understand why tasks exist, and act within governance rules.
2. **Prefer stable context over repeated context.** Unchanged instructions should not be resent through the most expensive path.
3. **Prefer deltas over full reloads.** Heartbeats should consume only what changed since the last useful run.
4. **Measure normalized deltas, not raw adapter claims.** Especially for sessioned CLIs.
5. **Keep escape hatches.** Board/manual runs may still want a forced fresh session.

## Plan

## Phase 1: Make token telemetry trustworthy

This should happen first.

### Changes

- Store both:
  - raw adapter-reported usage
  - Paperclip-normalized per-run usage
- For sessioned adapters, compute normalized deltas against prior usage for the same persisted session.
- Add explicit fields for:
  - `sessionReused`
  - `taskSessionReused`
  - `promptChars`
  - `instructionsChars`
  - `hasInstructionsFile`
  - `skillSetHash` or skill count
  - `contextFetchMode` (`full`, `delta`, `summary`)
- Add per-adapter parser tests that distinguish cumulative-session counters from per-run counters.

### Why

Without this, we cannot tell whether a reduction came from a real optimization or a reporting artifact.

### Success criteria

- per-run token totals stop exploding on long-lived sessions
- a resumed session’s usage curve is believable and monotonic at the session level, but not double-counted at the run level
- cost pages can show both raw and normalized numbers while we migrate

## Phase 2: Preserve safe session reuse by default

This is the highest-leverage behavior change.

### Changes

- Stop resetting task sessions on ordinary timer wakes.
- Keep resetting on:
  - explicit manual “fresh run” invocations
  - assignment changes
  - workspace mismatch
  - model mismatch / invalid resume errors
- Add an explicit wake flag like `forceFreshSession: true` when the board wants a reset.
- Record why a session was reused or reset in run metadata.

### Why

Timer wakes are the dominant heartbeat path. Resetting them destroys both session continuity and prompt cache reuse.

### Success criteria

- timer wakes resume the prior task session in the large majority of stable-workspace cases
- no increase in stale-session failures
- lower normalized input tokens per timer heartbeat

## Phase 3: Separate static bootstrap context from per-heartbeat context

This is the right version of the discussion’s bootstrap idea.

### Changes

- Implement `bootstrapPromptTemplate` in adapter execution paths.
- Use it only when starting a fresh session, not on resumed sessions.
- Keep `promptTemplate` intentionally small and stable:
  - who I am
  - what triggered this wake
  - which task/comment/approval to prioritize
- Move long-lived setup text out of recurring per-run prompts where possible.
- Add UI guidance and warnings when `promptTemplate` contains high-churn or large inline content.

### Why

Static instructions and dynamic wake context have different cache behavior and should be modeled separately.

For `codex_local`, this also requires isolating the Codex skill home per worktree or teaching Paperclip to repoint its own skill symlinks when the source checkout changes. Otherwise prompt and skill improvements in the active worktree may not reach the running agent.

### Success criteria

- fresh-session prompts can remain richer without inflating every resumed heartbeat
- resumed prompts become short and structurally stable
- cache hit rates improve for session-preserving adapters

## Phase 4: Make issue/task context incremental

This is the biggest product change and likely the biggest real token saver after session reuse.

### Changes

Add heartbeat-oriented endpoints and skill behavior:

- `GET /api/agents/me/inbox-lite`
  - minimal assignment list
  - issue id, identifier, status, priority, updatedAt, lastExternalCommentAt
- `GET /api/issues/:id/heartbeat-context`
  - compact issue state
  - parent-chain summary
  - latest execution summary
  - change markers
- `GET /api/issues/:id/comments?after=<cursor>` or `?since=<timestamp>`
  - return only new comments
- optional `GET /api/issues/:id/context-digest`
  - server-generated compact summary for heartbeat use

Update the `paperclip` skill so the default pattern becomes:

1. fetch compact inbox
2. fetch compact task context
3. fetch only new comments unless this is the first read, a mention-triggered wake, or a cache miss
4. fetch full thread only on demand

### Why

Today we are using full-fidelity board APIs as heartbeat APIs. That is convenient but token-inefficient.

### Success criteria

- after first task acquisition, most heartbeats consume only deltas
- repeated blocked-task or long-thread work no longer replays the whole comment history
- mention-triggered wakes still have enough context to respond correctly

## Phase 5: Add session compaction and controlled rotation

This protects against long-lived session bloat.

### Changes

- Add rotation thresholds per adapter/session:
  - turns
  - normalized input tokens
  - age
  - cache hit degradation
- Before rotating, produce a structured carry-forward summary:
  - current objective
  - work completed
  - open decisions
  - blockers
  - files/artifacts touched
  - next recommended action
- Persist that summary in task session state or runtime state.
- Start the next session with:
  - bootstrap prompt
  - compact carry-forward summary
  - current wake trigger

### Why

Even when reuse is desirable, some sessions become too expensive to keep alive indefinitely.

### Success criteria

- very long sessions stop growing without bound
- rotating a session does not cause loss of task continuity
- successful task completion rate stays flat or improves

## Phase 6: Reduce unnecessary skill surface

### Changes

- Move from “inject all repo skills” to an allowlist per agent or per adapter.
- Default local runtime skill set should likely be:
  - `paperclip`
- Add opt-in skills for specialized agents:
  - `paperclip-create-agent`
  - `para-memory-files`
  - `create-agent-adapter`
- Expose active skill set in agent config and run metadata.
- For `codex_local`, either:
  - run with a worktree-specific `CODEX_HOME`, or
  - treat Paperclip-owned Codex skill symlinks as repairable when they point at a different checkout

### Why

Most agents do not need adapter-authoring or memory-system skills on every run.

### Success criteria

- smaller startup instruction surface
- no loss of capability for specialist agents that explicitly need extra skills

## Rollout Order

Recommended order:

1. telemetry normalization
2. timer-wake session reuse
3. bootstrap prompt implementation
4. heartbeat delta APIs + `paperclip` skill rewrite
5. session compaction/rotation
6. skill allowlists

## Acceptance Metrics

We should treat this plan as successful only if we improve both efficiency and task outcomes.

Primary metrics:

- normalized input tokens per successful heartbeat
- normalized input tokens per completed issue
- cache-hit ratio for sessioned adapters
- session reuse rate by invocation source
- fraction of heartbeats that fetch full comment threads

Guardrail metrics:

- task completion rate
- blocked-task rate
- stale-session failure rate
- manual intervention rate
- issue reopen rate after agent completion

Initial targets:

- 30% to 50% reduction in normalized input tokens per successful resumed heartbeat
- 80%+ session reuse on stable timer wakes
- 80%+ reduction in full-thread comment reloads after first task read
- no statistically meaningful regression in completion rate or failure rate

## Concrete Engineering Tasks

1. Add normalized usage fields and migration support for run analytics.
2. Patch sessioned adapter accounting to compute deltas from prior session totals.
3. Change `shouldResetTaskSessionForWake(...)` so timer wakes do not reset by default.
4. Implement `bootstrapPromptTemplate` end-to-end in adapter execution.
5. Add compact heartbeat context and incremental comment APIs.
6. Rewrite `skills/paperclip/SKILL.md` around delta-fetch behavior.
7. Add session rotation with carry-forward summaries.
8. Replace global skill injection with explicit allowlists.
9. Fix `codex_local` skill resolution so worktree-local skill changes reliably reach the runtime.

## Recommendation

Treat this as a two-track effort:

- **Track A: correctness and no-regret wins**
  - telemetry normalization
  - timer-wake session reuse
  - bootstrap prompt implementation
- **Track B: structural token reduction**
  - delta APIs
  - skill rewrite
  - session compaction
  - skill allowlists

If we only do Track A, we will improve things, but agents will still re-read too much unchanged task context.

If we only do Track B without fixing telemetry first, we will not be able to prove the gains cleanly.

---

## Addendum: Claude Code 源码分析补充策略（2026-04-11）

基于对 Claude Code v2.1.88 源码的逆向分析（详见 `CLAUDE_CODE_ARCHITECTURE_ANALYSIS.md`），补充以下经过生产验证的优化模式：

### A1: 工具结果预算机制（Tool Result Budget System）

**Claude Code 实现**：
- 单工具阈值：50K chars（超出部分持久化到磁盘，只传 preview + 文件路径）
- 单消息聚合阈值：200K chars（防止 N 个并行工具结果集体溢出上下文窗口）

**Paperclip 应用**：
- 在 adapter-utils 中实现 `ContextBudgeter` 接口
- 当 heartbeat context + 工具输出超过自适应阈值时，提前触发 session rotation
- 启发式规则：若 `context + lastRunStdout > budgetTokens * 0.4`，标记需要 rotation

### A2: 渐进式上下文压缩管线（Progressive Context Compression）

**Claude Code 实现**（6 级压缩）：
1. 工具结果预算 → 大结果立即持久化到磁盘
2. Function Result Clearing → 旧工具结果替换为 `[Old tool result content cleared]`
3. Tool Use Summarization → 后台生成工具调用的紧凑摘要
4. Auto-Compact → 接近上下文窗口限制时全量摘要
5. Partial Compact → 只摘要前缀消息，保留近期消息原文
6. Transcript Reference → 压缩后仍可通过 Read 工具读取完整transcript

**Paperclip 应用**：
- Phase 5 session compaction 应参考此管线设计 carry-forward summary
- 在 session handoff markdown 中采用结构化 9 段摘要模板（Primary Request、Key Concepts、Files Touched、Errors、Problem Solving、User Messages、Pending Tasks、Current Work、Next Step）
- carry-forward summary 生成时使用 `<analysis>` scratchpad 模式：先让模型在 scratchpad 中推理，再提取结构化摘要，scratchpad 内容不进入最终上下文

### A3: 静态工具描述 + 动态附件分离

**Claude Code 实现**：
- Agent 列表从工具描述（会破坏工具 schema 缓存）移到 `system-reminder` 附件消息
- 工具描述变为静态（"Available agent types are listed in system-reminder messages"）
- 动态内容通过消息附件自由更新，不影响缓存

**Paperclip 应用**：
- Skill 内容注入时，将稳定的 API 文档和流程说明作为 bootstrap（可缓存）
- 将动态的 agent 列表、项目上下文等作为 per-heartbeat 注入
- 这与 Phase 3 的 bootstrap/heartbeat 分离互补

### A4: 缓存效率度量

**Claude Code 实现**：
- 跟踪 `cachedInputTokens` vs `inputTokens`
- 用 `DANGEROUS_uncachedSystemPromptSection` 命名惯例防止意外破坏缓存

**Paperclip 应用**：
- 在 costService 中新增计算指标：`cacheHitRate = cachedInputTokens / (cachedInputTokens + inputTokens)`
- 月度基线存储在 agent state JSON 中
- 当 cache hit rate < 0.2 时报警（上下文太不稳定或 bootstrap 太小）
- 当 cache hit rate > 0.7 时确认优化有效
- Dashboard 增加缓存效率趋势图

### A5: Post-Compact 文件恢复

**Claude Code 实现**：
- 压缩后自动重新注入最近读取的 5 个文件（50K token 预算，每文件 5K）
- 同时恢复最近加载的 skill 指令（25K 预算）

**Paperclip 应用**：
- Session rotation 时，carry-forward summary 应包含"活跃文件列表"
- 新 session 的 bootstrap 中可选择性注入关键文件内容的摘要
- 在 `evaluateSessionCompaction()` 中跟踪最近读取的文件列表

### 优先级建议

| 策略 | 影响 | 复杂度 | 建议阶段 |
|------|------|--------|----------|
| A3: 静态/动态分离 | 高 | 低 | Phase 3 实施时一并完成 |
| A4: 缓存效率度量 | 中 | 低 | Phase 1 实施时一并完成 |
| A2: 渐进压缩管线 | 高 | 高 | Phase 5 实施时采用 |
| A1: 工具结果预算 | 中 | 中 | Phase 5 之后单独实施 |
| A5: Post-Compact 恢复 | 中 | 中 | Phase 5 实施时一并完成 |
