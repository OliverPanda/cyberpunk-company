import fs from "node:fs";
import { paperclipConfigSchema, type PaperclipConfig } from "@cyberpunk-company/shared";
import { resolveCyberpunkConfigPath } from "./paths.js";

export function readConfigFile(): PaperclipConfig | null {
  const configPath = resolveCyberpunkConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return paperclipConfigSchema.parse(raw);
  } catch {
    return null;
  }
}
