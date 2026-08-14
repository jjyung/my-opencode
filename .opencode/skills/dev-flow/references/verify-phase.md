# QA and Verification Phase

## Entry Conditions

- Feature artifacts and implementation handoffs exist.
- Frontend/backend slices have completed review.

## Verification Order

### 1. Contract Traceability

- Read `evidence-pack.md`, `business-requirements.md`, `technical-design.md`, role contracts, and `traceability.md`.
- Confirm each UI action maps to evidence, business rule, API/data effect, and verification.
- Mark missing permission, state, source, or error decisions as blockers.

### 2. Business

Verify use cases, business rules, states, negative paths, duplicate/retry behavior, and acceptance intent.

### 3. Visual / Interaction

Verify approved design, state inventory, responsive behavior, keyboard/focus behavior, semantic structure, and accessibility.

### 4. API / Data

Verify request/response/error schemas, persistence, query patterns, pagination, and contract tests.

### 5. Security / Operations

Verify authorization and scope, audit, performance targets, observability, migration, and rollback.

### 6. Mechanical Checks

Detect project type and run lint, typecheck, tests, and build. Stop at the first blocking failure and record exact output.

## Output

Return a structured report to `team-lead`. The orchestrator persists the final report at `docs/specs/<feature>/verification-report.md`:

```markdown
# Verification Report: <feature>

## Results

| ID | Layer | Status | Evidence |
|----|-------|--------|----------|
| VER-001 | Business | Pass / Fail | <details> |

## Mechanical Checks

| Check | Status | Details |
|-------|--------|---------|
| Lint | Pass / Fail / Skip | <details> |
| Typecheck | Pass / Fail / Skip | <details> |
| Tests | Pass / Fail / Skip | <details> |
| Build | Pass / Fail / Skip | <details> |

## Overall Verdict

PASS or NEEDS FIX
```

## Fix Loop

1. Identify the failing ID and owning layer.
2. Update the contract if the contract is wrong.
3. Fix the bounded implementation slice.
4. Re-run review and verification.

Allow at most three attempts before reporting the blocker.
