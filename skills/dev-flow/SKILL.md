---
name: dev-flow
description: |
  Orchestrate the full development workflow: plan → code → verify → fix (loop).
  Use PROACTIVELY when implementing features, fixing bugs, refactoring, or making code changes.
  Triggers on: "implement", "feature", "fix bug", "refactor", "add", "change", "build"
---

# Development Flow

Full-stack development workflow with three phases: Plan → Code → Verify, with an optional fix loop.

## When to Use

- Implementing a new feature
- Fixing a bug
- Refactoring existing code
- Making any non-trivial code change

## Phase Overview

```
Plan → Code → Verify → [Fix loop] → Done
```

Each phase produces a handoff document for the next phase.

## Phase 1: Plan

**Goal:** Understand requirements, design approach, identify risks.

### Steps
1. **Analyze** — Read relevant files, understand current codebase structure
2. **Scope** — Define what will and won't be changed
3. **Approach** — Design the implementation strategy
4. **Review** — Present plan to user for approval

### Handoff Output (`.handoffs/dev-flow/plan.md`)
- Requirements summary
- Files to be modified (with rationale)
- Implementation approach (step by step)
- Risks and mitigations
- Test strategy

### Agent: planner (read-only)
- Tools: Read, Grep, Glob, Bash
- Model: sonnet or opus (for complex changes)
- Read-only: no Write/Edit allowed

See `references/plan-phase.md` for detailed planning workflow.

## Phase 2: Code

**Goal:** Implement the planned changes.

### Steps
1. **Setup** — Create or modify files per plan
2. **Implement** — Write code following project conventions
3. **Self-review** — Review changes before moving on

### Handoff Output (`.handoffs/dev-flow/code.md`)
- Files changed (with diff summary)
- Any deviations from plan (with rationale)
- Pending items (tests, docs, etc.)

### Agent: executor
- Tools: Read, Write, Edit, Bash, Grep, Glob
- Model: sonnet
- Full read/write access

See `references/code-phase.md` for detailed coding workflow.

## Phase 3: Verify

**Goal:** Ensure changes are correct, tested, and safe.

### Steps
1. **Lint** — Run linter (project-specific)
2. **Typecheck** — Run type checker if applicable
3. **Test** — Run existing tests, write new tests if needed
4. **Build** — Verify project builds successfully

If any step fails → enter fix loop (back to Phase 2).

### Handoff Output (`.handoffs/dev-flow/verify.md`)
- Lint result
- Typecheck result
- Test results (pass/fail, coverage)
- Build result
- Final verdict: pass / needs fix

### Agent: verifier
- Tools: Read, Grep, Glob, Bash
- Model: sonnet
- Read-only + execute tests

See `references/verify-phase.md` for detailed verification workflow.

## Fix Loop

If verification fails:
1. Read the verify handoff to understand what failed
2. Fix the issues (back to Phase 2, Code phase)
3. Re-verify (Phase 3)
4. Loop until all checks pass or max retries reached (default: 3)

## Quick Start

For simple changes (≤3 files, well-understood):
```
Phase 1: Quick scan → Phase 2: Code → Phase 3: Verify
```

For complex changes (new feature, refactor):
```
Phase 1: Full plan with user review → Phase 2: Code → Phase 3: Verify
```

## Handoff Directory

All handoff documents go to `.handoffs/dev-flow/`. This directory is:
- Created automatically on first use
- Gitignored (session-local)
- Read by subsequent phases for context

## Related Skills

- `test-gen` — Test generation (future)
- `pr-review` — PR review automation (future)
