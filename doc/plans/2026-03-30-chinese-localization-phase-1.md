# Chinese Localization Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让项目先具备可直接使用的中文体验，并让默认 agent 指令明确要求模型以中文回复。

**Architecture:** 先在默认 onboarding 指令模板中加入中文回复规则，并把默认 agent/CEO 指令资源翻译为中文。随后汉化 agent 配置相关 UI 与 LLM 说明，最后补一批核心仓库文档，保证默认产品入口和说明链路都变成中文。

**Tech Stack:** TypeScript, Express, React, Vitest, Markdown

---

### Task 1: 默认指令中文化与回复规则

**Files:**
- Create: `server/src/__tests__/default-agent-instructions.test.ts`
- Modify: `server/src/onboarding-assets/default/AGENTS.md`
- Modify: `server/src/onboarding-assets/ceo/AGENTS.md`
- Modify: `server/src/onboarding-assets/ceo/HEARTBEAT.md`
- Modify: `server/src/onboarding-assets/ceo/SOUL.md`
- Modify: `server/src/onboarding-assets/ceo/TOOLS.md`

- [ ] **Step 1: 编写失败测试**
- [ ] **Step 2: 运行定向测试并确认失败**
- [ ] **Step 3: 翻译默认指令，并加入“默认使用中文回复”的规则**
- [ ] **Step 4: 重新运行测试并确认通过**

### Task 2: Agent 配置与 LLM 说明汉化

**Files:**
- Modify: `ui/src/adapters/codex-local/config-fields.tsx`
- Modify: `ui/src/adapters/claude-local/config-fields.tsx`
- Modify: `ui/src/adapters/cursor/config-fields.tsx`
- Modify: `packages/adapters/codex-local/src/index.ts`
- Modify: `server/src/routes/llms.ts`
- Modify: `ui/src/pages/AgentDetail.tsx`

- [ ] **Step 1: 为关键中文文案补最小验证**
- [ ] **Step 2: 汉化配置字段、提示文案和说明文本**
- [ ] **Step 3: 保持行为不变，仅替换用户可见英文**
- [ ] **Step 4: 运行相关测试或类型检查**

### Task 3: 核心入口文档汉化

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `doc/GOAL.md`
- Modify: `doc/PRODUCT.md`
- Modify: `doc/SPEC-implementation.md`
- Modify: `doc/DEVELOPING.md`
- Modify: `doc/DATABASE.md`

- [ ] **Step 1: 统一核心术语译法**
- [ ] **Step 2: 直接替换入口文档为中文，保留命令、路径、API 路径和代码标识原样**
- [ ] **Step 3: 自查术语一致性**

### Task 4: 验证

**Files:**
- Modify: `doc/plans/2026-03-30-chinese-localization-phase-1.md`

- [ ] **Step 1: 运行新增/相关测试**
- [ ] **Step 2: 运行 `pnpm -r typecheck`**
- [ ] **Step 3: 记录仍未覆盖的全仓文案范围，避免误报已全量完成**
