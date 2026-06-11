---
name: gitlab-operator
description: "Operates the gitlab-trepr power to manage gitlab projects, merge request workflows, pipeline monitoring, issue tracking, wiki pages, release management, and milestone planning on the TRE-PR internal GitLab instance."
---

# GitLab Operator

This skill provides structured instructions for interacting with the TRE-PR internal GitLab instance (`gitlab.tre-pr.jus.br`) through the `gitlab-trepr` power. It covers power activation, project referencing conventions, read-only mode enforcement, common workflows (merge requests, issues, pipelines, wiki, releases, milestones), error handling, and security best practices.

All GitLab operations are performed via MCP tools exposed by the `gitlab-trepr` power. Follow the sections below in order — activation and conventions apply as context to every subsequent workflow.

## Power Activation

Before invoking any GitLab tool, you must activate the `gitlab-trepr` power and confirm the MCP server is available.

### Activation Steps

1. **Activate the power:**
   ```
   kiro_powers action="activate" powerName="gitlab-trepr"
   ```

2. **Verify availability:** Confirm that the `toolsByServer` response contains a `gitlab` server entry with the expected tools. Review the tool names and their input schemas to understand available operations and required parameters.

3. **Invoke tools:** For all subsequent GitLab operations, use:
   ```
   kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="<tool_name>" arguments={...}
   ```

### Activation Failure

If activation of the `gitlab-trepr` power fails for any reason:

- **Report the failure** to the user immediately, including any error details returned.
- **Do not attempt** to invoke any GitLab MCP tools until activation succeeds.
- Suggest the user verify that the power is installed and configured correctly in their Powers panel.

## Project Reference Convention

GitLab API operations require project identifiers. Always follow these rules when referencing projects:

### Full Namespace Path (Required)

- Always use the **full namespace path** when referencing projects: `group/subgroup/project`
- Example: `sds/sistemas/meu-projeto`, not just `meu-projeto`

### Personal Namespaces

- For projects under a personal namespace, use: `username/project-name`
- Example: `joao.silva/meu-experimento`

### Ambiguous References

- If the user provides a project reference that contains **no `/` separator** (e.g., just `meu-projeto`), do not guess the namespace.
- **Ask the user** for the full namespace path before making any GitLab API call with that reference.
- Example prompt: "Could you provide the full project path including the namespace? For example: `group/subgroup/project-name`"

## Read-Only Mode

The `gitlab-trepr` power supports a read-only mode that prevents write operations. You must check this setting before any operation that creates, updates, or deletes a GitLab resource.

### Before Any Write Operation

1. **Check** the `GITLAB_READ_ONLY_MODE` environment variable in the power's `mcp.json` configuration (located at `powers/gitlab-trepr/mcp.json`).

2. **If `GITLAB_READ_ONLY_MODE` is `true`:**
   - Decline the write operation.
   - Inform the user: "Write operations are unavailable because the power is configured in read-only mode. To enable write access, set `GITLAB_READ_ONLY_MODE` to `false` in the power's `mcp.json` file."

3. **If `GITLAB_READ_ONLY_MODE` is `false`:**
   - Proceed with the write operation normally.

### Write Operations Include

Any operation that creates, updates, or deletes a GitLab resource, including but not limited to:
- Creating or updating merge requests
- Creating, updating, or closing issues
- Adding comments or notes
- Creating, updating, or deleting wiki pages
- Creating or deleting releases and tags
- Creating milestones
- Retrying pipelines

## Projects & Merge Requests

### Listing Projects

To list projects the user has access to on the TRE-PR GitLab instance:

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_projects" arguments={}
```

When presenting results, always display the full namespace path for each project (e.g., `sds/sistemas/meu-projeto`).

**Example prompts:**
- "List my projects on GitLab"
- "Show all projects I have access to"

### Listing Merge Requests

To list merge requests for a specific project, use the full namespace path as the project identifier:

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_merge_requests" arguments={"project_id": "group/subgroup/project", "state": "opened"}
```

Always reference the project using its full namespace path (e.g., `sds/sistemas/meu-projeto`).

**Example prompts:**
- "List open merge requests in sds/sistemas/meu-projeto"
- "Show all MRs assigned to me in sds/devops/infra-tools"
- "What merge requests are open in joao.silva/meu-experimento?"

## Code Review

The code review workflow follows a structured, two-step process to systematically review merge request changes.

### Two-Step Review Process

1. **List changed files** in the merge request (identified by project path and MR IID):

   ```
   kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_merge_request_changes" arguments={"project_id": "group/subgroup/project", "merge_request_iid": 42}
   ```

2. **Retrieve the diff** for each changed file to analyze the code:

   ```
   kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="get_merge_request_diff" arguments={"project_id": "group/subgroup/project", "merge_request_iid": 42, "file_path": "src/example.ts"}
   ```

### Handling Large Merge Requests

If the merge request contains **more than 5 changed files**, review one file at a time rather than loading all diffs simultaneously. This ensures thorough analysis without overwhelming context:

- Retrieve the diff for a single file.
- Analyze it and note any issues or suggestions.
- Proceed to the next file.
- Repeat until all changed files have been reviewed.

### Review Summary

When all changed files have been reviewed, indicate that the review is complete and produce a structured review summary containing three sections:

1. **Issues Found** — For each issue, include the file name and a description of the problem.
2. **Improvement Suggestions** — General suggestions for improving code quality, readability, or maintainability.
3. **Approval Recommendation** — One of:
   - **Approve** — The changes are correct and ready to merge.
   - **Request Changes** — Issues must be addressed before merging.
   - **Comment Only** — Minor observations that do not block merging.

Always clearly state "All changed files have been reviewed" before presenting the review summary.

**Example prompts:**
- "Review the merge request !15 in sds/sistemas/meu-projeto"
- "Do a code review of MR !42 in sds/devops/infra-tools"
- "Analyze the changes in merge request !7 of sds/jurisprudencia/busca-api"

## Issues

Manage GitLab issues: create new issues, list existing ones, and close resolved issues.

### List Issues

Retrieve issues for a project, optionally filtering by state or labels.

**MCP tool:** `list_issues`

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_issues" arguments={"project_id": "sds/sistemas/meu-projeto", "state": "opened"}
```

**Example prompts:**
- "List open issues in sds/sistemas/meu-projeto"
- "Show all closed issues in sds/infraestrutura/ansible-playbooks"

### Create Issue

Create a new issue in a project. This is a **write operation** — requires `GITLAB_READ_ONLY_MODE=false` in `mcp.json`.

**MCP tool:** `create_issue`

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="create_issue" arguments={"project_id": "sds/sistemas/meu-projeto", "title": "Fix login timeout", "description": "Users report timeout after 30s on the login page.", "labels": "bug"}
```

**Example prompts:**
- "Create an issue in sds/sistemas/meu-projeto titled 'Fix login timeout' with label bug"
- "Open a new issue in sds/devops/ci-templates describing the pipeline failure on Node 22"

### Close Issue

Close an existing issue by its IID. This is a **write operation** — requires `GITLAB_READ_ONLY_MODE=false` in `mcp.json`.

**MCP tool:** `update_issue` (set `state_event` to `close`)

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="update_issue" arguments={"project_id": "sds/sistemas/meu-projeto", "issue_iid": "42", "state_event": "close"}
```

**Example prompts:**
- "Close issue #42 in sds/sistemas/meu-projeto"
- "Mark issue #15 as closed in sds/infraestrutura/monitoring"

## Pipelines

Monitor CI/CD pipelines: check pipeline status, view job logs, and retry failed pipelines.

### Pipeline Status

Retrieve the status of pipelines for a project or a specific pipeline.

**MCP tool:** `list_pipelines` or `get_pipeline`

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_pipelines" arguments={"project_id": "sds/sistemas/meu-projeto"}
```

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="get_pipeline" arguments={"project_id": "sds/sistemas/meu-projeto", "pipeline_id": "1234"}
```

**Example prompts:**
- "Show the latest pipelines in sds/sistemas/meu-projeto"
- "What is the status of pipeline #1234 in sds/devops/ci-templates?"

### View Job Logs

Retrieve the log output of a specific job within a pipeline.

**MCP tool:** `get_pipeline_job_log`

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="get_pipeline_job_log" arguments={"project_id": "sds/sistemas/meu-projeto", "job_id": "5678"}
```

**Example prompts:**
- "Show the logs for job #5678 in sds/sistemas/meu-projeto"
- "What's the output of the failed job in pipeline #1234 of sds/devops/ci-templates?"

### Retry Pipeline

Retry a failed pipeline. This is a **write operation** — requires `GITLAB_READ_ONLY_MODE=false` in `mcp.json`.

**MCP tool:** `retry_pipeline`

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="retry_pipeline" arguments={"project_id": "sds/sistemas/meu-projeto", "pipeline_id": "1234"}
```

**Example prompts:**
- "Retry pipeline #1234 in sds/sistemas/meu-projeto"
- "Re-run the failed pipeline in sds/devops/ci-templates"

## Wiki

Manage project wiki pages: list existing pages, create new ones, and update content.

### List Wiki Pages

Retrieve all wiki pages for a project.

**MCP tool:** `list_wiki_pages`

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_wiki_pages" arguments={"project_id": "sds/sistemas/meu-projeto"}
```

**Example prompts:**
- "List all wiki pages in sds/sistemas/meu-projeto"
- "Show the wiki page index for sds/infraestrutura/ansible-playbooks"

### Create Wiki Page

Create a new wiki page in a project. This is a **write operation** — requires `GITLAB_READ_ONLY_MODE=false` in `mcp.json`.

**MCP tool:** `create_wiki_page`

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="create_wiki_page" arguments={"project_id": "sds/sistemas/meu-projeto", "title": "Architecture Overview", "content": "# Architecture\n\nThis page describes the system architecture."}
```

**Example prompts:**
- "Create a wiki page titled 'Architecture Overview' in sds/sistemas/meu-projeto"
- "Add a new wiki page called 'Deployment Guide' in sds/devops/ci-templates with content describing the deploy process"

### Update Wiki Page

Update the content of an existing wiki page. This is a **write operation** — requires `GITLAB_READ_ONLY_MODE=false` in `mcp.json`.

**MCP tool:** `update_wiki_page`

```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="update_wiki_page" arguments={"project_id": "sds/sistemas/meu-projeto", "slug": "architecture-overview", "title": "Architecture Overview", "content": "# Architecture\n\nUpdated system architecture documentation."}
```

**Example prompts:**
- "Update the 'Architecture Overview' wiki page in sds/sistemas/meu-projeto with the new diagram section"
- "Edit the wiki page 'Deployment Guide' in sds/devops/ci-templates to include the rollback procedure"

## Releases & Tags

Manage releases and tags for GitLab projects. Creating a release is a write operation — verify that `GITLAB_READ_ONLY_MODE` is `false` before proceeding.

### List Releases

Retrieve all releases for a project.

**MCP tool operation:**
```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_releases" arguments={"project_id": "group/subgroup/project"}
```

**Example prompts:**
- "List all releases in `sds/sistemas/meu-projeto`"
- "Show me the releases for `sds/ferramentas/api-gateway`"

### Create Release

Create a new release for a project. This is a **write operation** — check that `GITLAB_READ_ONLY_MODE` is `false` in the power's `mcp.json` before proceeding.

**MCP tool operation:**
```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="create_release" arguments={"project_id": "group/subgroup/project", "tag_name": "v1.0.0", "name": "Release 1.0.0", "description": "Release notes content"}
```

**Example prompts:**
- "Create a release `v2.1.0` in `sds/sistemas/meu-projeto` with the tag `v2.1.0` and title 'Versão 2.1.0'"
- "Publish a new release for `sds/ferramentas/api-gateway` from tag `v1.3.0`"

### List Tags

Retrieve all tags for a project.

**MCP tool operation:**
```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_tags" arguments={"project_id": "group/subgroup/project"}
```

**Example prompts:**
- "Show all tags in `sds/sistemas/meu-projeto`"
- "List tags for `sds/ferramentas/api-gateway`"

## Milestones

Manage project milestones. Creating a milestone is a write operation — verify that `GITLAB_READ_ONLY_MODE` is `false` before proceeding.

### List Milestones

Retrieve milestones for a project, optionally filtered by state.

**MCP tool operation:**
```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="list_milestones" arguments={"project_id": "group/subgroup/project"}
```

**Example prompts:**
- "List active milestones in `sds/sistemas/meu-projeto`"
- "Show all milestones for `sds/ferramentas/api-gateway`"

### Create Milestone

Create a new milestone for a project. This is a **write operation** — check that `GITLAB_READ_ONLY_MODE` is `false` in the power's `mcp.json` before proceeding.

**MCP tool operation:**
```
kiro_powers action="use" powerName="gitlab-trepr" serverName="gitlab" toolName="create_milestone" arguments={"project_id": "group/subgroup/project", "title": "Sprint 10", "description": "Goals for sprint 10", "due_date": "2025-03-31"}
```

**Example prompts:**
- "Create a milestone 'Sprint 12' in `sds/sistemas/meu-projeto` with due date 2025-04-15"
- "Add a new milestone called 'Release 3.0' to `sds/ferramentas/api-gateway`"

## Error Handling

When a GitLab MCP tool invocation results in an error, evaluate the error against the following patterns **in priority order** (first match wins). Apply the corresponding response and do not check subsequent patterns once a match is found.

### 1. 401 Unauthorized

**Pattern:** HTTP status code 401 or error message indicating unauthorized access.

**Response:** Inform the user that the OAuth token may be expired or revoked. Suggest reconnecting the `gitlab-trepr` power via the Powers panel to trigger re-authentication.

Example message to user:
> "The GitLab API returned a 401 Unauthorized error. Your OAuth token may be expired or revoked. Please reconnect the `gitlab-trepr` power in the Powers panel to re-authenticate."

### 2. 404 Not Found

**Pattern:** HTTP status code 404 or error message indicating resource not found.

**Response:** Ask the user to verify that:
- The project path includes the full namespace (`group/subgroup/project`), not just the project name.
- The user has access to the project in GitLab.

Example message to user:
> "The GitLab API returned a 404 Not Found error. Please verify that the project path includes the full namespace (e.g., `sds/sistemas/meu-projeto`) and that you have access to this project in GitLab."

### 3. SSL Certificate Errors

**Pattern:** Error message contains `"self-signed certificate in certificate chain"` or `"unable to verify the first certificate"`.

**Response:** Suggest verifying that:
- Node.js version is 22 or higher (required for `--use-system-ca` flag).
- The internal CA certificate (TRE-PR root CA) is installed in the Windows Certificate Store.

Example message to user:
> "An SSL certificate error occurred. Please verify that Node.js 22+ is installed (`node --version`) and that the TRE-PR internal CA certificate is installed in the Windows Certificate Store. You can check with `certutil -store Root "ACRAIZ"` and install it with `certutil -addstore Root "powers/gitlab-trepr/tre-root-v3.crt"` if needed."

### 4. No Tools Available

**Pattern:** MCP server reports no tools available after connection, or `toolsByServer` response is empty or does not contain the `gitlab` server entry.

**Response:** Suggest verifying that:
- Node.js 22+ and `npx` are installed and accessible in the system PATH.
- Then reconnect the `gitlab-trepr` power via the Powers panel.

Example message to user:
> "The MCP server connected but no tools are available. Please verify that Node.js 22+ (`node --version`) and npx (`npx --version`) are installed and accessible in your system PATH, then reconnect the `gitlab-trepr` power in the Powers panel."

### 5. Catch-All (Any Other Error)

**Pattern:** Any error that does not match patterns 1 through 4 above.

**Response:** Present the original error message to the user without modification, and suggest checking the Troubleshooting section of `POWER.md` for additional guidance.

Example message to user:
> "A GitLab operation failed with the following error: `<original error message>`. For additional troubleshooting steps, please check the Troubleshooting section in the power's POWER.md file."

## Security

Security-conscious behavior is mandatory when interacting with the GitLab API. Follow these rules at all times.

### Destructive Operation Confirmation

Before performing any destructive operation, you **must** request explicit user confirmation. Present a description of the action and its impact, then wait for the user to confirm before proceeding.

**Destructive operations requiring confirmation:**

| Category | Operations |
|----------|-----------|
| Branch | Delete branch, force push |
| Issues | Close issue, delete issue |
| Wiki | Delete wiki page |
| Tags | Delete tag |
| Releases | Delete release |
| Pipelines | Retry pipeline (side-effect: re-runs jobs, consumes CI minutes) |

**Confirmation format:**

When requesting confirmation, clearly state:
1. The specific action to be performed (e.g., "Delete branch `feature/old-experiment`")
2. The target project (e.g., "in `sds/sistemas/meu-projeto`")
3. The impact (e.g., "This permanently removes the branch and its ref. Open merge requests targeting this branch will be affected.")

**Abort on no response:**

If the user does not respond to a confirmation prompt within the same conversation turn, **abort the destructive operation** and inform the user: "The action was not performed because confirmation was not received."

### Credential Safety

**Never** include OAuth tokens, personal access tokens, or any credentials in:
- Terminal output or command responses
- File contents written to disk
- Commit messages or merge request descriptions
- Any agent-generated text visible to users or stored in version control

If a tool response contains a token or credential value, do not echo it back to the user. Reference it by name only (e.g., "the configured OAuth token") without revealing the actual value.

### Read-Only Mode Recommendation

When the user's stated task involves **only read operations** (e.g., listing projects, reviewing merge requests, checking pipeline status, browsing wiki pages), proactively recommend:

> "Since this task only involves read operations, consider setting `GITLAB_READ_ONLY_MODE=true` in the power's `mcp.json` configuration. This prevents accidental write operations."

This recommendation helps protect against unintended modifications during exploration or review workflows.

## Installation

This skill is distributed as part of the `gitlab-trepr` power and must be copied into the consumer's workspace to activate.

### Source Path (this repository)

```
powers/gitlab-trepr/skills/gitlab-operator/SKILL.md
```

### Target Path (consumer workspace)

```
.kiro/skills/gitlab-operator/SKILL.md
```

### Steps

1. Copy the file from this repository:
   ```
   powers/gitlab-trepr/skills/gitlab-operator/SKILL.md
   ```

2. Place it in your workspace at:
   ```
   .kiro/skills/gitlab-operator/SKILL.md
   ```

3. Restart Kiro or reload the workspace. The skill will activate automatically when you mention GitLab-related topics (e.g., "merge request", "pipeline", "issue", "wiki", "release", "milestone").
 