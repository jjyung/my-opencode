import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

const config = JSON.parse(read("opencode.json"));
const expectedAgents = [
  "team-lead",
  "design-evidence",
  "business-analyst",
  "system-designer",
  "frontend-dev",
  "backend-dev",
  "verifier",
  "code-reviewer",
  "test-engineer",
  "tech-writer",
  "architect",
];
const removedAgents = ["fullstack-dev", "spec-writer", "executor"];
const expectedCommands = [
  "evidence",
  "business-spec",
  "technical-design",
  "frontend",
  "backend",
  "review",
  "test",
  "docs",
  "orchestrate",
  "adr",
  "verify",
];

expect(config.default_agent === "team-lead", "default_agent must be team-lead");
for (const agent of expectedAgents) {
  expect(config.agent?.[agent], `missing agent: ${agent}`);
  const prompt = config.agent?.[agent]?.prompt;
  if (prompt?.startsWith("{file:") && prompt.endsWith("}")) {
    expect(fs.existsSync(path.join(root, prompt.slice(6, -1))), `missing prompt for ${agent}`);
  }
}
for (const agent of removedAgents) {
  expect(!config.agent?.[agent], `removed agent remains registered: ${agent}`);
  expect(!fs.existsSync(path.join(root, "agents", `${agent}.md`)), `removed agent file remains: ${agent}`);
}
for (const command of expectedCommands) {
  expect(config.command?.[command], `missing command: ${command}`);
  expect(config.agent?.[config.command?.[command]?.agent], `command points to unknown agent: ${command}`);
}
expect(!config.command?.spec, "removed command remains registered: spec");
for (const instruction of config.instructions ?? []) {
  expect(fs.existsSync(path.join(root, instruction)), `missing instruction: ${instruction}`);
}

const evidenceSkill = read("skills/design-evidence/SKILL.md");
for (const term of ["observed", "inferred", "unknown", "confidence", "prototype", "EVID-"]) {
  expect(evidenceSkill.includes(term), `design-evidence skill missing term: ${term}`);
}
const devFlow = read("skills/dev-flow/SKILL.md");
for (const term of ["Business Requirements", "Technical Design", "frontend-contract.md", "backend-contract.md", "traceability.md", "VER-"]) {
  expect(devFlow.includes(term), `dev-flow skill missing term: ${term}`);
}

const plugin = spawnSync(process.execPath, [path.join(root, "plugins/provider-profile.mjs")], {
  cwd: root,
  env: { ...process.env, OPENCODE_PROVIDER_PROFILE: "google" },
  encoding: "utf8",
});
expect(plugin.status === 0, "provider profile plugin failed to execute");
if (plugin.status === 0) {
  const output = JSON.parse(plugin.stdout);
  for (const agent of ["design-evidence", "business-analyst", "system-designer", "code-reviewer", "team-lead", "architect"]) {
    expect(output.agent?.[agent]?.model === "google/gemini-3.1-pro-preview-customtools", `google heavy model missing for ${agent}`);
  }
  expect(output.agent?.verifier?.model === "google/gemini-3.5-flash", "google verifier model mismatch");
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Role-flow structure validation passed.");
