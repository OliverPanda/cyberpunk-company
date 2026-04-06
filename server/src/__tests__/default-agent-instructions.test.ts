import { describe, expect, it } from "vitest";
import { loadDefaultAgentInstructionsBundle } from "../services/default-agent-instructions.js";

describe("default agent instructions bundle", () => {
  it("requires the default agent bundle to reply in Chinese", async () => {
    const bundle = await loadDefaultAgentInstructionsBundle("default");

    expect(bundle["AGENTS.md"]).toContain("中文");
  });

  it("requires the CEO bundle to reply in Chinese", async () => {
    const bundle = await loadDefaultAgentInstructionsBundle("ceo");

    expect(bundle["AGENTS.md"]).toContain("中文");
    expect(bundle["HEARTBEAT.md"]).toContain("中文");
  });
});
