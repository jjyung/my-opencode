# Provider-Profile Plugin + `moc` Launcher

Switch opencode provider profiles via a friendly `moc` launcher.
The existing provider-profile resolver/plugin remains the internal implementation detail;
the `moc` launcher is the **user-facing entry point**.

Designed for **this repo** (`my-opencode`) — not a generic solution.

## Architecture References

- **ADR-001**: Contract-First Development Flow
- **D2** (design-decisions.md): Pipeline architecture — contract-first
- **D3** (design-decisions.md): Persistent contract + lightweight handoff
- **P3** (patterns.md): Single source of truth + generated artifacts

---

## Model Refresh (2026-Q2)

### Rationale

This contract update refreshes provider-profile model mappings using a **two-strategy approach**:

| Strategy | Applied to | Logic |
|----------|-----------|-------|
| **Zen best-tier** | `opencode` | OpenCode Zen models are **free** — no cost-performance tradeoff needed. Use the best available `opencode/` models directly. |
| **Tier-2 cost-optimized** | `openai`, `google`, `copilot` | These providers charge per-token. Prefer the model one step below the latest flagship for the best balance of capability, latency, and price. |

| Provider | Strategy | Primary model | Small model | Rationale |
|----------|----------|---------------|-------------|-----------|
| OpenAI | tier-2 | `gpt-5.4` | `gpt-5.4-mini` | Mature, widely validated, excellent cost/perf |
| Google | tier-2 (available-model constrained) | `gemini-3.1-pro-preview-customtools` | `gemini-3.5-flash` | Highest available Google Pro model with explicit tool-use support; small remains latest confirmed flash family |
| Copilot | tier-2 | `gpt-5.4` | `gpt-5.4-mini` | Mirrors OpenAI tier-2; exact IDs to verify live |
| opencode | **zen best-tier** | `big-pickle` | `deepseek-v4-flash-free` | All OpenCode Zen models are free — use the best (`big-pickle`) for primary and heavy reasoning; the fast `deepseek-v4-flash-free` serves as the lightweight small model. |

The `opencode` default profile uses the **OpenCode Zen provider series** at full quality because there is no cost constraint. The other three profiles (`openai`, `google`, `copilot`) continue their tier-2 strategy for cost-performance optimization.

---



## Requirements

### Functional — Plugin (Existing)

| ID | Description | Priority |
|----|-------------|----------|
| FR-1 | System MUST read `OPENCODE_PROVIDER_PROFILE` env var at config load time | MUST |
| FR-2 | System MUST default to `opencode` profile when env var is unset or empty | MUST |
| FR-3 | System MUST support exactly four profiles: `opencode`, `openai`, `google`, `copilot` | MUST |
| FR-4 | System MUST update top-level `model` field per the active profile | MUST |
| FR-5 | System MUST update top-level `small_model` field per the active profile | MUST |
| FR-6 | System MUST update per-agent `model` overrides for: `spec-writer`, `verifier`, `code-reviewer`, `team-lead`, `architect` | MUST |
| FR-7 | System MUST reject unknown profile values with a clear error message | MUST |
| FR-8 | System MUST preserve all non-model fields in `opencode.json` (agents, commands, instructions, permissions) | MUST |
| FR-9 | Plugin SHOULD be loadable via opencode's `plugin` config array as a local file | SHOULD |
| FR-10 | Plugin MAY accept an optional `profile` override via plugin config object (takes precedence over env var) | MAY |

### Functional — `moc` Launcher (New)

| ID | Description | Priority |
|----|-------------|----------|
| FR-11 | Launcher MUST be invocable as `moc` from any directory where `opencode` is also available on PATH | MUST |
| FR-12 | When invoked without arguments (`moc`), launcher MUST use the `opencode` (default) profile | MUST |
| FR-13 | When invoked with one of the four known profile names as first argument, launcher MUST activate that profile (e.g., `moc openai`) | MUST |
| FR-14 | When invoked with an argument that is NOT one of the four known profile names, launcher MUST pass all arguments through to `opencode` without profile override (transparent passthrough, e.g., `moc --help`) | MUST |
| FR-15 | Launcher MUST forward all arguments AFTER an optional profile argument to `opencode` (e.g., `moc openai --list-agents` → profile=openai, exec `opencode --list-agents`) | MUST |
| FR-16 | Launcher MUST internally set `OPENCODE_CONFIG_CONTENT` by executing the provider-profile plugin before invoking `opencode` | MUST |
| FR-17 | Launcher MUST preserve the current shell environment (no persistent env var leakage to the parent shell) | MUST |
| FR-18 | Launcher SHOULD provide a useful error message and fall back to plain `opencode` if the plugin file is not found | SHOULD |

### Non-Functional

| ID | Description | Priority |
|----|-------------|----------|
| NFR-1 | Plugin MUST have zero npm dependencies (pure Node.js stdlib) | MUST |
| NFR-2 | Profile resolution MUST complete synchronously within <100ms | MUST |
| NFR-3 | Plugin MUST be an ES module (`.mjs`) to match `"type": "module"` in `package.json` | MUST |
| NFR-4 | All model strings MUST use `provider/model` format | MUST |
| NFR-5 | Launcher MUST keep shell-side overhead minimal and use at most one Node.js subprocess before `exec` to compute `OPENCODE_CONFIG_CONTENT` | MUST |
| NFR-6 | Launcher MUST be a portable POSIX shell script (no bashisms, compatible with `/bin/sh` on macOS/Linux) | MUST |
| NFR-7 | No npm dependencies for the launcher; the Node.js plugin is the only dependency (already present) | MUST |

---

## Data Model / Profile Mapping

### Profile Definition

Each profile defines three tiers of model assignment:

| Tier | Scope | Description |
|------|-------|-------------|
| **primary** | `model` | Default model for agents without an override |
| **small** | `small_model` | Fast/cheap model for lightweight tasks |
| **heavy** | agent overrides | Reasoning-heavy agents: spec-writer, code-reviewer, team-lead, architect |

### Profile-to-Model Mapping

| Profile | `model` (primary) | `small_model` (small) | Agent `model` overrides (heavy) | Verifier override |
|---------|-------------------|-----------------------|--------------------------------|-------------------|
| `opencode` (default) | `opencode/big-pickle` | `opencode/deepseek-v4-flash-free` | `opencode/big-pickle` | `opencode/deepseek-v4-flash-free` |
| `openai` | `openai/gpt-5.4` | `openai/gpt-5.4-mini` | `openai/gpt-5.4` | `openai/gpt-5.4-mini` |
| `google` | `google/gemini-3.1-pro-preview-customtools` | `google/gemini-3.5-flash` | `google/gemini-3.1-pro-preview-customtools` | `google/gemini-3.5-flash` |
| `copilot` | `copilot/gpt-5.4` | `copilot/gpt-5.4-mini` | `copilot/gpt-5.4` | `copilot/gpt-5.4-mini` |

### Agents Receiving `model` Overrides

| Agent | Current override | Profile behavior | Rationale |
|-------|-----------------|------------------|-----------|
| `spec-writer` | `opencode/big-pickle` | Uses **heavy** tier from profile | Heavy reasoning (contract generation) |
| `code-reviewer` | `opencode/big-pickle` | Uses **heavy** tier from profile | Heavy reasoning (5-dimension analysis) |
| `team-lead` | `opencode/big-pickle` | Uses **heavy** tier from profile | Heavy reasoning (multi-agent orchestration) |
| `architect` | `opencode/big-pickle` | Uses **heavy** tier from profile | Heavy reasoning (architecture analysis) |
| `verifier` | `opencode/deepseek-v4-flash-free` | Uses **small** tier from profile | Lightweight (lint/test/build) |

All other agents inherit top-level `model` and need no override.

### Validation Rules

| Rule | Condition | Error |
|------|-----------|-------|
| V-1 | Profile value is not one of the four supported values | `Error: Unknown provider profile "${value}". Must be one of: opencode, openai, google, copilot` |
| V-2 | `OPENCODE_PROVIDER_PROFILE` env var contains whitespace | Trim and validate; if after trimming value is invalid, apply V-1 |

---

## Plugin Contract

### File Location

```
plugins/provider-profile.mjs     # Main plugin module (ESM)
```

### Module Interface

The plugin module exports a single default function:

```typescript
/**
 * @param {object} [options]
 * @param {string} [options.profile] - Explicit profile override (takes precedence over env var)
 * @returns {{ model: string, small_model: string, agent_overrides: Record<string, string> }}
 */
export default function resolveProfile(options = {}) { ... }
```

Because current OpenCode plugins expose runtime hooks/tools but do **not** rewrite JSON config during load, the same module also acts as a zero-dependency config override generator when executed directly:

```bash
OPENCODE_CONFIG_CONTENT="$(node .opencode/plugins/provider-profile.mjs)" opencode
```

Direct execution MUST emit a JSON object suitable for `OPENCODE_CONFIG_CONTENT` merging, containing only the model-related overrides:

```json
{
  "model": "provider/model",
  "small_model": "provider/model",
  "agent": {
    "spec-writer": { "model": "provider/model" },
    "verifier": { "model": "provider/model" },
    "code-reviewer": { "model": "provider/model" },
    "team-lead": { "model": "provider/model" },
    "architect": { "model": "provider/model" }
  }
}
```

**Return value:**

```typescript
{
  model: string,              // Top-level model (e.g. "openai/gpt-5.4" or "opencode/big-pickle")
  small_model: string,        // Top-level small_model
  agent_overrides: {          // Per-agent model overrides to apply
    "spec-writer": string,
    "verifier": string,
    "code-reviewer": string,
    "team-lead": string,
    "architect": string
  }
}
```

### Resolution Priority

1. If `options.profile` is provided and non-empty → use it
2. Else if `OPENCODE_PROVIDER_PROFILE` env var is set and non-empty → use it
3. Else → `"opencode"` (default)

### Plugin Registration in `opencode.json`

```jsonc
{
  "plugin": [
    // Path to local plugin module
    "plugins/provider-profile.mjs"
    // Optionally with config override:
    // ["plugins/provider-profile.mjs", { "profile": "openai" }]
  ]
}
```

---

## Launcher Contract (`bin/moc`)

### File Location

```
bin/moc                          # POSIX shell script (user-facing launcher)
```

### Behavior Table

| Command | Profile activated | Arguments forwarded to `opencode` |
|---------|-------------------|-----------------------------------|
| `moc` | `opencode` (default) | *(none)* |
| `moc opencode` | `opencode` | *(none)* |
| `moc openai` | `openai` | *(none)* |
| `moc google` | `google` | *(none)* |
| `moc copilot` | `copilot` | *(none)* |
| `moc openai --list-agents` | `openai` | `--list-agents` |
| `moc openai --model foo` | `openai` | `--model foo` |
| `moc --help` | *(passthrough, no override)* | `--help` |
| `moc init` | *(passthrough, no override)* | `init` |
| `moc --version` | *(passthrough, no override)* | `--version` |

### Interface Contract

```bash
# Usage:
#   moc [<profile>] [<opencode-args>...]
#
# Where <profile> is one of: opencode, openai, google, copilot
# or absent (defaults to "opencode").
# If <profile> is not a known profile name, ALL arguments are passed
# through to `opencode` unchanged.

moc                          # → OPENCODE_PROVIDER_PROFILE=opencode  → exec opencode
moc openai                   # → OPENCODE_PROVIDER_PROFILE=openai    → exec opencode
moc google --list-agents     # → OPENCODE_PROVIDER_PROFILE=google    → exec opencode --list-agents
moc --help                   # → exec opencode --help  (no profile override)
moc init                     # → exec opencode init    (no profile override)
```

### Internal Logic (Pseudocode)

```
1. Capture first argument as candidate_profile
2. If candidate_profile is one of [opencode, openai, google, copilot]:
     a. set OPENCODE_PROVIDER_PROFILE = candidate_profile
     b. shift args (remove first arg)
   Else:
     a. do NOT set OPENCODE_PROVIDER_PROFILE
     b. (keep all args as-is)
3. Compute OPENCODE_CONFIG_CONTENT:
     If .opencode/plugins/provider-profile.mjs exists (relative to CWD):
         OPENCODE_CONFIG_CONTENT = $(node .opencode/plugins/provider-profile.mjs)
     Else if non-empty error:
         Warn "moc: plugin not found, falling back to plain opencode"
         (do not set OPENCODE_CONFIG_CONTENT)
4. exec opencode "$@"  (replaces the shell process with opencode)
```

### Plugin Discovery

The launcher resolves the plugin script relative to the current working directory:

```
<CWD>/.opencode/plugins/provider-profile.mjs
```

This matches opencode's own discovery convention (`.opencode/` in the project root).
No `MOC_HOME` or additional config is needed for standard setups.

### Package Registration

In `package.json`, add a second bin entry:

```json
"bin": {
  "my-opencode": "bin/cli.js",
  "moc": "bin/moc"
}
```

npm will symlink both into `node_modules/.bin/` and (with `npx` or global install) into the user's PATH.

---

## Acceptance Criteria

### AC-1: Default profile works
```
GIVEN no OPENCODE_PROVIDER_PROFILE env var is set
 AND the provider-profile plugin is registered in opencode.json
WHEN OPENCODE_CONFIG_CONTENT is populated from `node plugins/provider-profile.mjs`
 AND opencode loads the merged configuration
THEN top-level model MUST be "opencode/big-pickle"
 AND top-level small_model MUST be "opencode/deepseek-v4-flash-free"
 AND spec-writer model MUST be "opencode/big-pickle"
 AND verifier model MUST be "opencode/deepseek-v4-flash-free"
 AND other agent models MUST NOT be set (inherit top-level model)
```

### AC-2: openai profile switch
```
GIVEN OPENCODE_PROVIDER_PROFILE=openai
WHEN OPENCODE_CONFIG_CONTENT is populated from `node plugins/provider-profile.mjs`
 AND opencode loads the merged configuration
THEN top-level model MUST be "openai/gpt-5.4"
 AND top-level small_model MUST be "openai/gpt-5.4-mini"
 AND spec-writer model MUST be "openai/gpt-5.4"
 AND verifier model MUST be "openai/gpt-5.4-mini"
```

### AC-3: google profile switch
```
GIVEN OPENCODE_PROVIDER_PROFILE=google
WHEN OPENCODE_CONFIG_CONTENT is populated from `node plugins/provider-profile.mjs`
 AND opencode loads the merged configuration
THEN top-level model MUST be "google/gemini-3.1-pro-preview-customtools"
 AND top-level small_model MUST be "google/gemini-3.5-flash"
 AND spec-writer model MUST be "google/gemini-3.1-pro-preview-customtools"
 AND verifier model MUST be "google/gemini-3.5-flash"
```

### AC-4: copilot profile switch
```
GIVEN OPENCODE_PROVIDER_PROFILE=copilot
WHEN OPENCODE_CONFIG_CONTENT is populated from `node plugins/provider-profile.mjs`
 AND opencode loads the merged configuration
THEN top-level model MUST be "copilot/gpt-5.4"
 AND top-level small_model MUST be "copilot/gpt-5.4-mini"
 AND spec-writer model MUST be "copilot/gpt-5.4"
 AND verifier model MUST be "copilot/gpt-5.4-mini"
```

### AC-5: Invalid profile value
```
GIVEN OPENCODE_PROVIDER_PROFILE=anthropic
WHEN the plugin resolves the profile
THEN it MUST throw an error with message containing "Must be one of: opencode, openai, google, copilot"
```

### AC-6: Plugin config override takes precedence
```
GIVEN OPENCODE_PROVIDER_PROFILE=opencode
 AND the plugin is registered with config { "profile": "google" }
WHEN OPENCODE_CONFIG_CONTENT is populated from `node plugins/provider-profile.mjs`
 AND opencode loads the merged configuration
THEN top-level model MUST be "google/gemini-3.1-pro-preview-customtools"
```

### AC-7: Non-model config is preserved
```
GIVEN any provider profile
WHEN the plugin applies profile overrides
THEN the commands block MUST remain unchanged
 AND the agents block MUST retain all tool permissions, prompts, and descriptions
 AND the instructions list MUST remain unchanged
 AND the default_agent MUST remain "fullstack-dev"
```

### AC-8: `moc` without args uses default profile
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc` (no arguments)
THEN the launcher MUST set OPENCODE_PROVIDER_PROFILE=opencode
 AND MUST set OPENCODE_CONFIG_CONTENT from the plugin output
 AND MUST exec opencode with no extra arguments
 AND opencode MUST load with the "opencode" profile models
```

### AC-9: `moc openai` activates the openai profile
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc openai`
THEN the launcher MUST set OPENCODE_PROVIDER_PROFILE=openai
 AND MUST set OPENCODE_CONFIG_CONTENT from the plugin output
 AND MUST exec opencode with no extra arguments
 AND opencode MUST load with "openai/gpt-5.4" as the top-level model
```

### AC-10: `moc google` activates google profile
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc google`
THEN the launcher MUST set OPENCODE_PROVIDER_PROFILE=google
 AND MUST exec opencode
 AND opencode MUST load with "google/gemini-3.1-pro-preview-customtools" as the top-level model
```

### AC-11: `moc copilot` activates copilot profile
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc copilot`
THEN the launcher MUST set OPENCODE_PROVIDER_PROFILE=copilot
 AND MUST exec opencode
 AND opencode MUST load with "copilot/gpt-5.4" as the top-level model
```

### AC-12: `moc` forwards extra args after profile
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc openai --model foo --verbose`
THEN the launcher MUST set OPENCODE_PROVIDER_PROFILE=openai
 AND MUST exec opencode with arguments ["--model", "foo", "--verbose"]
```

### AC-13: Unknown first argument passes through without profile override
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc --help`
THEN the launcher MUST NOT set OPENCODE_PROVIDER_PROFILE
 AND MUST exec opencode with argument ["--help"]
```

### AC-14: `moc init` passes through (no profile override)
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc init`
THEN the launcher MUST NOT set OPENCODE_PROVIDER_PROFILE
 AND MUST exec opencode init
```

### AC-15: Plugin not found — graceful fallback
```
GIVEN the project does NOT have .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc openai`
THEN the launcher MUST print a warning message to stderr
 AND MUST NOT set OPENCODE_CONFIG_CONTENT
 AND MUST exec opencode (fallback)
```

### AC-16: No environment leakage
```
GIVEN the user runs `moc openai` in a shell session
WHEN the command completes (opencode exits)
THEN the parent shell MUST NOT have OPENCODE_PROVIDER_PROFILE or OPENCODE_CONFIG_CONTENT set
```

---

## Impacted Files

| File | Change type | Description |
|------|-------------|-------------|
| `plugins/provider-profile.mjs` | **MODIFY** | Plugin: update profile-to-model mappings (opencode → zen best-tier big-pickle; openai/copilot → tier-2 gpt-5.4; google → available-model-constrained gemini-3.1-pro-preview-customtools) |
| `opencode.json` | **MODIFY** | Update default `model`, `small_model`, and agent model overrides to tier-2 models |
| `plugins/README.md` | **MODIFY** | Document the provider-profile plugin (if model IDs mentioned) |
| `README.md` | **MODIFY** | Add "Profile Switching" section documenting `moc` usage (replace raw env var example) |
| `scripts/postinstall.js` | **MODIFY** | Include `plugins/provider-profile.mjs` in the installed assets |
| `bin/cli.js` | **MODIFY** | Copy `plugins/` into `.opencode/` during `npx my-opencode init` |
| `package.json` | **MODIFY** | Add `"moc": "bin/moc"` to `"bin"` object |
| `docs/specs/provider-profile-plugin/README.md` | **MODIFY** | This contract document (tier-2 model refresh) |
| `bin/moc` | **CREATE** | New POSIX shell script: `moc` launcher — user-facing entry point |

### Dependencies

```
package.json (bin.moc)
    ↓
bin/moc                             ← created (shell launcher)
    ↓
.opencode/plugins/provider-profile.mjs  ← exists (plugin generates JSON)
    ↓
└── exec opencode with OPENCODE_CONFIG_CONTENT set
```

---

## Environment Variable

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `OPENCODE_PROVIDER_PROFILE` | `opencode`, `openai`, `google`, `copilot` | `opencode` | Selects the active provider profile, which determines all model references (internal; users should use `moc` instead) |

### Usage

#### Recommended: `moc` launcher

```bash
# Default (opencode) — same as typing "opencode"
moc

# Switch to OpenAI
moc openai

# Switch to Google
moc google

# Switch to Copilot
moc copilot

# Explicit default
moc opencode

# With extra opencode arguments
moc openai --list-agents
```

#### Direct env var (advanced / scripting)

```bash
# Default (opencode)
OPENCODE_CONFIG_CONTENT="$(node .opencode/plugins/provider-profile.mjs)" opencode

# Switch to OpenAI
OPENCODE_PROVIDER_PROFILE=openai \
OPENCODE_CONFIG_CONTENT="$(node .opencode/plugins/provider-profile.mjs)" \
opencode

# Switch to Google
OPENCODE_PROVIDER_PROFILE=google \
OPENCODE_CONFIG_CONTENT="$(node .opencode/plugins/provider-profile.mjs)" \
opencode

# Switch to Copilot
OPENCODE_PROVIDER_PROFILE=copilot \
OPENCODE_CONFIG_CONTENT="$(node .opencode/plugins/provider-profile.mjs)" \
opencode

# Persist in shell profile (deprecated — use moc instead)
echo 'export OPENCODE_PROVIDER_PROFILE=openai' >> ~/.zshrc
```

---

## Out of Scope

- Dynamic profile switching at runtime (no hot-reload; env var is read at startup)
- Provider credential management (API keys, auth tokens — handled by opencode's provider config)
- Profile-specific `provider` blocks in `opencode.json` (e.g., custom base URLs)
- Support for arbitrary/custom provider profiles (exactly four fixed profiles)
- Per-agent `variant` or `temperature` overrides per profile
- Validation that the selected provider is actually configured/available in opencode
- Plugin discovery or dynamic loading beyond opencode's built-in `plugin` array
- `moc` launcher supporting Windows (PowerShell/batch) — macOS/Linux only; opencode itself runs on all platforms but the shell-wrapper approach is Unix-native
- Interactive profile selection menu (`moc` without a profile argument always uses default; no interactive prompt)
- Profile completion or suggestion in the shell (users can add their own shell completions, but it's out of scope for this contract)
- `moc` working without `node` on PATH (Node.js is required — opencode itself is a Node.js CLI tool)

---

## Implementation Notes

1. **Plugin loading mechanism**: opencode supports `plugin` as an array of strings (npm packages or local paths) or `[name, config]` tuples. The local path resolves relative to the directory containing `opencode.json`.

2. **Config mutation constraint**: current opencode plugins expose runtime hooks/tools, but do not mutate `opencode.json` during config load. Therefore this implementation uses the plugin module as the canonical resolver and executes it to generate an `OPENCODE_CONFIG_CONTENT` JSON override fragment.

3. **Testing**: The `resolveProfile` function is pure (input → output) and can be unit-tested without opencode. Five test cases (one per profile: `opencode` uses zen best-tier `big-pickle` while `openai`/`google`/`copilot` use tier-2 models) + one error case + one default case.

4. **Published assets**: `plugins/` and `bin/` must both remain included in `package.json` so the plugin and `moc` launcher ship with npm installs.

5. **`bin/moc` launcher**: This is a thin POSIX shell script. It is **not** a Node.js script, so it adds zero startup overhead. The script uses `exec` to replace the shell process with `opencode`, so opencode's process is the direct child of the user's shell (no extra shell process lingering).

6. **Copilot model IDs**: Copilot model IDs (`copilot/gpt-5.4`, `copilot/gpt-5.4-mini`) use the `copilot/` prefix for repo consistency with the existing pattern. **These exact accepted model IDs should be verified in a live Copilot-connected opencode session before merging.** If the actual accepted prefix differs, update both this contract and `plugins/provider-profile.mjs` to match.

7. **OpenCode Zen model IDs for `opencode` profile**: The `opencode` profile uses the **zen best-tier** series — all free, no cost optimization. The selected IDs (`opencode/big-pickle` for primary/heavy, `opencode/deepseek-v4-flash-free` for small) are **already in active use** in `opencode.json` and are confirmed working. If newer/better zen models become available (e.g., a future `opencode/big-pickle-2` or `opencode/zen-1`), the `opencode` profile should be upgraded to the best available at that time — no tier-2 logic needed since pricing is not a concern. The `openai`/`google`/`copilot` profiles should remain on their tier-2 strategy regardless.

8. **Testing the launcher**: The shell script can be validated by:
   - Running `moc` in a project with `.opencode/plugins/provider-profile.mjs` and verifying `OPENCODE_CONFIG_CONTENT` is set (use `echo "$OPENCODE_CONFIG_CONTENT"` in a wrapper)
   - Running `moc --help` and verifying it outputs opencode's help (passthrough)
   - Running `moc invalid` and verifying it passes through (should show opencode's error or help)
   - Removing/moving the plugin file and verifying the warning message appears on stderr

9. **Google Gemini model mapping — available-model constrained**: Google does not currently expose a stable non-preview `gemini-3.0-pro`/`gemini-3.5-pro` path that resolves for this integration. The selected primary model is `google/gemini-3.1-pro-preview-customtools`, which is the highest confirmed available Pro-tier model and explicitly supports tool use. The small model remains `google/gemini-3.5-flash` because it is the latest confirmed fast/cheap flash variant. When Google ships a stable higher-tier Pro model that resolves in this environment, this mapping should be reviewed and updated.
