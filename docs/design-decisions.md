# Design Decisions — opencode 生態的取捨

本文件記錄針對 opencode 生態做 skill/agent 設計時的關鍵取捨。

---

## D1. Skill 範圍與粒度

**決定：** 參考 wshobson-agents 的單一職責原則，一個 skill 只做一件事。

- `dev-flow` 只管開發流程（plan→code→verify），不包含測試生成（那是 `test-gen`）
- `pr-review` 只管 PR 審查
- 如果一個 skill 的 description 包含 "and" → 考慮拆分

**理由：** 模組化程度高 → 可組合性強 → 使用者只載入需要的 context。

---

## D2. Pipeline 架構

**決定：** Evidence-first 分層流程，保留 ADR + persistent contracts，但在需求之前加入 Design Evidence Pack。

```
[ADR] → Evidence → Business Requirements → Technical Design → Role Contracts → Code → Verify → Fix (loop)
```

- Phase 0 (optional): Architecture Decision Record (why)
- Phase 1: Design Evidence (what is visible, with source and confidence)
- Phase 2: Business Requirements (what the business must do)
- Phase 3: Technical Design (how the system provides it)
- Phase 4: Role Contracts and sliced implementation
- Phase 5: Verify against business, visual, API/data, security/operations, and mechanical criteria

**改變歷程：** 最初參考 oh-my-claudecode 做 `plan → code → verify`，後改為 contract-first，再加入 Design Evidence Pack。核心 insight：視覺輸入不能直接成為需求或技術決策，必須先保留來源、信心與未知事項。

**不採用** oh-my-claudecode 的 8 種模式，專注於一個紮實的預設流程。

---

## D3. 持久 Contract + 輕量 Handoff

**決定：** 雙層 artifact 系統 — 持久 contract + 輕量 handoff。

```
持久（committed）    臨時（gitignored）
docs/adr/            .handoffs/<session>/code.md
docs/specs/<feature>/ .handoffs/<session>/verify.md
```

- **Contract** (`docs/specs/`, `docs/adr/`): 持久、提交到 git、跨 session 有效、前後端共享
- **Handoff** (`.handoffs/`): 臨時、僅傳遞實作筆記、不複製 contract 內容、可安全刪除

**改變歷程：** 最初採用純 handoff 機制（plan.md → code.md → verify.md），但發現 handoff 被刪除後設計脈絡即丟失。引入 contract 作為持久層，handoff 降級為輕量參考。

**不採用** 純 context-based 或純 handoff-based，因為兩者都無法滿足平行開發和歷史追溯的需求。

---

## D4. Model Routing

**決定：** 在 agent 定義中設定預設 model，但開放在 opencode.json 中覆寫。

```yaml
# agent 預設
model: sonnet # 或 opus, haiku, inherit
```

```json
// opencode.json 覆寫
{
  "agents": {
    "system-designer": { "model": "anthropic/claude-opus-4-5" }
  }
}
```

**解析優先序：** CLI flag > opencode.json per-agent > agent default

---

## D5. 工具權限

**決定：** 每個 agent 明確定義工具權限（參考 everything-claude-code 的 opencode.json pattern）。

```json
{
  "agents": {
    "system-designer": {
      "tools": { "read": true, "bash": true, "write": true, "edit": true }
    }
  }
}
```

**權限配置邏輯：**

| Agent | 寫入範圍 | 說明 |
|-------|----------|------|
| design-evidence | `docs/specs/<feature>/evidence-pack.md` | 寫有來源的設計證據 |
| business-analyst | `docs/specs/<feature>/business-requirements.md` | 寫 SA 業務契約 |
| system-designer | `docs/specs/<feature>/technical-design.md` | 寫 SD 技術契約 |
| frontend-dev / backend-dev | 任意 | 寫各自 implementation slice |
| architect | `docs/adr/` | 寫 ADR |
| verifier | 不寫入 | 唯讀 + bash 執行測試 |
| code-reviewer | 不寫入 | 唯讀審查 |

**開放路線：**

- 第一個版本全部開放（不限制 tool）
- 後續版本逐步收緊權限
- 在 SKILL.md 的 frontmatter 宣告建議的工具集

---

## D6. Progressive Disclosure 深度

**決定：** 採用三層 progressive disclosure（參考 second-brain-skills）。

| Level      | 檔案                   | 最大大小      |
| ---------- | ---------------------- | ------------- |
| Metadata   | `name` + `description` | ~100 words    |
| Body       | `SKILL.md`             | 200-300 lines |
| References | `references/*.md`      | 無限制        |

**不採用** 四層或五層，維持簡單。

---

## D7. 腳本語言與依賴

**決定：** 參考 claude-skills 的 stdlib-only Python（適用於 `scripts/` 中的工具）。

- 工具腳本使用 Python 3 stdlib 為主
- 如有需要可用 `uv run` + PEP 723（參考 second-brain-skills pattern）
- 避免 npm/pip 全域依賴

**理由：** 零安裝成本，跨平台，可測試。

---

## D8. 與 opencode 既有機制的關係

| 機制            | 我們的用法            | 說明                               |
| --------------- | --------------------- | ---------------------------------- |
| `opencode.json` | Agent/model/tool 設定 | 參考 ECC 的 opencode.json pattern  |
| `SKILL.md`      | Skill 定義            | 標準格式，加上 frontmatter trigger |
| Subagent        | Agent 實作            | 單一職責 agent                     |
| Permission      | 工具權限控制          | 從寬到嚴逐步收緊                   |
| MCP             | 外部工具整合          | 後期考慮                           |

---

## D9. 測試策略

**決定：** 每個 skill 附帶測試場景（eval set）。

- 參考 wshobson-agents 的 `make validate` + `make test` (386 tests)
- 參考 claude-code-research 的 plugin-eval 三層評估框架
- 至少包含：結構驗證 + 一個真實案例測試

---

## D10. 命名慣例

| 項目             | 慣例       | 範例                    |
| ---------------- | ---------- | ----------------------- |
| Skill 目錄       | kebab-case | `dev-flow`, `pr-review` |
| Agent 檔案       | kebab-case | `frontend-dev.md`       |
| SKILL.md         | 固定名稱   | `SKILL.md`              |
| Frontmatter name | kebab-case | `name: dev-flow`        |

---

## D11. 版本策略

**決定：** 不對 skill 做獨立版本管理。

- 整個 repo 一個版本號（Git tag）
- Skill 之間的相容性靠 convention（不引用其他 skill 的內部結構）
- 破壞性變更透過 changelog 通知

**理由：** 獨立版本管理帶來巨大的維護開銷（wshobson-agents 有 83 plugins 各自版本）。

---

## D12. 文件語言

**決定：** README 和設計文件使用中文（目標使用者為中文開發者），程式碼註釋和 SKILL.md 使用英文（LLM 最佳化）。

**理由：**

- SKILL.md 餵給 LLM → 英文效果最好
- 專案文件給人看 → 中文降低 barrier

---

## D13. Contract 與 Handoff 的界線

**決定：** Contract 是「團隊共識」，Handoff 是「跨 agent 的 session 內傳遞」。

| 維度 | Contract | Handoff |
|------|----------|---------|
| 生命週期 | 永久（committed） | 暫時（gitignored） |
| 讀者 | 所有開發者（當前與未來） | 下一個階段的 agent |
| 內容 | WHY + WHAT（需求、AC、API、資料模型） | HOW（實作筆記、變更摘要） |
| 變更流程 | Review → commit → code | Write → read → discard |
| 平行開發 | 前後端可參考同一份實作 | 不支援 |

**關鍵原則：** 如果一份文件在 feature 完成後還有價值 → 放 `docs/`（contract）。如果只對當前 session 有用 → 放 `.handoffs/`。

---

## D14. Evidence-First Role Allocation

**決定：** 將設計輸入、業務語意、技術契約、角色實作與驗證分成明確 owner。

```text
Design Evidence → SA → SD → Frontend / Backend → Review → QA / Verify
```

- `design-evidence` 只記錄 observed / inferred / unknown，不做業務或 API 決策。
- `business-analyst` 定義 actor、use case、business rule、state 與 acceptance intent。
- `system-designer` 定義 system boundary、API、資料、安全與 operational constraints。
- `frontend-dev` 與 `backend-dev` 從同一份 Technical Design 產生可平行 review 的 slices。
- `verifier` 驗證 Business、Visual/Interaction、API/Data、Security/Operations 與 lint/typecheck/test/build。

每個 feature 使用 `EVID-*`、`BR-*`、`BUS-*`、`API-*`、`DATA-*`、`AC-*`、`VER-*` 互相追蹤。長期有效的 evidence、契約、traceability 與 verification report 放在 `docs/specs/<feature>/`。
