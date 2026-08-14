---
name: dev-flow
description: |
  Evidence-first development workflow: design evidence → business requirements → technical design → role contracts → sliced code → review → verify.
  Use PROACTIVELY when implementing features, fixing bugs, refactoring, or making code changes.
  Triggers on: "implement", "feature", "fix bug", "refactor", "add", "change", "build", "Figma", "screenshot"
---

# Evidence-First Development Flow

The persistent feature artifact is the source of truth. Visual input becomes evidence first; business and technical decisions are made in separate layers; implementation is split into reviewable slices.

## Phase Overview

```text
Feature Intake
    │
    ▼
Design Evidence ──► Business Requirements (SA) ──► Technical Design (SD)
                                                        │
                                                        ▼
                                      Frontend / Backend Contracts
                                                        │
                                                        ▼
                              Sliced Implementation + Review + Tests
                                                        │
                                                        ▼
                                      QA / Verification + Fix Loop
```

## Phase 0: Architecture (Optional)

Use `architect` before technical design when a choice has long-term impact, meaningful alternatives, or cross-team consequences. Record the decision in `docs/adr/` and reference it from the feature artifacts.

## Phase 1: Feature Intake and Design Evidence

When a feature has Figma, screenshot, wireframe, prototype, or other UI/UX input:

1. Delegate to `design-evidence`.
2. Create `docs/specs/<feature>/README.md` with feature ID, source/version, viewport, approval status, scope, owner, and status.
3. Create `evidence-pack.md` with stable `EVID-*` entries.
4. Separate `observed`, `inferred`, and `unknown`; attach source and confidence to every entry.
5. Mark screenshot-only or wireframe-only input as `prototype`.

For features without design input, record `Design Evidence: not applicable` and explain why.

## Phase 2: Business Requirements (SA)

Delegate to `business-analyst` after the evidence pack is complete. Write `business-requirements.md` containing:

- Problem, goal, actor, user role, use case, scope, and out of scope.
- `BR-*` business requirements and `BUS-*` business rules.
- Business states, transitions, preconditions, negative paths, and duplicate/retry behavior.
- Business data dictionary and sensitivity.
- `AC-*` acceptance intent.

Every business item MUST reference relevant `EVID-*` IDs. SA defines what the system must do; it does not choose API paths or database structures.

## Phase 3: Technical Design (SD)

Delegate to `system-designer` after business requirements are approved. Write:

- `technical-design.md`: boundaries, API operations, schemas, errors, auth, authorization, data, query, performance, audit, observability, migration, rollback, and compatibility.
- `frontend-contract.md`: routes, components, client state, API mapping, UI states, responsive behavior, accessibility, and visual acceptance.
- `backend-contract.md`: operations, validation, domain logic, persistence, query, authorization, integrations, observability, and test requirements.

Assign `API-*`, `DATA-*`, `NFR-*`, and `VER-*` IDs. Technical design MUST preserve SA business semantics and reference upstream IDs.

## Phase 4: Sliced Implementation

The `team-lead` splits work by screen, component, service, or upstream group. Every slice has:

- One owner (`frontend-dev` or `backend-dev`)
- One reviewer (`code-reviewer` or designated domain reviewer)
- Requirement, API/data, and verification IDs
- A bounded file and behavior scope

Frontend and backend slices may run in parallel after their contracts are ready. If implementation changes business semantics, API shape, or technical constraints, update the correct persistent artifact before changing code.

Use `test-engineer` to generate missing unit, integration, contract, UI, permission, and performance tests.

## Phase 5: Review and Verification

Run `code-reviewer` per slice, then `verifier` as the independent QA owner. Verification covers:

1. Business: use cases, rules, states, and acceptance intent.
2. Visual/Interaction: approved design, states, responsive behavior, keyboard/focus, and accessibility.
3. API/Data: schemas, error behavior, persistence, query patterns, and contract tests.
4. Security/Operations: authorization, scope, audit, performance, observability, and rollback.
5. Lint, typecheck, tests, and build.

The verifier returns `VER-*` results and blocked mappings. `team-lead` persists the final verification report in the feature artifact.

## Traceability Gate

Maintain `traceability.md` with at least:

```text
UI action → EVID-* → BR-* / BUS-* → API-* / DATA-* → AC-* / VER-*
```

An unmapped UI action, requirement, API, or verification item is a specification gap, not a reason to guess.

## Fix Loop

If review or verification fails:

1. Identify the failing ID and owning layer.
2. Update the relevant artifact when the contract is wrong.
3. Fix the implementation in a bounded slice.
4. Re-run review and verification.

Allow at most three fix attempts before reporting the blocker.

## Artifact Summary

| Artifact | Location | Owner | Persistence |
|---|---|---|---|
| Feature intake | `docs/specs/<feature>/README.md` | team-lead | committed |
| Design evidence | `docs/specs/<feature>/evidence-pack.md` | design-evidence | committed |
| Business requirements | `docs/specs/<feature>/business-requirements.md` | business-analyst | committed |
| Technical design | `docs/specs/<feature>/technical-design.md` | system-designer | committed |
| Role contracts | `docs/specs/<feature>/frontend-contract.md`, `backend-contract.md` | system-designer | committed |
| Traceability | `docs/specs/<feature>/traceability.md` | team-lead | committed |
| Verification report | `docs/specs/<feature>/verification-report.md` | team-lead | committed |
| Session handoff | `.handoffs/` | current agent | temporary |
