import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCodexSkillsInjected } from "@paperclipai/adapter-codex-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createCyberpunkRepoSkill(root: string, skillName: string) {
  await fs.mkdir(path.join(root, "server"), { recursive: true });
  await fs.mkdir(path.join(root, "packages", "adapter-utils"), { recursive: true });
  await fs.mkdir(path.join(root, "skills", skillName), { recursive: true });
  await fs.writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");
  await fs.writeFile(path.join(root, "package.json"), '{"name":"cyberpunk-company"}\n', "utf8");
  await fs.writeFile(
    path.join(root, "skills", skillName, "SKILL.md"),
    `---\nname: ${skillName}\n---\n`,
    "utf8",
  );
}

async function createCustomSkill(root: string, skillName: string) {
  await fs.mkdir(path.join(root, "custom", skillName), { recursive: true });
  await fs.writeFile(
    path.join(root, "custom", skillName, "SKILL.md"),
    `---\nname: ${skillName}\n---\n`,
    "utf8",
  );
}

describe("codex local adapter skill injection", () => {
  const cyberpunkCompanyKey = "cyberpunk-company/cyberpunk-company/cyberpunk-company";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("repairs a Codex Cyberpunk Company skill symlink that still points at another live checkout", async () => {
    const currentRepo = await makeTempDir("cyberpunk-company-codex-current-");
    const oldRepo = await makeTempDir("cyberpunk-company-codex-old-");
    const skillsHome = await makeTempDir("cyberpunk-company-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(oldRepo);
    cleanupDirs.add(skillsHome);

    await createCyberpunkRepoSkill(currentRepo, "cyberpunk-company");
    await createCyberpunkRepoSkill(oldRepo, "cyberpunk-company");
    await fs.symlink(path.join(oldRepo, "skills", "cyberpunk-company"), path.join(skillsHome, "cyberpunk-company"));

    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];
    await ensureCodexSkillsInjected(
      async (stream, chunk) => {
        logs.push({ stream, chunk });
      },
      {
        skillsHome,
        skillsEntries: [{
          key: cyberpunkCompanyKey,
          runtimeName: "cyberpunk-company",
          source: path.join(currentRepo, "skills", "cyberpunk-company"),
        }],
      },
    );

    expect(await fs.realpath(path.join(skillsHome, "cyberpunk-company"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "cyberpunk-company")),
    );
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Repaired Codex skill "cyberpunk-company"'),
      }),
    );
  });

  it("preserves a custom Codex skill symlink outside Cyberpunk Company repo checkouts", async () => {
    const currentRepo = await makeTempDir("cyberpunk-company-codex-current-");
    const customRoot = await makeTempDir("cyberpunk-company-codex-custom-");
    const skillsHome = await makeTempDir("cyberpunk-company-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(customRoot);
    cleanupDirs.add(skillsHome);

    await createCyberpunkRepoSkill(currentRepo, "cyberpunk-company");
    await createCustomSkill(customRoot, "cyberpunk-company");
    await fs.symlink(path.join(customRoot, "custom", "cyberpunk-company"), path.join(skillsHome, "cyberpunk-company"));

    await ensureCodexSkillsInjected(async () => {}, {
      skillsHome,
      skillsEntries: [{
        key: cyberpunkCompanyKey,
        runtimeName: "cyberpunk-company",
        source: path.join(currentRepo, "skills", "cyberpunk-company"),
      }],
    });

    expect(await fs.realpath(path.join(skillsHome, "cyberpunk-company"))).toBe(
      await fs.realpath(path.join(customRoot, "custom", "cyberpunk-company")),
    );
  });

  it("prunes broken symlinks for unavailable Cyberpunk Company repo skills before Codex starts", async () => {
    const currentRepo = await makeTempDir("cyberpunk-company-codex-current-");
    const oldRepo = await makeTempDir("cyberpunk-company-codex-old-");
    const skillsHome = await makeTempDir("cyberpunk-company-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(oldRepo);
    cleanupDirs.add(skillsHome);

    await createCyberpunkRepoSkill(currentRepo, "cyberpunk-company");
    await createCyberpunkRepoSkill(oldRepo, "agent-browser");
    const staleTarget = path.join(oldRepo, "skills", "agent-browser");
    await fs.symlink(staleTarget, path.join(skillsHome, "agent-browser"));
    await fs.rm(staleTarget, { recursive: true, force: true });

    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];
    await ensureCodexSkillsInjected(
      async (stream, chunk) => {
        logs.push({ stream, chunk });
      },
      {
        skillsHome,
        skillsEntries: [{
          key: cyberpunkCompanyKey,
          runtimeName: "cyberpunk-company",
          source: path.join(currentRepo, "skills", "cyberpunk-company"),
        }],
      },
    );

    await expect(fs.lstat(path.join(skillsHome, "agent-browser"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Removed stale Codex skill "agent-browser"'),
      }),
    );
  });

  it("preserves other live Cyberpunk Company skill symlinks in the shared workspace skill directory", async () => {
    const currentRepo = await makeTempDir("cyberpunk-company-codex-current-");
    const skillsHome = await makeTempDir("cyberpunk-company-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(skillsHome);

    await createCyberpunkRepoSkill(currentRepo, "cyberpunk-company");
    await createCyberpunkRepoSkill(currentRepo, "agent-browser");
    await fs.symlink(
      path.join(currentRepo, "skills", "agent-browser"),
      path.join(skillsHome, "agent-browser"),
    );

    await ensureCodexSkillsInjected(async () => {}, {
      skillsHome,
      skillsEntries: [{
        key: cyberpunkCompanyKey,
        runtimeName: "cyberpunk-company",
        source: path.join(currentRepo, "skills", "cyberpunk-company"),
      }],
    });

    expect((await fs.lstat(path.join(skillsHome, "cyberpunk-company"))).isSymbolicLink()).toBe(true);
    expect((await fs.lstat(path.join(skillsHome, "agent-browser"))).isSymbolicLink()).toBe(true);
    expect(await fs.realpath(path.join(skillsHome, "agent-browser"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "agent-browser")),
    );
  });
});
