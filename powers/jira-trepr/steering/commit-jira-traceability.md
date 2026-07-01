# Commit-Jira Issue Traceability Rule

## Policy

Every commit in this workspace MUST reference a Jira issue. This ensures full traceability between code changes and the rationale (feature, bug, task) that motivated them.

## Workflow

When performing a commit, follow this sequence:

### 1. Identify the Related Issue

Before composing the commit message, determine if there is an existing Jira issue that this commit addresses:

1. **Search for assigned issues automatically:**
   - Resolve the current project key (see "Project Key Resolution" below)
   - Activate the `jira-trepr` power (use `kiro_powers action="activate" powerName="jira-trepr"`)
   - Search for open issues assigned to the current user using JQL: `assignee = currentUser() AND status != Done AND project = PROJ`
   - Compare issue summaries and descriptions against the work being committed (files changed, commit subject, branch name)
   - If a matching issue is found, present it to the user for confirmation: "I found issue PROJ-123 (`<summary>`) assigned to you that seems related to this change. Should I reference it in the commit?"

2. **If the user confirms the suggested issue**, use that issue key

3. **If no matching assigned issue is found**, or the user rejects the suggestion:
   - Ask the user: "Which Jira issue does this commit relate to?"
   - If the user provides an issue key (e.g., `PROJ-123`), use it
   - If the user provides a description but no issue key, search all open issues in the project for a match using JQL: `project = PROJ AND status != Done AND summary ~ "user description"`

### 2. Create Issue If None Exists

If no existing issue matches the work being committed:

1. **Activate the `jira-trepr` power** (use `kiro_powers action="activate" powerName="jira-trepr"`)
2. **Create the issue** using the Jira MCP server tools with:
   - **project**: The resolved project key (e.g., `SISCONV`, `INFRA`)
   - **issuetype**: Map from commit type — `Bug` for `fix`, `Story` for `feat`, `Task` for others
   - **summary**: A title that summarizes the work (in Portuguese, matching commit subject conventions)
3. **Note the issue key** returned by the API (e.g., `PROJ-456`) for use in the commit footer

### 3. Compose Commit Message with Issue Reference

The commit message footer MUST include a reference to the Jira issue using one of these patterns:

```
Closes: PROJ-123        # When the commit fully resolves the issue
References: PROJ-123    # When the commit partially addresses or relates to the issue
```

These patterns follow the Conventional Commits footer convention already defined in the `git-operator` skill.

### 4. Mapping Commit Types to Issue Labels

When creating an issue automatically, use this mapping to determine the Jira issue type:

| Commit type | Jira issuetype |
|-------------|----------------|
| `feat`      | `Story`        |
| `fix`       | `Bug`          |
| `docs`      | `Task`         |
| `chore`     | `Task`         |
| `test`      | `Task`         |
| `style`     | `Task`         |

## Examples

### Commit with existing issue:
```
feat(auth): implementar autenticação OAuth2 no login

- Adicionado fluxo de Authorization Code
- Integração com provedor interno do GitLab

Closes: SISCONV-78
Assisted-by: Kiro
```

### Commit where issue is created first:
```
fix(api): corrigir timeout na listagem de projetos

- Aumentado timeout de conexão para 30s
- Adicionado retry com backoff exponencial

Closes: INFRA-142
Assisted-by: Kiro
```

### Commit that partially addresses an issue:
```
refactor(db): extrair queries para repositório dedicado

- Movida lógica de acesso a dados para camada de repositório
- Preparação para implementação de cache

References: SISCONV-201
Assisted-by: Kiro
```

## Project Key Resolution

The agent must determine the **default Jira project key** for the current workspace. This key is used for contextual operations (commits, issue searches). The user can always query other projects explicitly (e.g., "list issues in INFRA") regardless of the default.

### Resolution Order (priority highest to lowest)

1. **Persisted configuration** — Check if `.kiro/jira-project.json` exists in the workspace root. If it does and contains a valid `defaultProjectKey`, use it immediately.

2. **Maven `pom.xml` — `<issueManagement>` section** — Look for a `pom.xml` at the workspace root (or parent POM in multi-module projects). If it contains an `<issueManagement>` section with a URL pointing to the Jira instance, extract the project key:
   ```xml
   <issueManagement>
       <system>Jira</system>
       <url>https://jira.tre-pr.jus.br/browse/SISCONV</url>
   </issueManagement>
   ```
   Extract the last path segment of the URL as the candidate project key (e.g., `SISCONV`).

3. **Maven `pom.xml` — `<artifactId>`** — If `<issueManagement>` is absent, extract the `<artifactId>` from the root `pom.xml`, convert to uppercase, and treat as a **candidate** key (e.g., `sisconv-api` → `SISCONV`). Strip common suffixes: `-api`, `-web`, `-app`, `-service`, `-server`, `-core`, `-parent`.

4. **Ask the user** — If none of the above sources yield a key, ask: "Which Jira project does this workspace belong to? (e.g., SISCONV, INFRA)"

### Candidate Validation

Keys obtained from sources 2 and 3 (pom.xml) are **candidates** that MUST be validated before use:

1. Activate the `jira-trepr` power
2. Query the Jira API to verify the project exists: search for the project by key
3. If the project exists → accept the key
4. If the project does NOT exist → discard the candidate and fall through to the next source in the resolution order

Keys from source 1 (persisted config) are considered already validated — they were previously confirmed by the user or validated against the Jira API.

### Persistence

Once a valid project key is determined (from any source), persist it to `.kiro/jira-project.json` in the workspace root:

```json
{
  "defaultProjectKey": "SISCONV",
  "resolvedFrom": "pom.xml/issueManagement",
  "resolvedAt": "2026-07-01",
  "jiraUrl": "https://jira.tre-pr.jus.br"
}
```

The `resolvedFrom` field records the source for traceability:
- `"pom.xml/issueManagement"` — extracted from `<issueManagement>` URL
- `"pom.xml/artifactId"` — derived from `<artifactId>` and validated
- `"user"` — explicitly provided by the user

### Multi-module Maven Projects

For multi-module Maven projects, always resolve from the **root (parent) POM**, not individual module POMs. The Jira project key applies to the entire workspace — there is only one key per workspace.

### Cross-project Queries

The default project key is used **only for contextual operations** (commit traceability, default JQL scope). The user can always query any project explicitly:

- "List issues in INFRA" → searches project INFRA regardless of default
- "Create a bug in DEVOPS" → creates in DEVOPS regardless of default
- "Search PROJ-456" → fetches from whatever project PROJ is

The default key restricts only:
- The JQL `project = PROJ` clause in automatic issue searches during commits
- The project used when creating issues automatically (commit traceability workflow)

### Changing the Default

If the user says "change the Jira project to INFRA" or the workspace context changes, update `.kiro/jira-project.json` with the new key and set `resolvedFrom` to `"user"`.

## Exceptions

The following commits MAY be exempt from the issue requirement (user must explicitly confirm the exemption):

- Initial commit in a new repository
- Merge commits (generated by Git, not authored manually)
- Commits that only modify `.gitignore`, `.gitattributes`, or similar meta-files with no functional impact

## Mutual Exclusion with gitlab-trepr

This steering file and the associated hook (`enforce-commit-jira-link.json`) are **mutually exclusive** with the GitLab equivalents from the `gitlab-trepr` power:

| Component | jira-trepr | gitlab-trepr |
|-----------|-----------|--------------|
| Hook | `enforce-commit-jira-link.json` | `enforce-commit-issue-link.json` |
| Steering | `commit-jira-traceability.md` | `commit-issue-traceability.md` |
| Issue format | `PROJ-123` | `#N` |
| Backend | Jira REST API | GitLab REST API |

**Rules:**
- Only ONE hook should be `"enabled": true` per workspace at any time
- The hook accepts both Jira (`PROJ-123`) and GitLab (`#N`) formats as valid references — this avoids blocking commits that already have a valid reference from the other system
- For **creating** and **searching** issues, only the Jira backend is used when this hook is active
- If the workspace switches from Jira to GitLab (or vice versa), the user must explicitly change which hook is enabled
