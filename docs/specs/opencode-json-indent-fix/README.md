# Feature: opencode.json indentation fix

## Requirements
FR-1: All JSON keys at the same nesting level MUST use the same indentation.
FR-2: After formatting, `opencode.json` MUST remain valid JSON.
FR-3: No semantic changes — only whitespace/indentation is modified.

## Acceptance Criteria
- GIVEN the root `opencode.json` WHEN checking `"prompt"` indentation in each agent definition THEN it MUST be 6 spaces (matching `"description"`, `"mode"`, `"tools"`, etc.)
- GIVEN the formatted file WHEN parsed with `JSON.parse` THEN it MUST succeed
- GIVEN `opencode.json` before and after the fix WHEN diffed THEN the only differences MUST be whitespace changes on `"prompt"` lines

## Files Changed
| File | Change |
|------|--------|
| `opencode.json` | Fix `"prompt"` key indentation from 12→6 spaces (9 occurrences) |

## Current vs Expected

Currently (root `opencode.json`):
```json
    "fullstack-dev": {
      "description": "...",
      "mode": "primary",
            "prompt": "{file:agents/fullstack-dev.md}",   // ← 12 spaces, WRONG
      "permission": {
```

Expected (matches `.opencode/opencode.json`):
```json
    "fullstack-dev": {
      "description": "...",
      "mode": "primary",
      "prompt": "{file:agents/fullstack-dev.md}",         // ← 6 spaces, CORRECT
      "permission": {
```

## Out of Scope
- `.opencode/opencode.json` — already has correct indentation
- Any other files — only `opencode.json` root file is affected
