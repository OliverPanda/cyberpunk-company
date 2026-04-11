import fs from "node:fs";
import path from "node:path";
import { resolveDefaultConfigPath } from "./home-paths.js";

const CYBERPUNK_CONFIG_BASENAME = "config.json";
const CYBERPUNK_ENV_FILENAME = ".env";

function findConfigFileFromAncestors(startDir: string): string | null {
  const absoluteStartDir = path.resolve(startDir);
  let currentDir = absoluteStartDir;

  while (true) {
    const candidate = path.resolve(currentDir, ".cyberpunk-company", CYBERPUNK_CONFIG_BASENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const nextDir = path.resolve(currentDir, "..");
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }

  return null;
}

export function resolveCyberpunkConfigPath(overridePath?: string): string {
  if (overridePath) return path.resolve(overridePath);
  if (process.env.CYBERPUNK_CONFIG) return path.resolve(process.env.CYBERPUNK_CONFIG);
  return findConfigFileFromAncestors(process.cwd()) ?? resolveDefaultConfigPath();
}

export function resolveCyberpunkEnvPath(overrideConfigPath?: string): string {
  return path.resolve(path.dirname(resolveCyberpunkConfigPath(overrideConfigPath)), CYBERPUNK_ENV_FILENAME);
}
