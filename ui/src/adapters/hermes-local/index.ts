import type { UIAdapterModule } from "../types";
import { parseHermesStdoutLine } from "hermes-cyberpunk-company-adapter/ui";
import { HermesLocalConfigFields } from "./config-fields";
import { buildHermesConfig } from "hermes-cyberpunk-company-adapter/ui";

export const hermesLocalUIAdapter: UIAdapterModule = {
  type: "hermes_local",
  label: "Hermes 智能体",
  parseStdoutLine: parseHermesStdoutLine,
  ConfigFields: HermesLocalConfigFields,
  buildAdapterConfig: buildHermesConfig,
};
