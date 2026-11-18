# Plugins

opencode plugin 是透過 `opencode.json` 的 `plugin` 區塊註冊的 npm 或本地封裝，可包含自訂 tool、MCP 整合、或額外的 subagent 類型。

## 目前包含

### `provider-profile.mjs`

零依賴 ESM plugin / resolver，用來切換本 repo 的模型 profile。

- 預設 profile：`opencode`
- 支援：`opencode`、`openai`、`copilot`、`anthropic`
- 讀取：`OPENCODE_PROVIDER_PROFILE`
- 可透過 plugin tuple options 覆寫：`["plugins/provider-profile.mjs", { "profile": "openai" }]`

| Profile | Primary / heavy | Small / verifier |
|---------|------------------|------------------|
| `opencode` | model：`opencode-go/gpt-6-luna#max`；heavy：`opencode-go/claude-haiku-5-5#max` | `opencode-go/deepseek-v4.1-flash#max` |
| `openai` | heavy：`openai/gpt-6.2-sol#medium`；model：`openai/gpt-6.2-sol#low` | `openai/gpt-6.1-terra#medium` |
| `copilot` | heavy：`github-copilot/gpt-6.1-sol#medium`；model：`github-copilot/claude-haiku-5.5#xhigh` | `github-copilot/gpt-6-luna#max` |
| `anthropic` | heavy：`anthropic/claude-sonnet-5-5#high`；default：`anthropic/claude-haiku-5-5#max` | `anthropic/claude-haiku-5-5#high` |

> 💡 `anthropic` profile 的 `#<variant>` 後綴為 opencode 的 effort 指定語法（`provider/model#variant`），
> 同一顆 haiku 可依 agent 使用不同 effort。variant 由 opencode 內建 model catalog 提供，因此此 profile 不產生 `provider` 覆寫區塊。

> 💡 `opencode` profile 全部使用 `max` effort（variant 皆由 opencode 內建 catalog 提供）：model 用 `gpt-6-luna#max`，heavy 用 `claude-haiku-5-5#max`，small 用 `deepseek-v4.1-flash#max`。
> `deepseek-v4.1-flash` 另有 low / high / max 可在 opencode 內用 `variant_cycle` 快捷鍵循環切換。
>
> 💡 `openai` profile 以 `#variant` 指定 effort（heavy `gpt-6.2-sol#medium`、model `gpt-6.2-sol#low`、small `gpt-6.1-terra#medium`；variant 由 opencode 內建 catalog 提供）。

> 💡 `copilot` profile 以 `#variant` 指定 effort（heavy `gpt-6.1-sol#medium`、model `claude-haiku-5.5#xhigh`、small `gpt-6-luna#max`；variant 由 opencode 內建 catalog 提供）。

### 用法

建議優先使用 `moc`：

```bash
moc
moc openai
moc anthropic --list-agents
```

`moc` 會對四個已知 profile 快取 provider-profile 產生出的 JSON override，位置在 `.opencode/cache/provider-profile/`。快取是否有效由以下條件決定：

- profile 名稱
- `.opencode/plugins/provider-profile.mjs` 的 mtime
- `.opencode/opencode.json` 的 mtime

若三者都沒變，`moc` 會直接重用快取，不再重新執行 `node .opencode/plugins/provider-profile.mjs`。

進階情境可直接設定環境變數：

```bash
OPENCODE_CONFIG_CONTENT="$(node .opencode/plugins/provider-profile.mjs)" opencode

OPENCODE_PROVIDER_PROFILE=openai \
OPENCODE_CONFIG_CONTENT="$(node .opencode/plugins/provider-profile.mjs)" \
opencode
```

直接執行模組時，會輸出可供 `OPENCODE_CONFIG_CONTENT` 使用的 JSON override。

> 備註：目前 OpenCode plugin API 可註冊 runtime hooks / tools，但不會在載入時直接改寫 `opencode.json`；因此這個模組同時扮演 plugin 與 config override generator。

## 何時需要 Plugin

- 需要封裝自訂 tool 給多個專案共用
- 需要透過 MCP 串接外部 API
- 需要 hook opencode 的生命週期事件

## 開發參考

- [opencode 官方文件 — Plugins](https://opencode.ai/plugins)
- 範本可參考 `templates/plugin-template/`
