param(
  [string]$BaseUrl = $env:BASE_URL
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Load-DotEnv([string[]]$paths) {
  foreach ($p in $paths) {
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $lines = Get-Content -LiteralPath $p -Encoding UTF8
    foreach ($line in $lines) {
      $t = $line.Trim()
      if (-not $t -or $t.StartsWith("#")) { continue }
      $idx = $t.IndexOf("=")
      if ($idx -lt 1) { continue }
      $k = $t.Substring(0,$idx).Trim()
      $v = $t.Substring($idx+1).Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1,$v.Length-2) }
      if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1,$v.Length-2) }
      if ($k) { Set-Item -Path ("Env:{0}" -f $k) -Value $v }
    }
  }
}
function Require-Env([string]$name) {
  $item = Get-Item -Path ("Env:{0}" -f $name) -ErrorAction SilentlyContinue
  if ($null -eq $item) { return "" }
  $v = $item.Value
  if ($null -eq $v) { return "" }
  return [string]$v
}function Assert-Status([int]$got, [int]$want, [string]$label) {
  if ($got -ne $want) { throw "$label => expected HTTP $want but got $got" }
}

if (-not $BaseUrl) { $BaseUrl = "http://localhost:3000" }
Write-Host "BASE_URL:" $BaseUrl

# Cargar .env.local/.env desde repo root
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Load-DotEnv @(
  (Join-Path $repoRoot ".env.local"),
  (Join-Path $repoRoot ".env")
)

# Supabase env
$supabaseUrl = (Require-Env "SUPABASE_URL")
if (-not $supabaseUrl) { $supabaseUrl = (Require-Env "NEXT_PUBLIC_SUPABASE_URL") }
$serviceRole = (Require-Env "SUPABASE_SERVICE_ROLE_KEY")
$anonKey = (Require-Env "NEXT_PUBLIC_SUPABASE_ANON_KEY")

Write-Host "SUPABASE_URL:" $supabaseUrl

if (-not $supabaseUrl) { throw "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in env" }
if (-not $serviceRole) { throw "Missing SUPABASE_SERVICE_ROLE_KEY in env" }
if (-not $anonKey) { throw "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in env" }

# Credenciales user e2e
$rand = Get-Random -Minimum 1000 -Maximum 9999
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "e2e+$stamp" + "_$rand@finhub.local"
$pass  = "P@ssw0rd!$rand"

Write-Host ""
Write-Host "[1] Creating confirmed user via Supabase Admin API:" $email

$adminUrl = "$supabaseUrl/auth/v1/admin/users"
$headers = @{
  "Authorization" = "Bearer $serviceRole"
  "apikey"        = $anonKey
  "Content-Type"  = "application/json"
}

$body = @{
  email = $email
  password = $pass
  email_confirm = $true
} | ConvertTo-Json

$created = Invoke-RestMethod -Method Post -Uri $adminUrl -Headers $headers -Body $body
$userId = $created.id
Write-Host "UserId:" $userId

Write-Host ""
Write-Host "[2] Unauth GET /app => expect redirect/401-ish (we assert NOT 200)"
try {
  Invoke-WebRequest -Uri "$BaseUrl/app" -UseBasicParsing -MaximumRedirection 0 | Out-Null
  throw "Unauth /app unexpectedly returned 200"
} catch {
  Write-Host "Unauth /app OK (not 200)"
}

Write-Host ""
Write-Host "[3] Login via Next /api/auth/login (cookie session)"
$loginJson = @{ email = $email; password = $pass } | ConvertTo-Json
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginResp = Invoke-WebRequest -Method Post -Uri "$BaseUrl/api/auth/login" -UseBasicParsing `
  -WebSession $session `
  -Headers @{ "Content-Type"="application/json" } `
  -Body $loginJson

Assert-Status $loginResp.StatusCode 200 "Login"
Write-Host "Cookies count:" $session.Cookies.Count

function Get-Page([string]$path) {
  $r = Invoke-WebRequest -Method Get -Uri ($BaseUrl + $path) -UseBasicParsing -WebSession $session -MaximumRedirection 0
  return $r
}

Write-Host ""
Write-Host "[4] Auth GET /app => expect 200"
$r1 = Get-Page "/app"
Assert-Status $r1.StatusCode 200 "GET /app"

Write-Host "[5] Auth GET /app/documents => expect 200"
$r2 = Get-Page "/app/documents"
Assert-Status $r2.StatusCode 200 "GET /app/documents"

Write-Host "[6] Auth GET /app/documents/ocr-review => expect 200"
$r3 = Get-Page "/app/documents/ocr-review"
Assert-Status $r3.StatusCode 200 "GET /app/documents/ocr-review"

Write-Host "[7] Auth POST /api/assistant/chat => expect ok=true"
$chat = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/assistant/chat" `
  -WebSession $session `
  -Headers @{ "Content-Type"="application/json" } `
  -Body (@{ message="machtiging"; lang="en" } | ConvertTo-Json)

if (-not $chat.ok) { throw "Assistant chat expected ok=true" }
Write-Host "Mode:" $chat.mode
Write-Host "Answer length:" ([string]$chat.answer).Length

Write-Host ""
Write-Host "E2E Dashboard Smoke OK."

