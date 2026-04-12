import type { UIAdapterModule } from "../types";
import { parseCodexStdoutLine } from "@paperclipai/adapter-codex-local/ui";
import { CodexLocalConfigFields } from "./config-fields";
import { buildCodexLocalConfig } from "@paperclipai/adapter-codex-local/ui";

export const codexLocalUIAdapter: UIAdapterModule = {
  type: "codex_local",
  label: "Codex（本地）",
  parseStdoutLine: parseCodexStdoutLine,
  ConfigFields: CodexLocalConfigFields,
  buildAdapterConfig: buildCodexLocalConfig,
};
