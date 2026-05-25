# Templates

快速建立新的 skill 或 agent 的起始範本。

```
templates/
├── README.md                 # 本文件
├── skill-template/
│   └── SKILL.md              # 新 skill 範本
└── agent-template.md         # 新 agent 範本
```

## 用法

```bash
# 複製 skill 範本
cp -r templates/skill-template skills/my-new-skill

# 複製 agent 範本
cp templates/agent-template.md agents/my-new-agent.md
```

記得在 `opencode.json` 的 `agent` / `command` / `instructions` 中註冊。
