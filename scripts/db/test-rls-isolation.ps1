$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlPath = Join-Path $here "test-rls-isolation.sql"
if (!(Test-Path -LiteralPath $sqlPath)) { throw "No existe el SQL: $sqlPath" }

$sqlAbs = (Resolve-Path -LiteralPath $sqlPath).Path
Write-Host "Running RLS isolation test using SQL => $sqlAbs"

$volume = "${sqlAbs}:/tmp/test-rls-isolation.sql:ro"

docker run --rm -i --network container:supabase_db_finhub-web -v $volume postgres:15-alpine `
  psql "postgresql://postgres:postgres@127.0.0.1:5432/postgres" -v ON_ERROR_STOP=1 -f /tmp/test-rls-isolation.sql

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "OK: test-rls-isolation finalizado"