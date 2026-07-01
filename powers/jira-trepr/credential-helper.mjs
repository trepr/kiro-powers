/**
 * Credential Helper — Cross-platform credential resolver for jira-trepr Power.
 *
 * Resolves JIRA_USERNAME and JIRA_API_TOKEN (password) from the following sources
 * (in priority order):
 *
 *   1. Environment variables (JIRA_USERNAME + JIRA_API_TOKEN, or JIRA_PASSWORD as alias)
 *   2. OS-native credential store:
 *      - Windows: Windows Credential Manager (via native CredRead API, no modules needed)
 *      - Linux:   libsecret / GNOME Keyring (via secret-tool)
 *      - macOS:   Keychain (via security CLI)
 *   3. Fails with actionable error message
 *
 * After resolving credentials, spawns the MCP server process (uvx mcp-atlassian)
 * with them injected as environment variables.
 *
 * The mcp-atlassian package expects:
 *   - JIRA_URL: base URL of the Jira instance
 *   - JIRA_USERNAME: username for Basic Auth
 *   - JIRA_API_TOKEN: password/token for Basic Auth (for Server, this is the user's password)
 *
 * Usage (from mcp.json):
 *   "command": "node",
 *   "args": ["--use-system-ca", "powers/jira-trepr/credential-helper.mjs"]
 */

import { execSync, spawn } from 'node:child_process';
import { platform } from 'node:os';

const CREDENTIAL_TARGET = 'jira-trepr';
const MCP_COMMAND = 'uvx';

// --- Credential resolution ---

function getCredentials() {
  // Priority 1: Environment variables (backward-compatible)
  // Accept both JIRA_PASSWORD (our convention) and JIRA_API_TOKEN (mcp-atlassian convention)
  const username = process.env.JIRA_USERNAME;
  const password = process.env.JIRA_API_TOKEN || process.env.JIRA_PASSWORD;

  if (username && password) {
    return { username, password };
  }

  // Priority 2: OS-native credential store
  const os = platform();

  if (os === 'win32') {
    return getFromWindows();
  } else if (os === 'linux') {
    return getFromLinux();
  } else if (os === 'darwin') {
    return getFromMacOS();
  }

  fail();
}

function getFromWindows() {
  try {
    // Uses read-credential.ps1 which calls native Windows CredRead API via P/Invoke.
    // No external PowerShell modules required — works on any Windows out of the box.
    const scriptPath = new URL('./read-credential.ps1', import.meta.url).pathname
      .replace(/^\/([A-Za-z]:)/, '$1'); // Fix Windows path (remove leading /)

    const out = execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" "${CREDENTIAL_TARGET}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    const lines = out.split(/\r?\n/);
    if (lines.length >= 2 && lines[0] && lines[1]) {
      return { username: lines[0], password: lines[1] };
    }
  } catch {
    // Fall through to error
  }

  fail(
    'Windows Credential Manager',
    `powershell -ExecutionPolicy Bypass -File powers/jira-trepr/store-credential.ps1`,
    null
  );
}

function getFromLinux() {
  try {
    const username = execSync(
      `secret-tool lookup service ${CREDENTIAL_TARGET} field username`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    const password = execSync(
      `secret-tool lookup service ${CREDENTIAL_TARGET} field password`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (username && password) {
      return { username, password };
    }
  } catch {
    // Fall through to error
  }

  fail(
    'libsecret (GNOME Keyring)',
    [
      `echo -n 'SEU_USUARIO' | secret-tool store --label='Jira TRE-PR' service ${CREDENTIAL_TARGET} field username`,
      `echo -n 'SUA_SENHA' | secret-tool store --label='Jira TRE-PR' service ${CREDENTIAL_TARGET} field password`,
    ].join('\n           '),
    'Requer pacote libsecret-tools (Debian/Ubuntu: apt install libsecret-tools)'
  );
}

function getFromMacOS() {
  try {
    const findOutput = execSync(
      `security find-generic-password -s ${CREDENTIAL_TARGET} -g 2>&1`,
      { encoding: 'utf8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const acctMatch = findOutput.match(/"acct"<blob>="([^"]+)"/);
    const passMatch = findOutput.match(/password: "([^"]+)"/);

    if (acctMatch && passMatch) {
      return { username: acctMatch[1], password: passMatch[1] };
    }

    const password = execSync(
      `security find-generic-password -s ${CREDENTIAL_TARGET} -w`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    const username = acctMatch ? acctMatch[1] : '';
    if (username && password) {
      return { username, password };
    }
  } catch {
    // Fall through to error
  }

  fail(
    'macOS Keychain',
    `security add-generic-password -s ${CREDENTIAL_TARGET} -a SEU_USUARIO -w SUA_SENHA`,
    null
  );
}

function fail(storeName, storeCommand, note) {
  const lines = [
    `[jira-trepr] Credenciais nao encontradas.`,
    ``,
    `Configure de uma das seguintes formas:`,
    ``,
    `  Opcao 1 - Variaveis de ambiente:`,
    `    JIRA_USERNAME=seu_usuario`,
    `    JIRA_API_TOKEN=sua_senha  (ou JIRA_PASSWORD=sua_senha)`,
    ``,
  ];

  if (storeName) {
    lines.push(
      `  Opcao 2 - ${storeName}:`,
      `    ${storeCommand}`,
    );
    if (note) {
      lines.push(`    (${note})`);
    }
    lines.push('');
  }

  lines.push(
    `  Target/service: "${CREDENTIAL_TARGET}"`,
    ``,
  );

  process.stderr.write(lines.join('\n') + '\n');
  process.exit(1);
}

// --- Main: resolve credentials and spawn MCP server ---

const creds = getCredentials();
const jiraUrl = process.env.JIRA_URL || 'https://jira.tre-pr.jus.br';

const args = [
  'mcp-atlassian',
  '--jira-url', jiraUrl,
  '--jira-username', creds.username,
  '--jira-token', creds.password,
];

const child = spawn(MCP_COMMAND, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    JIRA_USERNAME: creds.username,
    JIRA_API_TOKEN: creds.password,
  },
  shell: true,
});

child.on('error', (err) => {
  process.stderr.write(`[jira-trepr] Falha ao iniciar MCP server: ${err.message}\n`);
  process.exit(1);
});

child.on('exit', (code) => process.exit(code ?? 1));
