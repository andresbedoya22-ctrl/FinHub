#requires -Version 5.1
$ErrorActionPreference = "Stop"

$SqlPath = Join-Path $PSScriptRoot "test-rls-ocr-isolation.sql"
Write-Host "Running RLS OCR isolation test using SQL => $SqlPath"

if (-not (Test-Path -LiteralPath $SqlPath)) {
  throw "SQL file not found: $SqlPath"
}

# Require docker
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  throw "docker not found. Install Docker Desktop (or ensure it's in PATH)."
}

# Find local Supabase Postgres container (allow override)
$containerName = $env:SUPABASE_DB_CONTAINER
if ([string]::IsNullOrWhiteSpace($containerName)) {
  $found = docker ps --format "{{.Names}}" | Select-String -Pattern "^supabase_db_"
  if ($found) { $containerName = ($found | Select-Object -First 1).ToString().Trim() }
}

if ([string]::IsNullOrWhiteSpace($containerName)) {
  throw "Supabase DB container not running. Run: supabase start"
}

Write-Host "Using DB container => $containerName"

# Execute SQL via psql inside container
Get-Content -LiteralPath $SqlPath -Raw | docker exec -i $containerName psql -v ON_ERROR_STOP=1 -U postgres -d postgres