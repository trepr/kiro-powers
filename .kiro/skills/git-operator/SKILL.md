---
name: git-operator
description: 'Executes Git operations following the TRE-PR semi-linear workflow with Conventional Commits. Handles branching, commits, rebasing, merge request preparation, and CI/CD pipeline interaction. Use when the user says "commit", "push", "branch", "rebase", "merge request", "MR", "git status", "git log", or any Git-related operation.'
---

# Git Operator

**Goal:** Execute Git operations safely and correctly following the TRE-PR semi-linear merge workflow as defined in the Norma Técnica (NT-Repositório de Códigos Fonte) and related procedures (POPs).

## Workflow Model

This project uses **merge commits with semi-linear history**:
- The branch must always be rebased onto `main` before merge (mandatory)
- Merge commits are preserved with `--no-ff` to maintain branch context
- Squash commits are NOT used — individual commit history is preserved
- Foxtrot merges are strictly forbidden (rebase prevents them)
- After merge, the source branch is deleted

## Required Git Configuration

Before any operation, the following configurations must be active (per NT):

```ini
[core]
  autocrlf = false
[init]
  defaultBranch = main
[fetch]
  prune = true
[branch]
  autosetuprebase = always
[pull]
  rebase = true
```

Commands to set:
```shell
git config --global core.autocrlf false
git config --global init.defaultBranch main
git config --global fetch.prune true
git config --global branch.autoSetupRebase always
git config --global pull.rebase true
```

## Branch Strategy

### Branch Types

| Type | Naming | Created from | Merges into | CI/CD |
|------|--------|--------------|-------------|-------|
| Principal | `main` | — | — | Recusa construção |
| Evolutivo | `N.N.N` (versão alvo, e.g., `1.0.0`, `2.1.0`) | `main` | `main` (via MR) | Construção DEV + PROD |
| Auxiliar | Livre (e.g., `feat-login`, `fix-paginacao`) | Branch evolutivo | Branch evolutivo (via `--ff-only`) | Nenhuma |

### Rules
- **main**: Protected. Push: ninguém. Merge: apenas via Merge Request no GitLab.
- **Branches evolutivos**: Protected (wildcard `*.*.*`). Push/Merge: desenvolvedores e mantenedores.
- **Branches auxiliares**: Ephemeral. May be local-only or pushed. No CI/CD.
- Recommendation: only one evolutionary branch for major/minor versions; multiple concurrent patch branches allowed.

## Execution

### Operation: Status Check

1. Run `git status` to show working tree state
2. Run `git log --oneline -10` for recent history if requested
3. Report current branch, uncommitted changes, and ahead/behind status

### Operation: Create Branch

#### Evolutionary branch (from main):
```shell
git fetch --all --prune origin
git fetch origin main:main
git switch --create {version} main  # e.g., 1.0.0
```

#### Auxiliary branch (from evolutionary):
```shell
git switch {evolutionary-branch}
git pull --rebase
git switch --create {branch-name}
```

### Operation: Commit

1. Run `git status` to see what's changed
2. Stage specific files (prefer explicit `git add <file>` over `git add .`)
3. Verify staged content with `git diff --cached --stat`
4. Compose commit message following Conventional Commits (see format below)
   - **Commit messages must be written in Brazilian Portuguese** (except the Conventional Commits `type` and `scope` tokens, which remain in English)
5. Write the commit message to a temporary file and execute the commit using that file (see "Commit Message via Temporary File" below)
6. Never use `--no-verify` unless the user explicitly requests it

### Commit Message via Temporary File

Always use a temporary file for the commit message body instead of the inline `-m` flag. This avoids shell escaping issues, supports multi-line messages with trailers, and provides auditability if the commit command fails.

**Required steps:**

1. **Write the message** to `COMMIT_MSG` (preferred) or `COMMIT_EDITMSG` in the repository root:
   ```
   fs_write path="COMMIT_MSG" text="<full commit message>"
   ```

2. **Execute the commit** referencing the file:
   ```shell
   git commit -F COMMIT_MSG
   ```

3. **Delete the temporary file** after the commit succeeds:
   ```shell
   del COMMIT_MSG
   ```

**Why file-based over inline `-m`:**

| Concern | Inline `-m` | File-based `-F` |
|---------|-------------|-----------------|
| Multi-line messages | Requires awkward escaping or multiple `-m` flags | Natural multi-line content |
| Special characters | Shell-dependent escaping (`"`, `!`, `$`, backticks) | No escaping needed |
| Trailers (e.g., `Relates-to:`) | Hard to format correctly inline | Trivially appended as lines |
| Auditability | Message lost if command fails | File persists for retry |

**File naming:**
- **`COMMIT_MSG`** — Primary name (preferred).
- **`COMMIT_EDITMSG`** — Alternative, matching Git's own convention.

Both must be listed in `.gitignore` to prevent accidental commits.

**NEVER use `git commit -m "..."`** — always use `git commit -F COMMIT_MSG`.

### Operation: Pull / Sync

Always use rebase mode (configured globally, but be explicit):
```shell
git pull --rebase
```

If working directory has uncommitted changes:
```shell
git stash -u
git pull --rebase
git stash pop
```

**Frequency**: At minimum 1 pull per day (start of day recommended). Additional pulls whenever teammates report changes.

### Operation: Push

**Frequency**: At minimum 1 push per day to share work with the team.

1. Verify the branch is NOT `main` — never push directly
2. For first push: `git push -u origin {branch-name}`
3. For subsequent pushes: `git push`
4. If push is rejected (remote has new commits):
   ```shell
   git pull --rebase
   # resolve conflicts if any
   git push
   ```
5. Never force-push without explicit user authorization

### Operation: Rebase onto main/evolutionary

**MANDATORY before opening any Merge Request.**

```shell
git fetch --all --prune origin
git fetch origin main:main
git rebase main
```

Or for auxiliary branch onto evolutionary:
```shell
git fetch --prune
git rebase {evolutionary-branch}
```

If conflicts arise:
- Report conflicting files to the user
- Help resolve conflicts if asked
- Continue with `git rebase --continue`
- Never use `git rebase --skip` without user confirmation

### Operation: Merge Auxiliary Branch into Evolutionary

Auxiliary branches merge with fast-forward only (no merge commit):
```shell
git switch {auxiliary-branch}
git rebase {evolutionary-branch}
git switch {evolutionary-branch}
git merge {auxiliary-branch} --ff-only
git branch -d {auxiliary-branch}
# If branch exists on remote:
git push origin --delete {auxiliary-branch}
```

If `--ff-only` fails, it means the auxiliary branch needs rebasing first.

### Operation: Prepare Merge Request (Evolutionary → main)

Merge Requests from evolutionary to main are done **exclusively via GitLab**.

1. Ensure branch is rebased onto main:
   ```shell
   git fetch --all --prune origin
   git fetch origin main:main
   git rebase main
   git push
   ```
2. Verify build passes: `mvn clean package`
3. Verify checkstyle: `mvn checkstyle:check`
4. Create MR in GitLab:
   - Source branch: evolutionary branch
   - Target branch: `main`
   - Settings: `--no-ff` (merge commit), delete source branch after merge, NO squash
5. Pipeline validation:
   - Jenkins will run a PROD simulation build
   - SNAPSHOT dependencies are forbidden in release builds (enforcer will block)
   - If rebase is needed, GitLab will block the merge

## Commit Message Format (Conventional Commits)

```
<type>[(<scope>)][!]: <subject>

[<body>]

[<footer>]
```

### Types

| type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `test` | Adding/changing tests |
| `chore` | Maintenance, tooling, config |

### Rules
- **Subject**: imperative mood, present tense, no capitalization, no period, max 50 chars — **in Brazilian Portuguese**
- **Body**: explain *what* and *why*, wrap at 72 chars — **in Brazilian Portuguese**
- **Footer**: reference Jira tickets, breaking changes (tags in English, descriptions in Portuguese)
- **Breaking Changes**: append `!` after type/scope AND add `BREAKING CHANGE:` in footer
- **Imperative test**: "Se aplicado, esse commit irá {subject}" must read naturally
- **Language**: `type` and `scope` remain in English; `subject`, `body`, and `footer` descriptions are written in Brazilian Portuguese

### Scope (optional)
Describes the area affected. Examples: `jpa`, `auth`, `api`, `usuarios`, `bom`, `pom`

### Footer patterns
```
Closes: SAEL-1234
References: SAEL-322, #121
BREAKING CHANGE: description of the breaking change
See also: SAEL-567
Assisted-by: Kiro
```

### Assisted-by (mandatory when AI-assisted)
When a commit is authored or substantially assisted by an AI tool, the footer **must** include the `Assisted-by` tag identifying the tool:
```
Assisted-by: Kiro
```
This tag is always the last line in the footer. If multiple tools were used, list each on its own line.

### Examples

```
feat(bom): adicionar MicroProfile Health 4.0.1 ao jakarta-bom

- Adicionada dependência microprofile-health-api
- Necessário para readiness/liveness probes no WildFly

References: SDS-456
Assisted-by: Kiro
```

```
fix(wildfly-bom): atualizar Hibernate para 6.4.1

- Alinhado com a versão do runtime WildFly 31
- Versão anterior causava LazyInitializationException em batch jobs

Closes: SDS-789
Assisted-by: Kiro
```

```
chore: atualizar maven-checkstyle-plugin para 3.6.0

- Necessário para compatibilidade com Checkstyle 10.20.2
- Alinhado com o ruleset checkstyle-config:2.0

Assisted-by: Kiro
```

## CI/CD Pipeline Integration

### Pipeline triggers (via GitLab webhook to Jenkins):
- **Push to evolutionary branch** → DEV build (generates DEV container image, deploys to DEV namespace)
- **MR opened** → PROD simulation build (validates no SNAPSHOTs, build succeeds)
- **MR merged** → PROD build (creates version tag, generates release + DEV + HMG images, deploys to DEV + HMG)

### Important notes:
- Branch name must match Maven version in POM (e.g., branch `1.0.0` → POM version `1.0.0-SNAPSHOT`)
- Newly created branches may fail first Jenkins build if version doesn't match — this is expected
- Push to `main` ref is refused by Jenkins
- Manual Jenkins builds accept a git ref: evolutionary branch → DEV build, tag → PROD build

## Safety Rules

### NEVER do (without explicit user authorization):
- ❌ `git push --force` or `--force-with-lease` to any branch
- ❌ `git reset --hard` (data loss risk)
- ❌ `git clean -f` or `git clean -fd` (deletes untracked files)
- ❌ `git branch -D` (force-deletes unmerged branches)
- ❌ Push directly to `main`
- ❌ `git commit --amend` on already-pushed commits
- ❌ `git rebase -i` (requires interactive input, unsupported)
- ❌ Squash commits on merge

### ALWAYS do:
- ✅ Check `git status` before any destructive operation
- ✅ Stage files explicitly rather than using `git add .`
- ✅ Rebase onto main before preparing a Merge Request
- ✅ Use `git pull --rebase` (configured globally, but enforce explicitly)
- ✅ Use Conventional Commits format for all commit messages
- ✅ Reference Jira tickets in footer when applicable
- ✅ Verify build passes before recommending a push/MR
- ✅ Ask for confirmation before any destructive operation
- ✅ Ensure `user.name` and `user.email` are configured correctly

### Amend Rules:
- Only amend your own unpushed commits
- Prefer creating a new commit over amending
- If pre-commit hooks modify files, amend to incorporate those changes

## Conflict Resolution

When conflicts occur during rebase:

1. Run `git status` to identify conflicting files
2. Show the conflict markers to the user
3. If the conflict is in `pom.xml`:
   - Prefer the incoming (main/evolutionary) version for dependency versions
   - Preserve the branch's structural changes (new modules, new dependencies)
   - Ensure the result is valid XML
4. After resolution: `git add <resolved-files>` then `git rebase --continue`
5. Never blindly accept "ours" or "theirs" — always inspect the diff

## Halt Conditions

- HALT if the user asks to force-push to `main` — explain the risk, ask for confirmation
- HALT if a rebase produces more than 5 conflicts — suggest the user review manually
- HALT if `git status` shows uncommitted changes that would be lost by the next operation
- HALT if the working directory has untracked files that might be important before running `git clean`
- HALT if branch name doesn't match expected version pattern for evolutionary branches

## Reference

| Resource | URL |
|----------|-----|
| GitLab | `https://gitlab.tre-pr.jus.br/sds/apps/` |
| Jira | `https://jira.tre-pr.jus.br` |
| Jenkins Pipelines | GitLab project: Jenkins Pipeline |
| Wiki: Interagindo com repositório Git | `https://wikidev.tre-pr.jus.br/wiki/Interagindo_com_um_repositório_Git` |
| Wiki: Commit template | `https://wikidev.tre-pr.jus.br/wiki/GIT:_commit_template` |
| Wiki: Esteira de construção | `https://wikidev.tre-pr.jus.br/wiki/Esteira_de_construção_Git` |
| Wiki: Configuração ferramentas | `https://wikidev.tre-pr.jus.br/wiki/Configuração_das_ferramentas_para_acesso_ao_Git` |
| Wiki: NT Repositório | `https://wikidev.tre-pr.jus.br/wiki/NT-Repositório_de_Códigos_Fonte` |
| Wiki: PIT Repositório | `https://wikidev.tre-pr.jus.br/wiki/PIT_-_Repositório_de_Códigos_Fonte_Git` |
