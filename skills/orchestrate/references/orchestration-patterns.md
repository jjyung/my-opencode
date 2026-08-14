# Orchestration Patterns

## Dependency Graph

```text
Design Evidence → SA → SD ─┐
                            ├→ Frontend slice ─┐
                            └→ Backend slice ──┼→ Review → QA/Verify → Synthesis
```

## Agent Dispatch Reference

| Subtask Type | Agent | Max Parallel |
|---|---|---:|
| Design evidence | design-evidence | 3 |
| Business requirements | business-analyst | 3 |
| Technical design | system-designer | 3 |
| Frontend implementation | frontend-dev | 5 |
| Backend implementation | backend-dev | 5 |
| Code review | code-reviewer | 3 |
| Test generation | test-engineer | 3 |
| Verification / QA | verifier | 1 |

## Slice Handoff Format

All orchestration handoffs follow this structure:

```markdown
## Subtask: <name>
**Agent:** <type>
**Status:** completed / failed / skipped

### Input Artifacts
- docs/specs/<feature>/README.md
- docs/specs/<feature>/<role-contract>.md

### Scope and IDs
- Owner: <agent>
- Reviewer: <agent>
- IDs: EVID-001, BR-001, API-001, AC-001, VER-001

### Output
- <artifact, code, test, or verification result>

### Deviations and Risks
- <deviation, unresolved unknown, or risk>
```

Every slice must be independently reviewable and traceable to its upstream artifacts.
