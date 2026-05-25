# Plugins

opencode plugin 是透過 `opencode.json` 的 `plugin` 區塊註冊的 npm 或本地封裝，可包含自訂 tool、MCP 整合、或額外的 subagent 類型。

## 現狀

本目錄保留給未來擴充。目前所有功能透過 skill + agent 實現，無需 plugin。

## 何時需要 Plugin

- 需要封裝自訂 tool 給多個專案共用
- 需要透過 MCP 串接外部 API
- 需要 hook opencode 的生命週期事件

## 開發參考

- [opencode 官方文件 — Plugins](https://opencode.ai/plugins)
- 範本可參考 `templates/plugin-template/`
