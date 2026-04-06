export const type = "codex_local";
export const label = "Codex (local)";
export const DEFAULT_CODEX_LOCAL_MODEL = "gpt-5.3-codex";
export const DEFAULT_CODEX_LOCAL_BYPASS_APPROVALS_AND_SANDBOX = true;

export const models = [
  { id: "gpt-5.4", label: "gpt-5.4" },
  { id: DEFAULT_CODEX_LOCAL_MODEL, label: DEFAULT_CODEX_LOCAL_MODEL },
  { id: "gpt-5.3-codex-spark", label: "gpt-5.3-codex-spark" },
  { id: "gpt-5", label: "gpt-5" },
  { id: "o3", label: "o3" },
  { id: "o4-mini", label: "o4-mini" },
  { id: "gpt-5-mini", label: "gpt-5-mini" },
  { id: "gpt-5-nano", label: "gpt-5-nano" },
  { id: "o3-mini", label: "o3-mini" },
  { id: "codex-mini-latest", label: "Codex Mini" },
];

export const agentConfigurationDoc = `# codex_local 智能体配置

适配器：codex_local

核心字段：
- cwd（string，可选）：智能体进程的默认绝对工作目录兜底值；如果目录不存在，会在可能时自动创建
- instructionsFilePath（string，可选）：Markdown 指令文件的绝对路径；运行时会被追加到 stdin prompt 之前
- model（string，可选）：Codex 模型 ID
- modelReasoningEffort（string，可选）：推理强度覆盖值（minimal|low|medium|high），通过 \`-c model_reasoning_effort=...\` 传入
- promptTemplate（string，可选）：运行 prompt 模板
- search（boolean，可选）：是否以 \`--search\` 运行 codex
- dangerouslyBypassApprovalsAndSandbox（boolean，可选）：是否启用 bypass 标志运行
- command（string，可选）：命令，默认是 \`codex\`
- extraArgs（string[]，可选）：额外 CLI 参数
- env（object，可选）：KEY=VALUE 形式的环境变量
- workspaceStrategy（object，可选）：执行工作区策略；当前支持 \`{ type: "git_worktree", baseRef?, branchTemplate?, worktreeParentDir? }\`
- workspaceRuntime（object，可选）：工作区运行时服务意图；本地主机托管的服务会在 Codex 启动前准备好，并通过上下文或环境变量暴露给智能体

运行字段：
- timeoutSec（number，可选）：运行超时时间，单位秒
- graceSec（number，可选）：发送 SIGTERM 后的宽限时间，单位秒

说明：
- Prompt 通过 stdin 管道传入（Codex 接收 \`"-"\` 作为 prompt 参数）。
- 如果配置了 instructionsFilePath，Paperclip 会在每次运行时把该文件内容追加到 stdin prompt 前面。
- Codex exec 会自动应用当前工作区中的仓库级 AGENTS.md 指令。Paperclip 目前无法在 exec 模式下屏蔽这一发现逻辑，因此即使你只配置了显式 instructionsFilePath，仓库内的 AGENTS.md 仍可能生效。
- Paperclip 会在执行时把期望的本地技能注入到实际使用的 CODEX_HOME/skills/ 目录中，这样 Codex 能发现 "$paperclip" 等相关技能，同时不会污染项目工作目录。在 managed-home 模式下（默认值），路径是 ~/.paperclip/instances/<id>/companies/<companyId>/codex-home/skills/；如果在 adapter config 中显式覆盖了 CODEX_HOME，则使用该覆盖值。
- 除非在 adapter config 中显式覆盖，否则 Paperclip 会在当前实例下为每个公司使用托管的 CODEX_HOME，并从共享 Codex home（环境变量 CODEX_HOME 指向的位置，或 ~/.codex）复制认证和配置。
- 某些模型/工具组合会拒绝部分推理强度设置（例如启用 web search 时使用 minimal）。
- 当 Paperclip 为某次运行准备好工作区或运行时后，会为智能体侧工具注入 PAPERCLIP_WORKSPACE_* 和 PAPERCLIP_RUNTIME_* 环境变量。
`;
