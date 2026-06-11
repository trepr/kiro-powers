---
name: doc-writer
description: 'Writes and updates all project documentation files (.md). Auto-detects changes in the powers directory and propagates them to documentation. Use when the user says "update docs", "sync documentation", or "write docs".'
---

# Documentation Writer

**Goal:** Keep all project documentation accurate and consistent with the current state of the powers directory. Automatically detect discrepancies between power configurations and documentation, then fix them.

## Language Rules

| Target audience | Language | Examples |
|---|---|---|
| AI agents / LLMs | English | `.kiro/**/*.md`, `AGENTS.md`, `*.kiro.hook` |
| Human developers | Brazilian Portuguese | `CONTRIBUTING.md`, `powers/**/POWER.md` |

When in doubt: if the file is referenced in a steering rule or agent instruction, write in English. If it appears for human consumption (power docs, contribution guide), write in Brazilian Portuguese.

## Scope

All `.md` files in the repository:

- `.kiro/steering/product.md` — Product overview (English)
- `.kiro/steering/structure.md` — Project structure and conventions (English)
- `.kiro/steering/tech.md` — Tech stack and commands (English)
- `.kiro/steering/language.md` — Language rules (English)
- `CONTRIBUTING.md` — Contribution workflow (Portuguese)
- `powers/**/POWER.md` — Power documentation (Portuguese)

## Source of Truth

The source of truth for this repository is:

| Fact | Source |
|------|--------|
| Available powers | Directories under `powers/` |
| MCP server config | `powers/<name>/mcp.json` |
| Power capabilities | `powers/<name>/POWER.md` front-matter (name, displayName, description, keywords) |
| Supported assets | Files present in each power directory |
| Tech requirements | `NODE_OPTIONS`, env vars in `mcp.json` |

## Execution

### Step 1: Scan Powers Directory

Read all power directories under `powers/`:
- List of powers (directory names)
- Front-matter metadata from each `POWER.md` (name, displayName, description, keywords, author)
- MCP server names and packages from each `mcp.json`
- Environment variables and configuration options
- Supporting assets (certificates, scripts)

### Step 2: Scan Existing Documentation

Read all `.md` files listed in Scope above. Build a checklist of facts each document asserts (power names, descriptions, env vars, commands, prerequisites).

### Step 3: Detect Discrepancies

Compare powers-directory-derived facts against documentation assertions. Flag:
- **Missing powers** — a power directory exists but is not documented in steering files
- **Removed powers** — a power mentioned in docs no longer has a directory
- **Config drift** — env vars or MCP server packages in docs differ from `mcp.json`
- **Stale prerequisites** — Node.js version or other requirements changed
- **Missing assets** — files present in power directory but not documented in POWER.md
- **Keyword/description mismatch** — POWER.md front-matter doesn't match what steering files say

### Step 4: Report Findings

Present a summary table of detected discrepancies to the user:

```
| File | Section | Issue | Current (Source) | Documented |
|------|---------|-------|------------------|------------|
| ... | ... | ... | ... | ... |
```

### Step 5: Apply Fixes

After user confirmation (or immediately if invoked with "fix all"):
- Update each affected documentation file
- Preserve existing prose style and formatting
- Maintain the correct language for each file (English vs Portuguese)
- Keep tables and code blocks synchronized with actual config

### Step 6: Validate Consistency

After updates, cross-check that:
- All steering files agree on the same set of powers
- All documentation agrees on prerequisites (Node.js version, etc.)
- POWER.md front-matter matches what product.md describes
- Environment variables documented match those in mcp.json
- No orphan references exist (mentioning powers or configs that don't exist)

## Writing Guidelines

### For English (agent-targeted) files
- Use concise technical prose
- Prefer tables and bullet lists over paragraphs
- Include code examples for commands
- Use backticks for all file names, paths, env vars, and package names

### For Portuguese (human-targeted) files
- Write in clear, professional Brazilian Portuguese
- Keep technical terms in English (OAuth2, MCP, Node.js, etc.) — do not translate or conjugate them
- Follow the language rules in `.kiro/steering/language.md`

## Halt Conditions

- HALT if a `mcp.json` cannot be parsed (malformed JSON)
- HALT if a discrepancy is ambiguous (e.g., power exists but purpose is unclear) — ask the user
- HALT if updating would require removing substantial content the user may want to preserve

## Validation

- Every directory under `powers/` must be mentioned in `product.md` and `structure.md`
- MCP server packages in `tech.md` must match those in `mcp.json` files
- Node.js version requirements must be consistent across all docs
- POWER.md front-matter `name` must match its directory name
- Environment variables documented in POWER.md must match `mcp.json`
