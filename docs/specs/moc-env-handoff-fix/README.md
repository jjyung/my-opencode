# Feature: `moc` environment handoff fix

Fix a launcher bug where `bin/moc` computes the correct provider-profile JSON but fails to pass `OPENCODE_PROVIDER_PROFILE` and `OPENCODE_CONFIG_CONTENT` into the final `opencode` process for recognized profiles such as `google`.

## Architecture References

- **ADR-001**: Contract-First Development Flow
- **docs/specs/provider-profile-plugin/README.md**: Existing provider-profile + launcher contract
- **docs/specs/moc-mtime-cache/README.md**: Existing `moc` cache behavior contract

---

## Requirements

### Functional

| ID | Description | Priority |
|----|-------------|----------|
| FR-1 | `moc` MUST continue to recognize exactly `opencode`, `openai`, `google`, and `copilot` as profile arguments | MUST |
| FR-2 | For a recognized profile, `moc` MUST exec `opencode` with non-empty `OPENCODE_PROVIDER_PROFILE` equal to the selected profile | MUST |
| FR-3 | For a recognized profile, `moc` MUST exec `opencode` with non-empty `OPENCODE_CONFIG_CONTENT` equal to the computed or cached provider-profile JSON | MUST |
| FR-4 | `moc google` MUST result in the child `opencode` process receiving config whose top-level `model` is `google/gemini-3.1-pro-preview-customtools` and `small_model` is `google/gemini-3.5-flash` | MUST |
| FR-5 | The fix MUST preserve existing cache-hit and cache-miss behavior from `docs/specs/moc-mtime-cache/README.md` | MUST |
| FR-6 | Unrecognized first arguments such as `moc --help` MUST remain transparent passthroughs and MUST NOT inject provider-profile env vars | MUST |
| FR-7 | If plugin execution fails, `moc` MUST continue to exit non-zero with a clear error instead of launching `opencode` with empty env values | MUST |

### Non-Functional

| ID | Description | Priority |
|----|-------------|----------|
| NFR-1 | The fix MUST remain portable POSIX shell compatible with `/bin/sh` on macOS/Linux | MUST |
| NFR-2 | The fix MUST NOT add npm dependencies or change the provider-profile JSON schema | MUST |
| NFR-3 | The implementation SHOULD stay narrowly scoped to `bin/moc` unless a test artifact is required for verification | SHOULD |

---

## Acceptance Criteria

### AC-1: Google profile env handoff works on cache miss

```text
GIVEN `.opencode/plugins/provider-profile.mjs` exists
 AND no valid cache entry exists for profile `google`
WHEN the user runs `moc google`
THEN `moc` MUST compute provider-profile JSON for `google`
 AND MUST exec `opencode` with `OPENCODE_PROVIDER_PROFILE=google`
 AND MUST exec `opencode` with non-empty `OPENCODE_CONFIG_CONTENT`
 AND that JSON MUST include top-level `model=google/gemini-3.1-pro-preview-customtools`
 AND that JSON MUST include top-level `small_model=google/gemini-3.5-flash`
```

### AC-2: Google profile env handoff works on cache hit

```text
GIVEN a valid cache entry exists for profile `google`
WHEN the user runs `moc google`
THEN `moc` MUST reuse cached JSON as allowed by the cache contract
 AND MUST still exec `opencode` with `OPENCODE_PROVIDER_PROFILE=google`
 AND MUST still exec `opencode` with non-empty `OPENCODE_CONFIG_CONTENT`
```

### AC-3: Default profile env handoff works

```text
GIVEN `.opencode/plugins/provider-profile.mjs` exists
WHEN the user runs `moc`
THEN `moc` MUST exec `opencode` with `OPENCODE_PROVIDER_PROFILE=opencode`
 AND MUST exec `opencode` with non-empty `OPENCODE_CONFIG_CONTENT`
```

### AC-4: Passthrough commands remain unchanged

```text
GIVEN the user runs `moc --help`
WHEN `--help` is not a recognized profile name
THEN `moc` MUST exec `opencode --help`
 AND MUST NOT require provider-profile plugin execution
 AND MUST NOT inject `OPENCODE_PROVIDER_PROFILE` or `OPENCODE_CONFIG_CONTENT`
```

### AC-5: Failure path does not launch with empty env

```text
GIVEN the cache is stale or missing
 AND provider-profile plugin execution fails
WHEN the user runs `moc google`
THEN `moc` MUST print an error to stderr
 AND MUST exit non-zero
 AND MUST NOT launch `opencode` with empty or missing computed env values
```

---

## CLI Contract

| Command | Expected child env |
|---------|--------------------|
| `moc` | `OPENCODE_PROVIDER_PROFILE=opencode`, non-empty `OPENCODE_CONFIG_CONTENT` |
| `moc google` | `OPENCODE_PROVIDER_PROFILE=google`, non-empty `OPENCODE_CONFIG_CONTENT` |
| `moc openai --list-agents` | `OPENCODE_PROVIDER_PROFILE=openai`, non-empty `OPENCODE_CONFIG_CONTENT`, args forwarded as `--list-agents` |
| `moc --help` | No provider-profile env injection; direct passthrough |

There is no external HTTP/API change. This is a CLI launcher behavior fix only.

---

## Data Model / Cache Impact

- **Provider-profile JSON:** unchanged
- **Cache file format:** unchanged
- **Cache key inputs:** unchanged (`profile`, plugin mtime, config mtime)
- **Environment contract:** clarified that recognized-profile launches must pass non-empty `OPENCODE_PROVIDER_PROFILE` and `OPENCODE_CONFIG_CONTENT` into the child `opencode` process

---

## Affected Files

| File | Change Type | Notes |
|------|-------------|-------|
| `bin/moc` | **MODIFY** | Fix shell env handoff into final `exec opencode` path |
| `docs/specs/moc-env-handoff-fix/README.md` | **ADD** | Persistent contract for this bug fix |

Tests MAY use a temporary stub `opencode` binary during verification, but no persistent repo test file is required unless implementation chooses to add one.

---

## Out of Scope

- Changing supported profile names or model mappings
- Refactoring `plugins/provider-profile.mjs`
- Altering cache invalidation logic or metadata format
- Adding global shell persistence for provider env vars
- Fixing unrelated `moc` UX or startup performance issues
