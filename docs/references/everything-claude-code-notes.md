# Everything Claude Code (ECC) Reference Notes

## Source Repository
`/Users/cfh00902455/Projects/my/my-opencode/ref/everything-claude-code/`

**Version:** 2.0.0-rc.1  
**Author:** Affaan Mustafa (me@affaanmustafa.com)  
**License:** MIT  
**Total files:** 2,845  

---

## 1. Directory Structure — Top-Level Layout

```
agents/              — 60 specialized subagents (one .md file each)
skills/              — 232 workflow skills and domain knowledge directories
commands/            — 75 slash command definitions (.md files)
hooks/               — Trigger-based automations (hooks.json + memory-persistence/)
rules/               — Always-follow guidelines (common/ + 14 language dirs)
scripts/             — Cross-platform Node.js utilities (167 files total)
mcp-configs/         — MCP server configurations (1 .json with ~30 server entries)
schemas/             — JSON schemas for plugin, hooks, install configs, etc.
manifests/           — Install manifests (components, modules, profiles)
contexts/            — Mode contexts (dev.md, research.md, review.md)
tests/               — Test suite (149 files)
docs/                — Documentation (46 entries, including architecture, translations, security)
assets/              — Images and static assets
examples/            — Example projects (evaluator-rag-prototype, gan-harness)
config/              — Configuration files
research/            — Research docs
src/                 — Source code (llm/)
ecc2/                — ECC2 next-gen source
```

### Cross-Harness IDE Directories

```
.claude/             — Claude Code harness config
  commands/          — 3 workflow commands
  enterprise/        — controls.md (governance scaffold)
  homunculus/        — instincts/inherited/ (continuous learning)
  research/          — research playbook
  rules/             — guardrails + node.md
  skills/            — everything-claude-code/ (auto-generated repo skill)
  team/              — team config JSON
  identity.json      — identity preferences
  package-manager.json — package manager lock
  ecc-tools.json     — ECC-tools manifest (packages, modules, dependency graph)

.agents/             — OpenAI Agents SDK config
  plugins/           — marketplace.json
  skills/            — 33 skill copies for Codex

.codex/              — Codex harness config
  config.toml        — MCP + multi-agent config
  AGENTS.md          — Codex usage guide
  agents/            — explorer.toml, reviewer.toml, docs-researcher.toml

.cursor/             — Cursor IDE config
  hooks.json         — Cursor-specific hooks
  hooks/             — hook scripts
  rules/             — Cursor rules
  skills/            — skill copies

.codex-plugin/       — Codex plugin manifest
.codebuddy/          — CodeBuddy config
.gemini/             — Gemini config
.kiro/               — Kiro IDE config (agents/, docs/, hooks/, scripts/, settings/, skills/, steering/)
.opencode/           — OpenCode AI config (commands/, instructions/, plugins/, prompts/, tools/)
.qwen/               — Qwen config
.trae/               — Trae IDE config
.zed/                — Zed editor config
```

### How Skills Are Organized

Each skill lives in its own directory under `skills/`:

```
skills/<skill-name>/
    SKILL.md         — The skill definition (required)
    scripts/         — Optional supporting scripts (sh, js, etc.)
    assets/          — Optional images/diagrams
    examples/        — Optional example code
```

There are **232 skill directories** under `skills/`.

---

## 2. Skill Format — SKILL.md Structure

### Frontmatter

Every SKILL.md starts with YAML frontmatter enclosed in `---`:

```yaml
---
name: deep-research
description: Multi-source deep research using firecrawl and exa MCPs...
origin: ECC            # "ECC" for first-party, "community" for imported
tools: Read, Write, Edit, Bash, Grep, Glob   # optional, some omit
---
```

**Required frontmatter fields:** `name`, `description`, `origin`
**Optional fields:** `tools`, `argument-hint`

### Body Sections (Typical)

| Section | Purpose |
|---------|---------|
| `# Title` | H1 matching the skill name |
| `## When to Activate` / `## When to Use` | Trigger conditions |
| `## How It Works` / `## Workflow` | Step-by-step process |
| `## MCP Requirements` | External MCP servers needed |
| `## Examples` | Usage examples with code blocks |
| `## Best Practices` / `## Quality Rules` | Guidelines and guardrails |
| `## Related Skills` | Cross-references to other skills |

### Skill Sizing
- Simple skill (e.g., `deep-research`): ~159 lines, no `tools` field
- Complex skill (e.g., `agent-architecture-audit`): ~256 lines, with `tools` field, JSON schemas, severity models
- Reference skill (e.g., `mcp-server-patterns`): ~69 lines, concise

---

## 3. Skill Marketplace Configuration

### Plugin Manifest
```json
{
  "name": "ecc",
  "version": "2.0.0-rc.1",
  "skills": ["./skills/"],
  "commands": ["./commands/"]
}
```

### Marketplace Registration
```json
{
  "name": "ecc",
  "plugins": [
    {
      "name": "ecc", "source": "./",
      "category": "workflow", "strict": false
    }
  ]
}
```

---

## 4. Notable Patterns

### 4.1 Progressive Disclosure / Capability Surface Selection
```
rules/    → deterministic, always-on constraints
skills/   → on-demand workflows, token-expensive guidance
MCP       → interactive structured capabilities
CLI/script → simple deterministic actions
API       → narrow remote actions inside a skill
```

**Decision order:** rule → skill → MCP → CLI/script → API

### 4.2 Context Management
- Avoid last 20% of context window for large refactoring
- Strategic compaction at ~50 tool calls
- `ECC_SESSION_START_MAX_CHARS` (default 8000)
- Keep under 10 MCPs enabled
- Three mode contexts: `dev.md`, `research.md`, `review.md`

### 4.3 Model Routing
- Agent-level: `architect` → opus, `planner` → opus, `security-reviewer` → sonnet, `docs-lookup` → sonnet
- OpenCode config: per-agent model in `opencode.json`

### 4.4 Agent Orchestration Philosophy
1. Agent-First — route to specialist early
2. Proactive invocation without user prompt
3. Parallel execution for independent operations
4. Plan Before Execute
5. Skills canonical, commands legacy

### 4.5 Prompt Defense Baseline
Every agent file includes: no role/persona changes, no secret leakage, no untrusted executable output, unicode/homoglyph suspicion, external data as untrusted.

---

## 5. Tool & Subagent Definitions

### Skill Tool Declaration
```yaml
---
name: agent-architecture-audit
tools: Read, Write, Edit, Bash, Grep, Glob
---
```

### Agent Definition
```markdown
---
name: architect
description: Software architecture specialist...
tools: ["Read", "Grep", "Glob"]
model: opus
---
```

### OpenCode Tool Permissions
```json
"planner": {
  "mode": "subagent",
  "model": "anthropic/claude-opus-4-5",
  "tools": { "read": true, "bash": true, "write": false, "edit": false }
}
```

### Agent Composition
- Implicit via AGENTS.md routing rules
- Explicit via opencode.json command→agent routing
- Skill-based delegation via Task tool (parallel subagents)

---

## 6. Key Takeaways

1. Multi-harness by design — skill catalog duplicated across harnesses
2. Skill-first architecture — skills canonical, commands legacy
3. Agent specialization — 60 agents with model routing
4. Event-driven hooks — Pre/Post tool use, session lifecycle
5. Progressive disclosure — narrowest surface first
6. Prompt defense — every agent has injection baseline
7. Memory as lifecycle — persistence at every lifecycle boundary
