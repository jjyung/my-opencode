# 測試計畫：provider-profile.mjs

## 目標

為 `plugins/provider-profile.mjs`（provider profile 切換 plugin/resolver）建立自動化單元測試，
用 Node 內建 `node:test`（零依賴），補上之前 contract 提到「`resolveProfile` 是 pure function 可單元測試」但未實作的部分。

## 受測對象

- `plugins/provider-profile.mjs`（npm 發布來源，為受測主體）
- `.opencode/plugins/provider-profile.mjs`（本地運作副本，兩者必須保持同步，需有同步守衛測試）

公開 API：

| 匯出 | 型態 | 說明 |
|------|------|------|
| `resolveProfile(options)` | default export | 回傳 `{ model, small_model, agent_overrides }` |
| `buildProfileConfig(options)` | named | 回傳完整 config fragment `{ model, small_model, provider?, agent }` |
| `readPluginOptions(configPath)` | named | 從 opencode.json 的 plugin tuple 讀取 options |
| `ProviderProfilePlugin()` | named | runtime hook placeholder，回傳 `{}` |

## 測試案例清單

### T-1：Profile 選擇優先順序（pickProfile）

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| T-1.1 | 無 option、無 `OPENCODE_PROVIDER_PROFILE` | `resolveProfile()` | active profile = `opencode`（預設） |
| T-1.2 | option `{ profile: "openai" }` + env = `copilot` | `resolveProfile({ profile: "openai" })` | option 優先 → `openai` |
| T-1.3 | 無 option + env = `google` | `resolveProfile()` | 採用 env → `google` |
| T-1.4 | option `{ profile: " openai " }`（含空白） | `resolveProfile({ profile: " openai " })` | trim 後 → `openai` |

### T-2：各 profile 的 model 對應（resolveProfile）

| ID | Profile | model | small_model | heavy（4 agents） |
|----|---------|-------|-------------|-------------------|
| T-2.1 | opencode | `opencode-go/deepseek-v4-pro` | `opencode-go/deepseek-v4-flash` | `opencode-go/deepseek-v4-pro` |
| T-2.2 | openai | `openai/gpt-5.6` | `openai/gpt-5.6-luna` | `openai/gpt-5.6` |
| T-2.3 | google | `google/gemini-3.1-pro-preview-customtools` | `google/gemini-3.5-flash` | `google/gemini-3.1-pro-preview-customtools` |
| T-2.4 | copilot | `github-copilot/gpt-5.6-sol` | `github-copilot/gpt-5.6-luna` | `github-copilot/gpt-5.6-sol` |

### T-3：agent_overrides 對應

| ID | GIVEN | THEN |
|----|-------|------|
| T-3.1 | 任意 profile 的 `resolveProfile` | `spec-writer`、`code-reviewer`、`team-lead`、`architect` 皆 = `heavy_model` |
| T-3.2 | 任意 profile 的 `resolveProfile` | `verifier` = `small_model` |

### T-4：buildProfileConfig 輸出結構

| ID | Profile | THEN |
|----|---------|------|
| T-4.1 | opencode | 無 `provider` key；`agent` 含 5 個 overridden agents |
| T-4.2 | google | 無 `provider` key（無 reasoning 設定） |
| T-4.3 | openai | 有 `provider.openai.models["gpt-5.6-luna"]` |
| T-4.4 | copilot | 有 `provider.github-copilot.models["gpt-5.6-luna"]` |

### T-5：reasoning effort variants 結構

| ID | THEN |
|----|------|
| T-5.1 | openai 的 luna variants 含 `high` / `medium` / `low`，各對應 `{ reasoningEffort: <同名> }` |
| T-5.2 | openai 的 luna `options.reasoningEffort` = `low`（預設） |
| T-5.3 | copilot 的 luna variants 結構同 openai |
| T-5.4 | 無 `default_effort` 時，`options` 不存在（或無 reasoning 時整段 provider 不存在） |

### T-6：錯誤處理

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| T-6.1 | 未知 profile | `resolveProfile({ profile: "bogus" })` | 拋錯，訊息含 `"Must be one of: opencode, openai, google, copilot"` |

### T-7：readPluginOptions

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| T-7.1 | 暫存 config 含 tuple plugin `[".../provider-profile.mjs", { "profile": "google" }]` | `readPluginOptions(tmpPath)` | 回傳 `{ profile: "google" }` |
| T-7.2 | 暫存 config 無 provider-profile plugin | `readPluginOptions(tmpPath)` | 回傳 `{}` |
| T-7.3 | 暫存 config 為非法 JSON | `readPluginOptions(tmpPath)` | 回傳 `{}`（不拋錯） |
| T-7.4 | configPath 不存在 | `readPluginOptions(missingPath)` | 回傳 `{}`（不拋錯） |

### T-8：ProviderProfilePlugin placeholder

| ID | THEN |
|----|------|
| T-8.1 | `ProviderProfilePlugin()` 回傳 `{}` |

### T-9：來源同步守衛

| ID | THEN |
|----|------|
| T-9.1 | `plugins/provider-profile.mjs` 與 `.opencode/plugins/provider-profile.mjs` 內容完全一致 |

## Out of Scope（明確排除）

- ❌ 真實 opencode 啟動與 config 載入（需 opencode binary + 已登入 provider）
- ❌ `variant_cycle` 快捷鍵在 TUI 的實際行為
- ❌ `reasoningEffort` 是否被 GitHub Copilot / OpenAI API 接受（需 live API call）
- ❌ `moc` launcher 的快取/轉發整合測試（那是另一個測試目標）

## 執行方式

```bash
npm test
# 等價於 node --test test/
```
