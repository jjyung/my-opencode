# Feature: `init --force` 覆寫選項

## 背景

目前 `npx my-opencode init` 與 `postinstall` 都是「已存在就跳過」的策略
（`copyFileIfNotExists` / `if (!existsSync)`）。這導致使用者升級套件後，
新版本的 skills / agents / plugins / opencode.json 不會自動套用到既有的
`.opencode/` 目錄。升級需要手動刪除檔案再 re-init，不直覺。

## Requirements

- FR-1: `npx my-opencode init` 的預設行為 MUST 保持不變（不覆寫既有檔案）。
- FR-2: `npx my-opencode init --force`（alias `-f`、`--overwrite`）MUST 覆寫
  既有檔案，包括 skills、agents、plugins、opencode.json。
- FR-3: `--force` 與 `target-dir` 參數 MUST 可任意順序混用
  （例如 `init --force ./proj` 與 `init ./proj --force` 皆須有效）。
- FR-4: 無 `--force` 時，MUST 維持「跳過並警告（Skipped, already exists）」訊息。
- FR-5: `help` 與無參數歡迎訊息 SHOULD 說明 `--force` 用法。
- FR-6: `postinstall` 行為 MUST 維持不變（仍為 idempotent、安靜、不覆寫）。

## Acceptance Criteria

- GIVEN `.opencode/` 已存在舊版檔案
  WHEN 執行 `npx my-opencode init --force`
  THEN 所有 skills/agents/plugins/opencode.json 被覆寫為套件最新內容。

- GIVEN `.opencode/` 已存在舊版檔案
  WHEN 執行 `npx my-opencode init`（無 force）
  THEN 檔案保持不變，並輸出 Skipped 警告。

- GIVEN 任意參數順序
  WHEN 執行 `init --force ./my-project` 與 `init ./my-project --force`
  THEN 兩者皆在 `./my-project/.opencode` 覆寫安裝。

## 變更檔案

| 檔案 | 變動 |
|------|------|
| `bin/cli.js` | 新增 `--force`/`-f`/`--overwrite` 參數解析；`cmdInit` 與 `copyDirSync` 支援覆寫 |
| `README.md` | 更新安裝/升級章節，說明 `init --force` |

## Out of Scope

- `postinstall.js` 不變（保持 idempotent）。
- 不變更 `moc` launcher 行為。
