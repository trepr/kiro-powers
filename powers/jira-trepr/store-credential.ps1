# store-credential.ps1 — Stores Jira credentials in Windows Credential Manager
# using native CredWrite API (no external modules required).
#
# Usage: powershell -ExecutionPolicy Bypass -File store-credential.ps1 [-Target <name>] [-Username <user>]
#
# If -Username is not provided, defaults to the current Windows logged-in user.
# The password is always prompted interactively (masked input).

param(
    [string]$Target = 'jira-trepr',
    [string]$Username = $env:USERNAME
)

$ErrorActionPreference = 'Stop'

# Prompt for password (masked)
$securePassword = Read-Host "Senha do Jira para '$Username'" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if (-not $password) {
    Write-Error "Senha nao pode ser vazia."
    exit 1
}

# Define native CredWrite via P/Invoke
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class NativeCredWriter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CredWrite(ref CREDENTIAL credential, int flags);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CredDelete(string target, int type, int flags);

    public static bool Write(string target, string username, string password) {
        byte[] passwordBytes = Encoding.Unicode.GetBytes(password);
        CREDENTIAL cred = new CREDENTIAL();
        cred.Type = 1; // CRED_TYPE_GENERIC
        cred.TargetName = target;
        cred.UserName = username;
        cred.CredentialBlobSize = passwordBytes.Length;
        cred.CredentialBlob = Marshal.AllocHGlobal(passwordBytes.Length);
        cred.Persist = 2; // CRED_PERSIST_LOCAL_MACHINE
        cred.Comment = "Jira TRE-PR - armazenado via store-credential.ps1";

        try {
            Marshal.Copy(passwordBytes, 0, cred.CredentialBlob, passwordBytes.Length);
            return CredWrite(ref cred, 0);
        } finally {
            Marshal.FreeHGlobal(cred.CredentialBlob);
        }
    }
}
"@

# Store the credential
$success = [NativeCredWriter]::Write($Target, $Username, $password)

# Clear password from memory
$password = $null
[System.GC]::Collect()

if ($success) {
    Write-Host "Credencial armazenada com sucesso." -ForegroundColor Green
    Write-Host "  Target:   $Target"
    Write-Host "  Username: $Username"
    Write-Host ""
    Write-Host "Para verificar: cmdkey /list:$Target"
    Write-Host "Para remover:   cmdkey /delete:$Target"
} else {
    $errorCode = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Error "Falha ao armazenar credencial (erro Win32: $errorCode)."
    exit 1
}
