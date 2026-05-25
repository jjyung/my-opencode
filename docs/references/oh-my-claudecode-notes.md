# oh-my-claudecode Reference Notes

**Source:** `/Users/cfh00902455/Projects/my/my-opencode/ref/oh-my-claudecode/`
**Package:** `oh-my-claude-sisyphus` v4.14.1
**License:** MIT

---

## 1. Directory Structure

```
oh-my-claudecode/
├── .claude-plugin/          # Plugin marketplace & manifest
├── agents/                  # 19 agent prompt files (markdown + YAML frontmatter)
├── bridge/                  # CLI entry points, MCP server, team bridge (JS)
├── commands/                # Command expansion utilities
├── docs/                    # User & developer documentation
├── hooks/                   # Shell-based hooks for Claude Code events
├── missions/                # Mission definitions
├── scripts/                 # Build, setup, utility scripts
├── skills/                  # 30 skill definitions (markdown + YAML frontmatter)
├── src/                     # TypeScript source (main codebase)
│   ├── agents/              # 18+ agent definitions (TypeScript)
│   ├── features/            # Model routing, verification, delegation
│   ├── hooks/               # 40+ event-driven hooks
│   ├── hud/                 # Heads-up display statusline
│   ├── team/                # Team orchestration runtime (62 files)
│   └── tools/               # MCP tool definitions
├── tests/                   # Integration tests
├── AGENTS.md                # Canonical agent orchestration guidance (407 lines)
└── CLAUDE.md                # End-user instructions
```

### Agent Organization (two parallel hierarchies)

**Prompt files** (`agents/*.md`): markdown with YAML frontmatter
**TypeScript definitions** (`src/agents/definitions.ts`): 19 agents in lanes:
- **Build/Analysis:** explore, analyst, planner, architect, debugger, executor, verifier, tracer
- **Review:** security-reviewer, code-reviewer
- **Domain:** test-engineer, designer, writer, qa-tester, scientist, document-specialist, git-master, code-simplifier
- **Coordination:** critic

---

## 2. Agent Definition Format

```markdown
---
name: executor
description: Focused task executor for implementation work
model: sonnet
level: 2
---
<Agent_Prompt>
  <Role>...</Role>
  <Why_This_Matters>...</Why_This_Matters>
  <Success_Criteria>...</Success_Criteria>
</Agent_Prompt>
```

**Frontmatter fields:** `name`, `description`, `model` (haiku/sonnet/opus), `level` (1-4), `disallowedTools`

### Model Resolution Precedence
1. `forceInherit` env — all agents inherit parent model
2. `PluginConfig.agents[name].model` — user-configured per-agent
3. `AgentConfig.defaultModel` — built-in default

---

## 3. Pipeline / Orchestration

### Canonical Team Pipeline
```
team-plan → team-prd → team-exec → team-verify → team-fix (loop)
```
`team-fix` loop bounded by `max_fix_loops` (default: 3). Terminal states: `complete`, `failed`, `cancelled`.

### Stage Agent Routing

| Stage | Required | Optional |
|-------|----------|----------|
| team-plan | explore (haiku), planner (opus) | analyst, architect |
| team-prd | analyst (opus) | critic |
| team-exec | executor (sonnet) | debugger, designer, writer, test-engineer |
| team-verify | verifier (sonnet) | security-reviewer, code-reviewer |
| team-fix | executor (sonnet) | debugger |

### Handoff Convention
Each stage writes `.omc/handoffs/<stage-name>.md` with decisions, alternatives rejected, risks, files changed, remaining items.

### Ralph Pipeline (Persistence Loop)
1. PRD Setup → 2. Pick next story → 3. Implement → 4. Verify → 5. Mark complete → 6. Check PRD → 7. Reviewer verification → 8. Deslop pass → 9. Regression → 10. Cancel

### Autopilot Pipeline (Full Autonomous)
1. Expansion (analyst + architect) → 2. Planning (architect + critic) → 3. Execution (Ralph + Ultrawork) → 4. QA (build/lint/test, up to 5 cycles) → 5. Validation (multi-perspective) → 6. Cleanup

---

## 4. Skill System

### Skill Format
```markdown
---
name: skill-name
description: Brief description
triggers: ["keyword1", "keyword2"]
agent: executor
model: sonnet
pipeline: [skill-name, follow-up-skill]
handoff: .omc/plans/example.md
level: 4
---
```

### Skill Discovery
Scans: `.omc/skills/` → `~/.omc/skills/` → `~/.claude/skills/omc-learned/`

### Skill Invocation
- Manual: `/oh-my-claudecode:skill-name`
- Auto-detection: keywords match user message
- Agent shortcuts: `$name` syntax (e.g., `$ralph "fix tests"`)

### 30 Skills Categories
| Category | Skills |
|----------|--------|
| Execution | autopilot, ultrawork, ralph, team, ultraqa |
| Planning | omc-plan, ralplan, deep-interview, ralph-init |
| Exploration | deepinit, sciomc, external-context |
| Utility | skillify, note, cancel, hud, setup, omc-setup, mcp-setup, skill, ask |

---

## 5. Notable Patterns

### Mode Comparison (8 Orchestration Modes)

| Mode | Type | Phases | Parallelism | Verification |
|------|------|--------|-------------|-------------|
| Ralph | Loop | iterate→implement→verify→done | Ultrawork within iterations | PRD criteria + reviewer |
| Autopilot | Pipeline | 6 phases | Ralph + Ultrawork within phases | Multi-perspective |
| Ultrawork | Parallel Engine | waves→dependencies | Maximum | Build + test pass |
| Team | Staged Pipeline | 5 stages | N workers (1-20) | Stage-appropriate |
| UltraQA | QA Loop | test→verify→fix→repeat | Parallel within cycles | Cycling until pass |
| Plan | Planning | interview→plan→validate | Sequential | N/A |
| Ralplan | Consensus | planner→architect→critic | Serial | Critic validates |
| Deep-Interview | Socratic | Q&A→ambiguity→spec | Sequential | Ambiguity gating |

### Mode Composition Hierarchy
```
Autopilot → Ralph → Ultrawork → Agent delegation
```

### Token Saving
- Ecomode: token-efficient lightweight models
- Escalation-based routing: start cheap, escalate on failure
- Task size detection: suppress heavy orchestration for small tasks
- Notepad system: session-persistent scratchpad
- Context percent monitoring in HUD

### State Management (`.omc/`)
- `.omc/state/` — mode state files (JSON)
- `.omc/notepad.md` — session-persistent notes
- `.omc/project-memory.json` — cross-session knowledge
- `.omc/plans/` — planning documents
- `.omc/logs/` — audit logs
- `.omc/handoffs/` — stage transition docs

### HUD Statusline
- OMC version, active mode indicators, context %, rate limits, active agents, todo summary, git status, model name

---

## Key Takeaways
1. Multi-mode orchestration with clear phase contracts
2. File-based handoff (not context-window memory)
3. Keyword-triggered skill auto-detection
4. Three-tier model routing (haiku/sonnet/opus)
5. State machine with bounded retry loops
6. Task decomposition for small vs large tasks
