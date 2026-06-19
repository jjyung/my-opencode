# Feature: Windows `moc` Launcher

Make the `moc` launcher usable on Windows (cmd, PowerShell, Git Bash, WSL) while preserving existing macOS/Linux behavior and process hierarchy.

## Architecture References

- **ADR-001**: Contract-First Development Flow
- **docs/specs/provider-profile-plugin/README.md**: Existing `moc` launcher contract (Out of Scope explicitly marks Windows as excluded)
- **docs/specs/moc-mtime-cache/README.md**: Existing `moc` mtime-based cache contract
- **docs/specs/moc-env-handoff-fix/README.md**: Existing `moc` env handoff fix contract

---

## Rationale

The current `bin/moc` is a POSIX `/bin/sh` shell script. On Windows:

| Environment | `bin/moc` behavior | Problem |
|-------------|--------------------|---------|
| cmd.exe | npm creates `moc.cmd` shim → runs `bin/moc` via shell | No `/bin/sh` → script fails |
| PowerShell | npm creates `moc.ps1` shim → runs `bin/moc` via shell | No `/bin/sh` → script fails |
| Git Bash / MSYS2 | Shell available, but path separators differ | Mixed `/`/`\` issues, `stat` flags differ |
| WSL (Ubuntu) | Works if Node.js is also available via WSL | Works but requires WSL setup |

Users on Windows see a broken `moc` after `npm install my-opencode`. The fix must ship a cross-platform launcher that npm's bin shim mechanism handles natively.

---

## Requirements

### Functional — Launcher Cross-Platform

| ID | Description | Priority |
|----|-------------|----------|
| FR-WIN-1 | `moc` launcher MUST be invocable as `moc` on Windows (cmd, PowerShell) after `npm install` | MUST |
| FR-WIN-2 | Launcher MUST be invocable as `moc` on macOS/Linux with identical CLI behavior | MUST |
| FR-WIN-3 | Launcher MUST preserve the full CLI contract from the existing `moc` spec: profile recognition, passthrough, `doctor`, `print-config` | MUST |
| FR-WIN-4 | Launcher MUST emit identical stdout/stderr messages as the shell script for the same inputs | MUST |
| FR-WIN-5 | Launcher MUST respect `OPENCODE_PROVIDER_PROFILE` env var if already set (env var takes precedence over no-argument default) | MUST |
| FR-WIN-6 | Launcher MUST exit with the same exit code as the underlying `opencode` process | MUST |
| FR-WIN-7 | Launcher MUST proxy all signals (SIGINT, SIGTERM) to the child `opencode` process | MUST |
| FR-WIN-8 | Launcher MUST NOT leave orphaned `opencode` processes when the user presses Ctrl+C | MUST |
| FR-WIN-9 | Launcher MUST use path.sep-aware logic for all file system operations (plugin discovery, cache paths) | MUST |
| FR-WIN-10 | Launcher MUST NOT hardcode `/` path separators or assume POSIX-only utilities (`stat`, `mkdir -p`, `mv`) | MUST |

### Functional — Mtime Cache (Windows-Portable)

| ID | Description | Priority |
|----|-------------|----------|
| FR-CACHE-1 | Launcher MUST implement the same mtime-based cache logic as `bin/moc` using Node.js `fs.statSync` instead of POSIX `stat` | MUST |
| FR-CACHE-2 | Cache invalidation MUST occur when profile, plugin mtime, or config mtime changes (same semantics as shell version) | MUST |
| FR-CACHE-3 | Cache content MUST be stored under `.opencode/cache/provider-profile/` (same location as shell version) | MUST |
| FR-CACHE-4 | Cache read/write MUST use atomic writes (write to temp file, then rename) to prevent partial reads | SHOULD |
| FR-CACHE-5 | Cache directory creation MUST use `fs.mkdirSync` with `{ recursive: true }` | MUST |

### Non-Functional

| ID | Description | Priority |
|----|-------------|----------|
| NFR-WIN-1 | Launcher MUST have zero npm dependencies beyond what `opencode` already requires (Node.js >= 18 stdlib only) | MUST |
| NFR-WIN-2 | Launcher MUST be an ES module (`.mjs` or use `.js` with `"type": "module"`) to match project conventions | MUST |
| NFR-WIN-3 | Launcher SHOULD add no more than ~50ms startup overhead beyond the existing plugin execution time | SHOULD |
| NFR-WIN-4 | The POSIX shell `bin/moc` MUST remain in the repo for direct-use scenarios (Git Bash, WSL, native macOS/Linux) | MUST |
| NFR-WIN-5 | The POSIX shell `bin/moc` MUST NOT be the npm `"bin"` entry for `moc` — the Node.js version replaces it as the npm entry point | MUST |

---

## CLI Contract

### Behavior Table

Same as the existing `moc` contract — no behavioral changes:

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
| `moc doctor` | `opencode` (default for doctor) | *(none)* |
| `moc doctor google` | `google` | *(none)* |
| `moc print-config` | `opencode` (default for print-config) | *(none)* |
| `moc print-config openai` | `openai` | *(none)* |
| `moc unknown` | *(error — not a recognized profile or known command)* | Error to stderr, exit 1 |

### Internal Logic

The Node.js launcher (`bin/moc.js`) implements the same flow as `bin/moc`:

```
1. Parse first argument.
2. If first argument is one of [opencode, openai, google, copilot]:
     a. Set OPENCODE_PROVIDER_PROFILE = candidate_profile
     b. Shift remaining args
   Else if first argument is "doctor" or "print-config":
     a. Set command_mode = first argument
     b. If second argument is a recognized profile, set profile = second arg (else default to "opencode")
   Else:
     a. Passthrough: exec opencode with all original args, no profile override
3. Plugin discovery (CWD-relative):
     Path: .opencode/plugins/provider-profile.mjs
     Resolve using path.join() + path.resolve() (cross-platform)
4. If plugin file does not exist:
     Warn to stderr: "moc: plugin not found at <resolved_path>; falling back to plain opencode"
     Spawn opencode with (possibly shifted) args
5. If config file (.opencode/opencode.json) does not exist:
     Error to stderr: "moc: config not found at <resolved_path>; cannot compute provider profile override"
     Exit 1
6. Check mtime cache:
     Read .opencode/cache/provider-profile/<profile>.meta
     If meta exists and profile/plugin_mtime/config_mtime all match:
        Use cached content from .opencode/cache/provider-profile/<profile>.json
        Skip plugin execution
     Else:
        Spawn `node .opencode/plugins/provider-profile.mjs`
        Capture stdout
        Write cache files atomically
7. If command_mode is "doctor":
     Print profile, resolved paths, existence booleans as key=value lines
     Exit 0
8. If command_mode is "print-config":
     Print the config content JSON to stdout
     Exit 0
9. Spawn opencode with:
     env.OPENCODE_PROVIDER_PROFILE = profile
     env.OPENCODE_CONFIG_CONTENT = (cached or fresh) JSON content
     Remaining CLI args forwarded
   Pipe stdin/stdout/stderr
   Proxy signals
   Exit with opencode's exit code
```

### Process Model

| Platform | Shell launcher (`bin/moc`) | Node.js launcher (`bin/moc.js`) |
|----------|---------------------------|--------------------------------|
| macOS/Linux | `exec` replaces shell → direct child process | `spawn` → shell → `node` → `opencode` (extra Node.js process in tree) |
| Windows | N/A (broken) | `spawn` → shell → `node` → `opencode` |

**Tradeoff accepted:** The Node.js launcher adds one extra Node.js process to the chain. This is the standard pattern for cross-platform npm bin scripts. Startup overhead is dominated by the provider-profile plugin execution (~50-100ms), not the launcher itself.

### Signal Forwarding

The Node.js launcher MUST forward these signals to the child `opencode` process:

| Signal | Action |
|--------|--------|
| SIGINT (Ctrl+C) | Forward to child, then wait for child to exit; do not kill self first |
| SIGTERM | Forward to child, then exit with child's exit code |
| SIGHUP (POSIX only) | Forward to child |
| SIGBREAK (Windows only) | Forward to child |

Implementation: register handlers via `process.on('SIGINT', ...)` and forward via `child.kill(signal)`. Use `process.on('SIGBREAK')` for Windows.

---

## Acceptance Criteria

### AC-WIN-1: `moc` works in cmd.exe on Windows
```
GIVEN the package is installed via npm install on Windows
  AND the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc` in cmd.exe
THEN opencode MUST launch with OPENCODE_PROVIDER_PROFILE=opencode
  AND opencode MUST receive non-empty OPENCODE_CONFIG_CONTENT
  AND opencode MUST load with the "opencode" profile models
```

### AC-WIN-2: `moc` works in PowerShell on Windows
```
GIVEN the package is installed via npm install on Windows
  AND the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc openai` in PowerShell
THEN opencode MUST launch with OPENCODE_PROVIDER_PROFILE=openai
  AND opencode MUST receive config containing "openai/gpt-5.4"
```

### AC-WIN-3: Profile switching identical to shell launcher
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc google` on any platform (Windows, macOS, Linux)
THEN the profile activated MUST be "google"
  AND the model override MUST be "google/gemini-3.1-pro-preview-customtools"
  AND the behavior MUST be identical to running `bin/moc google` on macOS/Linux
```

### AC-WIN-4: Passthrough commands work
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc --help` on Windows
THEN opencode MUST receive argument `--help`
  AND MUST NOT have OPENCODE_PROVIDER_PROFILE or OPENCODE_CONFIG_CONTENT set
```

### AC-WIN-5: `moc doctor` works cross-platform
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc doctor` on Windows
THEN output MUST contain key=value lines
  AND MUST include "profile=opencode"
  AND MUST include "plugin_exists=yes"
  AND MUST exit 0
```

### AC-WIN-6: `moc print-config` works cross-platform
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc print-config openai` on Windows
THEN stdout MUST contain valid JSON
  AND JSON MUST include "model": "openai/gpt-5.4"
  AND MUST exit 0
```

### AC-WIN-7: Unknown profile error
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc unknown_profile_name` on any platform
THEN stderr MUST contain "unknown profile"
  AND exit code MUST be 1
```

### AC-WIN-8: Plugin-not-found fallback
```
GIVEN the project does NOT have .opencode/plugins/provider-profile.mjs
WHEN the user runs `moc` on Windows
THEN stderr MUST contain a warning message
  AND opencode MUST still launch (fallback, no profile override)
```

### AC-WIN-9: Config-not-found error
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
  BUT does NOT have .opencode/opencode.json
WHEN the user runs `moc openai` on Windows
THEN stderr MUST contain "config not found"
  AND exit code MUST be 1
```

### AC-WIN-10: Cache works on Windows
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
  AND no valid cache entry exists
WHEN the user runs `moc` on Windows (first run)
THEN the launcher MUST execute the plugin
  AND MUST write cache to .opencode/cache/provider-profile/opencode.json
  AND MUST write cache metadata
WHEN the user runs `moc` again (second run, no file changes)
THEN the launcher MUST NOT execute the plugin again (cache hit)
  AND MUST reuse the cached config content
```

### AC-WIN-11: Exit code propagation
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN opencode inside `moc` exits with exit code 42
THEN `moc` MUST exit with the same exit code 42
```

### AC-WIN-12: Ctrl+C signal forwarding
```
GIVEN the project has .opencode/plugins/provider-profile.mjs
WHEN the user presses Ctrl+C while `moc` is running
THEN SIGINT/signal MUST be forwarded to the child opencode process
  AND the child MUST terminate
  AND the launcher MUST NOT remain as a zombie process
```

### AC-WIN-13: Existing POSIX `bin/moc` behavior preserved
```
GIVEN the project is on macOS or Linux
  AND the user invokes `bin/moc` directly (not via npm shim)
WHEN the user runs any valid `moc` command
THEN behavior MUST be unchanged from the pre-Windows-support contract
  AND all existing ACs from provider-profile-plugin, moc-mtime-cache, and moc-env-handoff-fix MUST still hold
```

---

## Data Model Changes

No user-facing data model changes. The existing cache format under `.opencode/cache/provider-profile/` remains identical:

| Artifact | Location | Format | Purpose |
|----------|----------|--------|---------|
| Cache content | `.opencode/cache/provider-profile/<profile>.json` | JSON (same as shell version) | Cached `OPENCODE_CONFIG_CONTENT` payload |
| Cache metadata | `.opencode/cache/provider-profile/<profile>.meta` | Key=value lines (same as shell version) | Cache validity: profile, plugin_mtime, config_mtime |

The `.meta` file format stays:

```text
profile=opencode
plugin_mtime=1234567890.123
config_mtime=1234567890.456
```

**Note on cache coexistence:** The Node.js launcher and the shell launcher share the same cache directory and format. If a user switches between `bin/moc` (shell) and `bin/moc.js` (npm shim) on the same machine, the cache is interoperable. Both write the same file format.

---

## Packaging / Bin Changes

### `package.json` Changes

Current:
```json
"bin": {
  "my-opencode": "bin/cli.js",
  "moc": "bin/moc"
}
```

New:
```json
"bin": {
  "my-opencode": "bin/cli.js",
  "moc": "bin/moc.js"
}
```

The `"moc"` entry changes from `"bin/moc"` (shell script) to `"bin/moc.js"` (Node.js module). npm will:
- **Windows**: Create `moc.cmd` shim that runs `node bin/moc.js` — works in cmd and PowerShell
- **macOS/Linux**: Create a symlink `moc` → `bin/moc.js` with proper shebang — works in all POSIX shells

### npm Shim Generation

npm's cross-platform shim behavior:

| Platform | npm creates | Entry point | Behavior |
|----------|-------------|-------------|----------|
| Windows (cmd) | `moc.cmd` | `node bin/moc.js` | Works |
| Windows (PowerShell) | `moc.ps1` | `node bin/moc.js` | Works |
| macOS/Linux | `moc` → symlink | `bin/moc.js` with shebang | Works |

No `.cmd` or `.ps1` files need to be committed — npm generates them automatically during install.

### `bin/moc` (Shell Script) — Preservation

`bin/moc` remains in the repository for:
- Users on macOS/Linux who invoke it directly (`./bin/moc`) for the `exec`-based zero-overhead path
- Backward compatibility for scripts that reference `bin/moc` by path
- Git Bash / MSYS2 users on Windows who have a POSIX shell available

**The shell script is no longer the npm bin entry**, but it stays as a committed file.

---

## Affected Files

| File | Change type | Description |
|------|-------------|-------------|
| `bin/moc.js` | **CREATE** | New Node.js cross-platform launcher implementing the full `moc` behavior (profile dispatch, plugin execution, mtime cache, doctor, print-config, signal forwarding) |
| `package.json` | **MODIFY** | Change `"moc"` bin entry from `"bin/moc"` to `"bin/moc.js"` |
| `docs/specs/provider-profile-plugin/README.md` | **MODIFY** | Update "Out of Scope" section — remove "moc launcher supporting Windows" line; update "Launcher Contract" section to reflect dual launcher architecture (shell + Node.js) |
| `docs/specs/moc-mtime-cache/README.md` | **MODIFY** | Update "Out of Scope" section — remove "Windows-native launcher support" line; update "Impacted Files" to note `bin/moc.js` also implements cache |
| `README.md` | **MODIFY** | Update installation docs to state Windows is supported; update any platform-specific notes |
| `docs/specs/windows-moc-launcher/README.md` | **CREATE** | This contract document |

### No Changes Needed

These files already work cross-platform and do NOT need modification:

| File | Reason |
|------|--------|
| `bin/cli.js` | Already a Node.js script (`#!/usr/bin/env node`), works on Windows |
| `scripts/postinstall.js` | Uses `node:fs` and `node:path` APIs exclusively; cross-platform |
| `plugins/provider-profile.mjs` | ES module executed by `node`, no platform-specific code |
| `opencode.json` | JSON config, platform-agnostic |
| `.gitignore` | Already handles `.opencode/cache/` and `node_modules/` |

---

## Compatibility Notes

### npm Shim Interaction

The npm-generated `moc.cmd` (Windows) or `moc` symlink (POSIX) calls `node bin/moc.js`. The launcher must `process.exit()` with the child's exit code so that the npm shim propagates the correct exit code to the parent shell.

### Path Separator Handling

All file operations in `bin/moc.js` MUST use `path.join()` and `path.resolve()` instead of string concatenation with `/`. Specifically:

| Shell version (`bin/moc`) | Node.js version (`bin/moc.js`) |
|---------------------------|-------------------------------|
| `.opencode/plugins/provider-profile.mjs` | `path.join('.opencode', 'plugins', 'provider-profile.mjs')` |
| `.opencode/cache/provider-profile/` | `path.join('.opencode', 'cache', 'provider-profile')` |
| `<path>/$profile.json` | `path.join(cacheDir, `${profile}.json`)` |

### `stat` / `fs.statSync` Differences

The shell version uses POSIX `stat -f %m` (macOS) or `stat -c %Y` (Linux). The Node.js version uses `fs.statSync(path).mtimeMs` which returns milliseconds since epoch — portable across all platforms including Windows.

For cache metadata, store `mtimeMs` as a float string (e.g., `1234567890.123`). Compare using exact string match (same approach as shell `stat -c %Y` comparison).

### `exec` vs `spawn` Tradeoff

| Aspect | `bin/moc` (shell) | `bin/moc.js` (Node.js) |
|--------|------------------|------------------------|
| Process replacement | Yes (`exec`) | No (uses `spawn`) |
| Extra process | None | One Node.js process |
| Signal handling | Automatic (shell propagates) | Manual (must register handlers) |
| Exit code propagation | Automatic | Manual (`child.on('exit', code => process.exit(code))`) |
| Cross-platform | No | Yes |

### `opencode` Discovery

The launcher assumes `opencode` is on `PATH` (same as shell version). On Windows, if opencode is installed via npm, its `.cmd` shim will be on PATH automatically. The spawn call uses `'opencode'` as the command with `{ shell: false }` (default), which resolves through PATH on all platforms.

### `exec` Replacement in Shell Version

The POSIX shell `bin/moc` uses `exec` to replace the shell process with `opencode`. On Windows, `exec` is not available, so `child_process.spawn()` is the correct cross-platform equivalent. The Node.js launcher implements the `spawn` + pipe + signal-forwarding pattern.

### Cache Interoperability

Both `bin/moc` (shell) and `bin/moc.js` (Node.js) share the same cache files under `.opencode/cache/provider-profile/`. The file formats are identical:

- Content: `<profile>.json` — exact JSON string of the plugin output
- Metadata: `<profile>.meta` — key=value lines with `profile`, `plugin_mtime`, `config_mtime`

This means switching between the two launchers on the same project yields correct cache behavior.

---

## Out of Scope

- Creating a native Windows executable or PowerShell-only launcher
- Changing the provider-profile plugin or its output format
- Adding new provider profiles beyond `opencode`, `openai`, `google`, `copilot`
- Adding interactive profile selection (menus, prompts)
- Cross-project or global cache sharing
- Hot-reload or runtime profile switching
- Removing or deprecating the POSIX shell `bin/moc`
- Writing committed `.cmd` or `.ps1` shim files (npm generates these automatically)
- Supporting `moc` without Node.js on PATH (Node.js is a prerequisite — `opencode` itself is a Node.js CLI)
- Testing against every Windows terminal variant (cmd, PowerShell 5, PowerShell 7, Windows Terminal, Git Bash, WSL) — primary targets are cmd.exe and PowerShell
