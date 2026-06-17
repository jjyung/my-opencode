# Feature: `moc` mtime-based config cache

Improve `moc` startup time by avoiding a fresh provider-profile plugin execution on every launch while preserving correct profile switching for `opencode`, `openai`, `google`, and `copilot`.

## Architecture References

- **ADR-001**: Contract-First Development Flow
- **docs/specs/provider-profile-plugin/README.md**: Existing provider-profile and launcher contract

---

## Requirements

### Functional

| ID | Description | Priority |
|----|-------------|----------|
| FR-1 | `moc` MUST continue to treat `opencode`, `openai`, `google`, and `copilot` as the only recognized profile arguments | MUST |
| FR-2 | `moc google` MUST still result in `opencode` receiving a merged config whose top-level `model` is `google/gemini-3.1-pro-preview-customtools` and `small_model` is `google/gemini-3.5-flash` | MUST |
| FR-3 | `moc` MUST cache the computed `OPENCODE_CONFIG_CONTENT` for recognized profiles | MUST |
| FR-4 | Cache validity MUST be determined from the selected profile plus file modification metadata, without computing content hashes | MUST |
| FR-5 | On a cache hit, `moc` MUST reuse cached config content and MUST NOT execute `node .opencode/plugins/provider-profile.mjs` | MUST |
| FR-6 | On a cache miss, `moc` MUST execute `node .opencode/plugins/provider-profile.mjs`, capture its JSON output, and refresh the cache before launching `opencode` | MUST |
| FR-7 | Cache invalidation MUST occur when the selected profile changes | MUST |
| FR-8 | Cache invalidation MUST occur when `.opencode/plugins/provider-profile.mjs` mtime changes | MUST |
| FR-9 | Cache invalidation MUST occur when `.opencode/opencode.json` mtime changes | MUST |
| FR-10 | If plugin execution fails, `moc` MUST surface a clear error and exit non-zero rather than launching `opencode` with stale or empty generated config | MUST |
| FR-11 | If cache read, parse, or write fails, `moc` MUST fall back to recomputing config once for the current launch instead of trusting a broken cache entry | MUST |
| FR-12 | Unrecognized first arguments such as `moc --help` MUST remain transparent passthroughs and MUST NOT use the profile cache path | MUST |

### Non-Functional

| ID | Description | Priority |
|----|-------------|----------|
| NFR-1 | Steady-state launches for recognized profiles SHOULD avoid the extra Node.js provider-profile subprocess | SHOULD |
| NFR-2 | The cache mechanism MUST remain POSIX-shell compatible on macOS/Linux (`/bin/sh`) | MUST |
| NFR-3 | The cache mechanism MUST add no new npm dependencies | MUST |
| NFR-4 | Cache files MUST live under the project-local `.opencode/` directory so they are naturally scoped to the active project | MUST |
| NFR-5 | The implementation SHOULD prefer simple file metadata checks over heavier content hashing | SHOULD |

---

## Acceptance Criteria

### AC-1: Default profile cache miss

```text
GIVEN `.opencode/plugins/provider-profile.mjs` exists
 AND no valid cache entry exists for profile `opencode`
WHEN the user runs `moc`
THEN the launcher MUST compute config by executing `node .opencode/plugins/provider-profile.mjs`
 AND MUST write/update the cache entry for profile `opencode`
 AND MUST exec `opencode` with `OPENCODE_CONFIG_CONTENT` set to the computed JSON
```

### AC-2: Google profile cache miss

```text
GIVEN `.opencode/plugins/provider-profile.mjs` exists
 AND no valid cache entry exists for profile `google`
WHEN the user runs `moc google`
THEN the launcher MUST execute `node .opencode/plugins/provider-profile.mjs`
 AND the resulting config MUST contain top-level model `google/gemini-3.1-pro-preview-customtools`
 AND the resulting config MUST contain top-level small_model `google/gemini-3.5-flash`
 AND the launcher MUST refresh the `google` cache entry before execing `opencode`
```

### AC-3: Cache hit skips recomputation

```text
GIVEN a cache entry exists for profile `google`
 AND the cached metadata profile is `google`
 AND the cached plugin mtime matches `.opencode/plugins/provider-profile.mjs`
 AND the cached config mtime matches `.opencode/opencode.json`
WHEN the user runs `moc google`
THEN the launcher MUST reuse cached config content
 AND MUST NOT execute `node .opencode/plugins/provider-profile.mjs`
 AND MUST exec `opencode` with the cached JSON content
```

### AC-4: Plugin mtime change invalidates cache

```text
GIVEN a cache entry exists for profile `google`
 AND `.opencode/plugins/provider-profile.mjs` has a newer or different mtime than the cached metadata
WHEN the user runs `moc google`
THEN the launcher MUST treat the cache as stale
 AND MUST recompute config through the plugin
 AND MUST overwrite the cache metadata and content for `google`
```

### AC-5: Config mtime change invalidates cache

```text
GIVEN a cache entry exists for profile `openai`
 AND `.opencode/opencode.json` has a newer or different mtime than the cached metadata
WHEN the user runs `moc openai`
THEN the launcher MUST treat the cache as stale
 AND MUST recompute config through the plugin
```

### AC-6: Profile switch uses separate cache key

```text
GIVEN a valid cache entry exists for profile `openai`
WHEN the user runs `moc google`
THEN the launcher MUST NOT reuse the `openai` cache entry
 AND MUST load a valid `google` cache entry or recompute one
 AND opencode MUST receive Google profile model assignments
```

### AC-7: Broken cache falls back safely

```text
GIVEN a cache file exists but is unreadable, malformed, or missing required metadata
WHEN the user runs `moc google`
THEN the launcher MUST ignore that cache entry
 AND MUST attempt one fresh plugin execution for the current launch
 AND MUST continue if fresh computation succeeds
```

### AC-8: Plugin failure does not use stale cache

```text
GIVEN the cache is stale or missing
 AND `node .opencode/plugins/provider-profile.mjs` exits non-zero
WHEN the user runs `moc google`
THEN the launcher MUST print an error to stderr
 AND MUST exit non-zero
 AND MUST NOT launch `opencode` with stale cached content
```

### AC-9: Passthrough commands bypass cache logic

```text
GIVEN the user runs `moc --help`
WHEN `--help` is not a recognized profile name
THEN the launcher MUST exec `opencode --help`
 AND MUST NOT require or populate provider-profile cache artifacts for this launch
```

---

## Launcher Behavior

### Recognized profile flow

```text
1. Parse first argument.
2. If first argument is one of [opencode, openai, google, copilot], set active_profile to that value; otherwise use passthrough behavior.
3. Resolve paths:
   - plugin: .opencode/plugins/provider-profile.mjs
   - config: .opencode/opencode.json
   - cache dir: .opencode/cache/provider-profile/
   - cache content file: .opencode/cache/provider-profile/<profile>.json
   - cache meta file: .opencode/cache/provider-profile/<profile>.meta
4. Read current mtime for plugin and config.
5. If cache content and meta exist, and meta matches:
   - active profile
   - plugin mtime
   - config mtime
   then treat as cache hit.
6. Cache hit:
   - read cached JSON content
   - set OPENCODE_PROVIDER_PROFILE=<profile>
   - set OPENCODE_CONFIG_CONTENT=<cached json>
   - exec opencode
7. Cache miss:
   - execute `node .opencode/plugins/provider-profile.mjs`
   - capture stdout JSON
   - write content file and meta file
   - set OPENCODE_PROVIDER_PROFILE=<profile>
   - set OPENCODE_CONFIG_CONTENT=<fresh json>
   - exec opencode
```

### Passthrough flow

If the first argument is not a recognized profile name, `moc` MUST behave like a transparent wrapper around `opencode` and skip the cache code path.

---

## Cache Data Model

### Cache location

```text
.opencode/cache/provider-profile/
```

### Cache content file

Per-profile JSON override exactly as required by `OPENCODE_CONFIG_CONTENT`:

```json
{
  "model": "google/gemini-3.1-pro-preview-customtools",
  "small_model": "google/gemini-3.5-flash",
  "agent": {
    "spec-writer": { "model": "google/gemini-3.1-pro-preview-customtools" },
    "verifier": { "model": "google/gemini-3.5-flash" },
    "code-reviewer": { "model": "google/gemini-3.1-pro-preview-customtools" },
    "team-lead": { "model": "google/gemini-3.1-pro-preview-customtools" },
    "architect": { "model": "google/gemini-3.1-pro-preview-customtools" }
  }
}
```

### Cache metadata file

Plain line-oriented metadata or equivalent simple shell-readable format containing at least:

```text
profile=google
plugin_mtime=<stat-derived value>
config_mtime=<stat-derived value>
```

The exact encoding MAY be shell-friendly key/value lines rather than JSON if that reduces parsing overhead in `bin/moc`.

---

## Data Model Changes

No user-facing API changes.

Internal data artifacts added:

| Artifact | Fields | Purpose |
|----------|--------|---------|
| per-profile cache content | `model`, `small_model`, `agent` | Reused `OPENCODE_CONFIG_CONTENT` payload |
| per-profile cache metadata | `profile`, `plugin_mtime`, `config_mtime` | Cache validity check inputs |

---

## Impacted Files

| File | Change type | Description |
|------|-------------|-------------|
| `bin/moc` | **MODIFY** | Add mtime-based cache lookup, validation, refresh, and safe fallback behavior |
| `README.md` | **MODIFY** | Document that `moc` caches generated config and refreshes it when local plugin/config files change |
| `plugins/README.md` | **MODIFY** | Document cache behavior and invalidation rules for provider-profile launcher integration |
| `docs/specs/moc-mtime-cache/README.md` | **CREATE** | Persistent contract for this feature |

Optional/if needed during implementation:

| File | Change type | Description |
|------|-------------|-------------|
| `.gitignore` | **MODIFY** | Ignore `.opencode/cache/` artifacts if not already ignored through broader rules |

---

## Out of Scope

- Replacing the provider-profile plugin with hardcoded shell logic
- Hash-based cache invalidation
- Cross-project or global cache sharing
- Runtime profile switching after `opencode` has already started
- Changing model mappings for any provider profile
- Windows-native launcher support
- Adding new provider profiles

---

## Assumptions

1. `moc` continues to run from a project root where `.opencode/` is available.
2. Project-local cache artifacts under `.opencode/cache/` are acceptable.
3. File mtimes from `stat` are stable enough on supported environments to detect relevant edits to `.opencode/plugins/provider-profile.mjs` and `.opencode/opencode.json`.
