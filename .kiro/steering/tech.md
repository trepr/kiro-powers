# Tech Stack

## Runtime

- **Node.js 22+** — Required for `--use-system-ca` flag (trusts Windows Certificate Store for internal CA certificates)
- **npx** — Used to run MCP server packages without global installation

## MCP Servers

Powers use MCP (Model Context Protocol) servers as their backend. Configuration is declared in `mcp.json` files within each power directory.

- **@zereight/mcp-gitlab** — GitLab MCP server supporting self-hosted instances with OAuth2 authentication

## Authentication

- OAuth2 Authorization Code Flow (browser-based, no stored tokens in config)
- Internal CA certificates resolved via Node.js `--use-system-ca`

## Languages & Formats

- **Markdown** — Documentation (`POWER.md`) and steering files
- **JSON** — MCP server configuration (`mcp.json`)
- **PEM** — Certificate files (`.crt`)

## Build & Commands

This is a configuration/documentation repository — there is no build step, compilation, or test suite.

| Task | Command |
|------|---------|
| Verify Node.js version | `node --version` |
| Verify npx available | `npx --version` |
| Check internal CA cert | `certutil -store Root "ACRAIZ"` |
| Install internal CA cert | `certutil -addstore Root "powers/gitlab-trepr/tre-root-v3.crt"` |

## Platform

- **Windows** (TRE-PR workstations)
- Internal network with self-hosted GitLab behind corporate CA
