# Project Structure

```
kiro-powers/
├── .kiro/
│   ├── hooks/             # Agent hooks (preToolUse, fileEdited triggers)
│   ├── skills/            # Agent skills (doc-writer, git-operator)
│   └── steering/          # Steering files for AI agent guidance
├── powers/
│   └── <power-name>/      # One directory per Power
│       ├── POWER.md       # Documentation, onboarding, troubleshooting
│       ├── mcp.json       # MCP server configuration
│       ├── skills/        # Reference skills distributed with the power (optional)
│       ├── steering/      # Steering files distributed with the power (optional)
│       ├── hooks/         # Agent hooks distributed with the power (optional)
│       └── (assets)       # Supporting files (certs, scripts, etc.)
├── CONTRIBUTING.md        # Contribution workflow (pt-BR)
├── README.md              # Project overview for developers (pt-BR)
├── LICENSE                # Apache License 2.0
├── NOTICE                 # Copyright notice
├── .gitattributes         # Line-ending and binary rules
├── .gitignore             # Standard ignores
└── .kiroignore            # Files hidden from AI context
```

## Conventions

### Power Directory Layout

Each power lives in `powers/<power-name>/` and must contain:

| File | Required | Purpose |
|------|----------|---------|
| `POWER.md` | Yes | Full documentation with front-matter metadata (name, displayName, description, keywords, author) |
| `mcp.json` | Yes | MCP server definition following Kiro's `mcpServers` schema |
| `skills/<skill-name>/SKILL.md` | No | Reference skill distributed with the power for consumers to copy into their workspace |
| `steering/<rule-name>.md` | No | Steering files distributed with the power for consumers to copy into their `.kiro/steering/` directory |
| `hooks/<hook-name>.kiro.hook` | No | Agent hooks distributed with the power for consumers to copy into their `.kiro/hooks/` directory |
| Additional assets | No | Certificates, scripts, or other supporting files |

### Naming

- Power directory names use **kebab-case** (e.g., `gitlab-trepr`)
- Front-matter `name` in POWER.md must match the directory name

### Documentation Language

- All Power documentation (`POWER.md`) is written in **Brazilian Portuguese** (pt-BR), matching the TRE-PR organizational language
- Steering files under `.kiro/steering/` are written in **English**

### Git Attributes

- Text files enforce `eol=lf`
- Certificates (`.key`, `.p12`, etc.) and binary assets are marked `binary`
