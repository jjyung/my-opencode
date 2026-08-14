---
name: design-evidence
description: |
  Convert Figma, screenshots, wireframes, prototypes, or other UI/UX inputs into a traceable Design Evidence Pack.
  Use when a feature starts from visual or interaction design and before business or technical specifications are written.
  Triggers on: "design evidence", "Figma", "screenshot", "wireframe", "prototype", "UI flow", "evidence pack"
---

# Design Evidence

Design input is evidence, not a complete product or technical specification. Extract what is visible, separate it from interpretation, and make unresolved decisions explicit before downstream roles write requirements or code.

## Required Output

Create `docs/specs/<feature>/evidence-pack.md` with one or more entries using this format:

```markdown
## EVID-001

- source: Figma node URL | screenshot path | prototype URL | wireframe reference
- type: screen | component | interaction | token | asset
- status: observed | inferred | unknown
- confidence: high | medium | low
- related_nodes: <frame/component IDs or none>
- observed: <what the source explicitly shows>
- inferred: <reasonable interpretation, or none>
- unknown: <unresolved business, technical, state, permission, or accessibility questions>
```

Every entry MUST have a source, confidence, and at least one of `observed`, `inferred`, or `unknown`. Do not promote an inference into a requirement.

## Evidence Inventory

Cover these dimensions when the input supports them:

- Screen and structure: route, frame, tab, modal, drawer, navigation, component, variant, props, token, and asset.
- Behavior and state: loading, empty, error, success, disabled, read-only, permission denied, validation, confirmation, retry, undo, and duplicate submission.
- Responsive and usability: viewport, breakpoint, long text, large numbers, overflow, keyboard, focus, accessible name, and contrast.

If the only input is a screenshot or wireframe, mark the feature `prototype` in `docs/specs/<feature>/README.md`. It is not ready for implementation until unknowns are resolved or explicitly accepted.

## Handoff Rules

1. Pass evidence IDs to `business-analyst`; do not decide business meaning here.
2. Pass the same evidence IDs to `system-designer`; do not invent API or database behavior here.
3. Preserve unknowns until the owning role resolves them.
4. Use stable IDs so requirements, contracts, and verification can link back to the source.

## Quality Gate

The pack is ready for the next phase only when:

- Every screen and interaction has a source.
- Observations, inferences, and unknowns are visibly separated.
- UI states and responsive/accessibility concerns have been inventoried or marked unknown.
- The source version and approved/prototype status are recorded.
