#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsxEntrypoint = path.join(repoRoot, "cli", "node_modules", "tsx", "dist", "cli.mjs");
const cliEntrypoint = path.join(repoRoot, "cli", "src", "index.ts");

if (!existsSync(tsxEntrypoint)) {
  process.stderr.write(
    [
      "[cyberpunk-company] Local CLI dependencies are missing.",
      "Run `pnpm install` in the cloned repo, then retry `npx cyberpunk-company ...` or `pnpm cyberpunk-company ...`.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(process.execPath, [tsxEntrypoint, cliEntrypoint, ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  process.stderr.write(
    `[cyberpunk-company] Failed to start local CLI wrapper: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
