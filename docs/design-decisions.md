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

**決定：** 參考 oh-my-claudecode 的 pipeline 模式，但簡化為三階段。

```
plan → code → verify → fix (loop)
```

**不採用** oh-my-claudecode 的 8 種模式（Ralph/Autopilot/Ultrawork/Team/UltraQA/Plan/Ralplan/Deep-Interview），而是專注於一個通用流程，讓使用者可以透過組合 skill 自訂模式。

**理由：** opencode 生態處於早期，先提供一個紮實的預設流程，而不是多種模式讓使用者困惑。

---

## D3. Handoff 機制

**決定：** 採用 file-based handoff（參考 oh-my-claudecode 和 wshobson-agents）。

```
.handoffs/<session>/plan.md → .handoffs/<session>/code.md → .handoffs/<session>/verify.md
```

**不採用** 純 context-based（agent 直接在 prompt 中傳遞前一階段結果）。

**理由：** file-based handoff 可跨 session、可除錯、避免 context 污染。開銷低（寫幾個 markdown 檔案）。

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
    "planner": { "model": "anthropic/claude-opus-4-5" }
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
    "planner": {
      "tools": { "read": true, "bash": true, "write": false, "edit": false }
    }
  }
}
```

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
| Agent 檔案       | kebab-case | `fullstack-dev.md`      |
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
