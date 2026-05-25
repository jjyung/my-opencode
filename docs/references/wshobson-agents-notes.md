# wshobson-agents Reference Architecture Notes

**Source:** `/Users/cfh00902455/Projects/my/my-opencode/ref/wshobson-agents/`
**Repo:** wshobson/agents — multi-harness agentic plugin marketplace
**Scale:** 83 plugins, 191 agents, 155 skills, 102 commands, 16 orchestrators

---

## 1. Directory Structure

```
claude-agents/
├── AGENTS.md                       # Canonical context file (~150 lines)
├── CLAUDE.md                       # @AGENTS.md import + addenda
├── ARCHITECTURE.md                 # Architectural map
├── .claude-plugin/marketplace.json # 83 plugins cataloged
├── plugins/                        # SOURCE OF TRUTH
│   └── <plugin-name>/
│       ├── .claude-plugin/plugin.json
│       ├── agents/                 # Agent definition files (*.md)
│       ├── commands/               # Slash command definitions
│       └── skills/<skill-name>/
│           ├── SKILL.md            # ≤8KB body cap
│           ├── references/         # Deep material loaded on demand
│           └── assets/             # Templates, configs
├── tools/                          # Python adapter framework
│   └── adapters/                   # Per-harness: codex, cursor, opencode, gemini
├── docs/                           # Reference material (loaded on demand)
```

### Key Structural Invariants
- **Single source of truth:** Everything in `plugins/`. Generated artifacts are gitignored.
- **Four harness targets:** Claude Code, Codex CLI, Cursor, OpenCode, Gemini CLI
- **No harness-conditional markup:** Source files carry no `#ifdef`-style logic

---

## 2. Agent Definitions

### Location: `plugins/<plugin>/agents/<agent-name>.md`

### Frontmatter
```yaml
---
name: <globally-unique-name>        # Required: must be unique across all plugins
description: <trigger-phrase description>  # Required: must include "Use when..."
model: opus|sonnet|haiku|inherit    # Optional
tools: [Read, Grep, ...]           # Optional: [] means "locked" (no tools)
color: <color>                     # Optional: Claude-only cosmetic
---
```

### Body Structure
```
## Purpose
## Capabilities (categorized bullet lists)
## Behavioral Traits
## Knowledge Base
## Response Approach (numbered steps)
## Example Interactions
```

### Model Distribution
| Model | Count | Use Case |
|-------|-------|----------|
| Opus | 54 | Architecture, security, code review |
| Sonnet | 62 | Complex tasks |
| Haiku | 20 | Fast operational tasks |
| Inherit | 49 | User chooses at runtime |

---

## 3. Skill Definitions

### Location: `plugins/<plugin>/skills/<skill-name>/SKILL.md`

### Progressive Disclosure
```
SKILL.md:
  - Navigation + quick-start (what, when, decision tree)
  - Links to references/ for deep material
  - MUST stay ≤ 8 KB (Codex hard cap)

references/details.md:
  - Deep implementation notes, full examples, edge cases
  - Loaded on demand

assets/:
  - Templates, config files, scaffolding
  - Never loaded into context, copied by skill instructions
```

### Single-Responsibility Pattern
Each skill covers exactly one focused domain. Enforced by:
- `SKILL_OVER_CODEX_CAP` lint: fires if >8KB without `references/` dir
- `MISSING_TRIGGER` lint: fires if no trigger phrase in description

---

## 4. Plugin Architecture

| Dimension | Plugin | Skill |
|-----------|--------|-------|
| Nature | Organizational/install unit | Modular knowledge package |
| Contains | Agents + skills + commands + manifest | SKILL.md + references/ + assets/ |
| Granularity | Domain area | Single focused capability |
| Manifest | `.claude-plugin/plugin.json` | SKILL.md frontmatter |
| Auto-discovery | Plugin directory scanned | Skill directory under plugins/ |

**Plugins = packaging. Skills = knowledge. Agents = execution.**

---

## 5. Notable Patterns

### Single Source of Truth
```
plugins/          ← EDIT THESE (canonical)
.codex/           ← GENERATED (gitignored)
.opencode/        ← GENERATED (gitignored)
skills/ (root)    ← GENERATED (gitignored)
```

### Progressive Disclosure Chain
```
AGENTS.md (150 lines, ~500 tokens) → map
  ↳ docs/*.md → reference material
  ↳ plugins/*/agents/*.md → agent prompts
    ↳ plugins/*/skills/*/SKILL.md → ≤8KB entry point
      ↳ references/details.md → deep material
```

### Trigger Phrase Convention
Every agent/skill description must include: `Use when`, `Use PROACTIVELY when`, `Trigger when`, etc.

### Mechanical Enforcement
| Gate | Tool | Checks |
|------|------|--------|
| `make validate` | validate_generated.py | Structural validation |
| `make garden` | doc_gardener.py | Drift detection |
| `make test` | pytest (386 tests) | Adapters + validators + round-trip |

### Composition Patterns

1. **Command workflows:** Procedural steps invoking agents and skills, file-based state handoff
2. **Agent team orchestration:** `team-lead` agent with Agent, TeamCreate, TaskCreate, SendMessage tools
3. **Orchestrator plugins:** 16 orchestrators (full-stack, incident-response, security, etc.)
4. **Hybrid model tiers:**
   - Planning→Execution pattern: Sonnet architecture → Haiku implementation
   - Multi-agent: Parallel specialists, each with appropriate model

### Constraint: No Cross-Plugin Dependencies
Plugins are self-contained. They do not import agents/skills from other plugins.

---

## Key Takeaways
1. Single source of truth under `plugins/`, everything else generated
2. Progressive disclosure at every level (AGENTS.md → docs → skills → references)
3. Trigger-phrase convention for model-initiated agent/skill routing
4. Globally unique agent names prevent collisions
5. Adapter framework (not content conditionals) for harness portability
6. 8 KB skill body cap forces disciplined disclosure
7. No cross-plugin dependencies keeps each plugin independently installable
