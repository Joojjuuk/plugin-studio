$ErrorActionPreference='Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
    $env:ARC_MCP_TEST_PAIR='1'
    npm run install:local
    $env:ARC_MCP_TEST_PAIR=$null
    if ($LASTEXITCODE -ne 0) { throw 'Install failed' }
    $fixture=(Resolve-Path -LiteralPath 'builds\ARC_MCP_TEST.rbxl').Path
    # Keep existing sessions open so unsaved Studio work is never discarded.
    $studio=Get-ChildItem -LiteralPath "$env:LOCALAPPDATA\Roblox\Versions" -Filter RobloxStudioBeta.exe -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    # Interactive test window is needed for reviewing Arc's actual timeline and viewport.
    Start-Process -FilePath $studio.FullName -ArgumentList $fixture -WindowStyle Normal
} finally { $env:ARC_MCP_TEST_PAIR=$null; Pop-Location }
