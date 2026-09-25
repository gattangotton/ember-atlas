$ErrorActionPreference = 'Stop'
$taskNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) { $taskNode = (Get-Command node -ErrorAction Stop).Source }
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'EMBER ATLAS: http://localhost:5174/'
& $taskNode (Join-Path $PSScriptRoot 'server.mjs')
