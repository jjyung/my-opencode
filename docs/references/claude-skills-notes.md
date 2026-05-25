# Claude Skills Reference: Comprehensive Analysis

**Source:** `/Users/cfh00902455/Projects/my/my-opencode/ref/claude-skills/`
**Repository:** alirezarezvani/claude-skills (MIT)
**Version:** v2.8.4 (May 2026)
**Total Files:** 2,905, 330+ skills across 14 domains

---

## 1. Directory Structure

| Domain | Skills | Description |
|--------|--------|-------------|
| `engineering/` | 78 | Agent, RAG, MCP, CI/CD, SRE, security, database |
| `c-level-advisor/` | 66 | Full C-suite advisor: CEO/CTO/CFO/... |
| `engineering-team/` | 51 | Senior dev roles, code review, QA, a11y |
| `marketing-skill/` | 46 | Content, SEO, CRO, growth, analytics |
| `ra-qm-team/` | 18 | ISO 13485, MDR, FDA, GDPR, SOC 2 |
| `product-team/` | 17 | Product management, UX, design system |
| `project-management/` | 9 | Jira, scrum master, meeting analyzer |
| `compliance-os/` | 9 | Compliance readiness |
| `research/` | 8 | Literature review, grants, patent |
| `commercial/` | 8 | Pricing, partnerships, RFP |
| `business-operations/` | 7 | Process mapping, vendor management |
| `productivity/` | 6 | Capture, email, reflect, handoff |
| `business-growth/` | 5 | Customer success, sales engineering |
| `finance/` | 4 | Financial analyst, SaaS metrics |

### Standard Skill Package Layout
```
skill-name/
├── SKILL.md                         # Master instructions (YAML frontmatter + markdown)
├── scripts/                         # 3 deterministic CLI tools (stdlib Python)
├── references/                      # 3+ reference guides
└── assets/                          # (optional) Templates, examples
```

Known as the **"11-file contract"** (1 SKILL.md + 3 scripts + 3 references + optional assets + agent + command).

---

## 2. Cross-Platform Format

Supports **13 tools**: Claude Code, OpenAI Codex, Gemini CLI, Cursor, Windsurf, OpenCode, Aider, Kilo Code, Augment, and more.

### Layers
1. **SKILL.md** — universal format, all platforms read natively
2. **Claude Code** — `plugin.json` + `marketplace.json`
3. **Codex CLI** — symlink tree + `skills-index.json`
4. **Gemini CLI** — symlinks + `activate_skill()` target
5. **Hermes / Mistral Vibe** — pre-generated skill trees
6. **Other tools** — `scripts/convert.sh` converts to tool-specific formats

---

## 3. Python Tool Patterns (547 scripts, stdlib-only)

### Universal Template
```python
#!/usr/bin/env python3
import argparse, json, sys
def core_logic(input_data) -> dict: ...
def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input"), p.add_argument("--output", choices=["human","json"])
    p.add_argument("--sample", action="store_true")
    ...
```

### Key Patterns
- **CLI-first:** `argparse`, `--help`, `--sample` (demo mode), `--output json`/`human`
- **Deterministic pure functions:** no side effects, no LLM calls, no randomness
- **JSON persistence:** `~/.skillname_sessions/` for stateful workflows
- **Exit codes:** 0=success, 1=arg error, 2=runtime error
- **Dual output:** both human-readable and `--output json`
- **Zero external dependencies:** only Python stdlib (re, json, csv, pathlib, datetime, urllib)

### Tool Categories
| Category | Examples |
|----------|----------|
| Scorers | aeo_audit.py, decision_matrix_scorer.py |
| Classifiers | risk_classifier.py, source_tier_classifier.py |
| Calculators | burn_rate_calculator.py, error_budget_calculator.py |
| Analyzers | churn_analyzer.py, revenue_forecast_model.py |
| Generators | topic_grouper.py, model_buildvsbuy_calculator.py |
| Trackers | citation_tracker.py, compliance_tracker.py |
| Validators | skill_description_validator.py |

---

## 4. Skill Definition Format (SKILL.md)

### YAML Frontmatter
```yaml
---
name: "seo-audit"
description: When the user wants to audit, review, or diagnose SEO issues on their site...
license: MIT
metadata:
  version: 1.0.0
  category: marketing
---
```

### Body Structure (SKILL-AUTHORING-STANDARD.md, 10 patterns)
1. **Practitioner Voice:** "You are an expert in [domain]."
2. **Context-First:** Check for domain context before asking
3. **Multi-Mode Workflows:** 2-3 natural entry points
4. **Forcing-Question Intake:** One question per turn, with Why I'm asking
5. **Action-Oriented:** Tables, checklists, decision trees
6. **Proactive Triggers:** Surface issues without being asked
7. **Output Artifacts:** Table mapping requests to deliverables
8. **Communication Standard:** Bottom-line first, What+Why+How
9. **Related Skills:** Explicit disambiguation
10. **Portability Notes:** Tool requirements, cross-platform compatibility

---

## 5. Key Design Principles
1. **Skills are products** — each deployable as standalone package
2. **Documentation-driven** — success depends on clear docs
3. **Algorithm over AI** — deterministic analysis (code) vs LLM calls
4. **Template-heavy** — ready-to-use templates users customize
5. **Platform-specific** — specific best practices > generic advice

---

## Key Takeaways
1. Single source of truth (SKILL.md) with adapter layer for 13 tools
2. 547 stdlib-only Python tools — zero dependencies, purely deterministic
3. Algorithm over AI philosophy for tool design
4. Forcing-question intake (Matt Pocock discipline)
5. 11-file contract standardizes skill packaging
6. JSON session persistence for stateful workflows
