# Feature: Code Review Follow-Up Fix Pack

Address a blocking bug and three low-cost warnings/suggestions from a recent code review.
Narrowly scoped — no new features, no model changes, no test additions.

## Architecture References

- **ADR-001**: Contract-First Development Flow
- **docs/specs/provider-profile-plugin/README.md**: Provider-profile plugin + `moc` launcher contract
- **docs/specs/moc-mtime-cache/README.md**: `moc` mtime-based config cache contract
- **docs/specs/moc-env-handoff-fix/README.md**: `moc` environment handoff fix contract

---

## Requirements

### Functional

| ID | Description | Priority |
|----|-------------|----------|
| FR-1 | `scripts/postinstall.js` MUST create `.opencode/plugins/` explicitly before attempting to copy plugin files into it | MUST |
| FR-2 | `.gitignore` MUST include `.opencode/node_modules/` to prevent accidental check-in of local dependency artifacts | MUST |
| FR-3 | `ProviderProfilePlugin()` in `plugins/provider-profile.mjs` MUST have a JSDoc comment explaining it is a no-op runtime hook placeholder (model switching is driven by `OPENCODE_CONFIG_CONTENT` / direct execution) | MUST |
| FR-4 | `exec_opencode_with_profile()` in `bin/moc` MUST be collapsed to a single `exec` path, removing the conditional branch on `$#` | MUST |
| FR-5 | Collapsing `exec_opencode_with_profile()` MUST NOT change observable behavior for any invocation (zero args, one arg, or many args) | MUST |

### Non-Functional

| ID | Description | Priority |
|----|-------------|----------|
| NFR-1 | All changes MUST remain backward-compatible — no breaking changes to existing behavior | MUST |
| NFR-2 | No npm dependencies added | MUST |
| NFR-3 | `bin/moc` change MUST remain portable POSIX shell compatible with `/bin/sh` on macOS/Linux | MUST |
| NFR-4 | Plugin source files in both `plugins/` and `.opencode/plugins/` MUST be kept in sync (already identical; the postinstall copies them) | SHOULD |

---

## Acceptance Criteria

### AC-1: Postinstall creates plugins dir explicitly

```text
GIVEN a fresh project with no `.opencode/` directory
WHEN `npm install` triggers `scripts/postinstall.js`
THEN the script MUST create `.opencode/` first
 AND THEN explicitly create `.opencode/plugins/` before copying any `.mjs` files into it
 AND plugin files MUST be present in `.opencode/plugins/` after completion
```

### AC-2: Postinstall is idempotent on re-install

```text
GIVEN `.opencode/plugins/` already exists with content
WHEN `scripts/postinstall.js` runs again
THEN the explicit `mkdirSync` for `.opencode/plugins/` MUST NOT throw
 AND existing files MUST NOT be overwritten (`copyFileIfNotExists` preserves existing)
 AND no unexpected errors occur
```

### AC-3: `.opencode/node_modules/` is gitignored

```text
GIVEN the repo `.gitignore`
WHEN `git status` is run after local dependency artifacts appear under `.opencode/node_modules/`
THEN those artifacts MUST NOT appear in `git status` (they are ignored)
```

### AC-4: `ProviderProfilePlugin()` has clarifying docstring

```text
GIVEN the source file `plugins/provider-profile.mjs`
WHEN `ProviderProfilePlugin()` is read by a developer
THEN it MUST have a JSDoc comment explaining:
  - This is a no-op runtime hook placeholder
  - Model switching is driven by `OPENCODE_CONFIG_CONTENT` / direct execution
  - The real config generation happens when the module is run directly via `node plugins/provider-profile.mjs`
```

### AC-5: `exec_opencode_with_profile()` simplified

```text
GIVEN the current `bin/moc` has two exec paths in `exec_opencode_with_profile()`
WHEN the function is refactored to a single `exec env ... opencode "$@"` path
THEN the result MUST work identically for:
  - `moc` (zero extra args after profile)
  - `moc google` (profile only, no extra args)
  - `moc openai --list-agents` (profile + extra args)
  - `moc opencode --model foo --verbose` (profile + multiple extra args)
 AND all four cases MUST pass `OPENCODE_PROVIDER_PROFILE` and `OPENCODE_CONFIG_CONTENT` correctly
```

### AC-6: No behavioral regression in `bin/moc`

```text
GIVEN the collapsed `exec_opencode_with_profile()`
WHEN the full `bin/moc` is exercised with all profile combinations
THEN all existing acceptance criteria from `docs/specs/moc-env-handoff-fix/README.md` and `docs/specs/moc-mtime-cache/README.md` MUST still hold
```

---

## Specification Details

### 1. `scripts/postinstall.js` — explicit plugins dir creation

**Current behavior (implicit):** The `copyFileIfNotExists()` helper internally calls `fs.mkdirSync(path.dirname(dst), { recursive: true })`, which creates `.opencode/plugins/` as a side effect during the first iteration of the plugins copy loop.

**Required fix:** Add an explicit `fs.mkdirSync(targetPlugins, { recursive: true })` call immediately before the plugins copy loop (after line 173, inside the `if (fs.existsSync(PLUGINS_SRC))` block). This makes the directory creation visible, intentional, and independent of loop iteration order.

```javascript
// ── Copy plugins ───────────────────────────────────────────────────────
let pluginCount = 0;
if (fs.existsSync(PLUGINS_SRC)) {
  fs.mkdirSync(targetPlugins, { recursive: true });   // ← ADD THIS LINE
  const plugins = fs
    .readdirSync(PLUGINS_SRC, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".mjs"))
    .map((d) => d.name);

  for (const plugin of plugins) {
    const dst = path.join(targetPlugins, plugin);
    if (copyFileIfNotExists(path.join(PLUGINS_SRC, plugin), dst)) {
      pluginCount++;
    }
  }
}
```

### 2. `.gitignore` — ignore `node_modules/` under `.opencode/`

**Current content:**
```
.opencode/cache/
```

**Required addition:** Add `.opencode/node_modules/` to `.gitignore`.

This covers accidental `node_modules/` directories that may appear if a user runs `npm install` inside `.opencode/` or if tooling creates local dependency artifacts there.

### 3. `ProviderProfilePlugin()` — clarifying JSDoc comment

**Current implementation (line 108-110 in both `plugins/provider-profile.mjs` and `.opencode/plugins/provider-profile.mjs`):**

```javascript
export function ProviderProfilePlugin() {
  return {};
}
```

**Required docstring:**

```javascript
/**
 * ProviderProfilePlugin — runtime hook placeholder (no-op).
 *
 * This is a no-op runtime hook for opencode's plugin system.
 * The actual model-profile switching happens OUTSIDE the runtime hook:
 *
 *   1) `bin/moc` (the shell launcher) or direct invocation sets
 *      OPENCODE_CONFIG_CONTENT by running this module directly:
 *        node plugins/provider-profile.mjs
 *
 *   2) The direct-execution path (bottom of this file) generates
 *      a JSON config override fragment that opencode merges at startup.
 *
 * This function exists so the module is loadable as an opencode plugin
 * (i.e., it can be listed in the `plugin` array), but no runtime
 * transformation is needed because the config override is already
 * applied via OPENCODE_CONFIG_CONTENT at process launch.
 *
 * @returns {object} Empty object — no runtime hook behavior.
 */
export function ProviderProfilePlugin() {
  return {};
}
```

### 4. `exec_opencode_with_profile()` — single exec path

**Current implementation (lines 76-88 in `bin/moc`):**

```sh
exec_opencode_with_profile() {
  if [ $# -eq 0 ]; then
    exec env \
      OPENCODE_PROVIDER_PROFILE="$profile" \
      OPENCODE_CONFIG_CONTENT="$config_content" \
      opencode
  fi

  exec env \
    OPENCODE_PROVIDER_PROFILE="$profile" \
    OPENCODE_CONFIG_CONTENT="$config_content" \
    opencode "$@"
}
```

**Required simplification:**

```sh
exec_opencode_with_profile() {
  exec env \
    OPENCODE_PROVIDER_PROFILE="$profile" \
    OPENCODE_CONFIG_CONTENT="$config_content" \
    opencode "$@"
}
```

**Rationale:** In POSIX shell, `"$@"` expands to nothing when there are no positional parameters, so `opencode "$@"` with an empty `$@` is equivalent to `opencode`. The conditional branch is dead code. Removing it eliminates the duplication and reduces the chance of drift between the two branches.

---

## Impacted Files

| File | Change Type | Description |
|------|-------------|-------------|
| `scripts/postinstall.js` | **MODIFY** | Add explicit `fs.mkdirSync(targetPlugins, { recursive: true })` before plugins copy loop |
| `.gitignore` | **MODIFY** | Add `.opencode/node_modules/` entry |
| `plugins/provider-profile.mjs` | **MODIFY** | Add JSDoc comment on `ProviderProfilePlugin()` |
| `.opencode/plugins/provider-profile.mjs` | **MODIFY** | Add same JSDoc comment (must stay in sync with `plugins/` source) |
| `bin/moc` | **MODIFY** | Collapse `exec_opencode_with_profile()` to single exec path |
| `docs/specs/review-fix-pack/README.md` | **ADD** | This contract document |

---

## Out of Scope

- Adding automated tests for any of the four fixes
- Any new features, profile names, or model mappings
- Changes to `plugins/provider-profile.mjs` beyond the JSDoc comment
- Refactoring `scripts/postinstall.js` beyond the explicit `mkdirSync` addition
- Changes to `copyDirSync` or `copyFileIfNotExists` helper functions
- Cache invalidation logic or metadata format changes
- Windows launcher support
- Any other code review findings not listed in this contract

---

## Notable Risks / Tradeoffs

| Risk | Mitigation |
|------|------------|
| **Synchronization drift** between `plugins/provider-profile.mjs` and `.opencode/plugins/provider-profile.mjs` | Postinstall copies source → destination; as long as both are edited identically (or source-only), drift is minimal. However, editing the `.opencode/` copy directly would diverge. **Tradeoff accepted:** this is an existing pattern, not introduced here. |
| **`exec_opencode_with_profile()` simplification** relies on POSIX shell semantics for `"$@"` | Verified behavior: POSIX specifies that `"$@"` expands to zero words when no positional parameters are set. This is consistent across all POSIX shells (bash, zsh, dash, sh) on macOS/Linux. |
| **Explicit `mkdirSync` in postinstall** adds one redundant syscall on re-install | Negligible cost (~0.1ms). The `{ recursive: true }` flag makes it safe when the directory already exists. |
