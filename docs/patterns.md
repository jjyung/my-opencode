# Cross-Repo Patterns — 可複用模式萃取

從 6 個參考 repo 中萃取出跨專案一致的模式，作為本專案 skill/agent 設計的理論基礎。

---

## P1. Progressive Disclosure（漸進式揭露）

所有大型 repo 一致採用，是**最重要的模式**。

| Level | 內容 | Context 成本 | 載入時機 |
|-------|------|-------------|----------|
| 1: Metadata | `name` + `description` (~100 words) | 永遠在 context | 啟動時 |
| 2: Body | SKILL.md 主體 (<5KB) | 中等 | 被觸發時 |
| 3: References | `references/` 詳細文件 | 按需 | SKILL.md 指示時 |
| 4: Scripts | `scripts/` 可執行程式碼 | 零（不進 context） | 被呼叫時 |
| 5: Assets | `assets/` 範本/設定 | 零（不進 context） | 被複製時 |

**實作要點：**
- SKILL.md 保持在 200-500 行，超出則拆分到 `references/`
- SKILL.md 中明確寫出何時該讀哪個 reference 檔案
- `scripts/` 中的工具不進 context，直接執行
- `references/` 只一層深度，不要巢狀

**來源：** everything-claude-code (capability surface selection), second-brain-skills (core philosophy), wshobson-agents (AGENTS.md → docs → skills → references chain)

---

## P2. Trigger-Phrase Convention（觸發詞慣例）

Agent 和 skill 的 `description` 必須包含明確的觸發詞，讓 LLM 自行判斷何時啟動。

**標準觸發詞：**
- `Use when ...`
- `Use PROACTIVELY when ...`
- `Use this skill when ...`
- `Trigger when ...`
- `Auto-loads when ...`

**來源：** wshobson-agents (MISSING_TRIGGER lint), everything-claude-code (When to Activate 章節), second-brain-skills (TRIGGERS 段落)

---

## P3. Single Source of Truth + Generated Artifacts

只在一個地方編寫內容，其他平台的設定由 generator 自動產生。

```
plugins/          ← EDIT THESE (canonical markdown)
.codex/           ← GENERATED (gitignored)
.opencode/        ← GENERATED (gitignored)
.cursor/          ← GENERATED (gitignored)
```

**來源：** wshobson-agents (adapter framework), claude-skills (sync scripts)

**對 opencode 的意義：** opencode 本身就是一個 harness，無需跨平台產生。但同樣適用「只維護 canonical SKILL.md，不手動編輯 generated config」。

---

## P4. Skill Composition via File-Based Handoff

Agent 之間不靠 context 傳遞狀態，而是透過檔案。

**oh-my-claudecode 的 handoff 模式：**
```
team-plan → 寫 .omc/handoffs/plan.md → team-prd 讀取
team-prd → 寫 .omc/handoffs/prd.md → team-exec 讀取
```

**wshobson-agents 的 command 模式：**
```
Step 1: 寫 .feature/requirements.md
Step 2: 讀 .feature/requirements.md → 產 plan
Step 3: 讀 plan → 執行
```

**優點：** context window 不被歷史污染、可跨 session、可 debug

---

## P5. Model Tier Routing（模型分層路由）

根據任務複雜度分配不同模型：

| Tier | 適用場景 | 代表模型 |
|------|----------|----------|
| LOW / Haiku | 瀏覽、樣式檢查、文件查詢 | claude-3-haiku, gemini-2.0-flash |
| MEDIUM / Sonnet | 標準實作、除錯、審查 | claude-3.5-sonnet, gemini-2.5-flash |
| HIGH / Opus | 架構設計、安全審查、複雜重構 | claude-opus-4, gemini-2.5-pro |

**解析優先序：** CLI flag > env var > plugin config > agent default

**來源：** everything-claude-code (architect→opus, reviewer→sonnet), oh-my-claudecode (three-tier routing), wshobson-agents (54 opus / 62 sonnet / 20 haiku)

---

## P6. Parallel Agent Orchestration

所有複雜任務都應該平行執行獨立子任務。

**關鍵技巧：** 在 skill 描述中明確說「Launch these agents concurrently in a single message」。

**oh-my-claudecode 的 Ultrawork：** 最大平行度，fire all independent tasks simultaneously。

**everything-claude-code 的 deep-research：** Launch 3 research agents in parallel。

---

## P7. Tool Restriction by Agent Role

根據 agent 角色嚴格限制可用工具：

| Agent Role | Allowed Tools | 理由 |
|------------|---------------|------|
| Planner | Read, Grep, Glob, Bash | 只能讀不能寫 |
| Architect | Read, Grep, Glob | 唯讀 |
| Executor | Read, Write, Edit, Bash, Glob | 讀寫 |
| Reviewer | Read, Grep, Glob | 唯讀 |
| Security Reviewer | Read, Grep, Glob | 唯讀 |

**最小權限原則：** `allowedTools: ['Bash']` → 太寬；`allowedTools: ['Bash(mkdir:*)']` → 精確。

**來源：** claude-code-research (minimal allowedTools pattern), everything-claude-code (opencode.json per-agent tools)

---

## P8. Multi-Stage Pipeline with Explicit Phase Contracts

將開發流程拆成明確階段，每個階段有清楚的輸入/輸出合約。

```
plan → code → review → verify → fix (loop)
```

**每個階段的合約（oh-my-claudecode 的 handoff 文件）：**
- 需要哪些 agent
- 輸入是什麼（前一階段的產出）
- 輸出是什麼（handoff document）
- 成功/失敗條件
- 重試次數限制

---

## P9. Skill-First Architecture

能力優先以 skill 實現，command 只是技能呼叫的快捷方式。

- `skills/` 是 canonical
- `commands/` 是 legacy compatibility
- 新功能先進 skill，再考慮是否加 command

**來源：** everything-claude-code (Workflow Surface Policy)

---

## P10. Forcing-Question Intake（強制問答 intake）

在執行複雜工作前，一次只問一個問題，附上「為什麼問」的理由。

```
Q: What is the primary goal of this feature?
Why I'm asking: This determines whether we focus on performance, readability, or functionality.
Recommended answer: ...
```

**來源：** claude-skills (Matt Pocock Grill-With-Docs pattern)

---

## P11. Fail-Closed Security

無法解析的指令 → 問使用者（不是自動允許）。

不確定性本身就是安全訊號。

**來源：** claude-code-research (7-layer security, cannot parse → ask)

---

## P12. Single-Responsibility Skill

每個 skill 只做一件事，做好。

**判斷標準：**
- 如果 SKILL.md 需要「參見其他 skill」才能完成任務 → 範圍太大
- 如果一個 skill 的 description 包含「and」→ 考慮拆分

**來源：** wshobson-agents (155 skills, each focused), claude-skills (330+ skills, one domain per skill)

---

## P13. Error as Model Instruction

工具錯誤不只是給人看的診斷訊息，而是給模型的操作指引。

**好例子：** "Read tool returned 'file not found' — use Grep to locate the file first."

**來源：** claude-code-research (error injection as model feedback)

---

## P14. Context Budget Awareness

明確管理 context window 的使用：

- 保留最後 20% context 給大型操作
- 每 ~50 次 tool call 建議 compaction
- MCP 數量控制在 10 個以下
- Skill 列表只佔 1% context budget

**來源：** everything-claude-code (context-budget skill), claude-code-research (1% skill budget, progressive truncation)
