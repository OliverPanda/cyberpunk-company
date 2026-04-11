# Claude Code Architecture Analysis

Reverse-engineered from https://github.com/hangsman/claude-code-source (v2.1.88).
Analysis date: 2026-04-11.

---

## 1. System Prompt Architecture

### 1.1 Two-Zone Prompt Caching Strategy

**What:** The system prompt is split into a **static zone** (cacheable across users/orgs) and a **dynamic zone** (per-session). A sentinel marker `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` separates them.

**Why:** Everything before the boundary gets `scope: 'global'` caching, meaning it can be reused across different users within the same org. This dramatically reduces `cache_creation` tokens on the API. The source comments note that the dynamic agent list alone was "~10.2% of fleet cache_creation tokens."

**How it works:**
```
[Static: intro, system rules, doing-tasks, actions, tool-usage, tone, output-efficiency]
__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__
[Dynamic: session guidance, memory, env info, language, MCP instructions, etc.]
```

**Key code:** `src/constants/prompts.ts:113-115`

**Actionable insight:** Any agent system can partition its system prompt into a stable prefix (behavioral rules, tool descriptions) and a volatile suffix (session context, user preferences). This lets the API cache the expensive prefix across calls.

### 1.2 Memoized vs. Volatile Prompt Sections

**What:** Two factories for prompt sections:
- `systemPromptSection(name, compute)` -- computed once, cached until `/clear` or `/compact`
- `DANGEROUS_uncachedSystemPromptSection(name, compute, reason)` -- recomputed every turn, busts prompt cache

**Why:** The `DANGEROUS_` prefix is intentional friction. Most sections should be cached. The only volatile section in practice is MCP instructions (servers connect/disconnect between turns). The naming convention forces developers to document why cache-busting is needed.

**Key code:** `src/constants/systemPromptSections.ts:20-38`

**Actionable insight:** Treat prompt cache-busting as a code smell. Require explicit justification (the `_reason` parameter) for any section that recomputes per-turn.

### 1.3 Structured Prompt Composition

**What:** The system prompt is built from named, ordered sections returned as a `string[]`, each addressing a specific concern:

1. **Intro** -- Identity and core constraints (cyber risk instruction)
2. **System** -- Tool result handling, permission modes, hook feedback
3. **Doing Tasks** -- Code style rules, error handling approach, simplicity principles
4. **Actions** -- Reversibility/blast-radius reasoning framework
5. **Using Your Tools** -- Tool selection hierarchy (dedicated tools > Bash)
6. **Tone and Style** -- No emojis, file:line references, GitHub link formatting
7. **Output Efficiency** -- Conciseness rules with numeric anchors ("<=25 words between tool calls")
8. **[BOUNDARY]**
9. **Session Guidance** -- Agent tool usage, fork semantics, skill discovery
10. **Memory** -- CLAUDE.md contents
11. **Env Info** -- CWD, platform, git status, model name, knowledge cutoff

**Key behavioral rules embedded in the prompt:**
- "Don't add features, refactor code, or make 'improvements' beyond what was asked"
- "Three similar lines of code is better than a premature abstraction"
- "If an approach fails, diagnose why before switching tactics -- read the error, check your assumptions"
- "Report outcomes faithfully: if tests fail, say so with the relevant output"
- "Before reporting a task complete, verify it actually works: run the test, execute the script"

**Actionable insight:** The prompt is extremely prescriptive about common failure modes of LLMs (over-engineering, abandoning approaches too early, fabricating results). Each rule targets a specific observed misbehavior.

### 1.4 Numeric Length Anchors

**What:** For internal users: "keep text between tool calls to <=25 words. Keep final responses to <=100 words unless the task requires more detail."

**Why:** Research showed ~1.2% output token reduction vs qualitative "be concise." Concrete numbers outperform vague instructions.

**Key code:** `src/constants/prompts.ts:529-536`

### 1.5 The "Actions" Framework -- Reversibility/Blast-Radius Reasoning

**What:** Rather than listing banned operations, the prompt teaches a reasoning framework: "Carefully consider the reversibility and blast radius of actions." It categorizes actions as:
- Local, reversible (freely take)
- Hard to reverse (confirm first)
- Visible to others / shared state (confirm first)

**Why:** Rule-based safety is brittle. Teaching the model to *reason about risk* produces better generalization than enumerating forbidden commands.

**Key code:** `src/constants/prompts.ts:255-267`

---

## 2. Tool Orchestration

### 2.1 Concurrency Partitioning

**What:** Tool calls from a single assistant message are partitioned into batches:
- Consecutive **concurrency-safe** tools run in parallel (up to 10 concurrent)
- **Non-concurrency-safe** tools run serially

The partitioning uses `isConcurrencySafe(input)` on each tool -- this is input-dependent (e.g., a Bash `ls` is safe, a Bash `rm` is not).

**Key code:** `src/services/tools/toolOrchestration.ts:91-116`

```
[Read, Read, Grep, Write, Read, Read]
 --> Batch 1: [Read, Read, Grep] (parallel)
 --> Batch 2: [Write] (serial)
 --> Batch 3: [Read, Read] (parallel)
```

**Why:** Maximizes throughput for read-heavy workflows while preserving ordering guarantees for writes.

### 2.2 Streaming Tool Executor

**What:** A `StreamingToolExecutor` class can start executing tools **while the model is still streaming**. It tracks tools through states: `queued -> executing -> completed -> yielded`.

**Key behaviors:**
- Concurrent-safe tools start immediately as they stream in
- Non-concurrent tools wait for exclusive access
- Results are buffered and emitted in order (preserving tool-use ID ordering)
- A sibling abort controller kills concurrent tools if one Bash tool errors

**Key code:** `src/services/tools/StreamingToolExecutor.ts`

**Actionable insight:** Starting tool execution before the model finishes streaming saves significant wall-clock time. The key is tracking tool dependencies and having a rollback mechanism (the `discard()` method) for when streaming fallback occurs.

### 2.3 Tool Result Budget System

**What:** Large tool results are persisted to disk instead of staying in context:
- Per-tool threshold: `maxResultSizeChars` (default 50K chars)
- Per-message aggregate: 200K chars across all parallel tool results in one turn
- Results exceeding thresholds are saved to `tool-results/` on disk, and Claude receives a preview + file path

**Key code:** `src/utils/toolResultStorage.ts`, `src/constants/toolLimits.ts`

**Why:** Without this, N parallel grep/read operations could collectively inject 400K+ characters into one turn, consuming the entire context window. The per-message budget is the critical innovation -- individual tools can be under their limits but collectively overflow.

### 2.4 Tool Search / Deferred Loading

**What:** When `ToolSearch` is enabled, less-commonly-used tools are sent to the API with `defer_loading: true`. The model must call `ToolSearch` to discover and select deferred tools before using them. Each tool has a `searchHint` (3-10 words) for keyword matching.

**Why:** Reduces initial prompt size by deferring tools that aren't needed on most turns. The model pays a one-turn latency cost only when it needs a specialized tool.

**Key code:** `src/tools/ToolSearchTool/ToolSearchTool.ts`

### 2.5 The `buildTool` Pattern -- Fail-Closed Defaults

**What:** All tools are constructed via `buildTool(def)` which spreads safe defaults:
- `isEnabled` -> `true`
- `isConcurrencySafe` -> `false` (assume unsafe)
- `isReadOnly` -> `false` (assume writes)
- `isDestructive` -> `false`
- `checkPermissions` -> `allow` (defer to general permission system)

**Why:** Fail-closed on the dangerous axis: unknown tools are assumed to be non-concurrent and non-read-only. This prevents a missing implementation from accidentally bypassing safety checks.

**Key code:** `src/Tool.ts:757-792`

---

## 3. Memory & Context Management

### 3.1 Four-Tier Memory Hierarchy

**What:** Memory files (CLAUDE.md) are loaded in priority order:
1. **Managed** (`/etc/claude-code/CLAUDE.md`) -- org-wide
2. **User** (`~/.claude/CLAUDE.md`) -- personal global
3. **Project** (`CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md`) -- repo-level
4. **Local** (`CLAUDE.local.md`) -- personal project-specific (gitignored)

Files closer to the current directory have higher priority (loaded later, so the model pays more attention).

**Key code:** `src/utils/claudemd.ts:1-26`

The memory instruction prompt explicitly states: "These instructions OVERRIDE any default behavior and you MUST follow them exactly as written."

**Actionable insight:** A hierarchical memory system with clear priority ordering (global < user < project < local) lets organizations set defaults that individual users can override, and projects can override both.

### 3.2 @include Directive

**What:** Memory files can include other files using `@path`, `@./relative/path`, `@~/home/path`, or `@/absolute/path`. Included files become separate entries. Circular references are detected and prevented.

**Why:** Allows modular memory organization without duplicating content across files.

### 3.3 Auto-Compact with Partial Compaction

**What:** When context exceeds `contextWindowSize - 13K tokens`, auto-compact fires. There are two modes:
- **Full compact:** Summarizes the entire conversation
- **Partial compact:** Summarizes only a prefix of messages, preserving recent messages verbatim

The compact prompt uses an `<analysis>` scratchpad (stripped from the final summary) followed by a structured `<summary>` with 9 sections:
1. Primary Request and Intent
2. Key Technical Concepts
3. Files and Code Sections
4. Errors and fixes
5. Problem Solving
6. All user messages
7. Pending Tasks
8. Current Work
9. Optional Next Step

**Key code:** `src/services/compact/prompt.ts`

**Critical design detail:** The compact prompt aggressively prevents tool use: "CRITICAL: Respond with TEXT ONLY. Do NOT call any tools. Tool calls will be REJECTED and will waste your only turn." This appears both as a preamble AND a trailer, because newer models sometimes ignore one placement.

### 3.4 Post-Compact File Restoration

**What:** After compaction, the system re-injects the top 5 most recently read files (up to 50K tokens total, 5K per file) and recently loaded skill instructions (25K budget). This ensures the model doesn't lose access to actively-used file contents.

**Key code:** `src/services/compact/compact.ts:122-129`

### 3.5 Session Memory (Background Extraction)

**What:** A background forked subagent periodically extracts key information from the conversation into a session-specific markdown file. It runs without interrupting the main conversation flow, using the `runForkedAgent` utility.

**Key code:** `src/services/SessionMemory/sessionMemory.ts`

### 3.6 Function Result Clearing (FRC)

**What:** A system prompt section instructs the model about how old tool results are handled: tool results beyond a certain age/size are replaced with `[Old tool result content cleared]`. This is a form of progressive context compression where older tool outputs are summarized or dropped while newer ones are preserved verbatim.

### 3.7 Tool Result Summarization

**What:** After each agentic turn, a background summarizer generates compact descriptions of tool uses (visible in the UI as collapsed summaries). These summaries survive compaction and help the model understand what tools were called without needing the full output.

---

## 4. Agent / Sub-Agent Patterns

### 4.1 Fork Subagent Architecture

**What:** When `isForkSubagentEnabled()`, omitting `subagent_type` from the Agent tool creates a **fork** -- a child that inherits the parent's full conversation context and system prompt bytes. The fork runs in the background.

**Key design decisions:**
- Forks share the parent's prompt cache (saves ~50% on cache creation)
- The parent's rendered system prompt bytes are threaded through `toolUseContext.renderedSystemPrompt` to guarantee byte-exact cache matches
- Fork children keep the Agent tool in their pool but `isInForkChild()` prevents recursive forking
- Forks use `model: 'inherit'` to maintain context length parity

**Key code:** `src/tools/AgentTool/forkSubagent.ts`

The prompt explicitly warns: "Don't peek. The tool result includes an output_file path -- do not Read or tail it unless the user explicitly asks for a progress check. Reading the transcript mid-flight pulls the fork's tool noise into your context, which defeats the point of forking."

### 4.2 CacheSafeParams Pattern

**What:** A `CacheSafeParams` struct carries the parameters that must be identical between parent and child for prompt cache sharing: system prompt, user context, system context, tool use context, and fork context messages.

**Why:** The Anthropic API cache key is composed of system prompt + tools + model + message prefix + thinking config. Any divergence invalidates the cache. This struct makes the invariant explicit and shareable.

**Key code:** `src/utils/forkedAgent.ts:47-68`

### 4.3 Agent Definition System

**What:** Agents are defined with:
- `agentType` (string identifier)
- `whenToUse` (natural language description for model selection)
- `tools` (allowlist) / `disallowedTools` (denylist)
- `maxTurns` (turn limit)
- `model` (can be `'inherit'` or specific)
- `permissionMode` (`'bubble'` surfaces prompts to parent terminal)
- `mcpServers` (agent-specific MCP server connections)
- `getSystemPrompt()` (custom system prompt factory)

Built-in agents include: explore, verification, code-reviewer, test-runner, greeting-responder (example).

### 4.4 Agent Result Communication

**What:** Agent results are returned as a single message to the parent. The prompt states: "The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary."

This separation between agent output (for the orchestrator) and user output (for the human) is critical for clean UX.

### 4.5 Background Agent Notifications

**What:** Background agents send `<task-notification>` messages when complete. The system explicitly tells the model: "you will be automatically notified when it completes -- do NOT sleep, poll, or proactively check on its progress."

---

## 5. Permission & Safety System

### 5.1 Multi-Layer Permission Architecture

**What:** Permissions are evaluated in layers:
1. **Tool-level `validateInput()`** -- Schema validation, input sanitization
2. **Tool-level `checkPermissions()`** -- Tool-specific permission logic
3. **Rule-based matching** -- `alwaysAllowRules`, `alwaysDenyRules`, `alwaysAskRules` from settings
4. **Classifier-based** -- Transcript classifier for auto-mode decisions
5. **Hook-based** -- `PreToolUse` / `PostToolUse` hooks from settings.json
6. **User prompt** -- Interactive approval dialog

**Key code:** `src/utils/permissions/permissions.ts`

### 5.2 Bash Security Deep Defense

**What:** The Bash tool has multiple security layers:
- **Command substitution detection**: Blocks `$()`, `${}`, process substitution `<()`, Zsh-specific patterns like `=cmd` expansion
- **Zsh dangerous command blocklist**: `zmodload`, `sysopen`, `syswrite`, `ztcp`, `zsocket`, etc.
- **Read-only command validation**: Extensive allowlists with flag-level validation for git, docker, gh, ripgrep, pyright, etc.
- **Sed validation**: Separate parser to determine if sed commands are read-only or mutating
- **Path validation**: Checks output redirections against allowed directories
- **Heredoc analysis**: Parses heredocs to check for injection attempts

**Key code:** `src/tools/BashTool/bashSecurity.ts`, `src/tools/BashTool/readOnlyValidation.ts`

### 5.3 Denial Tracking with Fallback

**What:** A `DenialTrackingState` counts consecutive permission denials. After a threshold, the system falls back to prompting the user directly rather than continuing to auto-deny. This prevents infinite denial loops.

**Key code:** `src/utils/permissions/denialTracking.ts`

### 5.4 Permission Modes

Modes include: `default` (ask for writes), `plan` (read-only), `bypass` (yolo), and `auto` (classifier-decided). The system tracks `prePlanMode` to restore the previous mode when exiting plan mode.

### 5.5 Classifier-Based Auto-Mode

**What:** A transcript classifier evaluates whether operations are safe in auto-mode. The `yoloClassifier` formats actions for the classifier and interprets verdicts. This enables "trust but verify" automation.

---

## 6. Session Management

### 6.1 Query Loop Architecture

**What:** The core `query()` function is an `AsyncGenerator` that yields stream events, messages, and tombstones. It maintains mutable `State` across loop iterations:
- `messages`, `toolUseContext`, `autoCompactTracking`
- `maxOutputTokensRecoveryCount` (retries on truncation)
- `hasAttemptedReactiveCompact` (one-shot compact on overflow)
- `turnCount`, `stopHookActive`
- `pendingToolUseSummary` (background summarization)

**Key code:** `src/query.ts:200-280`

The loop handles:
- Streaming API responses
- Tool execution (via `runTools`)
- Auto-compaction when context exceeds threshold
- Max output tokens recovery (up to 3 retries)
- Reactive compaction on prompt-too-long errors
- Token budget tracking for "+500k" style requests
- Stop hooks and post-sampling hooks

### 6.2 Transcript Persistence

**What:** Full session transcripts are saved to disk, including a path that compact summaries reference: "If you need specific details from before compaction, read the full transcript at: {transcriptPath}." This gives the model a lifeline to recover pre-compaction details via the Read tool.

### 6.3 Max Output Tokens Recovery

**What:** When the model hits `max_output_tokens`, the system retries up to 3 times with escalated token limits. This handles cases where the model needs more output than the default allows.

### 6.4 Reactive Compaction

**What:** When a `prompt_too_long` error occurs mid-turn, the system can:
1. Truncate the oldest message groups to fit
2. Re-attempt the API call with the truncated context
3. Fall back to full compaction if truncation isn't enough

---

## 7. Novel / Clever Engineering Patterns

### 7.1 System Reminders as Ambient Context

**What:** The system prompt explains that `<system-reminder>` tags "contain useful information and reminders. They are automatically added by the system, and bear no direct relation to the specific tool results or user messages in which they appear."

This creates an ambient context channel where the system can inject timely information (skill suggestions, memory updates, state reminders) into any message without the model treating them as part of the tool output.

### 7.2 The "Don't Peek" Pattern for Background Work

**What:** Fork agents produce an `output_file` path but the system explicitly tells the parent: "do not Read or tail it unless the user explicitly asks." And: "Don't race. After launching, you know nothing about what the fork found. Never fabricate or predict fork results."

This is a clever prompt engineering pattern for preventing the model from contaminating its context with intermediate results or hallucinating completion of delegated work.

### 7.3 Prompt Cache Sharing Across Forks

**What:** The entire fork subagent architecture is designed around sharing prompt cache:
- Forks inherit exact system prompt bytes (not recomputed)
- Same tools, same model, same thinking config
- `CacheSafeParams` makes the invariant explicit
- Setting `maxOutputTokens` on a fork can invalidate cache (documented as a gotcha)

This means spawning 5 parallel forks costs 1x cache creation + 5x cache read, not 6x cache creation.

### 7.4 Progressive Context Compression Pipeline

**What:** Context is managed through a multi-stage pipeline:
1. **Tool result budgeting** -- Large results persisted to disk immediately
2. **Function result clearing** -- Old tool results replaced with stubs over time
3. **Tool use summarization** -- Background summaries of tool calls
4. **Auto-compact** -- Full conversation summarization when approaching limit
5. **Partial compact** -- Summarize prefix, preserve recent messages
6. **Transcript reference** -- Post-compact, model can still Read the full transcript from disk

### 7.5 The `analysis` + `summary` Scratchpad Pattern

**What:** The compact prompt asks for `<analysis>` (thinking/drafting) followed by `<summary>` (final output). The `<analysis>` block is then **stripped** from the result. This gives the model a scratchpad that improves summary quality without polluting the actual context.

**Key code:** `src/services/compact/prompt.ts:311-335`

This is structurally similar to chain-of-thought prompting but with explicit extraction of the reasoning trace.

### 7.6 Agent Listing as Attachment Delta

**What:** The dynamic agent list was moved from the tool description (which busts the tool-schema prompt cache on every change) to a `system-reminder` attachment message. The tool description becomes static ("Available agent types are listed in system-reminder messages") while the actual list updates freely.

This pattern -- making tool descriptions static and injecting dynamic context via message attachments -- is broadly applicable.

### 7.7 Memory File Prefetch with Relevance Scoring

**What:** `startRelevantMemoryPrefetch()` fires once per user turn and runs asynchronously while the model streams. It identifies memory files relevant to the current query and prepares them as attachments. The prefetch is consumed after tool execution, so there's zero added latency.

### 7.8 Hooks as Extension Points

**What:** The system supports user-configurable hooks at multiple lifecycle points:
- `PreToolUse` / `PostToolUse` -- Before/after each tool call
- `pre_compact` / `post_compact` -- Before/after compaction
- `session_start` -- On session initialization
- `instructions_loaded` -- When memory files are loaded
- `prompt_submit` -- When user submits input

Hooks are shell commands defined in settings.json. The system prompt tells the model: "Treat feedback from hooks, including <user-prompt-submit-hook>, as coming from the user."

### 7.9 Embedded Search Tool Adaptation

**What:** On "ant-native" builds, `find` and `grep` are aliased to embedded `bfs`/`ugrep` binaries. When detected, the system prompt removes references to the dedicated Glob/Grep tools and redirects the model to use Bash for search. This adaptation happens at both the prompt level and the tool registration level.

### 7.10 Destructive Operation Classification

**What:** Tools can implement `isDestructive(input)` to flag irreversible operations (delete, overwrite, send). Combined with `isReadOnly(input)`, this creates a three-tier classification:
- Read-only: safe for parallel execution, minimal permission check
- Write (non-destructive): standard permission check
- Destructive: elevated permission check + user confirmation

---

## Summary of Most Actionable Patterns

| Pattern | Impact | Complexity |
|---------|--------|------------|
| Two-zone prompt caching | High (saves cache_creation tokens) | Low |
| Concurrency partitioning | High (2-5x throughput for read-heavy work) | Medium |
| Tool result budget (per-tool + per-message) | High (prevents context overflow) | Medium |
| Fork cache sharing via CacheSafeParams | High (1x creation for N forks) | Medium |
| analysis/summary scratchpad for compaction | Medium (better summaries) | Low |
| Numeric length anchors | Low-Medium (~1.2% token reduction) | Low |
| Deferred tool loading via ToolSearch | Medium (smaller initial prompts) | Medium |
| Static tool descriptions + dynamic attachments | Medium (prevents cache busting) | Low |
| Progressive context compression pipeline | High (enables unlimited sessions) | High |
| Reversibility/blast-radius reasoning framework | Medium (better safety generalization) | Low |
