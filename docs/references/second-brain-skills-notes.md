# Second Brain Skills — Reference Report

**Source:** `/Users/cfh00902455/Projects/my/my-opencode/ref/second-brain-skills/`
**Author:** coleam00

---

## 1. Directory Structure

```
second-brain-skills/
└── .claude/skills/
    ├── mcp-client/              # Universal MCP client
    │   ├── SKILL.md
    │   ├── scripts/mcp_client.py
    │   └── references/          # Configs, server docs, SDK docs
    ├── sop-creator/             # SOP & runbook creator
    │   ├── SKILL.md
    │   └── references/          # 7 template types
    ├── skill-creator/           # Meta-skill for creating skills
    │   ├── SKILL.md
    │   ├── scripts/             # init_skill.py, package_skill.py, quick_validate.py
    │   └── references/          # Workflows, output patterns
    ├── pptx-generator/          # Presentation & carousel generator
    │   ├── SKILL.md (~1193 lines)
    │   ├── cookbook/            # 16 slide layouts + 5 carousel layouts
    │   └── brands/              # Brand configurations
    ├── remotion/                # Video creation skill
    │   ├── skill.md (59 lines)
    │   └── rules/               # 28 modular rule files
    └── brand-voice-generator/   # Brand identity setup
        ├── SKILL.md
        └── references/          # Tone, voice, color templates
```

---

## 2. Progressive Disclosure — The Core Technique

### Three-Level Loading System

| Level | Content | Context Impact |
|-------|---------|----------------|
| **1: Metadata** | `name` + `description` (~100 words) | Always in context, negligible |
| **2: SKILL.md Body** | Core workflow (<5k words, <500 lines) | Loaded when triggered |
| **3: Resources** | `references/`, `scripts/`, `assets/` | Loaded on demand, never auto-loaded |

### Specific Patterns

1. **High-level guide with references (most common)**
   - SKILL.md = core workflow + "See references/X.md for details"
   - references/X.md = loaded only when needed

2. **Domain-specific organization**
   - SKILL.md = overview + selection guide
   - references/ = one file per document type (runbook, decision-tree, etc.)

3. **Conditional details**
   - skill.md (59 lines) = just lists 28 rule files
   - rules/*.md = loaded only when that feature is needed

### Why It Matters
> "The context window is a public good. Skills share the context window with everything else Claude needs."

- 6 skills' metadata = ~600 words in context
- Only triggered skill's body loads (<5k words)
- Reference files load only on demand
- Scripts execute without entering context

---

## 3. SKILL.md Format

### Frontmatter
```yaml
---
name: mcp-client
description: |
  Universal MCP client...
  TRIGGERS - Use this skill when:
  - "connect to Zapier", "use MCP server"...
---
```
Only `name` and `description` required. Max 64 chars for name, max 1024 chars for description.

### Body Sections
1. H1 Title → 2. Purpose → 3. Location paths → 4. Setup → 5. Core workflow
6. Commands reference → 7. Examples → 8. Quality checklists → 9. Anti-patterns → 10. References

### Scripts (PEP 723 inline metadata)
```python
#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["python-pptx==1.0.2"]
# ///
```
Allows `uv run` to auto-resolve dependencies.

---

## 4. Core Philosophy

1. **Context as a public good** — every line must justify its token cost
2. **Claude is already smart** — only add context Claude doesn't have
3. **Three-level loading** as first-class design principle
4. **Skills are self-contained packages** — validated, zippable, installable
5. **Opinionated writing rules** — specific, actionable, anti-patterns listed
6. **Less config, more convention** — skills work out of the box

### Anti-Patterns (explicitly listed)
- Don't put "when to use" in body (belongs in frontmatter)
- Don't create README/CHANGELOG in skill dirs
- Avoid deeply nested references (keep one level deep)
- Keep SKILL.md under 500 lines
- Content-slide is last resort (PPTX skill)

---

## 5. Context Management

### Inter-Skill Data Flow
```
Brand & Voice Generator → creates brand config → consumed by PPTX Generator
MCP Client → documents gotchas in CLAUDE.md → consumed by all future sessions
Skill Creator → creates SKILL.md + scripts → consumed by subsequent requests
```

### Avoiding Context Bloat
- MCP Client: lists one server at a time, never holds unused schemas
- PPTX Generator: reads only frontmatter of ALL layouts first, then chosen layout fully
- Remotion: 59-line skill.md delegates entirely to 28 modular rule files

---

## Key Takeaways
1. Progressive disclosure is the central architectural concern
2. Three-level loading (metadata → body → resources) is the standard
3. Context as a public good — token efficiency drives all design decisions
4. Skills produce artifacts others consume — designed for composition
5. PEP 723 inline metadata for zero-config script execution with `uv run`
6. Anti-patterns explicitly documented alongside best practices
