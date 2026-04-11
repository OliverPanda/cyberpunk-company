import path from "node:path";
import {
  expandHomePrefix,
  resolveDefaultConfigPath,
  resolveDefaultContextPath,
  resolveCyberpunkInstanceId,
} from "./home.js";

export interface DataDirOptionLike {
  dataDir?: string;
  config?: string;
  context?: string;
  instance?: string;
}

export interface DataDirCommandSupport {
  hasConfigOption?: boolean;
  hasContextOption?: boolean;
}

export function applyDataDirOverride(
  options: DataDirOptionLike,
  support: DataDirCommandSupport = {},
): string | null {
  const rawDataDir = options.dataDir?.trim();
  if (!rawDataDir) return null;

  const resolvedDataDir = path.resolve(expandHomePrefix(rawDataDir));
  process.env.CYBERPUNK_HOME = resolvedDataDir;

  if (support.hasConfigOption) {
    const hasConfigOverride = Boolean(options.config?.trim()) || Boolean(process.env.CYBERPUNK_CONFIG?.trim());
    if (!hasConfigOverride) {
      const instanceId = resolveCyberpunkInstanceId(options.instance);
      process.env.CYBERPUNK_INSTANCE_ID = instanceId;
      process.env.CYBERPUNK_CONFIG = resolveDefaultConfigPath(instanceId);
    }
  }

  if (support.hasContextOption) {
    const hasContextOverride = Boolean(options.context?.trim()) || Boolean(process.env.CYBERPUNK_CONTEXT?.trim());
    if (!hasContextOverride) {
      process.env.CYBERPUNK_CONTEXT = resolveDefaultContextPath();
    }
  }

  return resolvedDataDir;
}
