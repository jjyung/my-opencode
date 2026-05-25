# my-opencode

為 [opencode](https://opencode.ai) 生態打造的高品質開發流程 skill 與 agents 集合。

> 參考業界知名 agentic coding repo 的設計哲學，提煉出一套符合 opencode 架構的模組化、可組合的開發技能包。

---

## 靈感來源

| 專案 | Stars | 核心啟發 |
|------|-------|----------|
| [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 170K+ | 超大型 skill 生態系統，40+ skill 模組，跨平台設計 |
| [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | 31K+ | 多 agent 編排模式（Team / Autopilot / Pipeline），plan→prd→exec→verify→fix 流程 |
| [wshobson/agents](https://github.com/wshobson/agents) | 35K+ | 185+ 專用 agent、153 skill、單一職責 plugin 架構 |
| [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | 15K+ | 313+ skill 跨 12 種 AI 編碼工具，零依賴 Python 工具 |
| [coleam00/second-brain-skills](https://github.com/coleam00/second-brain-skills) | 700+ | 漸進式上下文揭露（progressive disclosure）哲學 |
| [coleam00/your-claude-engineer](https://github.com/coleam00/your-claude-engineer) | 125+ | 多 agent 編排 + MCP 工具閘道整合 |
| [cablate/claude-code-research](https://github.com/cablate/claude-code-research) | 130+ | Claude Code 內部機制逆向分析，75 份 deep-dive 報告 |

---

## 本地參考原始碼

`ref/` 下以 `git submodule` 追蹤上述專案的原始碼，方便快速瀏覽、對照設計：

```
ref/
├── everything-claude-code/   → affaan-m/everything-claude-code
├── oh-my-claudecode/         → Yeachan-Heo/oh-my-claudecode
├── wshobson-agents/          → wshobson/agents
├── claude-skills/            → alirezarezvani/claude-skills
├── second-brain-skills/      → coleam00/second-brain-skills
└── claude-code-research/     → cablate/claude-code-research
```

**同步到最新：**
```bash
git submodule update --remote --merge
```

**首次 clone 本專案：**
```bash
git clone --recurse-submodules <repo-url>
# 或事後初始化
git submodule update --init --recursive
```

---

## 目標

1. **提煉通用流程** — 從上述專案中萃取「開發者真正需要的」工作流程模式，轉化為 opencode skill
2. **模組化設計** — 每個 skill 單一職責、可組合、可替換，避免大而全的 monolith
3. **opencode 原生** — 充分利用 opencode 的 skill/subagent/permission/MCP 機制，而非直接移植他廠格式
4. **團隊協作就緒** — 支援 plan → code → review → verify → deploy 的完整開發生命週期

---

## 結構規劃

```
my-opencode/
├── ref/                     # 參考專案（git submodule）
│   ├── everything-claude-code/
│   ├── oh-my-claudecode/
│   ├── wshobson-agents/
│   ├── claude-skills/
│   ├── second-brain-skills/
│   └── claude-code-research/
├── docs/                    # 探索記錄與設計文件
│   ├── references/          # 各 repo 分析筆記（6 份）
│   ├── patterns.md          # 跨 repo 可複用模式
│   └── design-decisions.md  # opencode 生態取捨
├── skills/                  # opencode skill（單一職責）
│   ├── dev-flow/            # [done] 開發流程：plan → code → verify
│   ├── pr-review/           # [done] PR 審查：5 維度分析
│   ├── test-gen/            # [done] 測試生成：框架偵測 + 多語言模式
│   ├── orchestrate/          # [done] 多 agent 編排：分解、平行派送、綜合
│   └── docs-gen/             # [done] 文件生成：註解、API、README、ADR
├── agents/                  # 組合多個 skill 的完整 agent
│   ├── planner.md           # 規劃 agent（唯讀）
│   ├── executor.md          # 實作 agent（讀寫）
│   ├── verifier.md          # 驗證 agent（唯讀+Bash）
│   ├── code-reviewer.md     # 程式碼審查 agent（唯讀）
│   ├── test-engineer.md     # 測試工程師 agent（讀寫）
│   ├── tech-writer.md       # 技術文件 agent（讀寫）
│   ├── fullstack-dev.md     # 全端開發 agent（編排三者）
│   └── team-lead.md         # 技術主管 agent（多 agent 交響樂指揮）
├── opencode.json            # opencode 整合設定：agent + command + skill 註冊
├── plugins/                 # opencode plugin（選擇性擴充）
└── templates/               # skill / agent 專案範本
```

---

## 關鍵設計原則

- **Progressive Disclosure** — 初期只載入必要 context，深入時才揭露細節
- **Single Responsibility** — 每個 skill 只做一件事，做好
- **Model Agnostic** — 不綁定特定模型，支援 opencode 支援的所有 LLM
- **Zero Heavy Dependency** — 盡量使用 stdlib / 現有工具，避免非必要的 npm/pip 依賴
- **可測試** — 每個 skill 附帶測試場景（eval set），可用 opencode eval 驗證

---

## 現狀

- [x] 專案初始化
- [x] ref/ 參考專案 submodule（6 個）
- [x] docs/ 探索紀錄（6 份 notes + patterns.md + design-decisions.md）
- [x] skill: dev-flow（開發流程，含 3 階段參考文件）
- [x] agents: planner, executor, verifier, fullstack-dev, code-reviewer, test-engineer, team-lead
- [x] skill: pr-review（PR 審查，含 5 維度分析 + 安全檢查表）
- [x] skill: test-gen（測試生成，含框架偵測 + 多語言測試模式）
- [x] skill: orchestrate（多 agent 編排）
- [x] skill: docs-gen（文件生成，含多語言註解風格 + ADR/CHANGELOG 範本）
- [x] agent: tech-writer
- [x] opencode.json 整合設定（含 8 個 agent + 6 個 command）
- [ ] plugin: 選擇性擴充

---

## 授權

MIT
