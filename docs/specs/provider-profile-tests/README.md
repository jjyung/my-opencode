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
| T-1.3 | 無 option + env = `anthropic` | `resolveProfile()` | 採用 env → `anthropic` |
| T-1.4 | option `{ profile: " openai " }`（含空白） | `resolveProfile({ profile: " openai " })` | trim 後 → `openai` |

### T-2：各 profile 的 model 對應（resolveProfile）

| ID | Profile | model | small_model | heavy（4 agents） |
|----|---------|-------|-------------|-------------------|
| T-2.1 | opencode | `opencode-go/gpt-6-luna#max` | `opencode-go/deepseek-v4.1-flash#max` | `opencode-go/claude-haiku-5-5#max` |
| T-2.2 | openai | `openai/gpt-6.2-sol#low` | `openai/gpt-6.1-terra#medium` | `openai/gpt-6.2-sol#medium` |
| T-2.3 | ~~google~~ | 已移除（Gemini profile 於 2026-11 移除，見下方「移除紀錄」） |
| T-2.4 | copilot | `github-copilot/claude-haiku-5.5#xhigh` | `github-copilot/gpt-6-luna#max` | `github-copilot/gpt-6.1-sol#medium` |
| T-2.5 | anthropic | `anthropic/claude-haiku-5-5#max` | `anthropic/claude-haiku-5-5#high` | `anthropic/claude-sonnet-5-5#high` |

> `#<variant>` 為 opencode 的 `provider/model#variant` 語法（effort 指定）；anthropic 的 haiku 同時需要 `max` 與 `high`，故以 variant 區分，而非 provider 預設值。

### T-3：agent_overrides 對應

| ID | GIVEN | THEN |
|----|-------|------|
| T-3.1 | 任意 profile 的 `resolveProfile` | `design-evidence`、`business-analyst`、`system-designer`、`code-reviewer`、`team-lead`、`architect` 皆 = `heavy_model`（含 variant） |
| T-3.2 | 任意 profile 的 `resolveProfile` | `verifier` = `small_model`（含 variant） |
| T-3.3 | anthropic | heavy agents = `anthropic/claude-sonnet-5-5#high`（最高） |
| T-3.4 | anthropic | `verifier` = `anthropic/claude-haiku-5-5#high`（最低） |
| T-3.5 | opencode | heavy agents = `opencode-go/claude-haiku-5-5#max`；`verifier` = `opencode-go/deepseek-v4.1-flash#max` |

### T-4：buildProfileConfig 輸出結構

| ID | Profile | THEN |
|----|---------|------|
| T-4.1 | opencode | 有 `provider.opencode-go.models["deepseek-v4.1-flash"]`；`model` = `opencode-go/gpt-6-luna#max`；`agent` 含 7 個 overridden agents |
| T-4.6 | opencode | `provider.opencode-go.models` 不含 `gpt-6-luna` / `claude-haiku-5-5`（其 variant 由 opencode 內建 catalog 提供） |
| T-4.2 | ~~google~~ | 已移除 |
| T-4.3 | openai | 無 `provider` key（variant 由 opencode 內建 catalog 提供）；`model` / `small_model` 含 `#variant`；`agent` 含 7 個 overridden agents |
| T-4.4 | copilot | 無 `provider` key（variant 由 opencode 內建 catalog 提供）；`model` / `small_model` 含 `#variant`；`agent` 含 7 個 overridden agents |
| T-4.5 | anthropic | 無 `provider` key（variant 由 opencode 內建 catalog 提供）；`model` / `small_model` 含 `#variant`；`agent` 含 7 個 overridden agents |

### T-5：reasoning effort variants 結構

| ID | THEN |
|----|------|
| T-5.1 | openai 的 `model` 為 `openai/gpt-6.2-sol#low`，`heavy_model` 為 `openai/gpt-6.2-sol#medium`，`small_model` 為 `openai/gpt-6.1-terra#medium`（variant 皆由 catalog 提供，無 provider 覆寫） |
| T-5.2 | openai 不再引用 `gpt-5.6-luna`；config 中不含 `gpt-5.6` 字樣 |
| T-5.3 | copilot 的 `model` 為 `github-copilot/claude-haiku-5.5#xhigh`，`heavy_model` 為 `github-copilot/gpt-6.1-sol#medium`，`small_model` 為 `github-copilot/gpt-6-luna#max`；config 不含 `gpt-5.6` 字樣 |
| T-5.4 | ~~google~~ | 已移除 |
| T-5.5 | opencode 的 `deepseek-v4.1-flash` variants 含 `low` / `high` / `max`，各對應 `{ reasoningEffort: <同名> }` |
| T-5.6 | opencode 的 `deepseek-v4.1-flash` `options.reasoningEffort` = `max`（預設） |
| T-5.7 | anthropic 的 `model` 為 `anthropic/claude-haiku-5-5#max`，`small_model` 為 `anthropic/claude-haiku-5-5#high`（`#` 後綴即 variant） |
| T-5.8 | ~~無 variant 的 profile（google）~~ | 已移除（現存所有 profile 皆使用 variant） |
| T-5.9 | opencode 的 `small_model` 為 `opencode-go/deepseek-v4.1-flash#max`；team-lead（heavy）為 `opencode-go/claude-haiku-5-5#max`；不再引用已下架的 `opencode-go/deepseek-v4-flash` |

### T-6：錯誤處理

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| T-6.1 | 未知 profile | `resolveProfile({ profile: "bogus" })` | 拋錯，訊息含 `"Must be one of: opencode, openai, copilot, anthropic"` |

### T-7：readPluginOptions

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| T-7.1 | 暫存 config 含 tuple plugin `[".../provider-profile.mjs", { "profile": "openai" }]` | `readPluginOptions(tmpPath)` | 回傳 `{ profile: "openai" }` |
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

### T-10：plugin 路徑解析（opencode.json）

opencode 會把 `plugins/x.mjs` 這種普通相對路徑當成 npm 套件規格（會去執行 `git`/`npm install`，失敗時出現 `Plugin failed to load`）。
本地檔案必須寫成 `./plugins/x.mjs`，其路徑相對於**設定檔所在目錄**（即 `.opencode/`）。

| ID | GIVEN | THEN |
|----|-------|------|
| T-10.1 | 根目錄 `opencode.json` 的 `plugin` 陣列 | 含 `./plugins/provider-profile.mjs`，且不含不以 `./` 開頭的 `plugins/...` 路徑 |
| T-10.2 | `.opencode/opencode.json` 的 `plugin` 陣列 | 與根目錄 `opencode.json` 完全相同（mirror 一致） |
| T-10.3 | 以 `.opencode/opencode.json` 為基準解析 `./plugins/provider-profile.mjs` | 解析結果 `.opencode/plugins/provider-profile.mjs` 存在 |

（發現紀錄：2026-11-18，lighthouse 專案 `plugins/provider-profile.mjs` 載入失敗，ref `err_ccd4bf54`。）

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

## 移除紀錄

- **2026-11-18**：移除 `google` profile（Gemini）。原因：目前 opencode 的 Google API 金鑰回報 `API key not valid`，無法使用。
  - 受影響案例：T-1.3（改用 anthropic）、T-2.3、T-4.2、T-5.4、T-5.8（已移除）、T-6.1（訊息更新）、T-7.1（改用 openai）。
  - 同步移除：`bin/moc`、`bin/moc.js`、`bin/cli.js` 說明、`scripts/validate-role-flow.mjs`（改用 openai 驗證）、README 與 plugins/README。
  - 歷史 spec（`docs/specs/google-profile-model-refresh/` 等）保留為決策紀錄，不改寫。
