# Requirements Document

## Introduction

Power para integração com a instância interna do Jira Server (versão 7.3.3) do TRE-PR. Permite que o agente Kiro interaja diretamente com issues, projetos, boards, sprints e worklogs do Jira através do Model Context Protocol. Complementa o Power `gitlab-trepr` (GitLab para código-fonte, Jira para gestão de demandas).

## Glossary

- **Power**: Pacote de integração Kiro que agrupa documentação, configuração MCP server e artefatos de suporte
- **MCP_Server**: Processo backend que expõe ferramentas ao agente via Model Context Protocol
- **Jira_System**: Instância Jira Server 7.3.3 on-premise do TRE-PR, acessível apenas na rede interna
- **Agent**: Agente de IA do Kiro que consome as ferramentas expostas pelo MCP server
- **JQL**: Jira Query Language — linguagem de consulta para busca de issues no Jira
- **Basic_Auth**: Esquema de autenticação HTTP com credenciais (usuário e senha/token) codificadas em Base64
- **CA_Interna**: Autoridade Certificadora raiz interna do TRE-PR cujo certificado deve ser confiável para conexões SSL
- **Onboarding**: Processo de instalação inicial de artefatos do Power no workspace do consumidor
- **Steering_File**: Arquivo de orientação comportamental que instrui o agente sobre regras e workflows
- **Hook**: Gatilho que intercepta ações do agente para impor regras ou validações

## Requirements

### Requirement 1: Configuração MCP Server

**User Story:** As a developer, I want the Power to declare the Jira MCP server configuration correctly, so that Kiro can start the server and expose Jira tools to the agent.

#### Acceptance Criteria

1. THE Power SHALL include a file `mcp.json` que declare o MCP_Server com comando `npx`, pacote `@aashari/mcp-server-atlassian-jira` e variáveis de ambiente para autenticação e URL do Jira_System.
2. THE Power SHALL configurar a variável `NODE_OPTIONS` com o valor `--use-system-ca` no `mcp.json` para que o MCP_Server confie nos certificados da CA_Interna via Windows Certificate Store.
3. THE Power SHALL configurar as variáveis de ambiente `JIRA_URL`, `JIRA_USERNAME` e `JIRA_PASSWORD` no `mcp.json` para autenticação Basic_Auth com o Jira_System.
4. THE Power SHALL utilizar a REST API v2 do Jira_System (endpoint base `/rest/api/2/`).

### Requirement 2: Documentação do Power

**User Story:** As a developer, I want comprehensive documentation in Portuguese, so that I can understand how to configure, use and troubleshoot the Power.

#### Acceptance Criteria

1. THE Power SHALL include a file `POWER.md` escrito em português brasileiro (pt-BR) com front-matter contendo name, displayName, version, description, keywords e author.
2. THE Power SHALL documentar em `POWER.md` as seções: Overview, Onboarding, Workflows Comuns, Troubleshooting, Best Practices e Referência de Variáveis de Ambiente.
3. THE Power SHALL documentar o processo de autenticação Basic_Auth, incluindo quais variáveis de ambiente o usuário deve configurar e onde obtê-las.
4. THE Power SHALL documentar a resolução de problemas de SSL com a CA_Interna, incluindo verificação e instalação do certificado.

### Requirement 3: Certificado CA Interna

**User Story:** As a developer, I want the internal CA certificate bundled with the Power, so that I can install it manually if needed for SSL trust.

#### Acceptance Criteria

1. THE Power SHALL include o arquivo `tre-root-v3.crt` (formato PEM) com o certificado da CA_Interna do TRE-PR.
2. THE Power SHALL documentar em `POWER.md` o procedimento de instalação manual do certificado via `certutil -addstore Root`.

### Requirement 4: Busca e Listagem de Issues

**User Story:** As a developer, I want the agent to search and list Jira issues using JQL, so that I can find relevant issues without leaving the IDE.

#### Acceptance Criteria

1. WHEN o Agent receber uma solicitação de busca de issues, THE MCP_Server SHALL expor ferramentas que executem consultas JQL na API REST v2 do Jira_System.
2. WHEN o Agent receber uma solicitação de listagem de issues de um projeto, THE MCP_Server SHALL retornar issues do projeto especificado com campos essenciais (key, summary, status, assignee, priority).
3. THE Power SHALL documentar em `POWER.md` exemplos de workflows de busca de issues por JQL.

### Requirement 5: Criação de Issues

**User Story:** As a developer, I want the agent to create new issues in Jira, so that I can track work items directly from my development environment.

#### Acceptance Criteria

1. WHEN o Agent receber uma solicitação de criação de issue, THE MCP_Server SHALL expor ferramentas que criem issues na API REST v2 do Jira_System com campos obrigatórios (project, summary, issuetype).
2. WHEN uma issue for criada com sucesso, THE MCP_Server SHALL retornar a key da issue criada para o Agent.
3. THE Power SHALL documentar em `POWER.md` exemplos de workflows de criação de issues.

### Requirement 6: Atualização de Issues

**User Story:** As a developer, I want the agent to update existing Jira issues (transitions, comments, assignments), so that I can manage issue lifecycle from my IDE.

#### Acceptance Criteria

1. WHEN o Agent receber uma solicitação de transição de status, THE MCP_Server SHALL expor ferramentas que executem transições de workflow na issue especificada.
2. WHEN o Agent receber uma solicitação de adição de comentário, THE MCP_Server SHALL expor ferramentas que adicionem comentários à issue especificada.
3. WHEN o Agent receber uma solicitação de atribuição de issue, THE MCP_Server SHALL expor ferramentas que alterem o assignee da issue especificada.
4. THE Power SHALL documentar em `POWER.md` exemplos de workflows de atualização de issues.

### Requirement 7: Projetos e Boards

**User Story:** As a developer, I want the agent to list projects and boards, so that I can navigate the Jira project structure.

#### Acceptance Criteria

1. WHEN o Agent receber uma solicitação de listagem de projetos, THE MCP_Server SHALL expor ferramentas que listem projetos acessíveis pelo usuário autenticado.
2. WHEN o Agent receber uma solicitação de listagem de boards, THE MCP_Server SHALL expor ferramentas que listem boards (Scrum/Kanban) disponíveis via Agile API.
3. WHEN o Agent receber uma solicitação de listagem de sprints de um board, THE MCP_Server SHALL expor ferramentas que listem sprints associadas ao board especificado.

### Requirement 8: Rastreabilidade Commit-Jira

**User Story:** As a developer, I want every agent-assisted commit to reference a Jira issue, so that I maintain traceability between code changes and work items.

#### Acceptance Criteria

1. THE Power SHALL include um steering file `steering/commit-jira-traceability.md` que defina a regra de rastreabilidade commit-issue para o Jira_System.
2. THE Power SHALL include um hook `hooks/enforce-commit-jira-link.json` que intercepte comandos de commit e verifique a presença de referência a uma issue do Jira (formato: issue key, ex: `PROJ-123`).
3. WHEN a mensagem de commit não contiver referência a uma issue Jira, THE Agent SHALL buscar issues abertas atribuídas ao usuário e sugerir uma correspondente ao trabalho realizado.
4. IF o usuário rejeitar a sugestão e nenhuma issue existir, THEN THE Agent SHALL criar uma issue automaticamente via MCP_Server e incluir a referência no commit.
5. THE Power SHALL documentar em `POWER.md` a seção de Rastreabilidade Commit-Issue com descrição do funcionamento, instalação e exceções.

### Requirement 9: Onboarding de Artefatos

**User Story:** As a developer, I want the Power onboarding to automatically copy skills, steering and hooks to my workspace, so that the agent has proper guidance configured.

#### Acceptance Criteria

1. WHEN o Power for ativado pela primeira vez em um workspace, THE Agent SHALL copiar o arquivo `skills/jira-operator/SKILL.md` para `.kiro/skills/jira-operator/SKILL.md` no workspace.
2. WHEN o Power for ativado pela primeira vez em um workspace, THE Agent SHALL copiar o arquivo `steering/commit-jira-traceability.md` para `.kiro/steering/commit-jira-traceability.md` no workspace.
3. WHEN o Power for ativado pela primeira vez em um workspace, THE Agent SHALL copiar o arquivo `hooks/enforce-commit-jira-link.json` para `.kiro/hooks/enforce-commit-jira-link.json` no workspace.
4. WHEN os artefatos já existirem no workspace, THE Agent SHALL sobrescrever os arquivos com a versão mais recente do Power e informar ao usuário quais artefatos foram atualizados.
5. THE Agent SHALL criar os diretórios de destino caso não existam antes de copiar os artefatos.

### Requirement 10: Skill de Referência

**User Story:** As a developer, I want a reference skill for the Jira Power, so that the agent knows how to use Jira tools effectively.

#### Acceptance Criteria

1. THE Power SHALL include um arquivo `skills/jira-operator/SKILL.md` que oriente o Agent sobre como utilizar as ferramentas MCP do Jira_System.
2. THE Skill SHALL cobrir: ativação do Power, convenções de referência a projetos e issues, workflows comuns, tratamento de erros e boas práticas.
3. THE Skill SHALL ser escrito em inglês, conforme a convenção do repositório para arquivos de skill.

### Requirement 11: Autenticação Basic Auth

**User Story:** As a developer, I want authentication configured via environment variables, so that my credentials are stored securely and not exposed in configuration files.

#### Acceptance Criteria

1. THE Power SHALL utilizar variáveis de ambiente (`JIRA_USERNAME`, `JIRA_PASSWORD`) para credenciais de autenticação, sem armazenar senhas em arquivos de configuração versionados.
2. THE Power SHALL documentar em `POWER.md` que o valor de `JIRA_PASSWORD` pode ser um API token gerado no Jira ou a senha do usuário.
3. IF as variáveis de ambiente de autenticação não estiverem definidas, THEN THE MCP_Server SHALL falhar na inicialização com mensagem de erro indicando quais variáveis estão ausentes.

### Requirement 12: SSL via Node.js 22+

**User Story:** As a developer, I want SSL to work transparently with the internal CA, so that I don't need manual certificate configuration for each tool.

#### Acceptance Criteria

1. THE Power SHALL configurar `NODE_OPTIONS=--use-system-ca` no `mcp.json` para que o Node.js confie nos certificados do Windows Certificate Store.
2. THE Power SHALL exigir Node.js versão 22 ou superior como pré-requisito.
3. WHEN a versão do Node.js for inferior a 22, THE Agent SHALL informar ao usuário que a versão mínima não é atendida e instruir sobre atualização.
4. THE Power SHALL documentar em `POWER.md` a alternativa `NODE_EXTRA_CA_CERTS` para ambientes com Node.js inferior a 22.

### Requirement 13: Coexistência com gitlab-trepr

**User Story:** As a developer, I want jira-trepr and gitlab-trepr to work together without conflicts, so that I can use both GitLab and Jira integrations simultaneously.

#### Acceptance Criteria

1. THE Power SHALL utilizar um nome de MCP_Server distinto (`jira`) que não conflite com o servidor `gitlab` do Power gitlab-trepr.
2. THE Power SHALL compartilhar a mesma estratégia de confiança SSL (Node.js `--use-system-ca`) utilizada pelo Power gitlab-trepr.
3. THE Power SHALL documentar em `POWER.md` a complementaridade com o Power gitlab-trepr (GitLab para código, Jira para gestão de demandas).

### Requirement 14: Worklogs

**User Story:** As a developer, I want the agent to manage worklogs on Jira issues, so that I can register time spent without context switching.

#### Acceptance Criteria

1. WHEN o Agent receber uma solicitação de registro de tempo, THE MCP_Server SHALL expor ferramentas que adicionem worklogs à issue especificada com tempo gasto e descrição.
2. WHEN o Agent receber uma solicitação de listagem de worklogs, THE MCP_Server SHALL expor ferramentas que retornem worklogs registrados na issue especificada.
