import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listCodexSkills,
  syncCodexSkills,
} from "@cyberpunk-company/adapter-codex-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("codex local skill sync", () => {
  const cyberpunkCompanyKey = "cyberpunk-company/cyberpunk-company/cyberpunk-company";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("reports configured Cyberpunk Company skills for workspace injection on the next run", async () => {
    const codexHome = await makeTempDir("cyberpunk-company-codex-skill-sync-");
    cleanupDirs.add(codexHome);

    const ctx = {
      agentId: "agent-1",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        cyberpunkSkillSync: {
          desiredSkills: [cyberpunkCompanyKey],
        },
      },
    } as const;

    const before = await listCodexSkills(ctx);
    expect(before.mode).toBe("ephemeral");
    expect(before.desiredSkills).toContain(cyberpunkCompanyKey);
    expect(before.entries.find((entry) => entry.key === cyberpunkCompanyKey)?.required).toBe(true);
    expect(before.entries.find((entry) => entry.key === cyberpunkCompanyKey)?.state).toBe("configured");
    expect(before.entries.find((entry) => entry.key === cyberpunkCompanyKey)?.detail).toContain("CODEX_HOME/skills/");
  });

  it("does not persist Cyberpunk Company skills into CODEX_HOME during sync", async () => {
    const codexHome = await makeTempDir("cyberpunk-company-codex-skill-prune-");
    cleanupDirs.add(codexHome);

    const configuredCtx = {
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        cyberpunkSkillSync: {
          desiredSkills: [cyberpunkCompanyKey],
        },
      },
    } as const;

    const after = await syncCodexSkills(configuredCtx, [cyberpunkCompanyKey]);
    expect(after.mode).toBe("ephemeral");
    expect(after.entries.find((entry) => entry.key === cyberpunkCompanyKey)?.state).toBe("configured");
    await expect(fs.lstat(path.join(codexHome, "skills", "cyberpunk-company"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps required bundled Cyberpunk Company skills configured even when the desired set is emptied", async () => {
    const codexHome = await makeTempDir("cyberpunk-company-codex-skill-required-");
    cleanupDirs.add(codexHome);

    const configuredCtx = {
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        cyberpunkSkillSync: {
          desiredSkills: [],
        },
      },
    } as const;

    const after = await syncCodexSkills(configuredCtx, []);
    expect(after.desiredSkills).toContain(cyberpunkCompanyKey);
    expect(after.entries.find((entry) => entry.key === cyberpunkCompanyKey)?.state).toBe("configured");
  });

  it("normalizes legacy flat Cyberpunk Company skill refs before reporting configured state", async () => {
    const codexHome = await makeTempDir("cyberpunk-company-codex-legacy-skill-sync-");
    cleanupDirs.add(codexHome);

    const snapshot = await listCodexSkills({
      agentId: "agent-3",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        cyberpunkSkillSync: {
          desiredSkills: ["cyberpunk-company"],
        },
      },
    });

    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.desiredSkills).toContain(cyberpunkCompanyKey);
    expect(snapshot.desiredSkills).not.toContain("cyberpunk-company");
    expect(snapshot.entries.find((entry) => entry.key === cyberpunkCompanyKey)?.state).toBe("configured");
    expect(snapshot.entries.find((entry) => entry.key === "cyberpunk-company")).toBeUndefined();
  });
});
