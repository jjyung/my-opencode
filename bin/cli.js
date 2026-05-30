#!/usr/bin/env node

/**
 * my-opencode CLI
 *
 * Two install methods:
 *
 *   1. npm install my-opencode
 *      → Files in node_modules/ (gitignored) + postinstall copies to .opencode/
 *
 *   2. npx my-opencode init
 *      → Files copied directly to .opencode/, no dependency in package.json
 *
 * Commands:
 *   init [target-dir]    Install skills/agents into .opencode/
 *   list                 List available skills and agents
 *   help                 Show this help
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const PKG_ROOT = path.resolve(path.dirname(__filename), "..");

const SKILLS_DIR = path.join(PKG_ROOT, "skills");
const AGENTS_DIR = path.join(PKG_ROOT, "agents");
const OPENCODE_CONFIG = path.join(PKG_ROOT, "opencode.json");

const INDENT = "  ";

// ─── Helpers ────────────────────────────────────────────────────────────────

function header(text) {
  console.log(`\n\x1b[36m━━━ ${text} ━━━\x1b[0m\n`);
}

function success(text) {
  console.log(`\x1b[32m✓\x1b[0m ${text}`);
}

function warn(text) {
  console.log(`\x1b[33m⚠\x1b[0m ${text}`);
}

function info(text) {
  console.log(`\x1b[34mℹ\x1b[0m ${text}`);
}

function getDirectories(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return [];
  }
}

function extractFrontmatterDescription(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const match = content.match(/^---\n([\s\S]+?)\n---/);
    if (!match) return "";
    const frontmatter = match[1];

    // Try multi-line YAML (description: | ...)
    const multiLine = frontmatter.match(/^description:\s*\|\s*\n((?:\s{2}.*\n?)*)/m);
    if (multiLine) {
      return multiLine[1]
        .split("\n")
        .map(l => l.replace(/^\s{2}/, "").trim())
        .filter(l => l)
        .join(" ");
    }

    // Try single-line: description: text
    const singleLine = frontmatter.match(/^description:\s*(.+)$/m);
    if (singleLine) {
      const val = singleLine[1].trim();
      if (val && val !== "|") return val;
    }

    return "";
  } catch {
    return "";
  }
}

function getFiles(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => d.name);
  } catch {
    return [];
  }
}

// ─── Commands ───────────────────────────────────────────────────────────────

function cmdHelp() {
  console.log(`
\x1b[1mmy-opencode\x1b[0m — 高品質 opencode 開發流程 skill 與 agents 集合

\x1b[1m安裝方式 (擇一)\x1b[0m

  \x1b[36m方法 A: npm install\x1b[0m (自動複製到 .opencode/)
    npm install my-opencode
    ✓ postinstall 自動將 agents/ skills/ 複製到 .opencode/
    ✓ 原始檔案留在 node_modules/ (已 gitignore)

  \x1b[36m方法 B: npx\x1b[0m (不留 package.json dependency)
    npx my-opencode init
    ✓ 直接安裝到 .opencode/
    ✓ 不寫入 package.json

\x1b[1mCOMMANDS\x1b[0m
  init  [target-dir]  安裝 skills/agents 到 .opencode/ 下
                       (預設: 當前目錄的 .opencode/)
  list                列出可用的 skills 與 agents
  help                顯示此說明

\x1b[1mEXAMPLES\x1b[0m
  npm install my-opencode              # 方法 A (自動)
  npx my-opencode init                 # 方法 B (手動)
  npx my-opencode init ./my-project    # 指定專案目錄
  npx my-opencode list                 # 列出內容
`);
}

function cmdList() {
  header("Available Skills");
  const skills = getDirectories(SKILLS_DIR);
  if (skills.length === 0) {
    warn("No skills found.");
  } else {
    for (const s of skills) {
      const skillPath = path.join(SKILLS_DIR, s, "SKILL.md");
      const desc = extractFrontmatterDescription(skillPath);
      console.log(`${INDENT}\x1b[33m${s}\x1b[0m`);
      if (desc) console.log(`${INDENT}  ${desc}`);
      console.log();
    }
  }

  header("Available Agents");
  const agents = getFiles(AGENTS_DIR);
  if (agents.length === 0) {
    warn("No agents found.");
  } else {
    for (const a of agents) {
      const agentPath = path.join(AGENTS_DIR, a);
      const desc = extractFrontmatterDescription(agentPath);
      const name = a.replace(/\.md$/, "");
      console.log(`${INDENT}\x1b[33m${name}\x1b[0m`);
      if (desc) console.log(`${INDENT}  ${desc}`);
      console.log();
    }
  }
}

function cmdInit(targetDir) {
  // If no target specified, default to .opencode/ in CWD
  const target = targetDir
    ? path.resolve(targetDir, ".opencode")
    : path.resolve(process.cwd(), ".opencode");

  header(`Installing my-opencode → ${target}`);

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
    success(`Created .opencode/`);
  }

  // ── Copy skills ───────────────────────────────────────────────────────────
  const targetSkills = path.join(target, "skills");
  if (!fs.existsSync(targetSkills)) {
    fs.mkdirSync(targetSkills, { recursive: true });
  }
  const skills = getDirectories(SKILLS_DIR);
  let skillCount = 0;
  for (const s of skills) {
    const src = path.join(SKILLS_DIR, s);
    const dst = path.join(targetSkills, s);
    copyDirSync(src, dst);
    skillCount++;
  }
  success(`Skills: ${skillCount} installed → .opencode/skills/`);

  // ── Copy agents ──────────────────────────────────────────────────────────
  const targetAgents = path.join(target, "agents");
  if (!fs.existsSync(targetAgents)) {
    fs.mkdirSync(targetAgents, { recursive: true });
  }
  const agents = getFiles(AGENTS_DIR);
  let agentCount = 0;
  for (const a of agents) {
    const src = path.join(AGENTS_DIR, a);
    const dst = path.join(targetAgents, a);
    if (!fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      agentCount++;
    } else {
      warn(`Skipped (already exists): agents/${a}`);
    }
  }
  success(`Agents: ${agentCount} installed → .opencode/agents/`);

  // ── Generate opencode.json ──────────────────────────────────────────────
  const targetConfig = path.join(target, "opencode.json");
  if (!fs.existsSync(targetConfig)) {
    try {
      const config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG, "utf-8"));
      fs.writeFileSync(targetConfig, JSON.stringify(config, null, 2) + "\n");
      success("Generated .opencode/opencode.json — ready to use");
    } catch {
      warn("Could not generate opencode.json (source config missing or invalid)");
    }
  } else {
    warn("Skipped (already exists): .opencode/opencode.json");
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log();
  header("Installation Complete");
  info("my-opencode is ready at .opencode/");
  console.log();
  console.log(`${INDENT}Your project's opencode.json should reference:`);
  console.log(`${INDENT}  "instructions": [`);
  console.log(`${INDENT}    ".opencode/skills/adr/SKILL.md",`);
  console.log(`${INDENT}    ".opencode/skills/dev-flow/SKILL.md",`);
  console.log(`${INDENT}    ".opencode/skills/pr-review/SKILL.md",`);
  console.log(`${INDENT}    ".opencode/skills/test-gen/SKILL.md",`);
  console.log(`${INDENT}    ".opencode/skills/docs-gen/SKILL.md",`);
  console.log(`${INDENT}    ".opencode/skills/orchestrate/SKILL.md"`);
  console.log(`${INDENT}  ]`);
  console.log();
  console.log(`${INDENT}Agents and commands from .opencode/opencode.json`);
  console.log(`${INDENT}are auto-discovered by opencode.`);
  console.log();
  info("Documentation: https://github.com/jjyung/my-opencode");
  console.log();
}

// ─── File Utilities ─────────────────────────────────────────────────────────

function copyDirSync(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath);
    } else if (entry.isFile()) {
      if (!fs.existsSync(dstPath)) {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || "";

  switch (cmd) {
    case "init":
    case "install":
      cmdInit(args[1]);
      break;
    case "list":
    case "ls":
      cmdList();
      break;
    case "help":
    case "--help":
    case "-h":
      cmdHelp();
      break;
    default:
      // No args — show a friendly welcome and prompt to init
      console.log(`
\x1b[1mmy-opencode\x1b[0m — 高品質 opencode 開發流程 skill 與 agents 集合

在專案中執行以下指令來安裝到 \x1b[33m.opencode/\x1b[0m：

  \x1b[36mnpx my-opencode init\x1b[0m

安裝後，將以下內容加入你的 \x1b[33mopencode.json\x1b[0m：

  \x1b[2m"instructions": [
    ".opencode/skills/adr/SKILL.md",
    ".opencode/skills/dev-flow/SKILL.md",
    ".opencode/skills/pr-review/SKILL.md",
    ".opencode/skills/test-gen/SKILL.md",
    ".opencode/skills/docs-gen/SKILL.md",
    ".opencode/skills/orchestrate/SKILL.md"
  ]\x1b[0m

更多資訊請執行：\x1b[36mnpx my-opencode help\x1b[0m
`);
      break;
  }
}

main();
