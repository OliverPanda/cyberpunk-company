import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalAgentJwt, verifyLocalAgentJwt } from "../agent-auth-jwt.js";

describe("agent local JWT", () => {
  const secretEnv = "CYBERPUNK_AGENT_JWT_SECRET";
  const legacySecretEnv = "PAPERCLIP_AGENT_JWT_SECRET";
  const ttlEnv = "CYBERPUNK_AGENT_JWT_TTL_SECONDS";
  const issuerEnv = "CYBERPUNK_AGENT_JWT_ISSUER";
  const audienceEnv = "CYBERPUNK_AGENT_JWT_AUDIENCE";

  const originalEnv = {
    secret: process.env[secretEnv],
    legacySecret: process.env[legacySecretEnv],
    ttl: process.env[ttlEnv],
    issuer: process.env[issuerEnv],
    audience: process.env[audienceEnv],
  };

  beforeEach(() => {
    process.env[secretEnv] = "test-secret";
    delete process.env[legacySecretEnv];
    process.env[ttlEnv] = "3600";
    delete process.env[issuerEnv];
    delete process.env[audienceEnv];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalEnv.secret === undefined) delete process.env[secretEnv];
    else process.env[secretEnv] = originalEnv.secret;
    if (originalEnv.legacySecret === undefined) delete process.env[legacySecretEnv];
    else process.env[legacySecretEnv] = originalEnv.legacySecret;
    if (originalEnv.ttl === undefined) delete process.env[ttlEnv];
    else process.env[ttlEnv] = originalEnv.ttl;
    if (originalEnv.issuer === undefined) delete process.env[issuerEnv];
    else process.env[issuerEnv] = originalEnv.issuer;
    if (originalEnv.audience === undefined) delete process.env[audienceEnv];
    else process.env[audienceEnv] = originalEnv.audience;
  });

  it("creates and verifies a token", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = createLocalAgentJwt("agent-1", "company-1", "claude_local", "run-1");
    expect(typeof token).toBe("string");

    const claims = verifyLocalAgentJwt(token!);
    expect(claims).toMatchObject({
      sub: "agent-1",
      company_id: "company-1",
      adapter_type: "claude_local",
      run_id: "run-1",
      iss: "cyberpunk-company",
      aud: "cyberpunk-company-api",
    });
  });

  it("returns null when secret is missing", () => {
    process.env[secretEnv] = "";
    const token = createLocalAgentJwt("agent-1", "company-1", "claude_local", "run-1");
    expect(token).toBeNull();
    expect(verifyLocalAgentJwt("abc.def.ghi")).toBeNull();
  });

  it("falls back to PAPERCLIP_AGENT_JWT_SECRET for legacy environments", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    delete process.env[secretEnv];
    process.env[legacySecretEnv] = "legacy-secret";

    const token = createLocalAgentJwt("agent-1", "company-1", "codex_local", "run-1");

    expect(typeof token).toBe("string");
    expect(verifyLocalAgentJwt(token!)).toMatchObject({
      sub: "agent-1",
      company_id: "company-1",
      adapter_type: "codex_local",
      run_id: "run-1",
    });
  });

  it("rejects expired tokens", () => {
    process.env[ttlEnv] = "1";
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = createLocalAgentJwt("agent-1", "company-1", "claude_local", "run-1");

    vi.setSystemTime(new Date("2026-01-01T00:00:05.000Z"));
    expect(verifyLocalAgentJwt(token!)).toBeNull();
  });

  it("rejects issuer/audience mismatch", () => {
    process.env[issuerEnv] = "custom-issuer";
    process.env[audienceEnv] = "custom-audience";
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = createLocalAgentJwt("agent-1", "company-1", "codex_local", "run-1");

    process.env[issuerEnv] = "cyberpunk-company";
    process.env[audienceEnv] = "cyberpunk-company-api";
    expect(verifyLocalAgentJwt(token!)).toBeNull();
  });
});
