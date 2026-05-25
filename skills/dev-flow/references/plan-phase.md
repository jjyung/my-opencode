# Plan Phase — Detailed Workflow

## Entry Conditions

- User request received (feature, bug, refactor)
- Dev-flow skill activated

## Analysis Process

### 1. Understand the Request
- Read the user's request carefully
- Ask clarifying questions if ambiguous (one at a time, with rationale)
- Identify the core goal, not just the surface request

### 2. Explore the Codebase
- Read relevant files to understand current state
- Use Grep/Glob to find related code
- Identify patterns and conventions in the codebase
- Check for existing tests related to the area

### 3. Design the Approach
- Break the change into logical steps
- For each step:
  - Which files to modify (and why)
  - What to change (add/modify/delete)
  - Potential risks
- Consider edge cases

### 4. Output the Plan

Write to `.handoffs/dev-flow/plan.md`:

```markdown
# Plan: <brief title>

## Summary
<1-2 sentence summary>

## Files to Modify
| File | Action | Rationale |
|------|--------|-----------|
| src/foo.ts | Modify | Add new feature logic |
| src/foo.test.ts | Add | Test new behavior |

## Implementation Steps
1. <step 1>
2. <step 2>
3. <step 3>

## Risks
- <risk and mitigation>

## Test Strategy
- <how to verify correctness>

## User Approval
- [ ] User reviewed and approved
```

### 5. User Review
- Present the plan to the user
- Ask: "Does this approach look good? Any concerns?"
- Wait for approval before proceeding to Code phase

## Anti-Patterns

- ❌ Jumping straight to code without a plan
- ❌ Over-engineering (gold-plating)
- ❌ Ignoring existing patterns/conventions
- ❌ Planning too far ahead (YAGNI)
- ❌ Not considering test impact
