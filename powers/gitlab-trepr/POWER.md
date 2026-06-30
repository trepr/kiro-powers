---
name: "gitlab-trepr"
displayName: "GitLab TRE-PR"
version: "2"
description: "Integração com o GitLab interno do TRE-PR para gerenciar projetos, merge requests, issues, pipelines, wiki, releases, milestones e mais."
keywords: ["gitlab", "tre-pr", "merge-request", "pipeline", "ci-cd", "issues"]
author: "SDS/TRE-PR"
---

# GitLab TRE-PR

## Overview

Power para integração com a instância interna do GitLab do TRE-PR (`gitlab.tre-pr.jus.br`). Permite que o agente interaja diretamente com projetos, merge requests, issues, pipelines de CI/CD, wiki, releases, tags, milestones e outros recursos do GitLab através do Model Context Protocol.

O MCP server utilizado é o `@zereight/mcp-gitlab`, que oferece cobertura ampla da API REST do GitLab e suporte nativo a instâncias self-hosted com autenticação via OAuth2.

## Onboarding

### Step 1: Instalar artefatos no workspace

Ao ativar este Power pela primeira vez em um workspace, copie os seguintes artefatos automaticamente para o workspace do consumidor:

1. **Skill `gitlab-operator`** — Copie de `skills/gitlab-operator/SKILL.md` para `.kiro/skills/gitlab-operator/SKILL.md`
2. **Skill `git-operator`** (dispatcher/router) — Copie de `skills/git-operator/SKILL.md` para `.kiro/skills/git-operator/SKILL.md`
3. **Agent `git-operator`** (Haiku) — Copie de `agents/git-operator.md` para `.kiro/agents/git-operator.md`
4. **Agent `git-resolver`** (auto) — Copie de `agents/git-resolver.md` para `.kiro/agents/git-resolver.md`
5. **Steering `commit-issue-traceability`** — Copie de `steering/commit-issue-traceability.md` para `.kiro/steering/commit-issue-traceability.md`
6. **Hook `enforce-commit-issue-link`** — Copie de `hooks/enforce-commit-issue-link.json` para `.kiro/hooks/enforce-commit-issue-link.json`

Verifique se os diretórios de destino existem antes de copiar (`.kiro/skills/gitlab-operator/`, `.kiro/skills/git-operator/`, `.kiro/agents/`, `.kiro/steering/`, `.kiro/hooks/`). Crie-os se necessário.

**Regra de sobrescrita:** Sempre sobrescreva os arquivos no destino, mesmo que já existam. Todos os artefatos (skills, steering, agents e hooks) são gerenciados pelo Power e devem estar sempre na versão mais recente. Informe ao usuário quais artefatos foram atualizados.

### Step 2: Validar pré-requisitos

Verifique se o ambiente atende aos requisitos mínimos:

- **Node.js** 22+ (necessário para `--use-system-ca`)
- **Certificado da CA interna** do TRE-PR instalado no Windows Certificate Store (normalmente já distribuído via GPO na rede interna)

Comandos de validação:
```powershell
node --version    # Deve retornar v22.x.x ou superior
npx --version     # Deve estar disponível no PATH
```

Se algum pré-requisito não for atendido, informe ao usuário com instruções de resolução e **não prossiga** com as operações do Power até que esteja resolvido.

### SSL e Certificados

O GitLab do TRE-PR utiliza SSL com CA interna. Este Power resolve a questão de confiança no certificado através da flag `--use-system-ca` do Node.js 22+, que instrui o Node.js a confiar nos certificados do Windows Certificate Store.

**Não é necessária nenhuma configuração manual de certificado** — desde que:
1. O certificado da CA interna esteja instalado no Windows (Trusted Root Certification Authorities)
2. A versão do Node.js seja 22 ou superior

Para verificar se o certificado está instalado:
```powershell
certutil -store Root "ACRAIZ"
```

Se não estiver instalado, o arquivo `tre-root-v3.crt` está incluído neste Power. Instale-o manualmente:
```powershell
certutil -addstore Root "tre-root-v3.crt"
```

### Autenticação OAuth2 (Browser Flow)

Este Power utiliza **OAuth2 Authorization Code Flow** com o próprio GitLab do TRE-PR como provedor de identidade. Isso significa que nenhum Personal Access Token precisa ser gerado ou armazenado manualmente — a autenticação é feita via navegador, da mesma forma que você faz login no GitLab normalmente.

#### Como funciona

1. **Ao iniciar o Power**, o MCP server detecta que não há token válido e inicia um servidor HTTP local na porta `8888`
2. **O navegador abre automaticamente** na URL de autorização do GitLab (`https://gitlab.tre-pr.jus.br/oauth/authorize`)
3. **Você faz login** com suas credenciais normais do GitLab (se ainda não estiver logado)
4. **O GitLab solicita autorização** — uma tela pergunta se você deseja conceder acesso à aplicação "Kiro MCP" com escopo `api`
5. **Clique em "Authorize"** para conceder acesso
6. **O GitLab redireciona** para `http://127.0.0.1:8888/callback` com um código de autorização
7. **O MCP server troca** o código por um token de acesso OAuth2
8. **Pronto** — o Power está autenticado e funcional

#### Detalhes técnicos

| Aspecto | Valor |
|---------|-------|
| **Tipo de fluxo** | OAuth2 Authorization Code (sem PKCE) |
| **Provedor** | GitLab TRE-PR (`gitlab.tre-pr.jus.br`) |
| **Tipo de aplicação** | Pública (sem client secret) |
| **Escopos solicitados** | `api` (acesso completo à API) |
| **Redirect URI** | `http://127.0.0.1:8888/callback` |
| **Porta local** | 8888 (servidor HTTP temporário) |

#### Consentimento no navegador

Na primeira vez que você autoriza, o GitLab exibirá uma tela similar a:

```
Authorize Kiro MCP to use your account?

This application will be able to:
- Access the API on your behalf (api scope)

[Authorize]  [Deny]
```

Clique em **Authorize**. Essa autorização é persistida pelo GitLab — nas próximas vezes, o fluxo pode ocorrer automaticamente (sem perguntar novamente), dependendo das configurações do GitLab.

#### Renovação e expiração

- O token OAuth2 é **armazenado localmente** pelo MCP server (em memória durante a sessão)
- Quando o token expira, o MCP server tenta renovar usando o **refresh token**
- Se a renovação falhar (ex: token revogado), o navegador abrirá novamente para reautenticação
- **Para forçar nova autenticação**: desconecte e reconecte o Power no painel de Powers

#### Segurança

- Nenhum token ou credencial é armazenado em arquivo de configuração
- O fluxo OAuth2 garante que o agente opera com as **mesmas permissões** que seu usuário do GitLab
- O escopo `api` concede acesso completo — se preferir restringir, altere para `read_api` no GitLab (mas isso limita operações de escrita)
- Para revogar o acesso: vá em **GitLab → User Settings → Applications → Authorized Applications** e revogue "Kiro MCP"

## Workflows Comuns

### Listar projetos e merge requests

```
Listar meus projetos no GitLab.
Listar meus projetos pessoais (namespace <usuario>).
Mostrar merge requests abertos do projeto grupo/projeto.
Verificar merge requests pendentes no GitLab.
```

### Code Review

O workflow de code review em merge requests segue dois passos:

1. Listar os arquivos alterados no MR
2. Obter os diffs de cada arquivo para análise

```
Revise o merge request !42 do projeto grupo/projeto.
```

### Gerenciar Issues

```
Criar uma issue no projeto grupo/projeto com título "Bug no login".
Listar issues abertas atribuídas a mim.
Fechar a issue #15 do projeto grupo/projeto.
```

### Pipelines de CI/CD

```
Mostrar o status da última pipeline do projeto grupo/projeto.
Ver o log do job "build" que falhou na pipeline #123.
Retry da pipeline #123 do projeto grupo/projeto.
```

### Wiki

```
Listar páginas wiki do projeto grupo/projeto.
Criar uma página wiki "Arquitetura" no projeto grupo/projeto.
```

### Releases e Tags

```
Listar releases do projeto grupo/projeto.
Criar uma release v2.0.0 a partir da tag v2.0.0.
Listar tags do projeto grupo/projeto.
```

### Milestones

```
Listar milestones do projeto grupo/projeto.
Criar milestone "Sprint 42" com data de término 2026-07-01.
```

## Troubleshooting

### Erro de SSL: "self-signed certificate in certificate chain" ou "unable to verify the first certificate"

**Causa**: O certificado da CA interna do TRE-PR não está instalado no Windows Certificate Store, ou a versão do Node.js é inferior a 22.

**Solução**:

1. **Verifique a versão do Node.js** — deve ser 22+:
   ```powershell
   node --version
   ```

2. **Verifique se o certificado da CA está no Windows Certificate Store**:
   ```powershell
   certutil -store Root "ACRAIZ"
   ```

3. **Se o certificado não estiver instalado**, use o arquivo `tre-root-v3.crt` incluído neste Power:
   ```powershell
   certutil -addstore Root "tre-root-v3.crt"
   ```

4. **Reinicie o Kiro** e reconecte o Power

**Alternativa para Node.js < 22** (não recomendado):
Se não puder atualizar o Node.js, adicione ao `mcp.json`:
```json
"NODE_EXTRA_CA_CERTS": "C:/caminho/para/tre-root-v3.crt"
```

### Erro: "401 Unauthorized"

**Causa**: Token OAuth expirado ou revogado.

**Solução**:
1. Reconecte o MCP server no painel de Powers
2. O navegador abrirá novamente para autenticação
3. Faça login e autorize novamente

### Erro: "404 Not Found" ao acessar projeto

**Causa**: O usuário autenticado não tem acesso ao projeto ou o caminho está incorreto.

**Solução**:
1. Use o caminho completo do projeto com namespace (ex: `grupo/subgrupo/projeto`)
2. Verifique se você é membro do projeto no GitLab

### MCP Server não inicia ou aparece "No tools available"

**Causa**: Node.js não instalado, versão incompatível, ou falha na conexão OAuth.

**Solução**:
1. Verifique a versão: `node --version` (precisa ser 22+)
2. Verifique se `npx` está disponível: `npx --version`
3. Desinstale e reinstale o Power no painel de Powers
4. O navegador deve abrir para autenticação OAuth — complete o login

### Navegador não abre para autenticação OAuth

**Causa**: Conflito de porta ou processo anterior não encerrado.

**Solução**:
1. Verifique se a porta 8888 não está em uso:
   ```powershell
   netstat -ano | findstr :8888
   ```
2. Se estiver em uso, encerre o processo que ocupa a porta
3. Reconecte o MCP server

## Best Practices

- Ao referenciar projetos, use sempre o **caminho completo** (namespace/projeto)
- Para projetos pessoais, use `usuario/nome-projeto`
- Para code reviews grandes, peça a revisão **arquivo por arquivo** para manter contexto gerenciável
- Use `GITLAB_READ_ONLY_MODE=true` no mcp.json quando não precisar realizar alterações (mais seguro)

## Referência de Variáveis de Ambiente

### Configuradas no mcp.json

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `GITLAB_USE_OAUTH` | `true` | Ativa autenticação OAuth2 |
| `GITLAB_OAUTH_CLIENT_ID` | (configurado) | Application ID da app OAuth no GitLab |
| `GITLAB_OAUTH_REDIRECT_URI` | `http://127.0.0.1:8888/callback` | URI de callback local |
| `GITLAB_API_URL` | `https://gitlab.tre-pr.jus.br/api/v4` | URL da API do GitLab |
| `GITLAB_READ_ONLY_MODE` | `false` | Modo somente leitura |
| `USE_GITLAB_WIKI` | `true` | Habilita ferramentas de wiki |
| `USE_MILESTONE` | `true` | Habilita ferramentas de milestone |
| `USE_PIPELINE` | `true` | Habilita ferramentas de pipeline |
| `NODE_OPTIONS` | `--use-system-ca` | Usa certificados do Windows Certificate Store |

## Skills e Agents de Referência

### Skill `gitlab-operator`

Skill que orienta o agente sobre como utilizar as ferramentas MCP do GitLab de forma eficaz. Cobre ativação do Power, convenções de referência a projetos, workflows comuns, tratamento de erros e boas práticas de segurança.

Consulte a documentação completa em [`skills/gitlab-operator/SKILL.md`](skills/gitlab-operator/SKILL.md).

### Operações Git — Arquitetura Hierárquica (Skill + 2 Agents)

A funcionalidade de operações Git utiliza uma **arquitetura hierárquica de 3 componentes** que otimiza custo e qualidade:

```
Usuário
  │
  ▼
Skill dispatcher (ativação por keywords)
  │
  ├─── git-operator (Haiku) ──── operações rotineiras
  │       commit, push, pull, branch, status, log, stash
  │
  └─── git-resolver (auto) ──── operações complexas
          conflitos, merge request, diff analysis, halt conditions
```

| Componente | Localização no workspace | Modelo | Responsabilidade |
|------------|--------------------------|--------|------------------|
| **Skill** (router) | `.kiro/skills/git-operator/SKILL.md` | — | Ativação por keywords e roteamento para o agent correto |
| **Agent `git-operator`** | `.kiro/agents/git-operator.md` | Haiku | Operações mecânicas: commit, push, pull, branch, status |
| **Agent `git-resolver`** | `.kiro/agents/git-resolver.md` | Auto | Operações complexas: conflitos, MR, diff analysis |

#### Por que essa arquitetura?

- **Custo otimizado** — ~90% das operações Git são mecânicas e rodam no modelo mais leve (Haiku)
- **Qualidade preservada** — O ~10% que exige raciocínio semântico (conflitos, análise de diff) usa modelo de maior capacidade (auto)
- **Economia de contexto** — A skill dispatcher ocupa ~70 linhas; cada agent roda em contexto isolado
- **Escalação automática** — Se o `git-operator` encontra conflitos durante um rebase, ele escala automaticamente para o `git-resolver`
- **Ativação automática preservada** — A skill mantém keyword matching transparente

#### Fluxo de execução — operação simples

1. Usuário diz "faça o commit das alterações"
2. A skill é ativada (keyword match: "commit")
3. A skill roteia para `git-operator` (operação mecânica)
4. O agent executa: status → stage → compose message → commit
5. Resultado retorna ao contexto principal

#### Fluxo de execução — operação complexa (com escalação)

1. Usuário diz "faça o rebase na main"
2. A skill roteia para `git-operator` (rebase simples)
3. O agent executa `git rebase main` e encontra conflitos
4. O agent retorna: `ESCALATE TO git-resolver: rebase produced 2 conflicts`
5. A skill invoca `git-resolver` com o contexto de escalação
6. O `git-resolver` resolve os conflitos semanticamente e completa o rebase

#### Fluxo de execução — operação complexa (roteamento direto)

1. Usuário diz "prepare o merge request para main"
2. A skill é ativada (keyword match: "merge request")
3. A skill roteia diretamente para `git-resolver` (operação complexa)
4. O agent executa: rebase → build → checkstyle → push → create MR → verify pipeline

> **Instalação automática:** A skill e ambos os agents são copiados durante o onboarding do Power (Step 1).

## Rastreabilidade Commit-Issue

Este Power inclui uma regra de rastreabilidade que garante que todo commit realizado com assistência do agente contenha uma referência a uma issue do GitLab no footer da mensagem.

### Como funciona

1. O hook `enforce-commit-issue-link` intercepta comandos `git commit`
2. Verifica se a mensagem já contém referência a uma issue (`Closes: #N`, `References: #N`)
3. Se não contém, o agente busca automaticamente issues abertas atribuídas ao usuário no projeto e sugere uma correspondente ao trabalho sendo realizado no commit
4. Se o usuário rejeita a sugestão ou nenhuma issue atribuída é encontrada, o agente pergunta qual issue se relaciona ao commit
5. Se nenhuma issue existe, o agente cria uma automaticamente via a ferramenta `create_issue` do MCP
6. O commit é então executado com a referência no footer

### Instalação

> **Instalação automática:** O steering file e o hook são copiados automaticamente durante o onboarding do Power (Step 1):
> - `steering/commit-issue-traceability.md` → `.kiro/steering/commit-issue-traceability.md`
> - `hooks/enforce-commit-issue-link.kiro.hook` → `.kiro/hooks/enforce-commit-issue-link.kiro.hook`

### Exceções

Commits isentos da obrigatoriedade (com confirmação explícita do usuário):
- Commit inicial de um novo repositório
- Merge commits gerados automaticamente
- Commits que modificam apenas `.gitignore`, `.gitattributes` ou meta-arquivos similares

## Arquivos incluídos neste Power

| Arquivo | Descrição |
|---------|-----------|
| `POWER.md` | Esta documentação |
| `mcp.json` | Configuração do MCP server |
| `tre-root-v3.crt` | Certificado da CA raiz interna do TRE-PR (formato PEM) — para instalação manual caso necessário |
| `skills/gitlab-operator/SKILL.md` | Skill de referência para uso do Power pelo agente — contém instruções de ativação, workflows e tratamento de erros |
| `skills/git-operator/SKILL.md` | Skill dispatcher/router de operações Git — ativa por keywords e roteia entre `git-operator` e `git-resolver` |
| `agents/git-operator.md` | Agent (Haiku) para operações Git mecânicas — commit, push, pull, branch, status, stash |
| `agents/git-resolver.md` | Agent (auto) para operações Git complexas — resolução de conflitos, preparação de MR, análise de diff |
| `steering/commit-issue-traceability.md` | Steering file que define a regra de rastreabilidade commit-issue — todo commit deve referenciar uma issue do GitLab |
| `hooks/enforce-commit-issue-link.kiro.hook` | Hook que intercepta comandos de commit e garante o vínculo com uma issue do GitLab |

---

**Package:** `@zereight/mcp-gitlab`
**MCP Server:** gitlab
**Node.js mínimo:** 22+
