import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import resolveProfile, {
  buildProfileConfig,
  readPluginOptions,
  ProviderProfilePlugin,
} from "../plugins/provider-profile.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENV_KEY = "OPENCODE_PROVIDER_PROFILE";

const EXPECTED = {
  opencode: {
    model: "opencode-go/gpt-6-luna#max",
    small_model: "opencode-go/deepseek-v4.1-flash#max",
    heavy_model: "opencode-go/claude-haiku-5-5#max",
  },
  openai: {
    model: "openai/gpt-6.2-sol#low",
    small_model: "openai/gpt-6.1-terra#medium",
    heavy_model: "openai/gpt-6.2-sol#medium",
  },
  copilot: {
    model: "github-copilot/claude-haiku-5.5#xhigh",
    small_model: "github-copilot/gpt-6-luna#max",
    heavy_model: "github-copilot/gpt-6.1-sol#medium",
  },
  anthropic: {
    model: "anthropic/claude-haiku-5-5#max",
    small_model: "anthropic/claude-haiku-5-5#high",
    heavy_model: "anthropic/claude-sonnet-5-5#high",
  },
};

const HEAVY_AGENTS = [
  "design-evidence",
  "business-analyst",
  "system-designer",
  "code-reviewer",
  "team-lead",
  "architect",
];

// ── Env isolation ───────────────────────────────────────────────────────────

function saveEnv() {
  return process.env[ENV_KEY];
}

function restoreEnv(saved) {
  if (saved === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = saved;
  }
}

let savedEnv;

beforeEach(() => {
  savedEnv = saveEnv();
});

afterEach(() => {
  restoreEnv(savedEnv);
});

// ── T-1: Profile selection priority ─────────────────────────────────────────

describe("T-1 profile selection priority (pickProfile)", () => {
  test("T-1.1 defaults to opencode when no option and no env", () => {
    delete process.env[ENV_KEY];
    const resolved = resolveProfile();
    assert.equal(resolved.model, EXPECTED.opencode.model);
  });

  test("T-1.2 option profile takes priority over env", () => {
    process.env[ENV_KEY] = "copilot";
    const resolved = resolveProfile({ profile: "openai" });
    assert.equal(resolved.model, EXPECTED.openai.model);
  });

  test("T-1.3 env var is used when no option is given", () => {
    process.env[ENV_KEY] = "anthropic";
    const resolved = resolveProfile();
    assert.equal(resolved.model, EXPECTED.anthropic.model);
  });

  test("T-1.4 option profile is trimmed", () => {
    delete process.env[ENV_KEY];
    const resolved = resolveProfile({ profile: "  openai  " });
    assert.equal(resolved.model, EXPECTED.openai.model);
  });
});

// ── T-2: Model mapping per profile ──────────────────────────────────────────

describe("T-2 model mapping per profile (resolveProfile)", () => {
  for (const [profile, expected] of Object.entries(EXPECTED)) {
    test(`T-2 ${profile} maps model / small_model / heavy_model`, () => {
      const resolved = resolveProfile({ profile });
      assert.equal(resolved.model, expected.model);
      assert.equal(resolved.small_model, expected.small_model);
    });
  }
});

// ── T-3: agent_overrides mapping ────────────────────────────────────────────

describe("T-3 agent_overrides mapping", () => {
  for (const profile of Object.keys(EXPECTED)) {
    test(`T-3.1 ${profile}: heavy agents use heavy_model`, () => {
      const resolved = resolveProfile({ profile });
      for (const agent of HEAVY_AGENTS) {
        assert.equal(
          resolved.agent_overrides[agent],
          EXPECTED[profile].heavy_model,
          `${agent} should use heavy_model`,
        );
      }
    });

    test(`T-3.2 ${profile}: verifier uses small_model`, () => {
      const resolved = resolveProfile({ profile });
      assert.equal(resolved.agent_overrides.verifier, EXPECTED[profile].small_model);
    });
  }
});

describe("T-3 anthropic tiers", () => {
  test("T-3.3 anthropic: heavy agents = sonnet-5-5#high (highest tier)", () => {
    const resolved = resolveProfile({ profile: "anthropic" });
    for (const agent of HEAVY_AGENTS) {
      assert.equal(resolved.agent_overrides[agent], "anthropic/claude-sonnet-5-5#high", agent);
    }
  });

  test("T-3.4 anthropic: verifier = haiku-5-5#high (lowest tier)", () => {
    const resolved = resolveProfile({ profile: "anthropic" });
    assert.equal(resolved.agent_overrides.verifier, "anthropic/claude-haiku-5-5#high");
  });
});

// ── T-4: buildProfileConfig output shape ────────────────────────────────────

describe("T-4 buildProfileConfig output shape", () => {
  test("T-4.1 opencode has provider.opencode-go deepseek-v4.1-flash and 7 overridden agents", () => {
    const config = buildProfileConfig({ profile: "opencode" });
    assert.equal(config.model, EXPECTED.opencode.model);
    assert.equal(config.model, "opencode-go/gpt-6-luna#max");
    assert.ok(config.provider["opencode-go"].models["deepseek-v4.1-flash"]);
    assert.deepEqual(Object.keys(config.agent).sort(), [
      "architect",
      "business-analyst",
      "code-reviewer",
      "design-evidence",
      "system-designer",
      "team-lead",
      "verifier",
    ]);
  });

  test("T-4.3 openai has no provider key; model/small_model carry #variant; 7 overridden agents", () => {
    const config = buildProfileConfig({ profile: "openai" });
    assert.equal("provider" in config, false);
    assert.equal(config.model, "openai/gpt-6.2-sol#low");
    assert.equal(config.small_model, "openai/gpt-6.1-terra#medium");
    assert.deepEqual(Object.keys(config.agent).sort(), [
      "architect",
      "business-analyst",
      "code-reviewer",
      "design-evidence",
      "system-designer",
      "team-lead",
      "verifier",
    ]);
  });

  test("T-4.4 copilot has no provider key; model/small_model carry #variant; 7 overridden agents", () => {
    const config = buildProfileConfig({ profile: "copilot" });
    assert.equal("provider" in config, false);
    assert.equal(config.model, "github-copilot/claude-haiku-5.5#xhigh");
    assert.equal(config.small_model, "github-copilot/gpt-6-luna#max");
    assert.deepEqual(Object.keys(config.agent).sort(), [
      "architect",
      "business-analyst",
      "code-reviewer",
      "design-evidence",
      "system-designer",
      "team-lead",
      "verifier",
    ]);
  });

  test("T-4.6 opencode provider block does not override gpt-6-luna / claude-haiku-5-5", () => {
    const config = buildProfileConfig({ profile: "opencode" });
    assert.equal("gpt-6-luna" in config.provider["opencode-go"].models, false);
    assert.equal("claude-haiku-5-5" in config.provider["opencode-go"].models, false);
  });

  test("T-4.5 anthropic has no provider key; model/small_model carry #variant; 7 overridden agents", () => {
    const config = buildProfileConfig({ profile: "anthropic" });
    assert.equal("provider" in config, false);
    assert.equal(config.model, "anthropic/claude-haiku-5-5#max");
    assert.equal(config.small_model, "anthropic/claude-haiku-5-5#high");
    assert.deepEqual(Object.keys(config.agent).sort(), [
      "architect",
      "business-analyst",
      "code-reviewer",
      "design-evidence",
      "system-designer",
      "team-lead",
      "verifier",
    ]);
  });
});

// ── T-5: reasoning effort variants structure ────────────────────────────────

describe("T-5 reasoning effort variants", () => {
  test("T-5.1 openai model = gpt-6.2-sol#low, heavy = gpt-6.2-sol#medium, small = gpt-6.1-terra#medium", () => {
    const resolved = resolveProfile({ profile: "openai" });
    assert.equal(resolved.model, "openai/gpt-6.2-sol#low");
    assert.equal(resolved.small_model, "openai/gpt-6.1-terra#medium");
    assert.equal(resolved.agent_overrides["team-lead"], "openai/gpt-6.2-sol#medium");
  });

  test("T-5.2 openai config no longer references gpt-5.6 models", () => {
    const config = buildProfileConfig({ profile: "openai" });
    assert.equal(JSON.stringify(config).includes("gpt-5.6"), false);
  });

  test("T-5.3 copilot model = claude-haiku-5.5#xhigh, heavy = gpt-6.1-sol#medium, small = gpt-6-luna#max", () => {
    const resolved = resolveProfile({ profile: "copilot" });
    assert.equal(resolved.model, "github-copilot/claude-haiku-5.5#xhigh");
    assert.equal(resolved.small_model, "github-copilot/gpt-6-luna#max");
    assert.equal(resolved.agent_overrides["team-lead"], "github-copilot/gpt-6.1-sol#medium");
    assert.equal(JSON.stringify(buildProfileConfig({ profile: "copilot" })).includes("gpt-5.6"), false);
  });

  test("T-5.5 opencode deepseek-v4.1-flash variants = low/high/max with reasoningEffort", () => {
    const config = buildProfileConfig({ profile: "opencode" });
    const variants = config.provider["opencode-go"].models["deepseek-v4.1-flash"].variants;
    assert.deepEqual(variants, {
      low: { reasoningEffort: "low" },
      high: { reasoningEffort: "high" },
      max: { reasoningEffort: "max" },
    });
  });

  test("T-5.6 opencode deepseek-v4.1-flash default effort is max", () => {
    const config = buildProfileConfig({ profile: "opencode" });
    const options = config.provider["opencode-go"].models["deepseek-v4.1-flash"].options;
    assert.deepEqual(options, { reasoningEffort: "max" });
  });

  test("T-5.7 anthropic model uses #max and small_model uses #high variant refs", () => {
    const resolved = resolveProfile({ profile: "anthropic" });
    assert.equal(resolved.model, "anthropic/claude-haiku-5-5#max");
    assert.equal(resolved.small_model, "anthropic/claude-haiku-5-5#high");
  });

  test("T-5.9 opencode small_model = deepseek-v4.1-flash#max; team-lead (heavy) = claude-haiku-5-5#max; no deprecated deepseek-v4-flash", () => {
    const config = buildProfileConfig({ profile: "opencode" });
    assert.equal(config.small_model, "opencode-go/deepseek-v4.1-flash#max");
    assert.equal(config.agent.verifier.model, "opencode-go/deepseek-v4.1-flash#max");
    assert.equal(config.agent["team-lead"].model, "opencode-go/claude-haiku-5-5#max");
    assert.equal(JSON.stringify(config).includes("deepseek-v4-flash"), false);
  });
});

// ── T-6: Error handling ─────────────────────────────────────────────────────

describe("T-6 error handling", () => {
  test("T-6.1 unknown profile throws with supported list", () => {
    assert.throws(
      () => resolveProfile({ profile: "bogus" }),
      /Unknown provider profile "bogus"\. Must be one of: opencode, openai, copilot, anthropic/,
    );
  });
});

// ── T-7: readPluginOptions ──────────────────────────────────────────────────

describe("T-7 readPluginOptions", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pp-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeConfig(filename, content) {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  test("T-7.1 returns options from tuple plugin entry", () => {
    const filePath = writeConfig(
      "config.json",
      JSON.stringify({
        plugin: [["plugins/provider-profile.mjs", { profile: "openai" }]],
      }),
    );
    assert.deepEqual(readPluginOptions(filePath), { profile: "openai" });
  });

  test("T-7.2 returns {} when no provider-profile plugin present", () => {
    const filePath = writeConfig("config.json", JSON.stringify({ plugin: ["other.mjs"] }));
    assert.deepEqual(readPluginOptions(filePath), {});
  });

  test("T-7.3 returns {} on invalid JSON (no throw)", () => {
    const filePath = writeConfig("config.json", "{ not valid json");
    assert.deepEqual(readPluginOptions(filePath), {});
  });

  test("T-7.4 returns {} on missing file (no throw)", () => {
    const missing = path.join(tmpDir, "does-not-exist.json");
    assert.deepEqual(readPluginOptions(missing), {});
  });
});

// ── T-8: ProviderProfilePlugin placeholder ──────────────────────────────────

describe("T-8 ProviderProfilePlugin placeholder", () => {
  test("T-8.1 returns empty object", () => {
    assert.deepEqual(ProviderProfilePlugin(), {});
  });
});

// ── T-9: Source sync guard ──────────────────────────────────────────────────

describe("T-9 source sync guard", () => {
  test("T-9.1 plugins/ and .opencode/plugins/ copies are identical", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "..", "plugins", "provider-profile.mjs"),
      "utf8",
    );
    const copy = fs.readFileSync(
      path.resolve(__dirname, "..", ".opencode", "plugins", "provider-profile.mjs"),
      "utf8",
    );
    assert.equal(copy, src, "the two provider-profile.mjs copies must stay in sync");
  });
});
