# Changelog

Todas as mudanças notáveis deste Power serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Este Power utiliza versionamento de 1 nível (inteiro incremental).

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
