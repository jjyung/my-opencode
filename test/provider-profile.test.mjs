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
    model: "opencode-go/deepseek-v4-pro",
    small_model: "opencode-go/deepseek-v4-flash",
    heavy_model: "opencode-go/deepseek-v4-pro",
  },
  openai: {
    model: "openai/gpt-5.6",
    small_model: "openai/gpt-5.6-luna",
    heavy_model: "openai/gpt-5.6",
  },
  google: {
    model: "google/gemini-3.1-pro-preview-customtools",
    small_model: "google/gemini-3.5-flash",
    heavy_model: "google/gemini-3.1-pro-preview-customtools",
  },
  copilot: {
    model: "github-copilot/gpt-5.6-sol",
    small_model: "github-copilot/gpt-5.6-luna",
    heavy_model: "github-copilot/gpt-5.6-sol",
  },
};

const HEAVY_AGENTS = ["spec-writer", "code-reviewer", "team-lead", "architect"];

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
    process.env[ENV_KEY] = "google";
    const resolved = resolveProfile();
    assert.equal(resolved.model, EXPECTED.google.model);
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

// ── T-4: buildProfileConfig output shape ────────────────────────────────────

describe("T-4 buildProfileConfig output shape", () => {
  test("T-4.1 opencode has no provider key and 5 overridden agents", () => {
    const config = buildProfileConfig({ profile: "opencode" });
    assert.equal(config.model, EXPECTED.opencode.model);
    assert.equal("provider" in config, false);
    assert.deepEqual(Object.keys(config.agent).sort(), [
      "architect",
      "code-reviewer",
      "spec-writer",
      "team-lead",
      "verifier",
    ]);
  });

  test("T-4.2 google has no provider key", () => {
    const config = buildProfileConfig({ profile: "google" });
    assert.equal("provider" in config, false);
  });

  test("T-4.3 openai has provider.openai.models['gpt-5.6-luna']", () => {
    const config = buildProfileConfig({ profile: "openai" });
    assert.ok(config.provider.openai.models["gpt-5.6-luna"]);
  });

  test("T-4.4 copilot has provider.github-copilot.models['gpt-5.6-luna']", () => {
    const config = buildProfileConfig({ profile: "copilot" });
    assert.ok(config.provider["github-copilot"].models["gpt-5.6-luna"]);
  });
});

// ── T-5: reasoning effort variants structure ────────────────────────────────

describe("T-5 reasoning effort variants", () => {
  test("T-5.1 openai luna variants = high/medium/low with reasoningEffort", () => {
    const config = buildProfileConfig({ profile: "openai" });
    const variants = config.provider.openai.models["gpt-5.6-luna"].variants;
    assert.deepEqual(variants, {
      high: { reasoningEffort: "high" },
      medium: { reasoningEffort: "medium" },
      low: { reasoningEffort: "low" },
    });
  });

  test("T-5.2 openai luna default effort is low", () => {
    const config = buildProfileConfig({ profile: "openai" });
    const options = config.provider.openai.models["gpt-5.6-luna"].options;
    assert.deepEqual(options, { reasoningEffort: "low" });
  });

  test("T-5.3 copilot luna variants mirror openai", () => {
    const config = buildProfileConfig({ profile: "copilot" });
    const variants = config.provider["github-copilot"].models["gpt-5.6-luna"].variants;
    assert.deepEqual(variants, {
      high: { reasoningEffort: "high" },
      medium: { reasoningEffort: "medium" },
      low: { reasoningEffort: "low" },
    });
  });

  test("T-5.4 no provider fragment when profile has no reasoning", () => {
    const opencode = buildProfileConfig({ profile: "opencode" });
    const google = buildProfileConfig({ profile: "google" });
    assert.equal("provider" in opencode, false);
    assert.equal("provider" in google, false);
  });
});

// ── T-6: Error handling ─────────────────────────────────────────────────────

describe("T-6 error handling", () => {
  test("T-6.1 unknown profile throws with supported list", () => {
    assert.throws(
      () => resolveProfile({ profile: "bogus" }),
      /Unknown provider profile "bogus"\. Must be one of: opencode, openai, google, copilot/,
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
        plugin: [["plugins/provider-profile.mjs", { profile: "google" }]],
      }),
    );
    assert.deepEqual(readPluginOptions(filePath), { profile: "google" });
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
