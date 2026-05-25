# Contributing to my-opencode

## 專案結構

```
my-opencode/
├── skills/       # 單一職責 skill，每目錄含 SKILL.md + references/
├── agents/       # agent prompt，frontmatter 格式
├── plugins/      # opencode plugin（保留）
├── templates/    # 新 skill/agent 建立範本
└── docs/         # 設計文件、ADR、參考筆記
```

所有 skill 與 agent 透過 `opencode.json` 註冊整合。

## 貢獻方式

### 新增 Skill
1. 在 `skills/` 下建立新目錄（kebab-case）
2. 撰寫 `SKILL.md`，遵循 frontmatter 格式
3. 如需參考文件，放在 `references/` 下
4. 在 `opencode.json` 的 `instructions` 中加入路徑

### 新增 Agent
1. 在 `agents/` 下建立 `.md` 檔案
2. 遵循 frontmatter 規格（name, description, model, tools, color）
3. 在 `opencode.json` 的 `agent` 區塊註冊
4. 如需暴露為指令，在 `command` 區塊註冊

### 新增 ADR
當架構決策影響專案方向時，在 `docs/adr/` 新增記錄。
參考 `skills/adr/references/templates.md` 格式。

### 報告問題
- 提供重現步驟
- 附上相關 opencode.json 設定片段
- 標明 opencode 版本

## 規範

| 項目 | 規範 |
|------|------|
| Skill 名稱 | kebab-case，description 不含 "and" |
| Agent 名稱 | kebab-case |
| SKILL.md 內容 | 英文 |
| README / 設計文件 | 中文 |
| ADR 內容 | 英文 |
| Frontmatter | name / description 必填 |
| ref/ 引用 | 可參考，不得依賴內部結構 |

## 驗證

提交前確認：

1. `opencode.json` 所有 agent / command / instruction 參考有效
2. 所有 `.md` frontmatter 格式正確
3. 無殘留除錯內容或機密資訊
4. 目錄結構與 `opencode.json` 一致

快速檢查：
```bash
# 檢查 JSON 語法
python3 -c "import json; json.load(open('opencode.json'))"

# 檢查所有 agent prompt 檔案存在
python3 -c "
import json, os
c = json.load(open('opencode.json'))
for n, a in c.get('agent', {}).items():
    p = a.get('prompt', '')
    if p.startswith('{file:'):
        fp = p[6:-1]
        assert os.path.exists(fp), f'Missing: {fp}'
print('All agent files exist')
for cn, cmd in c.get('command', {}).items():
    agent = cmd.get('agent', '')
    if agent:
        assert agent in c.get('agent', {}), f'Unknown agent: {agent} in command {cn}'
print('All commands valid')
for inst in c.get('instructions', []):
    assert os.path.exists(inst), f'Missing instruction: {inst}')
print('All instructions exist')
"
```

## 授權

本專案採用 MIT License。貢獻即同意以相同授權釋出。
