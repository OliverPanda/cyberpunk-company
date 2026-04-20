import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EMBEDDED_POSTGRES_DATABASE_NAME } from "./constants.js";
import { resolveMigrationConnection } from "./migration-runtime.js";

const originalEnv = { ...process.env };
const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  process.env = { ...originalEnv };
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
});

describe("resolveMigrationConnection", () => {
  it(
    "uses the canonical embedded database name",
    async () => {
      delete process.env.DATABASE_URL;

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cyberpunk-company-migration-runtime-"));
      process.env.CYBERPUNK_HOME = tempDir;
      process.env.CYBERPUNK_INSTANCE_ID = "test";

      const connection = await resolveMigrationConnection();
      cleanups.push(connection.stop);

      expect(connection.connectionString).toContain(`/${EMBEDDED_POSTGRES_DATABASE_NAME}`);
      expect(connection.connectionString).not.toContain("/cyberpunk-company");
    },
    20_000,
  );
});
