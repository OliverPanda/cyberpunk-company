import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  describeLocalInstancePaths,
  expandHomePrefix,
  resolveCyberpunkHomeDir,
  resolveCyberpunkInstanceId,
} from "../config/home.js";

const ORIGINAL_ENV = { ...process.env };

describe("home path resolution", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults to ~/.cyberpunk-company and default instance", () => {
    delete process.env.CYBERPUNK_HOME;
    delete process.env.CYBERPUNK_INSTANCE_ID;

    const paths = describeLocalInstancePaths();
    expect(paths.homeDir).toBe(path.resolve(os.homedir(), ".cyberpunk-company"));
    expect(paths.instanceId).toBe("default");
    expect(paths.configPath).toBe(path.resolve(os.homedir(), ".cyberpunk-company", "instances", "default", "config.json"));
  });

  it("supports CYBERPUNK_HOME and explicit instance ids", () => {
    process.env.CYBERPUNK_HOME = "~/cyberpunk-company-home";

    const home = resolveCyberpunkHomeDir();
    expect(home).toBe(path.resolve(os.homedir(), "cyberpunk-company-home"));
    expect(resolveCyberpunkInstanceId("dev_1")).toBe("dev_1");
  });

  it("rejects invalid instance ids", () => {
    expect(() => resolveCyberpunkInstanceId("bad/id")).toThrow(/Invalid instance id/);
  });

  it("expands ~ prefixes", () => {
    expect(expandHomePrefix("~")).toBe(os.homedir());
    expect(expandHomePrefix("~/x/y")).toBe(path.resolve(os.homedir(), "x/y"));
  });
});
