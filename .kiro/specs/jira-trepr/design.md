# Design Document: jira-trepr

## Architecture Overview

O Power `jira-trepr` segue a mesma arquitetura do `gitlab-trepr`: um diretório em `powers/jira-trepr/` contendo documentação, configuração MCP, certificado CA, skill de referência, steering file e hook. O MCP server é o pacote Node.js `@aashari/mcp-server-atlassian-jira`, executado via `npx` com autenticação Basic Auth e confiança SSL via `--use-system-ca`.

```
powers/jira-trepr/
├── POWER.md                              # Documentação completa (pt-BR)
├── mcp.json                              # Configuração do MCP server "jira"
├── tre-root-v3.crt                       # Certificado CA interna (PEM)
├── skills/
│   └── jira-operator/
│       └── SKILL.md                      # Skill de referência (inglês)
├── steering/
│   └── commit-jira-traceability.md       # Regra de rastreabilidade (inglês)
└── hooks/
    └── enforce-commit-jira-link.json     # Hook de commit-issue link
```

### Coexistência com gitlab-trepr

Ambos os Powers coexistem no mesmo workspace sem conflito:

| Aspecto | gitlab-trepr | jira-trepr |
|---------|--------------|------------|
| MCP Server name | `gitlab` | `jira` |
| Pacote | `@zereight/mcp-gitlab` | `@aashari/mcp-server-atlassian-jira` |
| Autenticação | OAuth2 (browser) | Basic Auth (env vars) |
| SSL | `--use-system-ca` | `--use-system-ca` |
| Propósito | Código-fonte, CI/CD | Gestão de demandas |

## Components

### 1. mcp.json — Configuração do MCP Server

Define o servidor MCP com nome `jira`, comando `npx`, pacote e variáveis de ambiente.

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@aashari/mcp-server-atlassian-jira"],
      "env": {
        "JIRA_URL": "https://jira.tre-pr.jus.br",
        "JIRA_USERNAME": "${JIRA_USERNAME}",
        "JIRA_PASSWORD": "${JIRA_PASSWORD}",
        "NODE_OPTIONS": "--use-system-ca"
      }
    }
  }
}
```

**Decisões de design:**
- O server name `jira` é distinto de `gitlab` para evitar conflito quando ambos os Powers estão ativos
- `JIRA_URL` usa valor fixo (instância única do TRE-PR) mas pode ser sobrescrito via env var do sistema
- `JIRA_USERNAME` e `JIRA_PASSWORD` usam referência a variáveis de ambiente — nunca valores literais
- `NODE_OPTIONS=--use-system-ca` garante confiança nos certificados do Windows Certificate Store (Node.js 22+)
- O pacote é executado via `npx -y` para instalação automática sem necessidade de instalação global

### 2. POWER.md — Documentação

Arquivo Markdown em português brasileiro com front-matter YAML:

```yaml
---
name: "jira-trepr"
displayName: "Jira TRE-PR"
version: "1"
description: "Integração com o Jira Server interno do TRE-PR para gerenciar issues, projetos, boards, sprints e worklogs através do Model Context Protocol."
keywords: ["jira", "tre-pr", "issues", "sprint", "kanban", "worklog"]
author: "SDS/TRE-PR"
---
```

**Seções obrigatórias:**

1. **Overview** — Descrição do Power, pacote MCP utilizado, versão do Jira (7.3.3, REST API v2)
2. **Onboarding** — Steps de instalação de artefatos, validação de pré-requisitos, SSL/certificados
3. **Autenticação Basic Auth** — Configuração de `JIRA_USERNAME` e `JIRA_PASSWORD`, menção a API token
4. **Workflows Comuns** — Exemplos de busca JQL, criação de issues, transições, boards/sprints, worklogs
5. **Troubleshooting** — Erros SSL, 401, 404, server não inicia
6. **Best Practices** — Convenções de referência a projetos/issues
7. **Referência de Variáveis de Ambiente** — Tabela com todas as env vars
8. **Rastreabilidade Commit-Issue** — Funcionamento, instalação, exceções
9. **Complementaridade com gitlab-trepr** — GitLab para código, Jira para demandas

### 3. tre-root-v3.crt — Certificado CA Interna

Cópia idêntica do arquivo `powers/gitlab-trepr/tre-root-v3.crt`. Formato PEM, mesmo certificado raiz da CA interna do TRE-PR. Incluído para instalação manual caso necessário.

### 4. skills/jira-operator/SKILL.md — Skill de Referência

Skill escrito em **inglês** (convenção do repositório) que orienta o agente sobre:

**Estrutura do SKILL.md:**

```markdown
---
name: jira-operator
description: "Operates the jira-trepr power to manage Jira issues, projects, boards, sprints and worklogs on the TRE-PR internal Jira Server instance."
---

# Jira Operator

## Power Activation
## Issue Reference Convention
## Search Issues (JQL)
## Create Issues
## Update Issues (Transitions, Comments, Assignment)
## Projects & Boards
## Sprints
## Worklogs
## Error Handling
## Security
## Installation
```

**Convenções de referência:**
- Issues: formato `PROJ-123` (project key + número)
- Projetos: referência pelo project key (ex: `SISCONV`, `INFRA`)
- JQL: exemplos de queries comuns

**Error Handling (mesma estrutura do gitlab-operator):**
1. 401 Unauthorized → credenciais inválidas, verificar JIRA_USERNAME/JIRA_PASSWORD
2. 404 Not Found → issue key ou projeto inexistente
3. SSL errors → Node.js 22+, certificado CA instalado
4. No tools available → verificar Node.js, npx, reconectar Power
5. Catch-all → apresentar erro original

### 5. steering/commit-jira-traceability.md — Steering File

Arquivo em **inglês** (convenção de steering files) que define a regra de rastreabilidade commit-issue para Jira.

**Estrutura:**

```markdown
# Commit-Jira Issue Traceability Rule

## Policy
## Workflow
### 1. Identify the Related Issue
### 2. Create Issue If None Exists
### 3. Compose Commit Message with Issue Reference
### 4. Mapping Commit Types to Issue Labels
## Examples
## Project Key Resolution
## Exceptions
```

**Diferenças em relação ao steering do gitlab-trepr:**
- Referência de issue usa formato Jira: `PROJ-123` (não `#N`)
- Footer patterns: `Closes: PROJ-123`, `References: PROJ-123`
- Busca de issues usa ferramentas do Power `jira-trepr` (não `gitlab-trepr`)
- Criação de issue usa campos Jira (project key, issuetype, summary)
- Resolução de projeto usa o project key do Jira (não o namespace Git)

### 6. hooks/enforce-commit-jira-link.json — Hook

Hook JSON com estrutura idêntica ao `enforce-commit-issue-link.json` do gitlab-trepr, adaptado para Jira.

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "Enforce Commit-Jira Issue Link",
      "description": "Intercepts git commit commands to ensure every commit message references a Jira issue. If no reference is found, the agent searches for assigned issues and suggests one, or creates a new issue if needed.",
      "trigger": "PreToolUse",
      "matcher": "execute_bash|execute_pwsh|control_bash_process|control_pwsh_process",
      "action": {
        "type": "agent",
        "prompt": "<prompt content>"
      },
      "enabled": false
    }
  ]
}
```

**Prompt do hook (lógica):**

1. Verifica se o comando é `git commit` — se não for, permite sem intervenção
2. Se for commit, verifica se a mensagem contém referência a issue Jira (padrão regex: `[A-Z][A-Z0-9]+-\d+`, ex: `PROJ-123`)
3. Se contém referência → permite o commit
4. Se não contém:
   a. Ativa o Power `jira-trepr`
   b. Busca issues abertas atribuídas ao usuário (via ferramenta de busca JQL: `assignee = currentUser() AND status != Done`)
   c. Compara títulos das issues com o trabalho sendo realizado (commit subject, branch name, arquivos alterados)
   d. Sugere issue correspondente ao usuário
   e. Se confirmado, adiciona referência no footer do commit
   f. Se rejeitado ou nenhuma issue encontrada, pergunta ao usuário
   g. Se nenhuma issue existe, cria uma via MCP server
   h. Executa o commit com a referência incluída

**Exceções (com confirmação explícita):**
- Commit inicial de repositório
- Merge commits automáticos
- Commits que modificam apenas `.gitignore`, `.gitattributes` ou meta-arquivos

## Interfaces

### MCP Server Tools (expostos pelo pacote @aashari/mcp-server-atlassian-jira)

O pacote expõe ferramentas que mapeiam para a REST API v2 do Jira Server 7.3.3:

| Categoria | Operações esperadas | Endpoint Jira |
|-----------|-------------------|---------------|
| Issues | Search (JQL), Get, Create, Update, Transitions | `/rest/api/2/search`, `/rest/api/2/issue` |
| Comments | Add, List | `/rest/api/2/issue/{key}/comment` |
| Projects | List, Get | `/rest/api/2/project` |
| Boards | List, Get | `/rest/agile/1.0/board` |
| Sprints | List by board | `/rest/agile/1.0/board/{id}/sprint` |
| Worklogs | Add, List | `/rest/api/2/issue/{key}/worklog` |
| Transitions | List, Execute | `/rest/api/2/issue/{key}/transitions` |

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `JIRA_URL` | Sim | URL base da instância Jira (ex: `https://jira.tre-pr.jus.br`) |
| `JIRA_USERNAME` | Sim | Nome de usuário para autenticação Basic Auth |
| `JIRA_PASSWORD` | Sim | Senha ou API token do usuário |
| `NODE_OPTIONS` | Sim (fixo) | `--use-system-ca` — confia nos certificados do Windows Certificate Store |

### Onboarding — Mapeamento de Cópia

| Origem (Power) | Destino (Workspace) |
|----------------|---------------------|
| `skills/jira-operator/SKILL.md` | `.kiro/skills/jira-operator/SKILL.md` |
| `steering/commit-jira-traceability.md` | `.kiro/steering/commit-jira-traceability.md` |
| `hooks/enforce-commit-jira-link.json` | `.kiro/hooks/enforce-commit-jira-link.json` |

## Data Models

### Issue Reference Format (Jira)

```
Pattern: [A-Z][A-Z0-9]+-\d+
Examples: PROJ-123, SISCONV-45, INFRA-7
```

### Commit Message Footer (com referência Jira)

```
<type>(<scope>): <subject>

<body>

Closes: PROJ-123
Assisted-by: Kiro
```

Ou para referência parcial:

```
References: PROJ-123
```

### Hook JSON Schema

```typescript
interface HookFile {
  version: "v1";
  hooks: Hook[];
}

interface Hook {
  name: string;
  description: string;
  trigger: "PreToolUse" | "PostToolUse" | "fileEdited";
  matcher: string;        // regex de tool names
  action: {
    type: "agent";
    prompt: string;       // instruções para o agente
  };
  enabled: boolean;
}
```

## Error Handling

### Erros de Autenticação (401)

- **Causa**: `JIRA_USERNAME` ou `JIRA_PASSWORD` incorretos ou não definidos
- **Ação do Skill**: Informar ao usuário para verificar as variáveis de ambiente
- **Diferença do gitlab-trepr**: Não há fluxo OAuth — o fix é verificar credenciais nas env vars

### Erros de SSL

- **Causa**: Node.js < 22 ou certificado CA não instalado no Windows Certificate Store
- **Ação do Skill**: Instruir verificação de versão Node.js e instalação do certificado
- **Fallback**: Documentar `NODE_EXTRA_CA_CERTS` como alternativa para Node.js < 22

### Erros de Permissão (403)

- **Causa**: Usuário sem permissão para a operação no projeto Jira
- **Ação do Skill**: Informar que o usuário não tem permissão e sugerir contato com admin do projeto

### MCP Server não Inicia

- **Causa**: Node.js não instalado, npx não disponível, ou env vars ausentes
- **Ação do Skill**: Verificar pré-requisitos (node --version, npx --version, env vars)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: MCP configuration structural completeness

*For any* valid `mcp.json` file produced by this Power, the JSON structure SHALL contain a top-level `mcpServers` object with a `jira` key whose value includes: `command` set to `"npx"`, `args` array containing `"@aashari/mcp-server-atlassian-jira"`, and an `env` object containing keys `JIRA_URL`, `JIRA_USERNAME`, `JIRA_PASSWORD`, and `NODE_OPTIONS`.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: POWER.md front-matter completeness

*For any* valid `POWER.md` file produced by this Power, the YAML front-matter SHALL contain all required fields: `name`, `displayName`, `version`, `description`, `keywords` (array), and `author`, with `name` matching the directory name `jira-trepr`.

**Validates: Requirements 2.1**

### Property 3: Jira issue key detection in commit messages

*For any* commit message string, the hook's pattern matching logic SHALL correctly identify the presence or absence of a Jira issue key (matching `[A-Z][A-Z0-9]+-\d+`). Specifically: for any string containing a valid Jira key like `PROJ-123`, detection returns true; for any string not containing such a pattern, detection returns false.

**Validates: Requirements 8.2**

### Property 4: Credential values never stored in versioned configuration

*For any* valid `mcp.json` produced by this Power, the `env` values for `JIRA_USERNAME` and `JIRA_PASSWORD` SHALL be variable references (e.g., `${JIRA_USERNAME}`) or empty strings, never literal credential values. No env value in the configuration file SHALL contain what appears to be a password, token, or base64-encoded credential.

**Validates: Requirements 11.1**

### Property 5: MCP server name uniqueness

*For any* workspace where both `jira-trepr` and `gitlab-trepr` Powers are active, the MCP server names SHALL be distinct: `jira-trepr` uses server name `jira` and `gitlab-trepr` uses server name `gitlab`, ensuring no namespace collision in the `mcpServers` registry.

**Validates: Requirements 13.1**
