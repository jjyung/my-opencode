---
name: orchestrate
description: |
  Multi-agent orchestration for complex development tasks. Breaks down large work, delegates to specialized agents, manages handoffs, and drives the fix loop.
  Use when tasks span multiple domains, require parallel execution, or need full lifecycle management.
  Triggers on: "orchestrate", "coordinate", "manage", "run the full pipeline", "team", "complex task"
---

# Orchestrate

Multi-agent orchestration workflow for complex development tasks.

## When to Use

- Task is too large for a single agent
- Task spans multiple domains (frontend + backend + infra)
- Need parallel execution of independent subtasks
- Full lifecycle management from requirements to merge

## Comparison with fullstack-dev

| Aspect | fullstack-dev | team-lead |
|--------|---------------|-----------|
| Scope | Single feature | Multi-domain, complex tasks |
| Parallelism | Sequential phases | Parallel subtask execution |
| Delegation | One agent per phase | Multiple agents concurrently |
| State | Single handoff chain | Parallel + merge handoffs |
| Best for | Well-defined changes | Large features, refactors, cross-cutting work |

## Workflow

```
Task Intake → Decomposition → Parallel Dispatch → Collection → Synthesis → Review → Done
```

### Step 1: Task Intake

Analyze the user's request and determine scope:
- **Simple** (≤3 files, single domain) → delegate to fullstack-dev
- **Complex** (multi-domain, large scope) → orchestrate here

Ask clarifying questions if needed (one at a time with rationale).

### Step 2: Decomposition

Break the task into manageable subtasks, each with:
- Clear input/output
- Assigned agent type
- Dependencies between subtasks

### Step 3: Parallel Dispatch

Launch independent subtasks concurrently using the Task tool with appropriate `subagent_type`:

```markdown
Task 1: planner (architecture + data model)
Task 2: planner (API design)
(These are independent — launch in parallel)
```

Dependent subtasks run sequentially:
```
Task 1: planner (design schema) → Task 2: executor (implement schema) → Task 3: executor (API endpoints)
```

### Step 4: Collection

Read handoff outputs from each subtask. Resolve conflicts between parallel streams.

### Step 5: Synthesis

Combine parallel results into a coherent whole. Write `.handoffs/orchestrate/synthesis.md` with:
- What each subtask produced
- Integration notes
- Remaining work
- Risks discovered

### Step 6: Review

Run pr-review on the synthesized result:
- Delegate to code-reviewer agent
- Apply fixes if issues found

### Step 7: Verification

Run tests:
- Delegate to test-engineer for new test generation
- Delegate to verifier for full test suite run

## Handoff Directory

All orchestration state: `.handoffs/orchestrate/`

## Error Recovery

| Failure | Action |
|---------|--------|
| Subtask fails | Retry once, then report to user |
| Parallel conflicts | Reconcile in synthesis phase |
| Verification fails | Enter fix loop (max 3 retries) |
| User changes mind | Accept new direction, re-plan affected subtasks |
