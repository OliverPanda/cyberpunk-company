import fs from "node:fs";
import { cyberpunkCompanyConfigSchema, type CyberpunkCompanyConfig } from "@paperclipai/shared";
import { resolveCyberpunkConfigPath } from "./paths.js";

export function readConfigFile(): CyberpunkCompanyConfig | null {
  const configPath = resolveCyberpunkConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return cyberpunkCompanyConfigSchema.parse(raw);
  } catch {
    return null;
  }
}
