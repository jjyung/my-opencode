# ADR-001: Contract-First Development Flow with ADR

**Date:** 2026-05-25
**Status:** Accepted

## Context
The original dev-flow used a handoff-driven approach: Plan → Code → Verify.
Plan phase produced temporary `.handoffs/` documents that were discarded after use.
This had several problems:
- Knowledge lost when handoffs were deleted
- No shared source of truth for frontend/backend parallel development
- Architectural decisions were implicit and undocumented
- New team members couldn't trace why decisions were made

## Decision
Adopt a contract-first development flow with two persistent artifact types:

1. **ADR** (`docs/adr/`) — Record architectural decisions (WHY)
2. **Contract** (`docs/specs/`) — Specify requirements, ACs, API, data model (WHAT)

The new flow: ADR (optional) → Contract (persistent) → Code → Verify.

Handoffs in `.handoffs/` remain as lightweight, temporary implementation notes —
they reference contracts but never replace them.

## Consequences
✅ Persistent design history that survives session boundaries
✅ Frontend and backend can implement from the same contract in parallel
✅ ADRs make architectural reasoning explicit and reviewable
✅ Contracts use RFC 2119 (MUST/SHOULD/MAY) and GIVEN/WHEN/THEN for clarity
⚠️ More upfront writing discipline required before coding
⚠️ Contracts need maintenance when requirements change mid-implementation

## Alternatives
- **Handoff-only (old approach):** Simpler but no persistent record, no parallel support. Rejected.
- **Spec-driven (Ralph-style PRD):** Close to our approach, but Ralph uses a single PRD doc. We prefer modular contracts per feature.
- **Wiki/Notion-based:** External docs go stale. In-repo docs stay with the code. Rejected.
