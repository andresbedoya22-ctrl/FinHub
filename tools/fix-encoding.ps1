$ErrorActionPreference = "Stop"

function Replace-All([string]$text, [hashtable]$map) {
  foreach ($k in $map.Keys) { $text = $text.Replace($k, $map[$k]) }
  return $text
}

# Detecta mojibake + BOM + espacios raros
$files = Get-ChildItem -Path .\src -Recurse -File -Include *.ts,*.tsx | Where-Object {
  $t = Get-Content -LiteralPath $_.FullName -Raw
  $t.Contains([char]0xFEFF) -or                      # BOM real
  $t.StartsWith(([string][char]0x00EF)+([string][char]0x00BB)+([string][char]0x00BF)) -or  # "ï»¿" textual
  $t -match "Â|Ã|â€" -or
  $t.Contains([char]0x00A0) -or                      # NBSP
  $t.Contains([char]0x200B) -or                      # ZWSP
  $t.Contains([char]0x202F) -or                      # NNBSP
  $t.Contains([char]0x2007)                          # Figure space
}

Write-Host ("Archivos a reparar: " + $files.Count)

# Mapa SOLO con escapes Unicode para evitar que el .ps1 se corrompa
$map = @{}

# Puntuación frecuente mojibake
$map[[string]([char]0x00C2)+([char]0x00BF)] = [string][char]0x00BF   # "Â¿" -> "¿"
$map[[string]([char]0x00C2)+([char]0x00A1)] = [string][char]0x00A1   # "Â¡" -> "¡"
$map[[string]([char]0x00C2)+([char]0x00B7)] = [string][char]0x00B7   # "Â·" -> "·"

# Vocales / ñ / ü mojibake: "Ã" + segundo byte
$map[[string]([char]0x00C3)+([char]0x00A1)] = [string][char]0x00E1   # á
$map[[string]([char]0x00C3)+([char]0x00A9)] = [string][char]0x00E9   # é
$map[[string]([char]0x00C3)+([char]0x00AD)] = [string][char]0x00ED   # í
$map[[string]([char]0x00C3)+([char]0x00B3)] = [string][char]0x00F3   # ó
$map[[string]([char]0x00C3)+([char]0x00BA)] = [string][char]0x00FA   # ú
$map[[string]([char]0x00C3)+([char]0x00B1)] = [string][char]0x00F1   # ñ
$map[[string]([char]0x00C3)+([char]0x00BC)] = [string][char]0x00FC   # ü

$map[[string]([char]0x00C3)+([char]0x0081)] = [string][char]0x00C1   # Á
$map[[string]([char]0x00C3)+([char]0x0089)] = [string][char]0x00C9   # É
$map[[string]([char]0x00C3)+([char]0x008D)] = [string][char]0x00CD   # Í
$map[[string]([char]0x00C3)+([char]0x0093)] = [string][char]0x00D3   # Ó
$map[[string]([char]0x00C3)+([char]0x009A)] = [string][char]0x00DA   # Ú
$map[[string]([char]0x00C3)+([char]0x0091)] = [string][char]0x00D1   # Ñ
$map[[string]([char]0x00C3)+([char]0x009C)] = [string][char]0x00DC   # Ü

# Tipografía: “â” etc
$map[[string]([char]0x00E2)+([char]0x0080)+([char]0x0099)] = [string][char]0x2019  # ’
$map[[string]([char]0x00E2)+([char]0x0080)+([char]0x0093)] = [string][char]0x2013  # –
$map[[string]([char]0x00E2)+([char]0x0080)+([char]0x0094)] = [string][char]0x2014  # —
$map[[string]([char]0x00E2)+([char]0x0080)+([char]0x00A6)] = [string][char]0x2026  # …

# "ï»¿" textual (tres chars)
$mojibakeBom = ([string][char]0x00EF)+([string][char]0x00BB)+([string][char]0x00BF)

foreach ($f in $files) {
  $path = $f.FullName
  $c = Get-Content -LiteralPath $path -Raw

  # Quitar BOM real y BOM textual
  $c = $c.Replace([string][char]0xFEFF, '')
  if ($c.StartsWith($mojibakeBom)) { $c = $c.Substring(3) }

  # Quitar whitespace raro (ESLint no-irregular-whitespace)
  $c = $c.Replace([string][char]0x00A0, ' ')
  $c = $c.Replace([string][char]0x200B, '')
  $c = $c.Replace([string][char]0x202F, ' ')
  $c = $c.Replace([string][char]0x2007, ' ')

  # Reemplazos mojibake
  $c = Replace-All $c $map

  [System.IO.File]::WriteAllText($path, $c, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Fixed: " + $path)
}

if (Test-Path .\.next) { Remove-Item -Recurse -Force .\.next }
Write-Host "Done."