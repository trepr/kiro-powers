# read-credential.ps1 — Reads a Generic credential from Windows Credential Manager
# using native CredRead API (no external modules required).
# Usage: powershell -NoProfile -File read-credential.ps1 <target-name>
# Output: Two lines — username on line 1, password on line 2.
# Exit code: 0 on success, 1 if credential not found.

param(
    [Parameter(Mandatory=$true)]
    [string]$Target
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class NativeCredManager {
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
    private static extern bool CredRead(string target, int type, int reserved, out IntPtr credential);

    [DllImport("advapi32.dll")]
    private static extern void CredFree(IntPtr credential);

    public static string[] Read(string target) {
        IntPtr credPtr;
        if (!CredRead(target, 1, 0, out credPtr)) {
            return null;
        }
        try {
            var cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            string password = cred.CredentialBlobSize > 0
                ? Marshal.PtrToStringUni(cred.CredentialBlob, cred.CredentialBlobSize / 2)
                : "";
            return new string[] { cred.UserName ?? "", password };
        } finally {
            CredFree(credPtr);
        }
    }
}
"@

$result = [NativeCredManager]::Read($Target)
if (-not $result) {
    exit 1
}

Write-Output $result[0]
Write-Output $result[1]
