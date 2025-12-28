param(
  [string]$LogDir = ".\tmp"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$log = Join-Path $LogDir "e2e-assistant.log"

pnpm e2e:assistant 2>&1 | Tee-Object -FilePath $log

$marker = "E2E Assistant Chat \(auth \+ lang\) OK\."
Select-String -Path $log -Pattern $marker -Quiet | Out-Null
if (-not $?) { throw "E2E marker not found: assistant chat did not finish OK" }

"E2E suite OK" | Out-Host
