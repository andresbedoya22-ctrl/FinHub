Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-EnvFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "Missing env file: $Path" }
  $lines = Get-Content -LiteralPath $Path -Encoding UTF8
  $map = @{}
  foreach ($line in $lines) {
    $l = $line.Trim()
    if (-not $l -or $l.StartsWith("#")) { continue }
    $idx = $l.IndexOf("=")
    if ($idx -lt 1) { continue }
    $k = $l.Substring(0, $idx).Trim()
    $v = $l.Substring($idx + 1).Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
    $map[$k] = $v
  }
  return $map
}

function Pick-First($map, [string[]]$keys) {
  foreach ($k in $keys) {
    if ($map.ContainsKey($k) -and ($map[$k].ToString().Trim().Length -gt 0)) { return $map[$k].ToString().Trim() }
  }
  return $null
}

function Assert-Ok($cond, [string]$msg) {
  if (-not $cond) { throw $msg }
}

function Json($o) { return ($o | ConvertTo-Json -Depth 20 -Compress) }

function Read-HttpErrorBody($err) {
  try {
    $resp = $err.Exception.Response
    if (-not $resp) { return $null }
    $stream = $resp.GetResponseStream()
    if (-not $stream) { return $null }
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    $reader.Close()
    return $body
  } catch { return $null }
}

function Pick-DocTypeMachtig([string]$repoRoot) {
  $candidates = @(
    (Join-Path $repoRoot "src\features\documents\documentsTypes.ts"),
    (Join-Path $repoRoot "src\features\documents\documentTypes.ts"),
    (Join-Path $repoRoot "src\features\documents\types.ts")
  )
  foreach ($p in $candidates) {
    try {
      if (-not (Test-Path -LiteralPath $p)) { continue }
      $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
      $ms = [regex]::Matches($txt, '"([^"]*machtig[^"]*)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if ($ms.Count -gt 0) { return $ms[0].Groups[1].Value }
    } catch { }
  }
  return "machtigingsregistratie"
}

# --- Config ---
$repoRoot = (Resolve-Path ".").Path
$envPath = Join-Path $repoRoot ".env.local"
$env = Read-EnvFile $envPath

$baseUrl = $env["FINHUB_BASE_URL"]
if (-not $baseUrl) { $baseUrl = "http://localhost:3000" }

$supabaseUrl = Pick-First $env @("NEXT_PUBLIC_SUPABASE_URL","SUPABASE_URL")
$serviceKey  = Pick-First $env @("SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SERVICE_KEY","SERVICE_ROLE_KEY","SUPABASE_SERVICE_ROLE")
$anonKey     = Pick-First $env @("NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_ANON_KEY")

Assert-Ok ($supabaseUrl) "No encontré SUPABASE URL en .env.local (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL)."
Assert-Ok ($serviceKey)  "No encontré SERVICE ROLE KEY en .env.local (SUPABASE_SERVICE_ROLE_KEY u otra variante)."
Assert-Ok ($anonKey)     "No encontré ANON KEY en .env.local (NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY)."

$docType = Pick-DocTypeMachtig $repoRoot

Write-Host "BASE_URL: $baseUrl"
Write-Host "SUPABASE_URL: $supabaseUrl"
Write-Host ("Using docType: " + $docType)

# Verificar que el server local responde
try {
  Invoke-RestMethod -Method GET -Uri "$baseUrl/api/debug/cookies" | Out-Null
} catch {
  throw "El servidor local no responde en $baseUrl. En otra terminal ejecuta: pnpm dev"
}

# --- 1) Crear usuario confirmado (Admin API) ---
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "e2e+$stamp@finhub.local"
$password = "Test!12345_$stamp"

$adminUsersUrl = "$supabaseUrl/auth/v1/admin/users"
$adminHeaders = @{
  "apikey" = $serviceKey
  "Authorization" = "Bearer $serviceKey"
  "content-type" = "application/json"
}

$createBody = @{ email = $email; password = $password; email_confirm = $true } | ConvertTo-Json -Depth 10

Write-Host "`n[1] Creating confirmed user via Admin API: $email"
$created = Invoke-RestMethod -Method POST -Uri $adminUsersUrl -Headers $adminHeaders -Body $createBody
$userId = $created.id
Assert-Ok ($userId) "No pude obtener userId del Admin API response."
Write-Host "UserId: $userId"

# --- 2) Login vía Next API (cookies) ---
Write-Host "`n[2] Login via Next /api/auth/login (cookie session)"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginJson = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/auth/login" -WebSession $session `
  -Headers @{ "content-type"="application/json" } `
  -Body (Json @{ email=$email; password=$password })

Assert-Ok ($loginJson.ok -eq $true) ("Login failed: " + (Json $loginJson))

$cookies = $session.Cookies.GetCookies($baseUrl)
Write-Host "Cookies count: $($cookies.Count)"
Assert-Ok ($cookies.Count -gt 0) "No se guardaron cookies de sesión tras login."

# --- 3) Upload fixture to Storage (service role) ---
$bucket = "vault"
$fixture = Join-Path $repoRoot "scripts\e2e\fixtures\machtigingsregistratie_sample.png"
Assert-Ok (Test-Path -LiteralPath $fixture) "Missing fixture: $fixture"

$storagePath = "$userId/e2e_$stamp-machtigingsregistratie_sample.png"
$uploadUrl = "$supabaseUrl/storage/v1/object/$bucket/$storagePath"

Write-Host "`n[3] Uploading fixture to Storage: $bucket/$storagePath"
$bytes = [System.IO.File]::ReadAllBytes($fixture)

$uploadHeaders = @{
  "apikey" = $serviceKey
  "Authorization" = "Bearer $serviceKey"
  "content-type" = "image/png"
  "x-upsert" = "true"
}

Invoke-RestMethod -Method POST -Uri $uploadUrl -Headers $uploadHeaders -Body $bytes | Out-Null
Write-Host "Uploaded OK."

# --- 4) Create document row via Next /api/documents (authenticated) ---
Write-Host "`n[4] Creating document row via Next /api/documents"
$docBody = @{
  fileName = "machtigingsregistratie_sample.png"
  type = $docType
  caseId = $null
  notes = "E2E OCR v1"
  storagePath = $storagePath
  ocrKind = "machtigingsregistratie"
}

try {
  $docRes = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/documents" -WebSession $session `
    -Headers @{ "content-type"="application/json" } `
    -Body (Json $docBody)
} catch {
  $body = Read-HttpErrorBody $_
  if ($body) { throw ("POST /api/documents failed. Body: " + $body) }
  throw ("POST /api/documents failed. Error: " + $_.Exception.Message)
}

Assert-Ok ($docRes.ok -eq $true) ("Create document failed: " + (Json $docRes))
$docId = $docRes.doc.id
Assert-Ok ($docId) "No docId returned."
Write-Host "DocumentId: $docId"

# --- 4.1) Debug doc row before OCR ---
Write-Host "`n[4.1] GET /api/documents/$docId (pre-OCR debug)"
$docGetPre = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/documents/$docId" -WebSession $session
Assert-Ok ($docGetPre.ok -eq $true) ("Get document (pre) failed: " + (Json $docGetPre))
Write-Host ("Pre-OCR status: " + $docGetPre.doc.status + "; type=" + $docGetPre.doc.type + "; ocr_kind=" + $docGetPre.doc.ocr_kind)

# --- 5) Run OCR ---
Write-Host "`n[5] POST /api/documents/$docId/ocr"
try {
  $ocrRes = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/documents/$docId/ocr" -WebSession $session `
    -Headers @{ "content-type"="application/json" } `
    -Body "{}"
} catch {
  $body = Read-HttpErrorBody $_
  if ($body) { throw ("POST /api/documents/$docId/ocr failed. Body: " + $body) }
  throw ("POST /api/documents/$docId/ocr failed. Error: " + $_.Exception.Message)
}

Assert-Ok ($ocrRes.ok -eq $true) ("OCR failed: " + (Json $ocrRes))
Write-Host "OCR ok."

# --- 6) Get extraction ---
Write-Host "`n[6] GET /api/documents/$docId/extraction"
$exRes = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/documents/$docId/extraction" -WebSession $session
Assert-Ok ($exRes.ok -eq $true) ("Get extraction failed: " + (Json $exRes))
$ex = $exRes.extraction
Assert-Ok ($ex) "No extraction returned."
Write-Host "ExtractionId: $($ex.id); needs_review=$($ex.needs_review)"

# --- 7) Patch extraction fields (mínimo viable) ---
Write-Host "`n[7] PATCH /api/documents/$docId/extraction"
$patch = @{
  fields = @{
    activeringscode = "ABC12345"
    briefkenmerk = "2026.01.12345.01"
    intrekkingscode = "INT123456"
    naam = "E2E Test"
    geboortedatum = "1990-01-01"
    bsn = "123456789"
    extra = @{ source = "e2e"; stamp = $stamp }
  }
  needsReview = $true
  confidence = $null
}

$patchRes = Invoke-RestMethod -Method PATCH -Uri "$baseUrl/api/documents/$docId/extraction" -WebSession $session `
  -Headers @{ "content-type"="application/json" } `
  -Body (Json $patch)

Assert-Ok ($patchRes.ok -eq $true) ("Patch extraction failed: " + (Json $patchRes))
Write-Host "Patched OK. extractionId=$($patchRes.extractionId)"

# --- 8) Verify ---
Write-Host "`n[8] POST /api/documents/$docId/verify"
$verRes = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/documents/$docId/verify" -WebSession $session `
  -Headers @{ "content-type"="application/json" } `
  -Body "{}"

Assert-Ok ($verRes.ok -eq $true) ("Verify failed: " + (Json $verRes))
Write-Host "Verify OK. extractionId=$($verRes.extractionId)"

# --- 9) Check document status ---
Write-Host "`n[9] GET /api/documents/$docId"
$docGet = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/documents/$docId" -WebSession $session
Assert-Ok ($docGet.ok -eq $true) ("Get document failed: " + (Json $docGet))
Write-Host ("Document status: " + $docGet.doc.status + "; ocr_kind=" + $docGet.doc.ocr_kind)

Write-Host "`nE2E OCR v1 OK."
