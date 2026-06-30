---
name: git-operator
description: 'Executes Git operations following the TRE-PR semi-linear workflow with Conventional Commits. Handles branching, commits, rebasing, merge request preparation, and CI/CD pipeline interaction. Use when the user says "commit", "push", "branch", "rebase", "merge request", "MR", "git status", "git log", or any Git-related operation.'
---

# Git Operator (Dispatcher)

This skill acts as a lightweight router. It activates on Git-related keywords and delegates execution to the appropriate agent based on operation complexity.

## Activation Keywords

This skill triggers when the user mentions: `commit`, `push`, `pull`, `branch`, `rebase`, `merge`, `merge request`, `MR`, `git status`, `git log`, `git diff`, `tag`, `stash`, `conflict`, `resolve`, or any other Git-related operation.

## Agent Routing

### Route to `git-operator` agent (routine operations):

Delegate when the user asks for:
- Commit changes
- Push to remote
- Pull / sync
- Create a branch (evolutionary or auxiliary)
- Check status or log
- Stash / unstash
- Simple fast-forward merge (auxiliary → evolutionary)
- Fetch remote refs

```
invoke_sub_agent(
  name: "git-operator",
  prompt: "<describe the user's Git request>",
  explanation: "Routing routine Git operation to git-operator (Haiku)."
)
```

### Route to `git-resolver` agent (complex operations):

Delegate when the user asks for:
- Resolve conflicts (rebase or merge)
- Prepare a Merge Request (includes rebase + build + MR creation)
- Review or analyze diffs before push
- Any operation explicitly involving conflict resolution
- Rebase when conflicts are expected or mentioned

```
invoke_sub_agent(
  name: "git-resolver",
  prompt: "<describe the user's Git request with relevant context>",
  explanation: "Routing complex Git operation to git-resolver (requires semantic reasoning)."
)
```

### Escalation handling

If `git-operator` returns an escalation message (starting with "ESCALATE TO git-resolver:"), immediately invoke `git-resolver` with the escalation context:

```
invoke_sub_agent(
  name: "git-resolver",
  prompt: "<original user request + escalation context from git-operator>",
  explanation: "Escalating from git-operator: <reason from escalation message>"
)
```

## Routing Decision Table

| User request pattern | Route to |
|---------------------|----------|
| "commit", "faça o commit" | `git-operator` |
| "push", "envie para o remote" | `git-operator` |
| "pull", "sincronize" | `git-operator` |
| "crie uma branch", "nova branch" | `git-operator` |
| "git status", "o que mudou" | `git-operator` |
| "git log", "histórico" | `git-operator` |
| "stash", "guarde as alterações" | `git-operator` |
| "merge request", "MR", "prepare o MR" | `git-resolver` |
| "resolva os conflitos", "conflito" | `git-resolver` |
| "rebase" (with mention of conflicts) | `git-resolver` |
| "rebase" (no mention of conflicts) | `git-operator` |
| "revise as alterações", "review diff" | `git-resolver` |
| "analise o diff", "o que vai ser enviado" | `git-resolver` |

## Critical Safety Rules (always enforced, even before delegation)

These rules are non-negotiable and must be checked BEFORE routing:

1. **Never push to `main`** — reject immediately if the user asks
2. **Never force-push** without explicit user authorization
3. **Never use `--no-verify`** without explicit user authorization
4. **Never use `git reset --hard`** without explicit user authorization
5. **Never squash commits** on merge

If the user's request violates any of these, inform them of the risk and ask for confirmation before routing.

## When NOT to delegate

For trivial read-only queries, you may answer directly without invoking any agent:
- `git status` — run it and report the result
- `git log --oneline -N` — run it and show the output
- `git branch` / `git branch -a` — list branches directly

For anything that **modifies** the repository, always delegate to the appropriate agent.

## Halt Condition Handling

If either agent returns a halt condition, relay the message to the user verbatim and wait for their decision before re-invoking.
