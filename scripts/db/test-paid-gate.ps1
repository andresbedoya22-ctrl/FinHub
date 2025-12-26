$ErrorActionPreference = "Stop"

# Root del repo: asumimos que ejecutas desde la raíz del proyecto (finhub-web).
# Si no, igual funciona porque usamos rutas relativas al CWD.
$repoRoot = (Get-Location).Path

$sqlPath = Join-Path $repoRoot "scripts\db\test-paid-gate.sql"
if (!(Test-Path -LiteralPath $sqlPath)) { throw "No existe el SQL: $sqlPath" }

$sqlAbs = (Resolve-Path -LiteralPath $sqlPath).Path
Write-Host "Running paid-gate test using SQL => $sqlAbs"

# Opción robusta: ejecutar psql en un contenedor postgres y conectarse al Postgres del contenedor supabase_db via network container:
docker run --rm -i `
  --network container:supabase_db_finhub-web `
  -v "${sqlAbs}:/tmp/test-paid-gate.sql:ro" `
  postgres:15-alpine `
  psql "postgresql://postgres:postgres@127.0.0.1:5432/postgres" -v ON_ERROR_STOP=1 -f /tmp/test-paid-gate.sql

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "OK: test-paid-gate finalizado"
