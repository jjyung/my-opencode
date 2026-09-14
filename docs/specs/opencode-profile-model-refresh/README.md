# Feature: OpenCode (Default) Profile — DeepSeek V4.1 Flash + Max Reasoning

Refresh the `opencode` (default) provider profile so the primary/heavy model is
`opencode-go/deepseek-v4.1-flash` **and** the model defaults to reasoning effort `max`,
with `low` / `high` / `max` exposed as cycleable variants.

## Architecture References

- **ADR-001**: Contract-First Development Flow
- **`docs/specs/provider-profile-plugin/README.md`**: Parent contract for provider-profile plugin + `moc` launcher
- **`docs/specs/provider-profile-tests/README.md`**: Test plan for `plugins/provider-profile.mjs`
- **`docs/specs/google-profile-model-refresh/README.md`**: Prior model-refresh precedent
- **`docs/specs/review-fix-pack/README.md`**: Reasoning-effort variant mechanism (gpt-5.6-luna)

---

## Intake

| Field | Value |
|-------|-------|
| Request | 使用者要求：opencode 預設模型改為 `deepseek-v4.1-flash`，推理強度為 `max` |
| Source | User request (2026-09-14), current session already runs `opencode-go/deepseek-v4.1-flash` |
| Owner | team-lead (default agent) |
| Status | Verified (2026-09-14) |

---

## Motivation / Rationale

### Why `deepseek-v4.1-flash`

Verified against the local `models.dev` catalog (`~/.cache/opencode/models.json`), provider `opencode-go`:

| Field | Value |
|-------|-------|
| id | `deepseek-v4.1-flash` |
| name | DeepSeek V4.1 Flash |
| family | `deepseek-flash` |
| release_date | `2026-09-10` (newest DeepSeek generation in the catalog) |
| reasoning | `true` |
| reasoning_options | `effort`: `low` / `high` / `max` |
| context / output | 1,000,000 / 384,000 |
| modalities | text + image input |

The `opencode` profile follows the **Zen best-tier** strategy (OpenCode Go models,
no cost-performance tradeoff), so the newest capable model replaces the previous
`opencode-go/deepseek-v4-pro` as primary/heavy.

### Why effort `max`

The user explicitly requests the highest reasoning strength for the default model.
opencode surfaces model variants as provider-specific reasoning effort
(`opencode run --variant` help: “provider-specific reasoning effort, e.g., high, max, minimal”),
and the previously shipped `gpt-5.6-luna` profiles already use this mechanism:

```json
"provider": {
  "<providerId>": {
    "models": {
      "<modelId>": {
        "options": { "reasoningEffort": "<default_effort>" },
        "variants": { "<effort>": { "reasoningEffort": "<effort>" } }
      }
    }
  }
}
```

The same shape is now applied to `opencode-go/deepseek-v4.1-flash` with
`default_effort = "max"` and variants `low` / `high` / `max`.

---

## Requirements

### Functional — Profile Mapping Update

| ID | Description | Priority |
|----|-------------|----------|
| FR-1 | `opencode` profile primary model (`model`) MUST be `opencode-go/deepseek-v4.1-flash` | MUST |
| FR-2 | `opencode` profile heavy agent override (`heavy_model`) MUST be `opencode-go/deepseek-v4.1-flash` | MUST |
| FR-3 | `opencode` profile small model (`small_model`) and `verifier` override MUST remain `opencode-go/deepseek-v4-flash` | MUST |
| FR-4 | Plugin output for `opencode` MUST include `provider.opencode-go.models["deepseek-v4.1-flash"]` with `options.reasoningEffort = "max"` and variants `low` / `high` / `max` mapping to `{ reasoningEffort: <name> }` | MUST |
| FR-5 | `opencode.json` and `.opencode/opencode.json` MUST mirror the new default:`model`, heavy agent pins, and the provider reasoning block | MUST |
| FR-6 | All other profiles (`openai`, `google`, `copilot`) MUST retain their existing model mappings and reasoning behavior unchanged | MUST |
| FR-7 | The four-profile set (`opencode`, `openai`, `google`, `copilot`) and the profile env-var/tuple-option mechanism MUST remain unchanged | MUST |

### Non-Functional

| ID | Description | Priority |
|----|-------------|----------|
| NFR-1 | All model IDs MUST follow `provider/model` format (already satisfied) | MUST |
| NFR-2 | Plugin MUST remain zero-dependency, ES module, synchronous (<100ms) — unchanged | MUST |
| NFR-3 | `plugins/provider-profile.mjs` and `.opencode/plugins/provider-profile.mjs` MUST remain byte-identical (T-9.1 guard) | MUST |
| NFR-4 | Default (`opencode`) profile config MUST validate against the opencode config schema when loaded (`opencode debug config`) | MUST |

---

## Data Model / Profile Mapping Change

### Before

| Profile | `model` (primary) | `small_model` (small) | Agent `model` overrides (heavy) | Verifier override |
|---------|-------------------|-----------------------|--------------------------------|-------------------|
| `opencode` (default) | `opencode-go/deepseek-v4-pro` | `opencode-go/deepseek-v4-flash` | `opencode-go/deepseek-v4-pro` | `opencode-go/deepseek-v4-flash` |

### After

| Profile | `model` (primary) | `small_model` (small) | Agent `model` overrides (heavy) | Verifier override |
|---------|-------------------|-----------------------|--------------------------------|-------------------|
| `opencode` (default) | `opencode-go/deepseek-v4.1-flash` | `opencode-go/deepseek-v4-flash` (unchanged) | `opencode-go/deepseek-v4.1-flash` | `opencode-go/deepseek-v4-flash` (unchanged) |

### Reasoning Effort Defaults (`opencode` profile)

| Model | Default effort | Cycleable variants |
|-------|---------------|--------------------|
| `opencode-go/deepseek-v4.1-flash` | `max` | `low`, `high`, `max` |
| `opencode-go/deepseek-v4-flash` (small) | (provider default) | — |

---

## Files Changed

| File | Change |
|------|--------|
| `plugins/provider-profile.mjs` | `opencode` profile: `model`/`heavy_model` → `deepseek-v4.1-flash`; add `reasoning` block (default `max`) |
| `.opencode/plugins/provider-profile.mjs` | Byte-identical mirror (T-9.1) |
| `opencode.json` | Top-level `model` → `deepseek-v4.1-flash`; 5 heavy agent pins → `deepseek-v4.1-flash`; add `provider.opencode-go` reasoning block |
| `.opencode/opencode.json` | Byte-identical mirror |
| `docs/specs/provider-profile-tests/README.md` | Test plan updates (T-2.1, T-4.1, T-5.4–T-5.6) |
| `test/provider-profile.test.mjs` | EXPECTED.opencode values + opencode provider/reasoning assertions |
| `README.md`, `plugins/README.md` | Profile table + reasoning-effort note |

## Out of Scope

- Live API verification that OpenCode Go accepts `reasoningEffort: "max"` (requires live call; consistent with existing test-plan exclusions)
- Changes to `openai` / `google` / `copilot` profiles
- TUI `variant_cycle` behavior verification

---

## Verification

```bash
npm test                # node --test test/*.test.mjs (provider-profile tests T-1..T-9)
npm run test:structure  # role-flow structure validation
node plugins/provider-profile.mjs                                   # default (opencode) profile
OPENCODE_PROVIDER_PROFILE=opencode node .opencode/plugins/provider-profile.mjs
moc print-config opencode                                           # launcher path (uses .opencode/ copies)
opencode debug config                                               # schema-level resolution check
```

Expected (plugin output for `opencode`):

```json
{
  "model": "opencode-go/deepseek-v4.1-flash",
  "small_model": "opencode-go/deepseek-v4-flash",
  "provider": {
    "opencode-go": {
      "models": {
        "deepseek-v4.1-flash": {
          "options": { "reasoningEffort": "max" },
          "variants": {
            "low": { "reasoningEffort": "low" },
            "high": { "reasoningEffort": "high" },
            "max": { "reasoningEffort": "max" }
          }
        }
      }
    }
  },
  "agent": { "...": "heavy agents → deepseek-v4.1-flash, verifier → deepseek-v4-flash" }
}
```

### Verification Results (2026-09-14)

| Check | Result |
|-------|--------|
| `npm test` | 33/33 pass (T-1 … T-9, incl. new T-5.5 / T-5.6) |
| `npm run test:structure` | Role-flow structure validation passed |
| `node plugins/provider-profile.mjs` + `moc print-config opencode` | model `deepseek-v4.1-flash`; `provider.opencode-go.models["deepseek-v4.1-flash"].options.reasoningEffort = "max"`; variants `low`/`high`/`max`; heavy agents `deepseek-v4.1-flash`; verifier `deepseek-v4-flash`; launcher cache regenerated |
| `opencode debug config` (project config) | Schema-valid; resolved `model = opencode-go/deepseek-v4.1-flash`; provider block and heavy agent pins resolved |
| `opencode debug config` with `OPENCODE_CONFIG_CONTENT` (moc merge) | Schema-valid; merged model / heavy overrides resolve identically |
| Sync guards | `plugins/` ↔ `.opencode/plugins/` and `opencode.json` ↔ `.opencode/opencode.json` byte-identical (T-9.1 + manual diff) |

> ⚠️ Config is loaded at startup: restart opencode (or re-run `moc`) for the new default to take effect in a session.
