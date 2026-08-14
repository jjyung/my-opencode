---
name: orchestrate
description: |
  Orchestrate evidence-first delivery across Design Evidence, SA, SD, frontend, backend, review, tests, and verification.
  Use when tasks span multiple domains, require parallel execution, or need full lifecycle management.
  Triggers on: "orchestrate", "coordinate", "manage", "run the full pipeline", "team", "complex task"
---

# Evidence-First Orchestration

## Workflow

```text
Intake → Evidence → SA → SD → Slice Plan
                         ├→ Frontend slice ─┐
                         └→ Backend slice ───┼→ Review → QA/Verify → Synthesis
```

## Dispatch Rules

1. `team-lead` records feature ID, source/version, owner, scope, status, and approval state.
2. `design-evidence` runs before business analysis whenever UI/UX input exists.
3. `business-analyst` runs after evidence and resolves business meaning only.
4. `system-designer` runs after business approval and produces the shared technical design plus role views.
5. `frontend-dev` and `backend-dev` run concurrently only after their contracts are ready.
6. `code-reviewer` reviews each bounded slice; `test-engineer` fills test gaps.
7. `verifier` independently checks business, visual/interaction, API/data, security/operations, and mechanical checks.
8. `team-lead` resolves conflicts, persists traceability and the final verification report, and starts the fix loop when needed.

## Slice Requirements

Each dispatched slice MUST include:

- Input artifact paths and source version
- Owner and reviewer
- File and behavior boundary
- `EVID-*`, `BR-*`, `BUS-*`, `API-*`, `DATA-*`, `AC-*`, and `VER-*` IDs in scope
- Expected output and verification command

Do not send a whole page or service to one worker when it can be split into independently reviewable slices.

## Parallelism

Parallelize independent evidence extraction, frontend/backend implementation, tests, and per-slice reviews. Keep dependencies sequential:

```text
Evidence → SA → SD → role contracts → implementation
```

Never run implementation before the contracts are approved. Never let parallel workers independently reinterpret the original design input.

## Synthesis

The synthesis must record:

- Artifact and code outputs by subtask
- Integrated slice list and owners
- Traceability coverage and unresolved unknowns
- Contract deviations and their owning layer
- Review findings and verification results
- Remaining work and release risks

Persist long-lived decisions and verification evidence under `docs/specs/<feature>/`; keep session-only coordination notes under `.handoffs/orchestrate/`.
