# Feature: Google Provider Profile — Model ID Refresh

Correct the Google profile model mapping in the provider-profile plugin to use **actually available** Google model IDs verified against `models.dev`, replacing the previous assumed/non-existent model IDs that cause runtime failures.

## Architecture References

- **ADR-001**: Contract-First Development Flow
- **`docs/specs/provider-profile-plugin/README.md`**: Parent contract for provider-profile plugin + `moc` launcher
- **`docs/specs/moc-mtime-cache/README.md`**: `moc` cache contract (references google model IDs)
- **`docs/specs/moc-env-handoff-fix/README.md`**: `moc` env handoff fix contract (references google model IDs)

---

## Motivation / Rationale

### Why the previous mapping is wrong

Previous contract assumed:

| Assumption | Reality |
|------------|---------|
| `google/gemini-3.0-pro` is a valid model ID | `gemini-3.0-pro` does **not** appear in the `models.dev` available model list for Google. It was a best-guess name following the `provider/name` convention, but no such model exists at the Google API layer that opencode resolves. |
| Google's latest flagship is `gemini-3.5-pro` | No `gemini-3.5-pro` or `gemini-3.0-pro` base model is listed on `models.dev`. The only "pro" tier models available are **preview** variants (`-pro-preview`). The assumption that a non-preview `gemini-3.0-pro` would resolve was incorrect. |
| Tier-2 strategy (one step below latest flagship) is applicable to Google | Since there is no non-preview Gemini 3.x "pro" model available, the tier-2 heuristic cannot be mechanically applied. We must map to **what actually exists** rather than applying a theoretical one-step-below rule. |

### What is actually available

Verified from `models.dev` Google provider page, the relevant available model IDs are:

| Model ID | Tier |
|----------|------|
| `google/gemini-3.1-pro-preview-customtools` | Pro (highest, with tool-use support) |
| `google/gemini-3.1-pro-preview` | Pro (same version, without customtools suffix) |
| `google/gemini-3-pro-preview` | Pro (older preview) |
| `google/gemini-3.5-flash` | Flash (latest flash generation) |
| `google/gemini-3-flash-preview` | Flash (preview variant) |
| `google/gemini-flash-latest` | Flash (dynamic alias) |
| `google/gemini-flash-lite-latest` | Flash (lite variant) |

**User confirmed:** Highest usable Pro model is `google/gemini-3.1-pro-preview-customtools`; `google/gemini-3.5-flash` is available and working.

### Selected mapping rationale

| Role | Selected ID | Rationale |
|------|-------------|-----------|
| **primary / heavy** | `google/gemini-3.1-pro-preview-customtools` | Highest-version available Pro model; includes explicit tool-use support (`customtools` suffix); confirmed working by user. Strictly better than `gemini-3.1-pro-preview` (non-customtools) and `gemini-3-pro-preview` (older). |
| **small / verifier** | `google/gemini-3.5-flash` | Highest-version available flash model; already correct in previous contract; confirmed working by user. No change needed. |

---

## Requirements

### Functional — Model Mapping Update

| ID | Description | Priority |
|----|-------------|----------|
| FR-1 | Google profile primary model (`model`, agent `heavy_model`) MUST be `google/gemini-3.1-pro-preview-customtools` | MUST |
| FR-2 | Google profile small model (`small_model`, verifier override) MUST remain `google/gemini-3.5-flash` | MUST |
| FR-3 | All other profiles (`opencode`, `openai`, `copilot`) MUST retain their existing model mappings unchanged | MUST |
| FR-4 | The four-profile set (`opencode`, `openai`, `google`, `copilot`) and the profile env-var mechanism MUST remain unchanged | MUST |
| FR-5 | Plugin output JSON for `google` profile MUST contain `model=google/gemini-3.1-pro-preview-customtools` and `small_model=google/gemini-3.5-flash` | MUST |

### Non-Functional

| ID | Description | Priority |
|----|-------------|----------|
| NFR-1 | All model IDs MUST follow `provider/model` format (already satisfied) | MUST |
| NFR-2 | Plugin MUST remain zero-dependency, ES module, synchronous (<100ms) — unchanged | MUST |
| NFR-3 | The mapping SHOULD be re-verified against `models.dev` when the next Gemini generation ships | SHOULD |

---

## Data Model / Profile Mapping Change

### Before (broken)

| Profile | `model` (primary) | `small_model` (small) | Agent `model` overrides (heavy) | Verifier override |
|---------|-------------------|-----------------------|--------------------------------|-------------------|
| `google` | `google/gemini-3.0-pro` ❌ | `google/gemini-3.5-flash` ✅ | `google/gemini-3.0-pro` ❌ | `google/gemini-3.5-flash` ✅ |

### After (correct)

| Profile | `model` (primary) | `small_model` (small) | Agent `model` overrides (heavy) | Verifier override |
|---------|-------------------|-----------------------|--------------------------------|-------------------|
| `google` | `google/gemini-3.1-pro-preview-customtools` ✅ | `google/gemini-3.5-flash` ✅ | `google/gemini-3.1-pro-preview-customtools` ✅ | `google/gemini-3.5-flash` ✅ |

### PROFILE_MAP constant (in code)

```javascript
// Before (broken)
google: {
  model: "google/gemini-3.0-pro",        // ← does not exist
  small_model: "google/gemini-3.5-flash", // ← correct, no change
  heavy_model: "google/gemini-3.0-pro",   // ← does not exist
},

// After (correct)
google: {
  model: "google/gemini-3.1-pro-preview-customtools",
  small_model: "google/gemini-3.5-flash",
  heavy_model: "google/gemini-3.1-pro-preview-customtools",
},
```

---

## Acceptance Criteria

### AC-1: Google profile model changes to correct model ID

```
GIVEN the provider-profile plugin is registered in opencode.json
 WHEN OPENCODE_PROVIDER_PROFILE=google
  AND the plugin resolves the profile
 THEN top-level model MUST be "google/gemini-3.1-pro-preview-customtools"
  AND top-level small_model MUST be "google/gemini-3.5-flash"
  AND spec-writer model MUST be "google/gemini-3.1-pro-preview-customtools"
  AND verifier model MUST be "google/gemini-3.5-flash"
  AND code-reviewer model MUST be "google/gemini-3.1-pro-preview-customtools"
  AND team-lead model MUST be "google/gemini-3.1-pro-preview-customtools"
  AND architect model MUST be "google/gemini-3.1-pro-preview-customtools"
```

### AC-2: Plugin JSON output for google profile is correct

```
GIVEN OPENCODE_PROVIDER_PROFILE=google
 WHEN the plugin is executed directly (node plugins/provider-profile.mjs)
 THEN the emitted JSON MUST contain:
   "model": "google/gemini-3.1-pro-preview-customtools"
   "small_model": "google/gemini-3.5-flash"
   "agent.spec-writer.model": "google/gemini-3.1-pro-preview-customtools"
   "agent.verifier.model": "google/gemini-3.5-flash"
```

### AC-3: Other profiles are unaffected

```
GIVEN OPENCODE_PROVIDER_PROFILE=opencode
 WHEN the plugin resolves the profile
 THEN top-level model MUST be "opencode/big-pickle"
  AND top-level small_model MUST be "opencode/deepseek-v4-flash-free"
```

```
GIVEN OPENCODE_PROVIDER_PROFILE=openai
 WHEN the plugin resolves the profile
 THEN top-level model MUST be "openai/gpt-5.4"
  AND top-level small_model MUST be "openai/gpt-5.4-mini"
```

```
GIVEN OPENCODE_PROVIDER_PROFILE=copilot
 WHEN the plugin resolves the profile
 THEN top-level model MUST be "copilot/gpt-5.4"
  AND top-level small_model MUST be "copilot/gpt-5.4-mini"
```

### AC-4: `moc google` activates correct models

```
GIVEN the project has .opencode/plugins/provider-profile.mjs
 WHEN the user runs `moc google`
 THEN opencode MUST load with top-level model "google/gemini-3.1-pro-preview-customtools"
  AND top-level small_model MUST be "google/gemini-3.5-flash"
```

---

## Impacted Files

| File | Change type | Description |
|------|-------------|-------------|
| `plugins/provider-profile.mjs` | **MODIFY** | Update `PROFILE_MAP.google` — change `model` and `heavy_model` from `google/gemini-3.0-pro` to `google/gemini-3.1-pro-preview-customtools` |
| `.opencode/plugins/provider-profile.mjs` | **MODIFY** | Same change as above (deployed copy of the plugin) |
| `docs/specs/provider-profile-plugin/README.md` | **MODIFY** | Update data model table (line 104), AC-3 (lines 325-328), AC-10 (line 394), AC-6 (line 355), rationale table (line 32), implementation note 9 (line 571) |
| `docs/specs/moc-mtime-cache/README.md` | **MODIFY** | Update model references: FR-2 (line 19), AC (lines 63-64), example JSON (lines 197-204) |
| `docs/specs/moc-env-handoff-fix/README.md` | **MODIFY** | Update model references: FR-4 (line 22), AC (line 48) |
| `plugins/README.md` | **MODIFY** | Update google row in model table (line 20) |
| `README.md` | **MODIFY** | Update google row in model table (line 69) |
| `docs/specs/google-profile-model-refresh/README.md` | **CREATE** | This contract document |

### Files with NO change needed

| File | Reason |
|------|--------|
| `bin/moc` | Shell launcher has no hardcoded model IDs; it delegates to the plugin |
| `opencode.json` | Default models are `opencode/` profile; google is set via env/plugin at runtime |
| `package.json` | No model IDs in package metadata |
| `scripts/postinstall.js` | No Google model IDs |

---

## Dependencies

```
docs/specs/provider-profile-plugin/README.md  ← parent contract, references to update
    │
    ├── plugins/provider-profile.mjs          ← primary source code change
    ├── .opencode/plugins/provider-profile.mjs ← deployed copy, same change
    │
    ├── docs/specs/moc-mtime-cache/README.md   ← dependent contract, model refs to update
    ├── docs/specs/moc-env-handoff-fix/README.md← dependent contract, model refs to update
    ├── plugins/README.md                      ← doc, model table to update
    └── README.md                              ← root README, model table to update
```

---

## Tradeoffs & Open Questions

### Tradeoffs

1. **Preview model stability**: `gemini-3.1-pro-preview-customtools` has a "preview" suffix, which implies it may be deprecated or replaced when the stable `gemini-3.1-pro` (non-preview) ships. However, it is the **only** available high-end Pro model that resolves — no stable non-preview alternative exists. When a stable 3.1-pro ships, this mapping MUST be updated to drop the `-preview` suffix.

2. **customtools variant specificity**: The `-customtools` suffix is specifically designed for tool/function-calling use cases, which aligns well with opencode's agent workflow (agents use tools extensively). The non-customtools variant (`google/gemini-3.1-pro-preview`) would also work but lacks the tool-use optimization. We choose customtools for primary/heavy because those agents are tool-heavy.

3. **Tier-2 strategy deviation**: The previous contract applied a tier-2 cost-optimization strategy (primary = one step below flagship). This no longer cleanly applies because there **are no non-preview Pro models** to form a clear tier hierarchy. The new mapping is driven by **available model reality** rather than strategy theory.

4. **Consistency with `opencode` / `openai` / `copilot` profiles**: The Google profile is now the only one using a model with a `-preview` suffix. This is a documentation and user-expectation concern — users should understand that Google's available Pro models are preview-level.

### Open Questions

- **Q1**: Should we also set `google/gemini-3.1-pro-preview` (non-customtools) as a fallback/alternative, or is the single customtools variant sufficient? **Resolution in this contract**: Single mapping is sufficient; customtools is a superset.
- **Q2**: When `google/gemini-3.1-pro` (stable, non-preview) ships, should the mapping automatically switch? **Resolution**: No — a follow-up contract/code change will be needed. This is explicit in the out-of-scope section.
- **Q3**: Should `google/gemini-3-flash-preview` or `google/gemini-flash-latest` be considered as alternatives to `google/gemini-3.5-flash`? **Resolution**: No — 3.5-flash is the highest-version flash confirmed available; the preview and dynamic-alias variants are inferior or redundant.

---

## Out of Scope

- Changes to `opencode`, `openai`, or `copilot` profile mappings
- Dynamic model discovery or automatic model list fetching from `models.dev`
- Adding/removing profiles from the four-profile set
- Changes to `bin/moc` launcher behavior
- Changes to the plugin's resolution logic (profile priority, validation, error handling)
- Google credential or provider configuration
- Automatic migration when `gemini-3.1-pro` stable ships — requires a follow-up contract
- Non-Google model ID changes (e.g., `openai/gpt-5.4` updates)

---

## Verification

1. Run `node plugins/provider-profile.mjs` with `OPENCODE_PROVIDER_PROFILE=google` and confirm output JSON contains `google/gemini-3.1-pro-preview-customtools` for `model` and `google/gemini-3.5-flash` for `small_model`
2. Verify `OPENCODE_PROVIDER_PROFILE=opencode` still produces `opencode/big-pickle`
3. Verify `OPENCODE_PROVIDER_PROFILE=openai` still produces `openai/gpt-5.4`
4. Verify `OPENCODE_PROVIDER_PROFILE=copilot` still produces `copilot/gpt-5.4`
5. Run `moc google` and confirm via opencode's UI or logs that the model resolves to `google/gemini-3.1-pro-preview-customtools`

---

## Implementation Notes

1. The change is a two-line edit in `PROFILE_MAP` (lines 21 and 23 in `plugins/provider-profile.mjs` and the same lines in `.opencode/plugins/provider-profile.mjs`).
2. The small model `google/gemini-3.5-flash` is already correct and needs no change — only the `model` and `heavy_model` fields change.
3. All downstream contract files have model IDs in acceptance criteria and example JSON — these must be updated in lockstep with the code change.
4. The `bin/moc` launcher contains no model IDs and needs no change.
5. `opencode.json` default models are `opencode/` profile; the google profile is applied via plugin/env-var override at runtime, so `opencode.json` itself needs no change.
