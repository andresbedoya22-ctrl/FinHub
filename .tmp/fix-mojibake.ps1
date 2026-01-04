$ErrorActionPreference = "Stop"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function UnMojibake([string]$Text) {
  $enc1252 = [System.Text.Encoding]::GetEncoding(1252)
  $utf8    = [System.Text.Encoding]::UTF8

  $t = $Text
  for ($i = 0; $i -lt 3; $i++) {
    if ($t -match '[ÃÂâ€\uFFFD]') {
      $bytes = $enc1252.GetBytes($t)
      $t = $utf8.GetString($bytes)
    } else {
      break
    }
  }

  # Normaliza restos típicos (si quedara alguno)
  $t = $t -replace "Â·", "·"
  $t = $t -replace "Ãº", "ú"
  $t = $t -replace "Ã­a", "ía"
  $t = $t -replace "vÃa", "vía"

  return $t
}

$dash  = "src/app/(dashboard)/app/finances/ui/FinancesDashboardClient.tsx"
$store = "src/features/finances/financesLedgerStore.ts"

foreach ($p in @($dash, $store)) {
  if (!(Test-Path $p)) { throw "No existe: $p" }

  $orig = Get-Content $p -Raw
  $fixed = UnMojibake $orig

  if ($fixed -ne $orig) {
    Write-Host "Fixing: $p"
    Write-Utf8NoBom -Path $p -Content $fixed
  } else {
    Write-Host "No changes needed: $p"
  }
}

# Verificación dura: si queda mojibake, mostramos y fallamos.
$pattern = "Ã|Â|â€|�"
$hits = @()
$hits += Select-String -Path $dash  -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue
$hits += Select-String -Path $store -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue

if ($hits.Count -gt 0) {
  Write-Host "`nAún quedan restos de mojibake:" -ForegroundColor Yellow
  $hits | ForEach-Object { Write-Host ("{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim()) }
  throw "Abortado: quedan patrones mojibake. No se continúa a gates."
}

Write-Host "`nMojibake OK. Running gates..." -ForegroundColor Green
pnpm lint
pnpm test
pnpm build