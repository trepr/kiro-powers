# Implementation Plan: jira-trepr

## Overview

Criação do Power `jira-trepr` seguindo a mesma estrutura do `gitlab-trepr`. Os entregáveis são arquivos de configuração (JSON), documentação (Markdown) e certificado (PEM). A ordem de implementação respeita as dependências entre arquivos: `mcp.json` primeiro (referenciado por todos os outros), depois skill, steering, hook, certificado, e `POWER.md` por último (referencia todos os outros).

## Tasks

- [x] 1. Criar estrutura de diretórios e configuração MCP
  - [x] 1.1 Criar `powers/jira-trepr/mcp.json` com a configuração do MCP server
    - Criar o arquivo JSON com server name `jira`, comando `npx`, args `["-y", "@aashari/mcp-server-atlassian-jira"]`
    - Incluir env vars: `JIRA_URL` (fixo `https://jira.tre-pr.jus.br`), `JIRA_USERNAME` (`${JIRA_USERNAME}`), `JIRA_PASSWORD` (`${JIRA_PASSWORD}`), `NODE_OPTIONS` (`--use-system-ca`)
    - Garantir que credenciais usem referência a variáveis de ambiente, nunca valores literais
    - _Requirements: 1.1, 1.2, 1.3, 11.1, 12.1, 13.1_

- [x] 2. Criar skill de referência
  - [x] 2.1 Criar `powers/jira-trepr/skills/jira-operator/SKILL.md`
    - Escrito em inglês (convenção do repositório para skills)
    - Front-matter YAML com name `jira-operator` e description
    - Seções: Power Activation, Issue Reference Convention (`PROJ-123`), Search Issues (JQL), Create Issues, Update Issues (Transitions/Comments/Assignment), Projects & Boards, Sprints, Worklogs, Error Handling (401, 404, SSL, no tools), Security, Installation
    - Documentar convenções de referência: issues como `PROJ-123`, projetos pelo key
    - Incluir exemplos de JQL queries comuns
    - _Requirements: 10.1, 10.2, 10.3, 4.1, 5.1, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 14.1, 14.2_

- [x] 3. Criar steering file e hook de rastreabilidade
  - [x] 3.1 Criar `powers/jira-trepr/steering/commit-jira-traceability.md`
    - Escrito em inglês (convenção de steering files)
    - Seções: Policy, Workflow (Identify Issue, Create If None, Compose Commit Message, Mapping Types to Labels), Examples, Project Key Resolution, Exceptions
    - Referência de issue usa formato Jira `PROJ-123` (não `#N`)
    - Footer patterns: `Closes: PROJ-123`, `References: PROJ-123`
    - Busca de issues via ferramentas do Power `jira-trepr`
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 3.2 Criar `powers/jira-trepr/hooks/enforce-commit-jira-link.json`
    - Estrutura JSON com `version: "v1"`, array `hooks` com um hook
    - Hook com trigger `PreToolUse`, matcher para bash/pwsh commands
    - Prompt do agente com lógica: detectar `git commit`, verificar presença de issue key (regex `[A-Z][A-Z0-9]+-\d+`), buscar issues atribuídas via JQL, sugerir correspondente, criar se necessário
    - Exceções: commit inicial, merge commits, meta-arquivos
    - Hook desabilitado por padrão (`enabled: false`)
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 4. Checkpoint - Validar estrutura parcial
  - Ensure all files created so far are valid JSON/Markdown, ask the user if questions arise.

- [x] 5. Copiar certificado CA e criar documentação principal
  - [x] 5.1 Copiar `powers/gitlab-trepr/tre-root-v3.crt` para `powers/jira-trepr/tre-root-v3.crt`
    - Cópia idêntica do certificado PEM da CA interna
    - Mesmo conteúdo, disponível para instalação manual
    - _Requirements: 3.1_

  - [x] 5.2 Criar `powers/jira-trepr/POWER.md` com documentação completa em pt-BR
    - Front-matter YAML: name `jira-trepr`, displayName `Jira TRE-PR`, version `1`, description, keywords `["jira", "tre-pr", "issues", "sprint", "kanban", "worklog"]`, author `SDS/TRE-PR`
    - Seção **Overview**: descrição do Power, pacote MCP, versão Jira 7.3.3, REST API v2
    - Seção **Onboarding**: steps de instalação (copiar skill, steering, hook), validação de pré-requisitos (Node.js 22+, npx), mapeamento de cópia dos artefatos
    - Seção **Autenticação Basic Auth**: configuração de `JIRA_USERNAME` e `JIRA_PASSWORD`, menção a API token como alternativa à senha
    - Seção **Workflows Comuns**: busca JQL, criação de issues, transições, boards/sprints, worklogs — com exemplos práticos
    - Seção **Troubleshooting**: erros SSL (Node.js < 22, certificado), 401 (credenciais), 404 (key inválida), server não inicia (npx, env vars)
    - Seção **Best Practices**: convenções de referência a projetos/issues
    - Seção **Referência de Variáveis de Ambiente**: tabela com todas as env vars
    - Seção **Rastreabilidade Commit-Issue**: funcionamento do hook e steering, instalação, exceções
    - Seção **Complementaridade com gitlab-trepr**: GitLab para código, Jira para demandas, tabela comparativa
    - Documentar procedimento de instalação manual do certificado via `certutil -addstore Root`
    - Documentar alternativa `NODE_EXTRA_CA_CERTS` para Node.js < 22
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 4.3, 5.3, 6.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 11.2, 12.2, 12.3, 12.4, 13.2, 13.3_

- [x] 6. Final checkpoint - Validar todos os artefatos
  - Ensure all files are complete and consistent, ask the user if questions arise.

## Notes

- Este repositório não possui build step, compilação ou test suite — a validação é por inspeção dos artefatos
- A ordem de implementação respeita dependências: `mcp.json` → skill → steering/hook → cert → `POWER.md`
- `POWER.md` é o último porque referencia e documenta todos os outros artefatos
- O certificado é cópia idêntica do existente em `gitlab-trepr`
- Todos os arquivos seguem `eol=lf` conforme `.gitattributes`
- Skills e steering files são escritos em inglês; `POWER.md` em pt-BR

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2", "5.1"] },
    { "id": 2, "tasks": ["5.2"] }
  ]
}
```
