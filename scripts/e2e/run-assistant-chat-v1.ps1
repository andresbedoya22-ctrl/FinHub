param(
  [string]$BaseUrl = $env:BASE_URL
)

if (-not $BaseUrl) { $BaseUrl = "http://localhost:3000" }

$SupabaseUrl = $env:SUPABASE_URL
if (-not $SupabaseUrl) { $SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL }

$ServiceRole = $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "BASE_URL:" $BaseUrl
Write-Host "SUPABASE_URL:" $SupabaseUrl

# DOTENV_LOADER: load .env.local into PowerShell env (pnpm does not auto-export)
function Load-DotEnvIfMissing([string]$repoRoot) {
  $candidates = @(
    (Join-Path -Path $repoRoot -ChildPath ".env.local")
    (Join-Path -Path $repoRoot -ChildPath ".env")
  )

  foreach ($p in $candidates) {
    if (-not (Test-Path -LiteralPath $p)) { continue }

    Get-Content -LiteralPath $p -Encoding UTF8 | ForEach-Object {
      $line = $_.Trim()
      if (-not $line) { return }
      if ($line.StartsWith("#")) { return }
      if ($line -notmatch "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$") { return }

      $k = $matches[1]
      $v = $matches[2]

      # strip quotes
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length-2) }
      if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length-2) }

      if (-not (Test-Path Env:$k)) {
        Set-Item -Path ("Env:{0}" -f $k) -Value $v
      }
    }
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Load-DotEnvIfMissing $repoRoot

# DOTENV_REEVAL: refresh SupabaseUrl/ServiceRole after dotenv
if (-not $SupabaseUrl) { $SupabaseUrl = $env:SUPABASE_URL }
if (-not $SupabaseUrl) { $SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL }
if (-not $ServiceRole) { $ServiceRole = $env:SUPABASE_SERVICE_ROLE_KEY }

if (-not $SupabaseUrl) { throw "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in env" }
if (-not $ServiceRole) { throw "Missing SUPABASE_SERVICE_ROLE_KEY in env (needed to create confirmed user)" }

function New-RandSuffix {
  return [DateTime]::UtcNow.ToString("yyyyMMddHHmmss") + "_" + (Get-Random -Minimum 1000 -Maximum 9999)
}

function Post-Json([string]$Url, $Obj, [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null) {
  $json = $Obj | ConvertTo-Json -Depth 10
  if ($Session) {
    return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json -WebSession $Session
  }
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json
}

function Post-JsonRaw([string]$Url, $Obj, [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null) {
  $json = $Obj | ConvertTo-Json -Depth 10
  if ($Session) {
    return Invoke-WebRequest -UseBasicParsing -Method Post -Uri $Url -ContentType "application/json" -Body $json -WebSession $Session -ErrorAction Stop
  }
  return Invoke-WebRequest -UseBasicParsing -Method Post -Uri $Url -ContentType "application/json" -Body $json -ErrorAction Stop
}

# [1] Create confirmed user via Supabase Admin API
$suffix = New-RandSuffix
$email = "e2e+$suffix@finhub.local"
$pass  = "Passw0rd!$suffix"

Write-Host ""
Write-Host "[1] Creating confirmed user via Admin API:" $email

$adminUrl = "$SupabaseUrl/auth/v1/admin/users"
$adminHeaders = @{
  "apikey"        = $ServiceRole
  "Authorization" = "Bearer $ServiceRole"
  "Content-Type"  = "application/json"
}

$adminBody = @{
  email = $email
  password = $pass
  email_confirm = $true
} | ConvertTo-Json -Depth 10

$u = Invoke-RestMethod -Method Post -Uri $adminUrl -Headers $adminHeaders -Body $adminBody
if (-not $u.id) { throw "Admin create user failed: missing id" }
Write-Host "UserId:" $u.id

# [2] Unauth call => must be 401
Write-Host ""
Write-Host "[2] Unauth POST /api/assistant/chat => expect 401"

$unauthStatus = $null
$unauthBody = $null
try {
  $r = Post-JsonRaw "$BaseUrl/api/assistant/chat" @{ message = "machtiging"; lang = "en" }
  # si llegó aquí, no fue 401
  throw "Expected 401 but got HTTP $($r.StatusCode)"
} catch {
  # Intentamos extraer status code y body
  $resp = $_.Exception.Response
  if ($resp -and $resp.StatusCode) {
    $unauthStatus = [int]$resp.StatusCode
  }
  try {
    $stream = $resp.GetResponseStream()
    if ($stream) {
      $reader = New-Object System.IO.StreamReader($stream)
      $unauthBody = $reader.ReadToEnd()
      $reader.Close()
    }
  } catch { }
}

if ($unauthStatus -ne 401) {
  throw "Expected 401, got: $unauthStatus. Body: $unauthBody"
}
Write-Host "Unauth OK => 401"

# [3] Login to get cookie session (Next /api/auth/login)
Write-Host ""
Write-Host "[3] Login via Next /api/auth/login (cookie session)"

$null = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" `
  -Body (@{ email = $email; password = $pass } | ConvertTo-Json) `
  -SessionVariable sess

if (-not $sess) { throw "No WebSession created" }
if ($sess.Cookies.Count -lt 1) { throw "No cookies captured in session" }

Write-Host "Cookies count:" $sess.Cookies.Count

# [4] Auth call (FAQ) in ES
Write-Host ""
Write-Host "[4] Auth POST /api/assistant/chat => expect ok=true (FAQ) [es]"

$respEs = Post-Json "$BaseUrl/api/assistant/chat" @{ message = "¿Qué es la machtigingsregistratie?"; lang = "es" } $sess
if (-not $respEs.ok) { throw "Expected ok=true, got: $($respEs | ConvertTo-Json -Depth 10)" }
if (-not $respEs.answer) { throw "Expected non-empty answer (es)" }

Write-Host "Mode:" $respEs.mode
Write-Host "Answer (es) length:" ($respEs.answer.ToString().Length)

# [5] Auth call (FAQ or LLM) in EN
Write-Host ""
Write-Host "[5] Auth POST /api/assistant/chat => expect ok=true [en]"

$respEn = Post-Json "$BaseUrl/api/assistant/chat" @{ message = "What is an authorization (machtiging)?"; lang = "en" } $sess
if (-not $respEn.ok) { throw "Expected ok=true, got: $($respEn | ConvertTo-Json -Depth 10)" }
if (-not $respEn.answer) { throw "Expected non-empty answer (en)" }

Write-Host "Mode:" $respEn.mode
Write-Host "Answer (en) length:" ($respEn.answer.ToString().Length)

Write-Host ""
Write-Host "E2E Assistant Chat (auth + lang) OK."




