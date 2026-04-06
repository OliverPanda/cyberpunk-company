import { useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bot,
  Code,
  Gem,
  MousePointer2,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OpenCodeLogoIcon } from "./OpenCodeLogoIcon";
import { HermesIcon } from "./HermesIcon";

type AdvancedAdapterType =
  | "claude_local"
  | "codex_local"
  | "gemini_local"
  | "opencode_local"
  | "pi_local"
  | "cursor"
  | "openclaw_gateway"
  | "hermes_local";

const ADVANCED_ADAPTER_OPTIONS: Array<{
  value: AdvancedAdapterType;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  recommended?: boolean;
}> = [
  {
    value: "claude_local",
    label: "Claude Code",
    icon: Sparkles,
    desc: "本地 Claude 智能体",
    recommended: true,
  },
  {
    value: "codex_local",
    label: "Codex",
    icon: Code,
    desc: "本地 Codex 智能体",
    recommended: true,
  },
  {
    value: "gemini_local",
    label: "Gemini CLI",
    icon: Gem,
    desc: "本地 Gemini 智能体",
  },
  {
    value: "opencode_local",
    label: "OpenCode",
    icon: OpenCodeLogoIcon,
    desc: "本地多模型提供方智能体",
  },
  {
    value: "hermes_local",
    label: "Hermes 智能体",
    icon: HermesIcon,
    desc: "本地多模型提供方智能体",
  },
  {
    value: "pi_local",
    label: "Pi",
    icon: Terminal,
    desc: "本地 Pi 智能体",
  },
  {
    value: "cursor",
    label: "Cursor",
    icon: MousePointer2,
    desc: "本地 Cursor 智能体",
  },
  {
    value: "openclaw_gateway",
    label: "OpenClaw Gateway",
    icon: Bot,
    desc: "通过网关协议调用 OpenClaw",
  },
];

export function NewAgentDialog() {
  const { newAgentOpen, closeNewAgent, openNewIssue } = useDialog();
  const { selectedCompanyId } = useCompany();
  const navigate = useNavigate();
  const [showAdvancedCards, setShowAdvancedCards] = useState(false);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && newAgentOpen,
  });

  const ceoAgent = (agents ?? []).find((a) => a.role === "ceo");

  function handleAskCeo() {
    closeNewAgent();
    openNewIssue({
      assigneeAgentId: ceoAgent?.id,
      title: "创建新智能体",
      description: "（在这里输入你想创建什么类型的智能体）",
    });
  }

  function handleAdvancedConfig() {
    setShowAdvancedCards(true);
  }

  function handleAdvancedAdapterPick(adapterType: AdvancedAdapterType) {
    closeNewAgent();
    setShowAdvancedCards(false);
    navigate(`/agents/new?adapterType=${encodeURIComponent(adapterType)}`);
  }

  return (
    <Dialog
      open={newAgentOpen}
      onOpenChange={(open) => {
        if (!open) {
          setShowAdvancedCards(false);
          closeNewAgent();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-sm text-muted-foreground">添加新智能体</span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => {
              setShowAdvancedCards(false);
              closeNewAgent();
            }}
          >
            <span className="text-lg leading-none">&times;</span>
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {!showAdvancedCards ? (
            <>
              {/* Recommendation */}
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <Sparkles className="h-6 w-6 text-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  建议让 CEO 负责智能体创建，他们更了解组织结构，也能更合理地配置汇报关系、权限和适配器。
                </p>
              </div>

              <Button className="w-full" size="lg" onClick={handleAskCeo}>
                <Bot className="h-4 w-4 mr-2" />
                请 CEO 创建新智能体
              </Button>

              {/* Advanced link */}
              <div className="text-center">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  onClick={handleAdvancedConfig}
                >
                  我想自己进行高级配置
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <button
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowAdvancedCards(false)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  返回
                </button>
                <p className="text-sm text-muted-foreground">
                  选择用于高级配置的适配器类型。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ADVANCED_ADAPTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border border-border p-3 text-xs transition-colors hover:bg-accent/50 relative"
                    )}
                    onClick={() => handleAdvancedAdapterPick(opt.value)}
                  >
                    {opt.recommended && (
                      <span className="absolute -top-1.5 right-1.5 bg-green-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                        推荐
                      </span>
                    )}
                    <opt.icon className="h-4 w-4" />
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
