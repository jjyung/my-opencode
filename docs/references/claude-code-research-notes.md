# Claude Code Research: Comprehensive Analysis Notes

**Source:** `/Users/cfh00902455/Projects/my/my-opencode/ref/claude-code-research/`
**Author:** CabLate (independent research)
**Baseline:** Claude Code v2.1.88 (2026-03-31 sourcemap)
**Scope:** 75 reports across 10 domains (~884KB)

---

## 1. Directory Structure

```
source-code-analysis/          # 75 reports, 10 domains
├── phase-01-system-prompt/    # 6 reports
├── phase-02-tool-definitions/ # 8 reports
├── phase-03-agent-architecture/ # 7 reports
├── phase-04-skills-system/    # 5 reports
├── phase-05-memory-context/   # 9 reports
├── phase-06-security-permissions/ # 8 reports
├── phase-07-api-model-architecture/ # 7 reports
├── phase-08-special-features/ # 10 reports
├── phase-09-harness-engineering/ # 7 reports
└── phase-10-cost-quota-management/ # 8 reports
reports/                       # 8 behavioral investigations
research/                      # 1 methodology guide
```

---

## 2. Agent Loop Analysis

### Core Architecture
```
User Input → normalizeMessagesForAPI() → Claude API (streaming)
  └→ end_turn → Response
  └→ tool_use → partitionToolCalls()
       ├→ read-only: concurrent (max 10)
       └→ write tools: serial
       └→ per tool:
            1. Zod schema validation
            2. Custom validateInput()
            3. PreToolUse hooks
            4. Permission resolution
            5. tool.call()
            6. PostToolUse hooks
            7. Wrap result as UserMessage(tool_result)
       └→ loop back to API
```

### Key Findings
1. **Streaming-first:** All API calls streaming; non-streaming is fallback
2. **Read/Write concurrency:** Tools declare `isConcurrencySafe()` — parallel for read, serial for write
3. **Error injection as model feedback:** Errors wrapped as `is_error: true` tool_result blocks
4. **Cancellation propagation:** Every tool bound to `AbortController.signal`
5. **10-stage execution pipeline per tool**

---

## 3. Skill System Internals

### Architecture
| Component | File | Role |
|-----------|------|------|
| SkillTool | `src/tools/SkillTool/SkillTool.ts` | External entry point |
| BundledSkills | `src/skills/bundledSkills.ts` | Registration system |
| SkillTool Prompt | `src/tools/SkillTool/prompt.ts` | Skill listing in system-reminder |

### Loading Flow
```
initBundledSkills()
  → registerUpdateConfigSkill() (unconditional)
  → registerKeybindingsSkill() (unconditional)
  → registerVerifySkill() (USER_TYPE === 'ant')
  → feature('FLAG') → registerDream/Loop/etc. (feature-gated)
```

### Skill Discovery
Every turn: `getSkillToolCommands(cwd)` → bundled + project + MCP skills

**Budget control:** 1% of context window (`SKILL_BUDGET_CONTEXT_PERCENT = 0.01`). Bundled skills never truncated; others proportionally shortened. Each entry max 250 chars.

### Execution Modes
| Dimension | Inline | Fork |
|-----------|--------|------|
| Context | Shared with main | Isolated sub-agent |
| Default | Yes | Only when `command.context === 'fork'` |

### Permission System
- **Auto-allow** when `skillHasOnlySafeProperties()` (Read/Grep/Glob etc.)
- **Manual rules** in settings.json: `permissions.allow` / `permissions.deny`
- **Priority:** deny > allow > auto-allow > ask

### 16 Bundled Skills
update-config, keybindings-help, verify, debug, lorem-ipsum, skillify, remember, simplify, batch, stuck, loop, schedule, claude-api, claude-in-chrome, dream, hunter

---

## 4. Tool System (36 Tools)

### Two Layers
| Layer | File | Responsibility |
|-------|------|----------------|
| Orchestration | `toolOrchestration.ts` | Parallel vs serial batching |
| Execution | `toolExecution.ts` | Single-tool lifecycle (10 stages) |

### 10-Stage Tool Execution Pipeline
1. Zod schema validation → 2. Custom validateInput() → 3. Speculative classifier start (Bash only)
4. Input sanitization → 5. PreToolUse hooks → 6. Permission resolution → 7. Permission denial
8. tool.call() → 9. PostToolUse hooks → 10. Result packaging

### Key Design Patterns
- **Tool Preference Hierarchy:** Each tool tells model when to use other tools
- **Mandatory Pre-operation:** FileEdit/Write require prior Read
- **Budget-aware:** 50K chars max per result, 200K chars per message
- **Feature-gated prompt sections** based on `feature('FLAG')`
- **Communication Visibility Contract:** Tools state what other agents can/can't see

---

## 5. Security Model (Seven-Layer Defense)

| Layer | Mechanism |
|-------|-----------|
| 1. AI-Level Policy | cyberRiskInstruction.ts |
| 2. Structural Parse Gate | Tree-sitter AST parsing |
| 3. Bash Security Validators | 23 static analysis validators |
| 4. Permission Rule Engine | deny/ask/allow with exact/prefix/wildcard |
| 5. Path Constraint Checks | Working directory whitelist |
| 6. Read-Only Validation | Command whitelist with flag-level precision |
| 7. OS Sandbox | bwrap/sandbox-runtime |

### Key Decisions
- **Fail-closed:** Cannot parse → ask (not auto-allow)
- **Deny-first:** Deny checked before all other paths
- **Parser Differential Defense:** Detects gaps between shell-quote and bash parsers
- **Asymmetric Env Var Stripping:** Allow strips only safe vars; Deny strips ALL env vars
- **Multi-version Quote Tracker:** Each command analyzed from 5 viewpoints

---

## 6. Multi-Agent Architecture

### Three-Layer Architecture
```
Coordinator / Main Agent
Tools: AgentTool, SendMessageTool, TaskStopTool
  ├→ LocalAgentTask (async subagent)
  ├→ RemoteAgentTask (CCR remote)
  ├→ InProcessTeammateTask (AsyncLocalStorage)
  └→ Swarm/Team system
```

### 6 Built-in Agents
| Agent | Model | Purpose |
|-------|-------|---------|
| general-purpose | Inherits | Full tool access |
| explore | Haiku | Read-only codebase exploration |
| plan | Inherits | Architecture planning |
| verification | Inherits | Test verification |
| claude-code-guide | Haiku | Documentation queries |
| statusline-setup | Sonnet | Status bar config |

### Coordinator Mode
**Activation:** `CLAUDE_CODE_COORDINATOR_MODE=1`
4-phase: Research (parallel workers) → Synthesis (coordinator) → Implementation (workers) → Verification (workers)

### Swarm/Teammate System (`src/utils/swarm/`)
- **Pane-based** (tmux): Separate processes, filesystem mailbox
- **In-process** (AsyncLocalStorage): Same process, direct memory mailbox
- 7 message types: idle_notification, permission_request/response, shutdown, DM, etc.

---

## 7. Relevance to Opencode

### Directly Transferable
| Finding | Application |
|---------|-------------|
| Agent loop: query → tool exec → feedback | Same pattern for opencode REPL |
| Tool concurrency partitioning | `isConcurrencySafe` per tool |
| 10-stage tool execution pipeline | Zod + hooks + permission + post-hooks |
| Error injection as model feedback | Instructional error messages, not just diagnostics |
| Budget-aware prompt design | 1% context for skills, progressive truncation |
| Deny-first permission model | Deny before allow in rules engine |
| Fail-closed security | Ask when uncertain |
| Context compaction pipeline | Normalize → strip → compact as stages |
| Skills as prompt extensions | Same Markdown + metadata model |

### Architectural Differences
| Aspect | Claude Code | Opencode Consideration |
|--------|-------------|----------------------|
| Language | TypeScript/TSX | TypeScript (terminal-focused) |
| API | Anthropic only | Multi-provider |
| Multi-agent | Full coordinator/swarm | Start with single-agent + basic forking |
| Security | 7-layer, 23 bash validators | Layer proportionate to threat model |
| Memory | 6 subsystems | Start with simpler CLAUDE.md system |

---

## 8. Skill Development Insights

### 12 Design Patterns
1. **Defensive getPromptForCommand** — check env before returning prompt
2. **Dynamic prompt building** — generate from source-of-truth at call time
3. **Lazy content loading** — `import()` inside getPromptForCommand
4. **Context-aware prompt** — detect user env (language, timezone, git)
5. **Progressive disclosure** — most important rules first
6. **Strict phase ordering** — explicit phases with exit conditions
7. **Parallel agent orchestration** — "in a single message"
8. **Minimal allowedTools** — narrowest scope possible
9. **Append user request at end** — model instructions take priority
10. **disableModelInvocation for safety** — only user-invocable
11. **Session context injection** — read session state from context param
12. **Dynamic visibility with isEnabled** — runtime visibility control

### 5 Anti-patterns
1. Over-reliance on static prompts (will drift)
2. Loading large files on startup (~247KB of docs)
3. No defensive pre-checks
4. Overly broad allowedTools
5. Serial execution of parallel tasks

---

## Key Takeaways
1. Deep understanding of Claude Code internals → directly applicable to opencode
2. 10-stage tool pipeline is the reference architecture
3. 7-layer security model establishes the standard
4. 12 skill design patterns serve as checklist for skill authoring
5. Budget-aware design at every level (1% skill budget, progressive truncation)
