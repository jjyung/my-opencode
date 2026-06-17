#!/usr/bin/env node

/**
 * postinstall.js — npm postinstall hook
 *
 * After `npm install my-opencode` in another project, this script
 * automatically copies agents/, skills/, plugins/, and opencode.json to the
 * target project's .opencode/ directory.
 *
 * The package stays in node_modules/ (gitignored, no residue).
 * The .opencode/ files are what opencode reads.
 *
 * To skip: npm install my-opencode --ignore-scripts
 * To run manually: npx my-opencode init
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PKG_DIR = path.resolve(__dirname, "..");
const SKILLS_SRC = path.join(PKG_DIR, "skills");
const AGENTS_SRC = path.join(PKG_DIR, "agents");
const PLUGINS_SRC = path.join(PKG_DIR, "plugins");
const CONFIG_SRC = path.join(PKG_DIR, "opencode.json");

// ─── Detect project root ────────────────────────────────────────────────
//
// During npm postinstall, `process.cwd()` is typically the package root
// (node_modules/my-opencode/), but behavior varies by npm version.
// We try multiple strategies to find the parent project root.

function hasPackageJson(dir) {
  try {
    const pkgPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.name !== "my-opencode";
  } catch {
    return false;
  }
}

function findProjectRoot() {
  // Strategy 1: process.cwd() is the project root (npm v6 behavior)
  let candidate = path.resolve(process.cwd());
  if (hasPackageJson(candidate)) return candidate;

  // Strategy 2: process.cwd() is node_modules/my-opencode/ (npm v7+)
  candidate = path.resolve(process.cwd(), "..", "..");
  if (hasPackageJson(candidate)) return candidate;

  // Strategy 3: __dirname is scripts/, go up 3 levels
  candidate = path.resolve(__dirname, "..", "..", "..");
  if (hasPackageJson(candidate)) return candidate;

  // Strategy 4: Walk up from __dirname until we find a project's package.json
  candidate = path.resolve(__dirname);
  while (candidate !== path.parse(candidate).root) {
    const parent = path.resolve(candidate, "..");
    if (hasPackageJson(parent)) return parent;
    candidate = parent;
  }

  return null;
}

// ─── File utilities ─────────────────────────────────────────────────────

function copyDirSync(src, dst) {
  let count = 0;
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      count += copyDirSync(srcPath, dstPath);
    } else if (entry.isFile()) {
      if (!fs.existsSync(dstPath)) {
        fs.copyFileSync(srcPath, dstPath);
        count++;
      }
    }
  }
  return count;
}

function copyFileIfNotExists(src, dst) {
  if (!fs.existsSync(dst)) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    return true;
  }
  return false;
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  const INDENT = "  ";
  const CYAN = "\x1b[36m";
  const GREEN = "\x1b[32m";
  const YELLOW = "\x1b[33m";
  const RESET = "\x1b[0m";

  function header(text) {
    console.log(`\n${CYAN}━━━ ${text} ━━━${RESET}\n`);
  }
  function success(text) {
    console.log(`${GREEN}✓${RESET} ${text}`);
  }
  function warn(text) {
    console.log(`${YELLOW}⚠${RESET} ${text}`);
  }

  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    warn(
      "Could not detect project root for my-opencode postinstall.\n" +
        `${INDENT}Run "npx my-opencode init" to set up manually.`,
    );
    process.exit(0);
  }

  const targetDir = path.join(projectRoot, ".opencode");
  const targetSkills = path.join(targetDir, "skills");
  const targetAgents = path.join(targetDir, "agents");
  const targetPlugins = path.join(targetDir, "plugins");
  const targetConfig = path.join(targetDir, "opencode.json");

  // ── Create .opencode/ ──────────────────────────────────────────────────
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // ── Copy skills ────────────────────────────────────────────────────────
  let skillCount = 0;
  if (fs.existsSync(SKILLS_SRC)) {
    const skills = fs
      .readdirSync(SKILLS_SRC, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const s of skills) {
      const dst = path.join(targetSkills, s);
      if (!fs.existsSync(dst)) {
        copyDirSync(path.join(SKILLS_SRC, s), dst);
        skillCount++;
      }
    }
  }

  // ── Copy agents ────────────────────────────────────────────────────────
  let agentCount = 0;
  if (fs.existsSync(AGENTS_SRC)) {
    const agents = fs
      .readdirSync(AGENTS_SRC, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".md"))
      .map((d) => d.name);

    for (const a of agents) {
      const dst = path.join(targetAgents, a);
      if (copyFileIfNotExists(path.join(AGENTS_SRC, a), dst)) {
        agentCount++;
      }
    }
  }

  // ── Copy plugins ───────────────────────────────────────────────────────
  let pluginCount = 0;
  if (fs.existsSync(PLUGINS_SRC)) {
    fs.mkdirSync(targetPlugins, { recursive: true });
    const plugins = fs
      .readdirSync(PLUGINS_SRC, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".mjs"))
      .map((d) => d.name);

    for (const plugin of plugins) {
      const dst = path.join(targetPlugins, plugin);
      if (copyFileIfNotExists(path.join(PLUGINS_SRC, plugin), dst)) {
        pluginCount++;
      }
    }
  }

  // ── Copy opencode.json ────────────────────────────────────────────────
  copyFileIfNotExists(CONFIG_SRC, targetConfig);

  // Suppress output if nothing changed (quiet idempotency)
  if (skillCount === 0 && agentCount === 0 && pluginCount === 0) return;

  header("my-opencode: installed to .opencode/");
  if (skillCount > 0) success(`Skills: ${skillCount}`);
  if (agentCount > 0) success(`Agents: ${agentCount}`);
  if (pluginCount > 0) success(`Plugins: ${pluginCount}`);
}

main();
