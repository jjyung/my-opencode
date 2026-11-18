import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Spec: docs/specs/provider-profile-tests/README.md（T-10）

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ROOT_CONFIG = path.join(ROOT, "opencode.json");
const MIRROR_CONFIG = path.join(ROOT, ".opencode", "opencode.json");
const EXPECTED_PLUGIN = "./plugins/provider-profile.mjs";

function readPluginList(configPath) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return Array.isArray(config.plugin) ? config.plugin : [];
}

describe("T-10 plugin path resolution", () => {
  test("T-10.1 root opencode.json uses ./plugins/provider-profile.mjs (not bare plugins/...)", () => {
    const plugins = readPluginList(ROOT_CONFIG);
    assert.ok(plugins.includes(EXPECTED_PLUGIN), `expected ${EXPECTED_PLUGIN} in ${JSON.stringify(plugins)}`);
    for (const entry of plugins) {
      if (typeof entry === "string" && entry.includes("provider-profile")) {
        assert.ok(entry.startsWith("./") || entry.startsWith("file://"), `bare path would be treated as npm package: ${entry}`);
      }
    }
  });

  test("T-10.2 .opencode/opencode.json mirror matches root opencode.json", () => {
    assert.deepEqual(readPluginList(MIRROR_CONFIG), readPluginList(ROOT_CONFIG));
  });

  test("T-10.3 ./plugins/provider-profile.mjs resolves to an existing file relative to .opencode/", () => {
    const resolved = path.resolve(path.dirname(MIRROR_CONFIG), EXPECTED_PLUGIN);
    assert.equal(resolved, path.join(ROOT, ".opencode", "plugins", "provider-profile.mjs"));
    assert.ok(fs.existsSync(resolved), `missing plugin file: ${resolved}`);
  });
});
