import { Database, Gauge, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SURFACES = [
  {
    title: "推理台账",
    description: "来自 `cost_events` 的请求级用量与计费运行。",
    icon: Database,
    points: ["token 与美元费用", "提供商、计费方、模型", "支持订阅与超额计费"],
    tone: "from-sky-500/12 via-sky-500/6 to-transparent",
  },
  {
    title: "财务台账",
    description: "不属于单次问答请求的账户级费用。",
    icon: ReceiptText,
    points: ["充值、退款、手续费", "Bedrock 预置容量或训练费用", "信用额度过期与调整"],
    tone: "from-amber-500/14 via-amber-500/6 to-transparent",
  },
  {
    title: "实时配额",
    description: "可在实时流量中触发限制的提供商或计费方窗口。",
    icon: Gauge,
    points: ["提供商配额窗口", "计费方信用额度系统", "错误直接透出"],
    tone: "from-emerald-500/14 via-emerald-500/6 to-transparent",
  },
] as const;

export function AccountingModelCard() {
  return (
    <Card className="relative overflow-hidden border-border/70">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.1),transparent_32%)]" />
      <CardHeader className="relative px-5 pt-5 pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          记账模型
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-6">
          Cyberpunk Company 现在将请求级推理用量与账户级财务事件分开记录。
          当计费方是 OpenRouter、Cloudflare、Bedrock 或其他中间层时，这样可以保持提供商统计更准确。
        </CardDescription>
      </CardHeader>
      <CardContent className="relative grid gap-3 px-5 pb-5 md:grid-cols-3">
        {SURFACES.map((surface) => {
          const Icon = surface.icon;
          return (
            <div
              key={surface.title}
              className={`rounded-2xl border border-border/70 bg-gradient-to-br ${surface.tone} p-4 shadow-sm`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{surface.title}</div>
                  <div className="text-xs text-muted-foreground">{surface.description}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {surface.points.map((point) => (
                  <div key={point}>{point}</div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
