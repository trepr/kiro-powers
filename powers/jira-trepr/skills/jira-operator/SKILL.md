---
name: jira-operator
description: "Operates the jira-trepr power to manage Jira issues, projects, boards, sprints and worklogs on the TRE-PR internal Jira Server instance."
---

# Jira Operator

This skill provides structured instructions for interacting with the TRE-PR internal Jira Server instance (`jira.tre-pr.jus.br`) through the `jira-trepr` power. It covers power activation, issue referencing conventions, common workflows (search, create, update issues, boards, sprints, worklogs), error handling, and security best practices.

All Jira operations are performed via MCP tools exposed by the `jira-trepr` power. Follow the sections below in order — activation and conventions apply as context to every subsequent workflow.

## Power Activation

Before invoking any Jira tool, you must activate the `jira-trepr` power and confirm the MCP server is available.

### Activation Steps

1. **Activate the power:**
   ```
   kiro_powers action="activate" powerName="jira-trepr"
   ```

2. **Verify availability:** Confirm that the `toolsByServer` response contains a `jira` server entry with the expected tools. Review the tool names and their input schemas — actual tool names are discovered at activation time since they depend on the MCP package version.

3. **Invoke tools:** For all subsequent Jira operations, use:
   ```
   kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<tool_name>" arguments={...}
   ```

### Activation Failure

If activation of the `jira-trepr` power fails for any reason:

- **Report the failure** to the user immediately, including any error details returned.
- **Do not attempt** to invoke any Jira MCP tools until activation succeeds.
- Suggest the user verify that the power is installed and configured correctly in their Powers panel.

## Issue Reference Convention

Jira issues and projects use specific identifier formats. Always follow these rules when referencing them.

### Issue Keys

- Issues use the format `PROJ-123` (project key + hyphen + number).
- The project key is uppercase alphanumeric (e.g., `SISCONV`, `INFRA`, `DEVOPS`).
- Examples: `SISCONV-45`, `INFRA-7`, `DEVOPS-312`

### Project Keys

- Projects are referenced by their **key** (not by name or path).
- Examples: `SISCONV`, `INFRA`, `DEVOPS`, `JURISPRUD`

### Ambiguous References

- If the user provides a reference that does not match the `PROJ-123` pattern, ask for clarification.
- Example prompt: "Could you provide the full Jira issue key? For example: `SISCONV-45`"

## Search Issues (JQL)

Search for issues using Jira Query Language (JQL). The MCP server exposes tools that execute JQL queries against the Jira REST API v2.

### Common JQL Queries

| Purpose | JQL |
|---------|-----|
| My open issues | `assignee = currentUser() AND status != Done` |
| Project in progress | `project = SISCONV AND status = "In Progress"` |
| Recent bugs | `labels = bug AND created >= -7d` |
| My sprint issues | `sprint in openSprints() AND assignee = currentUser()` |
| Unassigned in project | `project = INFRA AND assignee is EMPTY` |
| High priority | `priority = High AND status != Done` |
| Updated this week | `project = DEVOPS AND updated >= startOfWeek()` |

### Usage

After activating the power, use the search/JQL tool discovered during activation:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<search_tool>" arguments={"jql": "assignee = currentUser() AND status != Done"}
```

**Example prompts:**
- "Search my open Jira issues"
- "Find bugs created in the last 7 days"
- "List issues in SISCONV that are In Progress"

## Create Issues

Create new issues in Jira. This is a **write operation**.

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `project` | Project key | `SISCONV` |
| `summary` | Issue title | `Fix login timeout on SSO` |
| `issuetype` | Type of issue | `Task`, `Bug`, `Story` |

### Optional Fields

| Field | Description | Example |
|-------|-------------|---------|
| `description` | Detailed description | `Users report timeout after 30s...` |
| `assignee` | Username to assign | `joao.silva` |
| `priority` | Issue priority | `High`, `Medium`, `Low` |
| `labels` | Labels array | `["bug", "frontend"]` |

### Usage

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<create_issue_tool>" arguments={"project": "SISCONV", "summary": "Fix login timeout", "issuetype": "Bug", "description": "Users report timeout after 30s on the login page."}
```

On success, the tool returns the key of the created issue (e.g., `SISCONV-128`).

**Example prompts:**
- "Create a Bug in SISCONV titled 'Fix login timeout'"
- "Open a new Task in INFRA for setting up monitoring alerts"
- "Create a Story in DEVOPS about automating deployment"

## Update Issues (Transitions, Comments, Assignment)

Update existing Jira issues: execute workflow transitions, add comments, or change assignee. All update operations are **write operations**.

### Transitions

Workflow transitions move issues between statuses (e.g., "To Do" → "In Progress" → "Done").

1. **List available transitions** for an issue to discover valid transition IDs:
   ```
   kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<get_transitions_tool>" arguments={"issueKey": "SISCONV-45"}
   ```

2. **Execute a transition** using the transition ID:
   ```
   kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<transition_tool>" arguments={"issueKey": "SISCONV-45", "transitionId": "31"}
   ```

**Example prompts:**
- "Move SISCONV-45 to In Progress"
- "Transition INFRA-12 to Done"

### Comments

Add comments to an issue for discussion or documentation:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<add_comment_tool>" arguments={"issueKey": "SISCONV-45", "body": "Fixed in commit abc1234. Ready for review."}
```

**Example prompts:**
- "Add a comment to SISCONV-45 saying the fix is ready"
- "Comment on INFRA-12 with the deployment instructions"

### Assignment

Change the assignee of an issue:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<update_issue_tool>" arguments={"issueKey": "SISCONV-45", "assignee": "maria.santos"}
```

**Example prompts:**
- "Assign SISCONV-45 to maria.santos"
- "Reassign INFRA-12 to joao.silva"

## Projects & Boards

Navigate Jira project structure: list projects and boards.

### List Projects

Retrieve projects accessible by the authenticated user:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<list_projects_tool>" arguments={}
```

**Example prompts:**
- "List my Jira projects"
- "Show all projects I have access to in Jira"

### List Boards

Retrieve boards (Scrum or Kanban) via the Jira Agile API:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<list_boards_tool>" arguments={}
```

**Example prompts:**
- "List Jira boards"
- "Show the Scrum boards available"
- "What Kanban boards exist in Jira?"

## Sprints

Manage sprints associated with Scrum boards.

### List Sprints

Retrieve sprints for a specific board:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<list_sprints_tool>" arguments={"boardId": "42"}
```

### Get Sprint Details

Retrieve details of a specific sprint:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<get_sprint_tool>" arguments={"sprintId": "15"}
```

**Example prompts:**
- "List sprints for board 42"
- "Show the active sprint on the SISCONV board"
- "What are the open sprints?"

## Worklogs

Register and list time spent on issues.

### Add Worklog

Register time spent on an issue:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<add_worklog_tool>" arguments={"issueKey": "SISCONV-45", "timeSpent": "2h", "comment": "Implemented login timeout fix"}
```

The `timeSpent` field uses Jira duration format: `1d` (day), `4h` (hours), `30m` (minutes), or combinations like `1d 2h 30m`.

### List Worklogs

Retrieve worklogs registered on an issue:

```
kiro_powers action="use" powerName="jira-trepr" serverName="jira" toolName="<list_worklogs_tool>" arguments={"issueKey": "SISCONV-45"}
```

**Example prompts:**
- "Log 2 hours on SISCONV-45 with comment 'Fixed timeout issue'"
- "Show worklogs for INFRA-12"
- "Register 30 minutes on DEVOPS-7"

## Error Handling

When a Jira MCP tool invocation results in an error, evaluate the error against the following patterns **in priority order** (first match wins). Apply the corresponding response and do not check subsequent patterns once a match is found.

### 1. 401 Unauthorized

**Pattern:** HTTP status code 401 or error message indicating unauthorized access.

**Response:** Inform the user that their credentials may be incorrect or expired. Suggest verifying the `JIRA_USERNAME` and `JIRA_PASSWORD` environment variables.

Example message to user:
> "The Jira API returned a 401 Unauthorized error. Please verify that your `JIRA_USERNAME` and `JIRA_PASSWORD` environment variables are correctly configured. The password value can be your Jira password or an API token."

### 2. 404 Not Found

**Pattern:** HTTP status code 404 or error message indicating resource not found.

**Response:** Ask the user to verify that:
- The issue key is correct and uses the format `PROJ-123`.
- The project key exists in Jira.
- The user has access to the project.

Example message to user:
> "The Jira API returned a 404 Not Found error. Please verify that the issue key (e.g., `SISCONV-45`) or project key (e.g., `SISCONV`) is correct and that you have access to the resource in Jira."

### 3. SSL Certificate Errors

**Pattern:** Error message contains `"self-signed certificate in certificate chain"`, `"unable to verify the first certificate"`, or `"UNABLE_TO_VERIFY_LEAF_SIGNATURE"`.

**Response:** Suggest verifying that:
- Node.js version is 22 or higher (required for `--use-system-ca` flag).
- The internal CA certificate (TRE-PR root CA) is installed in the Windows Certificate Store.

Example message to user:
> "An SSL certificate error occurred. Please verify that Node.js 22+ is installed (`node --version`) and that the TRE-PR internal CA certificate is installed in the Windows Certificate Store. You can check with `certutil -store Root "ACRAIZ"` and install it with `certutil -addstore Root "powers/jira-trepr/tre-root-v3.crt"` if needed."

### 4. No Tools Available

**Pattern:** MCP server reports no tools available after connection, or `toolsByServer` response is empty or does not contain the `jira` server entry.

**Response:** Suggest verifying that:
- Node.js 22+ and `npx` are installed and accessible in the system PATH.
- The `JIRA_USERNAME`, `JIRA_PASSWORD`, and `JIRA_URL` environment variables are defined.
- Then reconnect the `jira-trepr` power via the Powers panel.

Example message to user:
> "The MCP server connected but no tools are available. Please verify that Node.js 22+ (`node --version`) and npx (`npx --version`) are installed and accessible in your system PATH, that the environment variables `JIRA_USERNAME`, `JIRA_PASSWORD`, and `JIRA_URL` are defined, then reconnect the `jira-trepr` power in the Powers panel."

### 5. Catch-All (Any Other Error)

**Pattern:** Any error that does not match patterns 1 through 4 above.

**Response:** Present the original error message to the user without modification, and suggest checking the Troubleshooting section of `POWER.md` for additional guidance.

Example message to user:
> "A Jira operation failed with the following error: `<original error message>`. For additional troubleshooting steps, please check the Troubleshooting section in the power's POWER.md file."

## Security

Security-conscious behavior is mandatory when interacting with the Jira API. Follow these rules at all times.

### Destructive Operation Confirmation

Before performing any destructive operation, you **must** request explicit user confirmation. Present a description of the action and its impact, then wait for the user to confirm before proceeding.

**Destructive operations requiring confirmation:**

| Category | Operations |
|----------|-----------|
| Issues | Close issue, delete issue |
| Transitions | Transitions that close or resolve an issue |
| Worklogs | Delete worklog |

**Confirmation format:**

When requesting confirmation, clearly state:
1. The specific action to be performed (e.g., "Transition `SISCONV-45` to Done")
2. The impact (e.g., "This will close the issue and mark it as resolved")

**Abort on no response:**

If the user does not respond to a confirmation prompt within the same conversation turn, **abort the destructive operation** and inform the user: "The action was not performed because confirmation was not received."

### Credential Safety

**Never** include passwords, API tokens, or any credentials in:
- Terminal output or command responses
- File contents written to disk
- Commit messages or issue comments
- Any agent-generated text visible to users or stored in version control

If a tool response contains a credential value, do not echo it back to the user. Reference it by name only (e.g., "the configured JIRA_PASSWORD") without revealing the actual value.

## Installation

This skill is distributed as part of the `jira-trepr` power and must be copied into the consumer's workspace to activate.

### Source Path (this repository)

```
powers/jira-trepr/skills/jira-operator/SKILL.md
```

### Target Path (consumer workspace)

```
.kiro/skills/jira-operator/SKILL.md
```

### Steps

1. Copy the file from this repository:
   ```
   powers/jira-trepr/skills/jira-operator/SKILL.md
   ```

2. Place it in your workspace at:
   ```
   .kiro/skills/jira-operator/SKILL.md
   ```

3. Restart Kiro or reload the workspace. The skill will activate automatically when you mention Jira-related topics (e.g., "issue", "sprint", "board", "worklog", "JQL").
