# Kiro Powers — SDS/TRE-PR

Repositório de **Kiro Powers** desenvolvidos pela Seção de Desenvolvimento de Sistemas (SDS) do Tribunal Regional Eleitoral do Paraná (TRE-PR).

Um Power é uma integração empacotada que combina documentação, configuração de MCP server e arquivos de suporte (certificados, steering files) para estender o ambiente de desenvolvimento Kiro com capacidades de serviços externos.

## Powers Disponíveis

| Power | Descrição |
|-------|-----------|
| [gitlab-trepr](powers/gitlab-trepr/POWER.md) | Integração com o GitLab interno do TRE-PR (`gitlab.tre-pr.jus.br`) — gerenciamento de projetos, merge requests, issues, pipelines de CI/CD, wiki, releases, milestones e mais |

## Pré-requisitos

- **Node.js 22+** — necessário para a flag `--use-system-ca` (confia nos certificados do Windows Certificate Store)
- **npx** — utilizado para executar pacotes MCP server sem instalação global
- **Certificado da CA interna** do TRE-PR instalado no Windows (normalmente distribuído via GPO)

### Verificação rápida

```powershell
node --version        # deve ser v22.x ou superior
npx --version         # deve estar disponível
certutil -store Root "ACRAIZ"   # verifica certificado da CA interna
```

## Estrutura do Repositório

```
kiro-powers/
├── powers/
│   └── gitlab-trepr/        # Power de integração com GitLab
│       ├── POWER.md         # Documentação completa do Power
│       ├── mcp.json         # Configuração do MCP server
│       ├── tre-root-v3.crt  # Certificado da CA raiz interna (PEM)
│       └── skills/
│           └── gitlab-operator/SKILL.md  # Skill de referência para uso do Power
├── .kiro/
│   ├── hooks/               # Hooks do agente (validação de idioma, sync de docs)
│   ├── skills/              # Skills do agente (doc-writer, git-operator)
│   └── steering/            # Steering files para orientação do agente
├── CONTRIBUTING.md          # Guia de contribuição e fluxo Git
├── README.md                # Este arquivo
├── LICENSE                  # Apache License 2.0
└── NOTICE                   # Aviso de copyright
```

## Instalação

1. Abra o painel de **Powers** no Kiro
2. Selecione o Power desejado para instalação
3. Na primeira conexão, o navegador abrirá para autenticação OAuth2 com o GitLab

Para detalhes de configuração e troubleshooting, consulte a documentação de cada Power (ex: [GitLab TRE-PR](powers/gitlab-trepr/POWER.md)).

## Contribuindo

Consulte o [CONTRIBUTING.md](CONTRIBUTING.md) para informações sobre o fluxo de trabalho Git (semi-linear com merge commits) e boas práticas para manter o histórico limpo.

## Licença

Este projeto está licenciado sob a [Apache License 2.0](LICENSE).

Copyright 2024 Tribunal Regional Eleitoral do Paraná — veja o arquivo [NOTICE](NOTICE) para detalhes.
