---
name: "gitlab-trepr"
displayName: "GitLab TRE-PR"
description: "Integração com o GitLab interno do TRE-PR para gerenciar projetos, merge requests, issues, pipelines, wiki, releases, milestones e mais."
keywords: ["gitlab", "tre-pr", "merge-request", "pipeline", "ci-cd", "issues"]
author: "SDS/TRE-PR"
---

# GitLab TRE-PR

## Overview

Power para integração com a instância interna do GitLab do TRE-PR (`gitlab.tre-pr.jus.br`). Permite que o agente interaja diretamente com projetos, merge requests, issues, pipelines de CI/CD, wiki, releases, tags, milestones e outros recursos do GitLab através do Model Context Protocol.

O MCP server utilizado é o `@zereight/mcp-gitlab`, que oferece cobertura ampla da API REST do GitLab e suporte nativo a instâncias self-hosted com autenticação via OAuth2.

## Onboarding

### Pré-requisitos

- **Node.js** 22+ (necessário para `--use-system-ca`)
- **Certificado da CA interna** do TRE-PR instalado no Windows Certificate Store (normalmente já distribuído via GPO na rede interna)

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

## Skill de Referência

Este Power inclui uma skill de referência que orienta o agente sobre como utilizar as ferramentas MCP do GitLab de forma eficaz. A skill cobre ativação do Power, convenções de referência a projetos, workflows comuns, tratamento de erros e boas práticas de segurança.

Consulte a documentação completa da skill em [`skills/gitlab-operator/SKILL.md`](skills/gitlab-operator/SKILL.md).

Para instalar a skill no seu workspace, copie o arquivo para `.kiro/skills/gitlab-operator/SKILL.md`.

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

Para habilitar essa regra no seu workspace:

1. Copie o steering file:
   ```
   powers/gitlab-trepr/steering/commit-issue-traceability.md → .kiro/steering/commit-issue-traceability.md
   ```

2. Copie o hook:
   ```
   powers/gitlab-trepr/hooks/enforce-commit-issue-link.kiro.hook → .kiro/hooks/enforce-commit-issue-link.kiro.hook
   ```

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
| `steering/commit-issue-traceability.md` | Steering file que define a regra de rastreabilidade commit-issue — todo commit deve referenciar uma issue do GitLab |
| `hooks/enforce-commit-issue-link.kiro.hook` | Hook que intercepta comandos de commit e garante o vínculo com uma issue do GitLab |

---

**Package:** `@zereight/mcp-gitlab`
**MCP Server:** gitlab
**Node.js mínimo:** 22+
