import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
  help,
} from "../../components/agent-config-primitives";
import {
  PayloadTemplateJsonField,
  RuntimeServicesJsonField,
} from "../runtime-json-fields";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

function SecretField({
  label,
  value,
  onCommit,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <DraftInput
          value={value}
          onCommit={onCommit}
          immediate
          type={visible ? "text" : "password"}
          className={inputClass + " pl-8"}
          placeholder={placeholder}
        />
      </div>
    </Field>
  );
}

function parseScopes(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string").join(", ");
  }
  return typeof value === "string" ? value : "";
}

export function OpenClawGatewayConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  const configuredHeaders =
    config.headers && typeof config.headers === "object" && !Array.isArray(config.headers)
      ? (config.headers as Record<string, unknown>)
      : {};
  const effectiveHeaders =
    (eff("adapterConfig", "headers", configuredHeaders) as Record<string, unknown>) ?? {};

  const effectiveGatewayToken = typeof effectiveHeaders["x-openclaw-token"] === "string"
    ? String(effectiveHeaders["x-openclaw-token"])
    : typeof effectiveHeaders["x-openclaw-auth"] === "string"
      ? String(effectiveHeaders["x-openclaw-auth"])
      : "";

  const commitGatewayToken = (rawValue: string) => {
    const nextValue = rawValue.trim();
    const nextHeaders: Record<string, unknown> = { ...effectiveHeaders };
    if (nextValue) {
      nextHeaders["x-openclaw-token"] = nextValue;
      delete nextHeaders["x-openclaw-auth"];
    } else {
      delete nextHeaders["x-openclaw-token"];
      delete nextHeaders["x-openclaw-auth"];
    }
    mark("adapterConfig", "headers", Object.keys(nextHeaders).length > 0 ? nextHeaders : undefined);
  };

  const sessionStrategy = eff(
    "adapterConfig",
    "sessionKeyStrategy",
    String(config.sessionKeyStrategy ?? "fixed"),
  );

  return (
    <>
      <Field label="网关地址" hint={help.webhookUrl}>
        <DraftInput
          value={
            isCreate
              ? values!.url
              : eff("adapterConfig", "url", String(config.url ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ url: v })
              : mark("adapterConfig", "url", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="ws://127.0.0.1:18789"
        />
      </Field>

      <PayloadTemplateJsonField
        isCreate={isCreate}
        values={values}
        set={set}
        config={config}
        mark={mark}
      />

      <RuntimeServicesJsonField
        isCreate={isCreate}
        values={values}
        set={set}
        config={config}
        mark={mark}
      />

      {!isCreate && (
        <>
          <Field label="Cyberpunk Company API 地址覆盖">
            <DraftInput
              value={
                eff(
                  "adapterConfig",
                  "cyberpunkCompanyApiUrl",
                  String(config.cyberpunkCompanyApiUrl ?? ""),
                )
              }
              onCommit={(v) => mark("adapterConfig", "cyberpunkCompanyApiUrl", v || undefined)}
              immediate
              className={inputClass}
              placeholder="https://cyberpunk-company.example"
            />
          </Field>

          <Field label="会话策略">
            <select
              value={sessionStrategy}
              onChange={(e) => mark("adapterConfig", "sessionKeyStrategy", e.target.value)}
              className={inputClass}
            >
              <option value="fixed">固定</option>
              <option value="issue">按议题</option>
              <option value="run">按运行</option>
            </select>
          </Field>

          {sessionStrategy === "fixed" && (
            <Field label="会话键">
              <DraftInput
                value={eff("adapterConfig", "sessionKey", String(config.sessionKey ?? "cyberpunk-company"))}
                onCommit={(v) => mark("adapterConfig", "sessionKey", v || undefined)}
                immediate
                className={inputClass}
                placeholder="cyberpunk-company"
              />
            </Field>
          )}

          <SecretField
            label="网关鉴权令牌（x-openclaw-token）"
            value={effectiveGatewayToken}
            onCommit={commitGatewayToken}
            placeholder="OpenClaw 网关令牌"
          />

          <Field label="角色">
            <DraftInput
              value={eff("adapterConfig", "role", String(config.role ?? "operator"))}
              onCommit={(v) => mark("adapterConfig", "role", v || undefined)}
              immediate
              className={inputClass}
              placeholder="operator"
            />
          </Field>

          <Field label="作用域（逗号分隔）">
            <DraftInput
              value={eff("adapterConfig", "scopes", parseScopes(config.scopes ?? ["operator.admin"]))}
              onCommit={(v) => {
                const parsed = v
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter(Boolean);
                mark("adapterConfig", "scopes", parsed.length > 0 ? parsed : undefined);
              }}
              immediate
              className={inputClass}
              placeholder="operator.admin"
            />
          </Field>

          <Field label="等待超时（毫秒）">
            <DraftInput
              value={eff("adapterConfig", "waitTimeoutMs", String(config.waitTimeoutMs ?? "120000"))}
              onCommit={(v) => {
                const parsed = Number.parseInt(v.trim(), 10);
                mark(
                  "adapterConfig",
                  "waitTimeoutMs",
                  Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
                );
              }}
              immediate
              className={inputClass}
              placeholder="120000"
            />
          </Field>

          <Field label="设备鉴权">
            <div className="text-xs text-muted-foreground leading-relaxed">
              网关智能体始终启用。Cyberpunk Company 会在引导期间持久化设备密钥，以便跨多次运行保持配对批准稳定。
            </div>
          </Field>
        </>
      )}
    </>
  );
}
