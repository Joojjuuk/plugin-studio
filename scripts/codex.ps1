param([Parameter(ValueFromRemainingArguments=$true)][string[]]$ClientArguments)
$taskRoot=Split-Path $PSScriptRoot -Parent
$entry=Join-Path $taskRoot 'mcp\dist\server\index.js'
$nodePath=(Get-Command node).Source
# Command-line configuration keeps this integration scoped to this invocation.
& codex -C $taskRoot -c "mcp_servers.arc_vfx.command='$nodePath'" -c "mcp_servers.arc_vfx.args=['$entry']" -c "mcp_servers.arc_vfx.cwd='$taskRoot'" @ClientArguments
exit $LASTEXITCODE
