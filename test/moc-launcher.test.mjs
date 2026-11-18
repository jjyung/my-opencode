import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Spec: docs/specs/moc-standalone-launch/README.md

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MOC_SH = path.join(REPO_ROOT, "bin", "moc");
const MOC_JS = path.join(REPO_ROOT, "bin", "moc.js");

const isWindows = process.platform === "win32";

let workDir;
let fakeBin;
let outFile;

// Fake `opencode` that records argv and the profile env vars it receives.
const FAKE_OPENCODE = `#!/bin/sh
printf '%s\\n' "$@" > "$FAKE_OPENCODE_OUT"
printf '%s' "\${OPENCODE_PROVIDER_PROFILE-}" > "$FAKE_OPENCODE_OUT.profile"
printf '%s' "\${OPENCODE_CONFIG_CONTENT:+set}" > "$FAKE_OPENCODE_OUT.config"
`;

function setupWorkspace() {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), "moc-launcher-"));
  fakeBin = path.join(workDir, "fake-bin");
  fs.mkdirSync(fakeBin);
  const fake = path.join(fakeBin, "opencode");
  fs.writeFileSync(fake, FAKE_OPENCODE, { mode: 0o755 });

  // moc resolves .opencode/plugins/provider-profile.mjs and .opencode/opencode.json from cwd.
  fs.mkdirSync(path.join(workDir, ".opencode", "plugins"), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, "plugins", "provider-profile.mjs"),
    path.join(workDir, ".opencode", "plugins", "provider-profile.mjs"),
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, "opencode.json"),
    path.join(workDir, ".opencode", "opencode.json"),
  );

  outFile = path.join(workDir, "argv.txt");
}

function runMoc(launcher, args) {
  const cmd = launcher === "sh" ? "sh" : process.execPath;
  const script = launcher === "sh" ? MOC_SH : MOC_JS;
  return spawnSync(cmd, [script, ...args], {
    cwd: workDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
      FAKE_OPENCODE_OUT: outFile,
      OPENCODE_PROVIDER_PROFILE: "",
      OPENCODE_CONFIG_CONTENT: "",
    },
  });
}

function readArgv() {
  return fs.readFileSync(outFile, "utf8").split("\n").filter((line, i, all) => !(line === "" && i === all.length - 1));
}

function readProfileEnv() {
  return fs.readFileSync(`${outFile}.profile`, "utf8");
}

function readConfigEnv() {
  return fs.readFileSync(`${outFile}.config`, "utf8");
}

function opencodeWasCalled() {
  return fs.existsSync(outFile);
}

beforeEach(() => {
  setupWorkspace();
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

// ── L-1 / L-4: profile launches add --standalone ────────────────────────────

describe("L-1 sh launcher: profile launch adds --standalone", { skip: isWindows }, () => {
  test("L-1.1 moc anthropic run hi → --standalone run hi with profile + config env", () => {
    const res = runMoc("sh", ["anthropic", "run", "hi"]);
    assert.equal(res.status, 0, res.stderr);
    assert.deepEqual(readArgv(), ["--standalone", "run", "hi"]);
    assert.equal(readProfileEnv(), "anthropic");
    assert.equal(readConfigEnv(), "set");
  });

  test("L-1.2 moc (no args) → first arg is --standalone, profile opencode", () => {
    const res = runMoc("sh", []);
    assert.equal(res.status, 0, res.stderr);
    assert.equal(readArgv()[0], "--standalone");
    assert.equal(readProfileEnv(), "opencode");
  });

  test("L-1.3 user-supplied --standalone is not duplicated", () => {
    const res = runMoc("sh", ["openai", "run", "x", "--standalone"]);
    assert.equal(res.status, 0, res.stderr);
    const argv = readArgv();
    assert.equal(argv.filter((a) => a === "--standalone").length, 1);
    assert.deepEqual(argv, ["run", "x", "--standalone"]);
  });
});

describe("L-2 sh launcher: passthrough does not add --standalone", { skip: isWindows }, () => {
  test("L-2.1 moc --version → argv = --version, no profile env", () => {
    const res = runMoc("sh", ["--version"]);
    assert.equal(res.status, 0, res.stderr);
    assert.deepEqual(readArgv(), ["--version"]);
    assert.equal(readProfileEnv(), "");
    assert.equal(readConfigEnv(), "");
  });
});

describe("L-3 sh launcher: print-config does not launch opencode", { skip: isWindows }, () => {
  test("L-3.1 moc print-config anthropic → JSON on stdout, opencode not called", () => {
    const res = runMoc("sh", ["print-config", "anthropic"]);
    assert.equal(res.status, 0, res.stderr);
    assert.ok(res.stdout.includes("anthropic/claude-haiku-5-5#max"));
    assert.equal(opencodeWasCalled(), false);
  });
});

describe("L-4 node launcher (bin/moc.js): same behavior as sh", () => {
  test("L-4.1 moc.js anthropic run hi → --standalone run hi with profile + config env", () => {
    const res = runMoc("node", ["anthropic", "run", "hi"]);
    assert.equal(res.status, 0, res.stderr);
    assert.deepEqual(readArgv(), ["--standalone", "run", "hi"]);
    assert.equal(readProfileEnv(), "anthropic");
    assert.equal(readConfigEnv(), "set");
  });

  test("L-4.2 moc.js (no args) → first arg is --standalone, profile opencode", () => {
    const res = runMoc("node", []);
    assert.equal(res.status, 0, res.stderr);
    assert.equal(readArgv()[0], "--standalone");
    assert.equal(readProfileEnv(), "opencode");
  });

  test("L-4.3 user-supplied --standalone is not duplicated", () => {
    const res = runMoc("node", ["openai", "run", "x", "--standalone"]);
    assert.equal(res.status, 0, res.stderr);
    const argv = readArgv();
    assert.equal(argv.filter((a) => a === "--standalone").length, 1);
    assert.deepEqual(argv, ["run", "x", "--standalone"]);
  });

  test("L-4.4 moc.js --version → argv = --version, no profile env", () => {
    const res = runMoc("node", ["--version"]);
    assert.equal(res.status, 0, res.stderr);
    assert.deepEqual(readArgv(), ["--version"]);
    assert.equal(readProfileEnv(), "");
  });

  test("L-4.5 moc.js print-config anthropic → JSON on stdout, opencode not called", () => {
    const res = runMoc("node", ["print-config", "anthropic"]);
    assert.equal(res.status, 0, res.stderr);
    assert.ok(res.stdout.includes("anthropic/claude-haiku-5-5#max"));
    assert.equal(opencodeWasCalled(), false);
  });
});
