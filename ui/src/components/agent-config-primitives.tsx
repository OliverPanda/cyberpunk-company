import { useState, useRef, useEffect, useCallback } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { AGENT_ROLE_LABELS } from "@cyberpunk-company/shared";

/* ---- Help text for (?) tooltips ---- */
export const help: Record<string, string> = {
  name: "该智能体的显示名称。",
  title: "在组织架构图中显示的职位名称。",
  role: "组织角色，决定其位置与能力。",
  reportsTo: "该智能体在组织层级中汇报给谁。",
  capabilities: "描述该智能体能做什么。会显示在组织架构图中，并用于任务路由。",
  adapterType: "该智能体的运行方式：本地 CLI（Claude/Codex/OpenCode）、OpenClaw Gateway、派生进程或通用 HTTP webhook。",
  cwd: "已弃用的本地适配器旧版工作目录回退字段。现有智能体可能仍保留该值，但新配置应改用项目工作区。",
  promptTemplate: "每次心跳时都会发送。请保持简短且动态，用于描述当前任务，而不是放大量静态指令。支持 {{ agent.id }}、{{ agent.name }}、{{ agent.role }} 等模板变量。",
  model: "覆盖适配器默认使用的模型。",
  thinkingEffort: "控制模型的推理深度。支持的取值依适配器或模型而定。",
  chrome: "通过传递 --chrome 启用 Claude 的 Chrome 集成。",
  dangerouslySkipPermissions: "在支持时自动批准适配器权限提示，以实现无人值守运行。",
  dangerouslyBypassSandbox: "让 Codex 在无沙箱限制下运行。文件系统或网络访问需要此选项。",
  search: "启用 Codex 在运行期间的网页搜索能力。",
  workspaceStrategy: "指定 Cyberpunk Company 应如何为该智能体创建执行工作区。常规 cwd 执行请使用 project_primary；按事项隔离检出请使用 git_worktree。",
  workspaceBaseRef: "创建工作树分支时使用的 git 基线引用。留空则使用解析后的工作区引用或 HEAD。",
  workspaceBranchTemplate: "派生分支的命名模板。支持 {{issue.identifier}}、{{issue.title}}、{{agent.name}}、{{project.id}}、{{workspace.repoRef}} 和 {{slug}}。",
  worktreeParentDir: "创建派生工作树的目录。支持绝对路径、~ 前缀路径和相对仓库路径。",
  runtimeServicesJson: "可选的工作区运行时服务定义。可用于共享应用服务器、worker 或附着在工作区上的其他长生命周期伴随进程。",
  maxTurnsPerRun: "每次心跳运行允许的最大 agentic 回合数（工具调用数）。",
  command: "要执行的命令（例如 node、python）。",
  localCommand: "覆盖适配器实际调用的 CLI 命令路径（例如 /usr/local/bin/claude、codex、opencode）。",
  args: "命令行参数，使用逗号分隔。",
  extraArgs: "本地适配器的额外 CLI 参数，使用逗号分隔。",
  envVars: "注入到适配器进程中的环境变量。可使用明文值或 secret 引用。",
  bootstrapPrompt: "仅在 Cyberpunk Company 启动一个全新会话时发送。用于稳定的初始化指导，不应在每次心跳时重复。",
  payloadTemplateJson: "可选 JSON，会在 Cyberpunk Company 添加标准唤醒字段和工作区字段之前合并到远程适配器请求体中。",
  webhookUrl: "调用该智能体时接收 POST 请求的 URL。",
  heartbeatInterval: "让该智能体按定时器自动运行。适合周期性任务，例如检查新工作。",
  intervalSec: "自动心跳调用之间的秒数。",
  timeoutSec: "单次运行在被终止前允许持续的最大秒数。0 表示不设超时。",
  graceSec: "发送中断后，在强制杀死进程前等待的秒数。",
  wakeOnDemand: "允许通过分派、API 调用、UI 操作或自动化系统唤醒该智能体。",
  cooldownSec: "连续两次心跳运行之间的最小间隔秒数。",
  maxConcurrentRuns: "该智能体可同时执行的最大心跳运行数。",
  budgetMonthlyCents: "每月支出上限，单位为美分。0 表示不限制。",
};

export const adapterLabels: Record<string, string> = {
  claude_local: "Claude（本地）",
  codex_local: "Codex（本地）",
  gemini_local: "Gemini CLI（本地）",
  opencode_local: "OpenCode（本地）",
  openclaw_gateway: "OpenClaw 网关",
  cursor: "Cursor（本地）",
  hermes_local: "Hermes 智能体",
  process: "进程",
  http: "HTTP 接口",
};

export const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

/* ---- Primitive components ---- */

export function HintIcon({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <HelpCircle className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        {hint && <HintIcon text={hint} />}
      </div>
      {children}
    </div>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {hint && <HintIcon text={hint} />}
      </div>
      <button
        data-slot="toggle"
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          checked ? "bg-green-600" : "bg-muted"
        )}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

export function ToggleWithNumber({
  label,
  hint,
  checked,
  onCheckedChange,
  number,
  onNumberChange,
  numberLabel,
  numberHint,
  numberPrefix,
  showNumber,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  number: number;
  onNumberChange: (v: number) => void;
  numberLabel: string;
  numberHint?: string;
  numberPrefix?: string;
  showNumber: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          {hint && <HintIcon text={hint} />}
        </div>
        <button
          data-slot="toggle"
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
            checked ? "bg-green-600" : "bg-muted"
          )}
          onClick={() => onCheckedChange(!checked)}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
              checked ? "translate-x-4.5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
      {showNumber && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {numberPrefix && <span>{numberPrefix}</span>}
          <input
            type="number"
            className="w-16 rounded-md border border-border px-2 py-0.5 bg-transparent outline-none text-xs font-mono text-center"
            value={number}
            onChange={(e) => onNumberChange(Number(e.target.value))}
          />
          <span>{numberLabel}</span>
          {numberHint && <HintIcon text={numberHint} />}
        </div>
      )}
    </div>
  );
}

export function CollapsibleSection({
  title,
  icon,
  open,
  onToggle,
  bordered,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(bordered && "border-t border-border")}>
      <button
        className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export function AutoExpandTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  minRows,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minRows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rows = minRows ?? 3;
  const lineHeight = 20;
  const minHeight = rows * lineHeight;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [minHeight]);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      className="w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40 resize-none overflow-hidden"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={{ minHeight }}
    />
  );
}

/**
 * Text input that manages internal draft state.
 * Calls `onCommit` on blur (and optionally on every change if `immediate` is set).
 */
export function DraftInput({
  value,
  onCommit,
  immediate,
  className,
  ...props
}: {
  value: string;
  onCommit: (v: string) => void;
  immediate?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className">) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      className={className}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(e.target.value);
      }}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      {...props}
    />
  );
}

/**
 * Auto-expanding textarea with draft state and blur-commit.
 */
export function DraftTextarea({
  value,
  onCommit,
  immediate,
  placeholder,
  minRows,
}: {
  value: string;
  onCommit: (v: string) => void;
  immediate?: boolean;
  placeholder?: string;
  minRows?: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rows = minRows ?? 3;
  const lineHeight = 20;
  const minHeight = rows * lineHeight;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [minHeight]);

  useEffect(() => { adjustHeight(); }, [draft, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      className="w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40 resize-none overflow-hidden"
      placeholder={placeholder}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(e.target.value);
      }}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      style={{ minHeight }}
    />
  );
}

/**
 * Number input with draft state and blur-commit.
 */
export function DraftNumberInput({
  value,
  onCommit,
  immediate,
  className,
  ...props
}: {
  value: number;
  onCommit: (v: number) => void;
  immediate?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className" | "type">) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      type="number"
      className={className}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(Number(e.target.value) || 0);
      }}
      onBlur={() => {
        const num = Number(draft) || 0;
        if (num !== value) onCommit(num);
      }}
      {...props}
    />
  );
}

/**
 * "Choose" button that opens a dialog explaining the user must manually
 * type the path due to browser security limitations.
 */
export function ChoosePathButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors shrink-0"
        onClick={() => setOpen(true)}
      >
        选择
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>手动填写路径</DialogTitle>
            <DialogDescription>
              由于浏览器安全限制，应用无法通过文件选择器读取完整本地路径。
              请复制绝对路径并粘贴到输入框中。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section className="space-y-1.5">
              <p className="font-medium">macOS（Finder）</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>在 Finder 中找到该文件夹。</li>
                <li>按住 <kbd>Option</kbd> 并右键点击文件夹。</li>
                <li>点击“将&lt;文件夹名&gt;复制为路径名”。</li>
                <li>把结果粘贴到路径输入框中。</li>
              </ol>
              <p className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                /Users/yourname/Documents/project
              </p>
            </section>
            <section className="space-y-1.5">
              <p className="font-medium">Windows（文件资源管理器）</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>在文件资源管理器中找到该文件夹。</li>
                <li>按住 <kbd>Shift</kbd> 并右键点击文件夹。</li>
                <li>点击“复制为路径”。</li>
                <li>把结果粘贴到路径输入框中。</li>
              </ol>
              <p className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                C:\Users\yourname\Documents\project
              </p>
            </section>
            <section className="space-y-1.5">
              <p className="font-medium">终端备用方案（macOS/Linux）</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>运行 <code>cd /path/to/folder</code>。</li>
                <li>运行 <code>pwd</code>。</li>
                <li>复制输出并粘贴到路径输入框中。</li>
              </ol>
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Label + input rendered on the same line (inline layout for compact fields).
 */
export function InlineField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 shrink-0">
        <label className="text-xs text-muted-foreground">{label}</label>
        {hint && <HintIcon text={hint} />}
      </div>
      <div className="w-24 ml-auto">{children}</div>
    </div>
  );
}
