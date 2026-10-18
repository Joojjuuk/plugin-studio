param([string]$PluginDirectory = "$env:LOCALAPPDATA\Roblox\Plugins")
$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    node scripts/pair-local.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Pairing build failed' }
    New-Item -ItemType Directory -Path $PluginDirectory -Force | Out-Null
    $target = Join-Path $PluginDirectory 'Arc-MCP-Local.rbxm'
    if (Test-Path -LiteralPath $target) {
        Copy-Item -LiteralPath $target -Destination "$target.backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
    }
    Copy-Item -LiteralPath '.local\Arc-MCP-Local.rbxm' -Destination $target
    Write-Output "Installed local plugin: $target"
    Write-Output 'Open builds/ARC_MCP_TEST.rbxl in a separate Studio. Plugins > Arc > MCP > Connect.'
} finally { Pop-Location }
