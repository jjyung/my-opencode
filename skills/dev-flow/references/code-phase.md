# Sliced Code Phase

## Entry Conditions

- The feature artifacts exist under `docs/specs/<feature>/`.
- The relevant frontend or backend contract has been reviewed and approved.
- The slice has an owner, reviewer, bounded scope, and stable traceability IDs.

## Process

1. Read the feature intake, evidence pack, business requirements, technical design, and role contract.
2. Confirm the slice's `EVID-*`, `BR-*`, `API-*`, `DATA-*`, `AC-*`, and `VER-*` IDs.
3. Read every file before modifying it and follow existing project conventions.
4. Implement only the assigned screen, component, service, or upstream slice.
5. Add or update tests required by the contract.
6. Self-review for behavior, security, error paths, accessibility, and traceability.
7. Write a lightweight handoff to `.handoffs/dev-flow/code.md` with files, IDs, deviations, and pending items.

## Contract Change Rule

If implementation reveals that business semantics, API shape, data constraints, or non-functional requirements are wrong:

1. Stop the code change.
2. Update the owning persistent artifact.
3. Re-review the affected downstream contract.
4. Resume implementation only after the IDs and scope are consistent.

## Self-Review Checklist

- [ ] Slice matches the approved contract.
- [ ] No business or technical guesses were added from visual layout.
- [ ] Loading, empty, error, permission, retry, and duplicate paths are covered where applicable.
- [ ] Frontend accessibility/visual requirements or backend authorization/data requirements are covered.
- [ ] Tests and traceability IDs are reported.
- [ ] No debug code, secrets, or unrelated changes remain.
