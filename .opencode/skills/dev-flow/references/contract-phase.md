# Layered Contract Phase

The contract phase produces persistent, committed artifacts. It does not use a temporary plan as the source of truth.

## Entry Conditions

- User request received.
- Relevant ADRs have been checked.
- Feature ID, source/version, owner, and scope are known or explicitly marked unknown.

## Artifact Set

Create `docs/specs/<feature>/` with:

```text
README.md
evidence-pack.md
business-requirements.md
technical-design.md
frontend-contract.md
backend-contract.md
traceability.md
```

Create `verification-report.md` at delivery time.

## Layer Rules

### Intake and Evidence

`README.md` records source type, source version, viewport, approval/prototype status, owner, scope, and out-of-scope items. `evidence-pack.md` contains stable `EVID-*` records with source, type, confidence, and separate observed/inferred/unknown fields.

### Business Requirements

`business-requirements.md` is owned by `business-analyst` and contains actors, goals, use cases, business rules, business states, business data meaning, and `AC-*` acceptance intent. Every item links to `EVID-*`.

### Technical Design

`technical-design.md` is owned by `system-designer` and contains boundaries, API, data, authorization, errors, performance, audit, observability, migration, rollback, and compatibility. It assigns `API-*`, `DATA-*`, and `NFR-*` IDs.

The same technical design produces `frontend-contract.md` and `backend-contract.md`; these are role views, not independent interpretations of the evidence.

### Traceability

`traceability.md` links at minimum:

```text
UI action → EVID-* → BR-* / BUS-* → API-* / DATA-* → AC-* / VER-*
```

## Review Gate

Before implementation, confirm:

- Evidence sources and confidence are recorded.
- Observations, inferences, and unknowns are separated.
- Business semantics are approved before API/data choices.
- Frontend and backend contracts reference the technical design.
- Every implementation slice has owner, reviewer, and stable IDs.

## Anti-Patterns

- Writing business or technical decisions into the evidence pack.
- Treating screenshot-only input as implementation-ready.
- Inventing permissions, API semantics, or database behavior from visual layout.
- Starting implementation without approved upstream artifact layers.
