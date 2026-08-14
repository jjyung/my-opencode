# ADR-002: Evidence-First Role Allocation

**Date:** 2026-08-14
**Status:** Accepted

## Context

The previous workflow started with a general contract writer and passed a shared contract to a general executor. That workflow did not distinguish visual observations from business meaning, technical decisions, implementation contracts, or verification evidence. It made screenshot and Figma inputs easy to over-interpret and left frontend, backend, and QA ownership implicit.

## Decision

Adopt an evidence-first delivery flow:

```text
Design Evidence → SA → SD → Frontend / Backend → Review → QA / Verify
```

The repository uses these role owners:

- `design-evidence`: source-backed `observed`, `inferred`, and `unknown` records.
- `business-analyst`: actor, use case, business rule, business state, business data, and acceptance intent.
- `system-designer`: system boundary, API, data, security, performance, and operations contracts.
- `frontend-dev` / `backend-dev`: bounded implementation slices from role-specific contracts.
- `verifier`: business, visual/interaction, API/data, security/operations, and mechanical verification.

Every feature keeps evidence, layered contracts, traceability, and final verification under `docs/specs/<feature>/`. The old general-purpose `fullstack-dev`, `spec-writer`, and `executor` roles are removed rather than retained as aliases.

## Consequences

✅ Design observations cannot silently become requirements or API decisions.
✅ SA, SD, frontend, backend, and QA responsibilities are explicit.
✅ Frontend and backend can work in parallel from one technical design.
✅ Verification can identify gaps before implementation or release.
⚠️ Features require more structured artifacts before coding.
⚠️ This is a breaking role and command change; consumers must update configuration and usage.

## Alternatives

- **Keep a general spec-writer and executor:** rejected because it preserves the semantic and ownership ambiguity.
- **Add evidence only while keeping one contract:** rejected because business and technical decisions would remain mixed.
- **Let team-lead simulate every role:** rejected because role boundaries and artifact ownership would remain difficult to verify.
