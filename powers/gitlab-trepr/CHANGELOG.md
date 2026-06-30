# Changelog

Todas as mudanças notáveis deste Power serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Este Power utiliza versionamento de 1 nível (inteiro incremental).

## [2] — 2026-06-30

### Adicionado

- Agent `git-operator` (model: Haiku) — operações Git mecânicas com escalação automática
- Agent `git-resolver` (model: auto) — resolução de conflitos, preparação de MR, análise de diff
- Estratégias de resolução de conflitos por tipo de arquivo (pom.xml, Java, config)
- Mecanismo de escalação automática entre agents (git-operator → git-resolver)
- Diretório `agents/` no power para distribuição dos custom agents

### Alterado

- Skill `git-operator` refatorada para dispatcher/router leve (ativa por keywords, roteia entre agents)
- Documentação (`POWER.md`) atualizada com arquitetura hierárquica de 3 componentes
- Onboarding (Step 1) expandido para incluir ambos os agents na instalação

## [1] — 2025-06-30

### Adicionado

- Integração com GitLab TRE-PR via MCP server (`@zereight/mcp-gitlab`)
- Autenticação OAuth2 Authorization Code Flow (browser-based)
- Suporte a SSL com CA interna via `--use-system-ca` (Node.js 22+)
- Certificado `tre-root-v3.crt` incluso para instalação manual
- Skill `gitlab-operator` — referência de uso do Power pelo agente
- Skill `git-operator` — workflow Git semi-linear com Conventional Commits
- Steering `commit-issue-traceability` — rastreabilidade commit-issue obrigatória
- Hook `enforce-commit-issue-link` — intercepta commits para garantir vínculo com issue
- Documentação completa em pt-BR (`POWER.md`)
