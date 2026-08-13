# Agents 開發約定

本文件記錄 agents 共用的開發約定。個別 agent 的職責與 prompt 定義於 `agents/<name>.md`。

## 測試流程（Test-Plan-First）

補測試時，**必須先寫測試計畫文件，再依文件寫測試**。不要直接跳去寫測試程式碼。

```
寫測試計畫文件 → 依文件寫測試 → 執行驗證（npm test）
     │                  │                │
docs/specs/<name>-tests/  test/*.test.mjs   node --test
```

### Step 1：寫測試計畫文件

位置：`docs/specs/<feature>-tests/README.md`

文件必須先「列出要測什麼」，內容包含：

| 區段 | 說明 |
|------|------|
| 受測對象 | 哪個檔案／哪些公開 API（含 export 型態） |
| 測試案例清單 | 每個案例用 GIVEN / WHEN / THEN（或表格）描述，並給予唯一 ID（如 `T-1.1`） |
| Out of Scope | 明確排除不測的東西（例如需 live 環境、外部 API、TUI 行為） |
| 執行方式 | 如何跑測試（`npm test`） |

### Step 2：依文件寫測試

位置：`test/*.test.mjs`（Node 內建 `node:test`，零依賴，除非專案已有框架）

- 每個測試名稱對應計畫文件的 ID（例如 `T-1.2 option profile takes priority over env`），確保可追溯。
- 只測文件列出的案例；發現新案例先回補文件，再寫測試。
- 測試原則：測行為不測實作、happy path → edge case → error path、快且確定性（無網路/時間依賴）。

### Step 3：執行驗證

```bash
npm test        # 等價 node --test（自動探索 test/ 下的 *.test.mjs）
```

驗證失敗時，先修正程式碼或測試，再重跑；不要用「改測試讓它過」來掩蓋真實問題。

## 適用 Agent

| Agent | 角色 |
|-------|------|
| `test-engineer` | 執行本流程：寫計畫文件 → 寫測試 → 跑測試 |
| `fullstack-dev` | 在 Verify phase 把「有無測試 + 是否依計畫文件」納入驗證 |
| `verifier` | 跑 `npm test`，確認所有案例通過 |

## 範例

- 測試計畫：`docs/specs/provider-profile-tests/README.md`
- 測試實作：`test/provider-profile.test.mjs`
