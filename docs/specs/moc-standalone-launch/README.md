# 測試計畫：moc profile 啟動時自動加 `--standalone`

## 背景

`opencode run` / TUI 預設會連到背景常駐的 service。若該 service 是在沒有 profile 環境變數時啟動，之後 `moc <profile>` 注入的 `OPENCODE_PROVIDER_PROFILE` / `OPENCODE_CONFIG_CONTENT` 不會生效。改為 profile 啟動時自動加上 `--standalone`，讓 opencode 使用私有 server，profile 每次都會生效。

## 規則

| 情境 | 行為 |
|------|------|
| `moc <profile> [args]`（含 `moc` 無參數，預設 profile = opencode） | 呼叫 `opencode --standalone [args]` |
| 使用者 args 已含 `--standalone` | 不重複加入 |
| 無 profile 的 passthrough（如 `moc --version`） | 不加入，行為與原來相同 |
| `moc doctor` / `moc print-config` | 不啟動 opencode |

## 受測對象

- `bin/moc`（POSIX shell launcher）
- `bin/moc.js`（跨平台 Node launcher）

兩者行為必須一致。測試使用暫存目錄與假的 `opencode` 可執行檔（記錄 argv 與環境變數），不需要真實 opencode 或 API key。

## 測試案例清單

### L-1：profile 啟動加上 `--standalone`（sh launcher）

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| L-1.1 | 暫存目錄含 profile plugin 與 config | `sh bin/moc anthropic run hi` | 假 opencode 的 argv = `--standalone run hi`；`OPENCODE_PROVIDER_PROFILE` = `anthropic`；`OPENCODE_CONFIG_CONTENT` 非空 |
| L-1.2 | 同上 | `sh bin/moc`（無參數） | 假 opencode argv 第一個為 `--standalone`；profile = `opencode` |
| L-1.3 | 同上 | `sh bin/moc openai run "x" --standalone` | argv 不重複，`--standalone` 只出現一次 |

### L-2：passthrough 不加 `--standalone`（sh launcher）

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| L-2.1 | 同上 | `sh bin/moc --version` | argv = `--version`；無 `OPENCODE_PROVIDER_PROFILE` |

### L-3：doctor / print-config 不啟動 opencode（sh launcher）

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| L-3.1 | 同上 | `sh bin/moc print-config anthropic` | stdout 為 JSON 並含 `anthropic/claude-haiku-5-5#max`；假 opencode 未被呼叫 |

### L-4：同上行為於 Node launcher（`bin/moc.js`）

| ID | GIVEN | WHEN | THEN |
|----|-------|------|------|
| L-4.1 | 同 L-1.1 | `node bin/moc.js anthropic run hi` | argv = `--standalone run hi`；profile/config 環境變數正確 |
| L-4.2 | 同 L-1.2 | `node bin/moc.js` | argv 第一個為 `--standalone` |
| L-4.3 | 同 L-1.3 | `node bin/moc.js openai run "x" --standalone` | argv 不重複 |
| L-4.4 | 同 L-2.1 | `node bin/moc.js --version` | argv = `--version`；無 profile env |
| L-4.5 | 同 L-3.1 | `node bin/moc.js print-config anthropic` | stdout 為 JSON；假 opencode 未被呼叫 |

## Out of Scope（明確排除）

- ❌ 真實 opencode 啟動與 API 呼叫（需登入 provider，屬於手動驗證）
- ❌ 互動式 TUI 的實際畫面（以 `script` 手動確認 `--standalone` 不報參數錯誤即可）
- ❌ Windows 上的 `sh` launcher（`bin/moc` 本身僅支援 POSIX；Windows 測試會 skip）
- ❌ `--standalone` 的效能影響與 session 共享行為（另行觀察）

## 執行方式

```bash
npm test
# 等價於 node --test test/*.test.mjs
```
