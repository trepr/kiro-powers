---
name: "jira-trepr"
displayName: "Jira TRE-PR"
version: "1"
description: "Integração com o Jira Server interno do TRE-PR para gerenciar issues, projetos, boards, sprints e worklogs através do Model Context Protocol."
keywords: ["jira", "tre-pr", "issues", "sprint", "kanban", "worklog"]
author: "SDS/TRE-PR"
---

# Jira TRE-PR

## Overview

Power para integração com a instância interna do Jira Server do TRE-PR (`jira.tre-pr.jus.br`). Permite que o agente interaja diretamente com issues, projetos, boards Scrum/Kanban, sprints e worklogs do Jira através do Model Context Protocol.

O Jira Server utilizado é a versão **7.3.3**, com a **REST API v2** (endpoint base `/rest/api/2/`) e a **Agile API** (endpoint base `/rest/agile/1.0/`).

O MCP server utilizado é o `mcp-atlassian` (pacote Python, executado via `uvx`), que oferece cobertura ampla da API REST do Jira com suporte a instâncias Server/Data Center self-hosted via autenticação Basic Auth. Este pacote expõe 72+ ferramentas incluindo busca JQL, CRUD de issues, transições, comentários, worklogs, boards, sprints e mais.

## Onboarding

### Step 1: Instalar artefatos no workspace

Ao ativar este Power pela primeira vez em um workspace, copie os seguintes artefatos automaticamente para o workspace do consumidor:

1. **Skill `jira-operator`** — Copie de `skills/jira-operator/SKILL.md` para `.kiro/skills/jira-operator/SKILL.md`
2. **Steering `commit-jira-traceability`** — Copie de `steering/commit-jira-traceability.md` para `.kiro/steering/commit-jira-traceability.md`
3. **Hook `enforce-commit-jira-link`** — Copie de `hooks/enforce-commit-jira-link.json` para `.kiro/hooks/enforce-commit-jira-link.json`

| Origem (Power) | Destino (Workspace) |
|----------------|---------------------|
| `skills/jira-operator/SKILL.md` | `.kiro/skills/jira-operator/SKILL.md` |
| `steering/commit-jira-traceability.md` | `.kiro/steering/commit-jira-traceability.md` |
| `hooks/enforce-commit-jira-link.json` | `.kiro/hooks/enforce-commit-jira-link.json` |

Verifique se os diretórios de destino existem antes de copiar (`.kiro/skills/jira-operator/`, `.kiro/steering/`, `.kiro/hooks/`). Crie-os se necessário.

**Regra de sobrescrita:** Sempre sobrescreva os arquivos no destino, mesmo que já existam. Todos os artefatos (skill, steering e hook) são gerenciados pelo Power e devem estar sempre na versão mais recente. Informe ao usuário quais artefatos foram atualizados.

### Step 1.1: Exclusão mútua de hooks de rastreabilidade

Os Powers `jira-trepr` e `gitlab-trepr` possuem hooks de rastreabilidade commit-issue mutuamente exclusivos — apenas **um** deve estar habilitado por workspace, conforme o sistema onde as issues são registradas.

Ao copiar o hook `enforce-commit-jira-link.json` para o workspace:

1. **Verifique** se o arquivo `.kiro/hooks/enforce-commit-issue-link.json` (hook do `gitlab-trepr`) existe no workspace
2. **Se existir e estiver habilitado** (`"enabled": true`):
   - Pergunte ao usuário: "Este workspace possui o hook de rastreabilidade do GitLab ativo. As issues deste projeto são registradas no Jira ou no GitLab?"
   - Se o usuário responder **Jira**: desabilite o hook do GitLab (set `"enabled": false` em `.kiro/hooks/enforce-commit-issue-link.json`) e habilite o do Jira (`"enabled": true`)
   - Se o usuário responder **GitLab**: mantenha o hook do GitLab ativo e **não habilite** o hook do Jira (deixe `"enabled": false`)
3. **Se não existir ou estiver desabilitado**: habilite o hook do Jira (`"enabled": true` em `.kiro/hooks/enforce-commit-jira-link.json`)

> **Regra:** Nunca habilite ambos os hooks simultaneamente. Um workspace deve ter no máximo um hook de rastreabilidade de issues ativo.

### Step 2: Validar pré-requisitos

Verifique se o ambiente atende aos requisitos mínimos:

- **Node.js** 22+ (necessário para o credential helper com `--use-system-ca`)
- **Python 3.10+** e **uv** (necessários para executar o MCP server via `uvx`)
- **Certificado da CA interna** do TRE-PR instalado no Certificate Store do OS (normalmente já distribuído via GPO na rede interna)

Comandos de validação:
```powershell
node --version    # Deve retornar v22.x.x ou superior
uvx --version     # Deve estar disponível no PATH
```

Se `uvx` não estiver instalado:
```powershell
# Windows (via winget):
winget install astral-sh.uv

# Linux/macOS:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Se algum pré-requisito não for atendido, informe ao usuário com instruções de resolução e **não prossiga** com as operações do Power até que esteja resolvido.

### SSL e Certificados

O Jira do TRE-PR utiliza SSL com CA interna. Este Power resolve a questão de confiança no certificado através da flag `--use-system-ca` do Node.js 22+, que instrui o Node.js a confiar nos certificados do Windows Certificate Store.

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

**Alternativa para Node.js < 22** (não recomendado):
Se não puder atualizar o Node.js, configure a variável `NODE_EXTRA_CA_CERTS` apontando para o arquivo do certificado:
```json
"NODE_EXTRA_CA_CERTS": "C:/caminho/para/tre-root-v3.crt"
```

Esta alternativa deve ser adicionada à seção `env` do `mcp.json`. No entanto, a recomendação é atualizar para Node.js 22+ para uma solução mais limpa e consistente com o Power `gitlab-trepr`.

## Autenticação

Este Power utiliza **Basic Auth** (autenticação HTTP básica) com as credenciais do usuário no Jira do TRE-PR. As credenciais são resolvidas automaticamente pelo **credential helper** (`credential-helper.mjs`) na seguinte ordem de prioridade:

1. **Variáveis de ambiente** (`JIRA_USERNAME` + `JIRA_PASSWORD`) — se definidas, são utilizadas diretamente
2. **Credential store nativo do OS** — se as variáveis não estiverem definidas, busca no gerenciador de credenciais do sistema operacional
3. **Erro com instruções** — se nenhuma fonte for encontrada, exibe mensagem com as opções de configuração

### Configuração via Credential Store (recomendado)

Armazene suas credenciais no gerenciador nativo do sistema operacional. Isso evita manter senhas em variáveis de ambiente ou arquivos de configuração.

#### Windows (Credential Manager)

```powershell
# Armazenar credenciais (solicita a senha interativamente):
powershell -ExecutionPolicy Bypass -File powers/jira-trepr/store-credential.ps1
```

O script `store-credential.ps1`:
- Assume o username do usuário logado no Windows (Active Directory)
- Solicita a senha interativamente (input mascarado — não aparece no terminal)
- Armazena no Windows Credential Manager via API nativa (`CredWrite` do `advapi32.dll`)

Se precisar especificar um username diferente:
```powershell
powershell -ExecutionPolicy Bypass -File powers/jira-trepr/store-credential.ps1 -Username outro.usuario
```

Para verificar ou remover:
```powershell
cmdkey /list:jira-trepr      # Verificar
cmdkey /delete:jira-trepr    # Remover
```

O credential helper lê as credenciais via API nativa do Windows (`CredRead` do `advapi32.dll`) — não requer módulos PowerShell adicionais.

#### Linux (libsecret / GNOME Keyring)

```bash
# Pré-requisito:
sudo apt install libsecret-tools   # Debian/Ubuntu

# Armazenar credenciais:
echo -n 'seu.usuario' | secret-tool store --label='Jira TRE-PR' service jira-trepr field username
echo -n 'sua-senha' | secret-tool store --label='Jira TRE-PR' service jira-trepr field password
```

#### macOS (Keychain)

```bash
security add-generic-password -s jira-trepr -a seu.usuario -w sua-senha
```

### Configuração via Variáveis de Ambiente (alternativa)

Se preferir não utilizar o credential store, defina as variáveis de ambiente no seu perfil de shell:

```powershell
# PowerShell (Windows):
$env:JIRA_USERNAME = "seu.usuario"
$env:JIRA_API_TOKEN = "sua-senha"

# Bash/Zsh (Linux/macOS):
export JIRA_USERNAME="seu.usuario"
export JIRA_API_TOKEN="sua-senha"
```

As variáveis de ambiente têm **prioridade sobre o credential store** — se estiverem definidas, o credential helper as utiliza diretamente sem consultar o OS.

> **Nota:** A variável `JIRA_PASSWORD` também é aceita como alias de `JIRA_API_TOKEN` para retrocompatibilidade.

### Sobre o valor da senha

O valor da senha (`JIRA_PASSWORD` ou o campo password no credential store) pode ser:
- A **senha de rede** do usuário (mesma utilizada para login no Jira via browser)
- Um **API token** gerado nas configurações pessoais do Jira (se a instância suportar)

A utilização de API token é preferível por ser mais segura e permitir revogação independente da senha de rede, porém a instância 7.3.3 pode não oferecer essa funcionalidade.

### Segurança

- Credenciais **nunca são armazenadas** em `mcp.json` ou qualquer arquivo versionado
- O credential helper resolve credenciais em tempo de execução e as injeta apenas no processo do MCP server
- O agente opera com as **mesmas permissões** que o usuário autenticado no Jira
- Se nenhuma credencial for encontrada, o helper exibe mensagem de erro e encerra sem iniciar o server

## Workflows Comuns

### Buscar issues por JQL

```
Buscar issues abertas atribuídas a mim no projeto SISCONV.
Buscar issues com prioridade Critical no projeto INFRA.
Listar bugs abertos do sprint atual no board SISCONV.
```

Exemplos de queries JQL que o agente pode executar:
- `assignee = currentUser() AND status != Done`
- `project = SISCONV AND issuetype = Bug AND status = "In Progress"`
- `priority = Critical AND resolution = Unresolved`
- `sprint in openSprints() AND project = INFRA`

### Criar issues

```
Criar uma issue do tipo Bug no projeto SISCONV com título "Erro no relatório de consolidação".
Criar uma Task no projeto INFRA para "Atualizar certificado SSL do servidor de homologação".
```

### Transições de status

```
Mover a issue SISCONV-123 para "In Progress".
Finalizar a issue INFRA-45 (transição para Done).
Reabrir a issue SISCONV-200.
```

### Boards e Sprints

```
Listar boards disponíveis no Jira.
Mostrar o sprint atual do board SISCONV.
Listar issues do sprint ativo no board INFRA.
```

### Worklogs (registro de horas)

```
Registrar 2 horas na issue SISCONV-123 com descrição "Implementação do endpoint de autenticação".
Listar worklogs da issue INFRA-45.
Registrar 30 minutos na issue SISCONV-200 com descrição "Code review e ajustes".
```

### Comentários

```
Adicionar comentário na issue SISCONV-123: "Implementação concluída, aguardando review."
Listar comentários da issue INFRA-45.
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
Se não puder atualizar o Node.js, adicione ao `mcp.json` na seção `env`:
```json
"NODE_EXTRA_CA_CERTS": "C:/caminho/para/tre-root-v3.crt"
```

### Erro: "401 Unauthorized"

**Causa**: Credenciais inválidas — `JIRA_USERNAME` ou `JIRA_PASSWORD` incorretos ou não definidos.

**Solução**:
1. Verifique se as credenciais estão armazenadas no credential store:
   - Windows: `cmdkey /list:jira-trepr`
   - Linux: `secret-tool lookup service jira-trepr field username`
2. Ou verifique se as variáveis de ambiente `JIRA_USERNAME` e `JIRA_PASSWORD` estão definidas
3. Confirme que o nome de usuário está correto (mesmo utilizado para login no Jira via browser)
4. Confirme que a senha está correta (tente acessar o Jira pelo browser com as mesmas credenciais)
5. Se a senha da rede foi alterada, atualize no credential store ou na variável de ambiente

### Erro: "404 Not Found" ao acessar issue ou projeto

**Causa**: A issue key ou o project key informado não existe ou o usuário não tem acesso.

**Solução**:
1. Verifique se a issue key está no formato correto (`PROJ-123`, ex: `SISCONV-45`)
2. Confirme que o projeto existe acessando `https://jira.tre-pr.jus.br/browse/PROJ`
3. Verifique se o usuário autenticado tem permissão de visualização no projeto

### MCP Server não inicia ou aparece "No tools available"

**Causa**: Node.js não instalado, versão incompatível, npx não disponível ou variáveis de ambiente ausentes.

**Solução**:
1. Verifique a versão do Node.js: `node --version` (precisa ser 22+ para o credential helper)
2. Verifique se `uvx` está disponível: `uvx --version` (precisa estar no PATH)
3. Verifique se as credenciais estão disponíveis (credential store ou env vars):
   ```powershell
   # Testar o credential helper diretamente:
   node --use-system-ca powers/jira-trepr/credential-helper.mjs
   ```
4. Desinstale e reinstale o Power no painel de Powers
5. Verifique logs do MCP server para mensagens de erro detalhadas

## Best Practices

- Ao referenciar issues, use sempre o formato completo com project key: `PROJ-123` (ex: `SISCONV-45`, `INFRA-7`)
- Ao referenciar projetos, use o **project key** em maiúsculas (ex: `SISCONV`, `INFRA`)
- Para buscas JQL complexas, teste primeiro no Jira via browser antes de solicitar ao agente
- Prefira criar issues com informações completas (summary, description, issuetype, priority) para facilitar rastreabilidade
- Ao registrar worklogs, inclua sempre uma descrição do trabalho realizado

## Referência de Variáveis de Ambiente

### Configuradas no mcp.json

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `JIRA_URL` | `https://jira.tre-pr.jus.br` | URL base da instância Jira |
| `JIRA_SSL_VERIFY` | `false` | Desabilita verificação SSL no pacote Python (fallback para CA interna) |

### Resolvidas pelo credential helper

| Variável | Fonte | Descrição |
|----------|-------|-----------|
| `JIRA_USERNAME` | Env var ou credential store | Nome de usuário para Basic Auth |
| `JIRA_API_TOKEN` | Env var ou credential store | Senha ou API token do usuário (aceita `JIRA_PASSWORD` como alias) |

### Flags do Node.js

| Flag | Descrição |
|------|-----------|
| `--use-system-ca` | Confia nos certificados do OS (passada via args no mcp.json) |

## Skill de Referência

### Skill `jira-operator`

Skill que orienta o agente sobre como utilizar as ferramentas MCP do Jira de forma eficaz. Cobre ativação do Power, convenções de referência a projetos e issues, workflows comuns (JQL, criação, transições, boards, sprints, worklogs), tratamento de erros e boas práticas de segurança.

Consulte a documentação completa em [`skills/jira-operator/SKILL.md`](skills/jira-operator/SKILL.md).

## Rastreabilidade Commit-Issue

Este Power inclui uma regra de rastreabilidade que garante que todo commit realizado com assistência do agente contenha uma referência a uma issue do Jira no footer da mensagem.

### Como funciona

1. O hook `enforce-commit-jira-link` intercepta comandos `git commit`
2. Verifica se a mensagem já contém referência a uma issue Jira (padrão regex: `[A-Z][A-Z0-9]+-\d+`, ex: `PROJ-123`)
3. Se não contém, o agente busca automaticamente issues abertas atribuídas ao usuário via JQL (`assignee = currentUser() AND status != Done`) e sugere uma correspondente ao trabalho sendo realizado no commit
4. Se o usuário rejeita a sugestão ou nenhuma issue atribuída é encontrada, o agente pergunta qual issue se relaciona ao commit
5. Se nenhuma issue existe, o agente cria uma automaticamente via MCP server e inclui a referência no commit
6. O commit é então executado com a referência no footer (ex: `Closes: PROJ-123`)

### Instalação

> **Instalação automática:** O steering file e o hook são copiados automaticamente durante o onboarding do Power (Step 1):
> - `steering/commit-jira-traceability.md` → `.kiro/steering/commit-jira-traceability.md`
> - `hooks/enforce-commit-jira-link.json` → `.kiro/hooks/enforce-commit-jira-link.json`

### Exceções

Commits isentos da obrigatoriedade (com confirmação explícita do usuário):
- Commit inicial de um novo repositório
- Merge commits gerados automaticamente
- Commits que modificam apenas `.gitignore`, `.gitattributes` ou meta-arquivos similares

## Complementaridade com gitlab-trepr

Os Powers `jira-trepr` e `gitlab-trepr` são complementares e podem coexistir no mesmo workspace sem conflito. O GitLab gerencia o **código-fonte e CI/CD**, enquanto o Jira gerencia as **demandas, sprints e registro de horas**.

| Aspecto | gitlab-trepr | jira-trepr |
|---------|--------------|------------|
| MCP Server name | `gitlab` | `jira` |
| Pacote | `@zereight/mcp-gitlab` | `mcp-atlassian` |
| Autenticação | OAuth2 (browser) | Basic Auth (credential helper) |
| SSL | `--use-system-ca` | `--use-system-ca` |
| Propósito | Código-fonte, CI/CD, merge requests | Gestão de demandas, sprints, worklogs |

### Uso combinado

Na prática, ambos os Powers são utilizados juntos:

- **Criar uma issue no Jira** (via `jira-trepr`) para registrar a demanda
- **Desenvolver no GitLab** (via `gitlab-trepr`) referenciando a issue no commit
- **Registrar horas no Jira** (via `jira-trepr`) ao concluir o trabalho
- **Criar merge request no GitLab** (via `gitlab-trepr`) vinculando à issue

Cada Power utiliza seu próprio MCP server independente, com nomes distintos (`jira` e `gitlab`), garantindo que não haja conflito de ferramentas ou namespaces.

## Arquivos incluídos neste Power

| Arquivo | Descrição |
|---------|-----------|
| `POWER.md` | Esta documentação |
| `mcp.json` | Configuração do MCP server |
| `credential-helper.mjs` | Script Node.js que resolve credenciais do credential store nativo do OS (Windows/Linux/macOS) e inicia o MCP server |
| `read-credential.ps1` | Script PowerShell que lê credenciais do Windows Credential Manager via API nativa (CredRead) |
| `store-credential.ps1` | Script PowerShell interativo para armazenar credenciais no Windows Credential Manager (solicita senha com input mascarado) |
| `tre-root-v3.crt` | Certificado da CA raiz interna do TRE-PR (formato PEM) |
| `skills/jira-operator/SKILL.md` | Skill de referência para uso do Power pelo agente |
| `steering/commit-jira-traceability.md` | Steering file que define a regra de rastreabilidade commit-issue |
| `hooks/enforce-commit-jira-link.json` | Hook que intercepta comandos de commit e garante o vínculo com uma issue do Jira |

---

**Package:** `mcp-atlassian` (Python, via `uvx`)
**MCP Server:** jira
**Node.js mínimo:** 22+ (credential helper)
**Python mínimo:** 3.10+ (MCP server)
**Credential helper:** credential-helper.mjs
