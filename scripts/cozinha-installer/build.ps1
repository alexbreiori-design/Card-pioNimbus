#Requires -Version 5.1
<#
  Gera instalador versionado do Cardápio Nimbus (Inno Setup).

  Uso:
    .\build.ps1                 # usa version.json
    .\build.ps1 -Bump patch     # 1.1.0 -> 1.1.1 e compila
    .\build.ps1 -Version 1.2.0  # força versão e compila

  Saída:
    dist\releases\CardapioNimbusSetup-<versão>.exe
    dist\latest\CardapioNimbusSetup.exe
    dist\manifest.json
#>
param(
  [string]$Version = '',
  [ValidateSet('', 'patch', 'minor', 'major')]
  [string]$Bump = '',
  [switch]$SkipIcon
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
Set-Location -LiteralPath $Root

function Read-VersionManifest {
  $path = Join-Path $Root 'version.json'
  if (-not (Test-Path -LiteralPath $path)) {
    throw 'version.json não encontrado.'
  }
  $raw = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  return [pscustomobject]@{
    version = [string]$raw.version
    productName = [string]$raw.productName
    publisher = [string]$raw.publisher
    adminUrl = [string]$raw.adminUrl
  }
}

function Write-VersionManifest {
  param([Parameter(Mandatory)][pscustomobject]$Manifest)
  $payload = [ordered]@{
    version = $Manifest.version
    productName = $Manifest.productName
    publisher = $Manifest.publisher
    adminUrl = $Manifest.adminUrl
  }
  ($payload | ConvertTo-Json -Depth 4) + "`n" | Set-Content -LiteralPath (Join-Path $Root 'version.json') -Encoding UTF8
}

function Bump-SemVer {
  param(
    [Parameter(Mandatory)][string]$Current,
    [Parameter(Mandatory)][ValidateSet('patch', 'minor', 'major')][string]$Part
  )
  if ($Current -notmatch '^(\d+)\.(\d+)\.(\d+)$') {
    throw "Versão inválida: $Current (esperado major.minor.patch)"
  }
  $major = [int]$Matches[1]
  $minor = [int]$Matches[2]
  $patch = [int]$Matches[3]
  switch ($Part) {
    'major' { return "$($major + 1).0.0" }
    'minor' { return "$major.$($minor + 1).0" }
    'patch' { return "$major.$minor.$($patch + 1)" }
  }
}

function Sync-RuntimeConfig {
  param([Parameter(Mandatory)][pscustomobject]$Manifest)
  $payload = [ordered]@{
    adminUrl = $Manifest.adminUrl
    productName = $Manifest.productName
    version = $Manifest.version
  }
  ($payload | ConvertTo-Json -Depth 4) + "`n" | Set-Content -LiteralPath (Join-Path $Root 'config.json') -Encoding UTF8
}

function Ensure-Icon {
  $ico = Join-Path $Root 'assets\nimbus-cozinha.ico'
  if ($SkipIcon -and (Test-Path -LiteralPath $ico)) {
    Write-Host "Ícone OK (skip): $ico"
    return
  }

  New-Item -ItemType Directory -Force -Path (Join-Path $Root 'assets') | Out-Null
  $repoRoot = Resolve-Path (Join-Path $Root '..\..')
  $png = Join-Path $repoRoot 'public\images\icon.png'
  if (-not (Test-Path -LiteralPath $png)) { throw "PNG não encontrado: $png" }

  Write-Host "Gerando ícone com png-to-ico…"
  $npx = Get-Command npx -ErrorAction SilentlyContinue
  if (-not $npx) { throw 'npx não encontrado. Instale Node.js para gerar o ícone.' }

  $repoRootPath = $repoRoot.Path
  $cmd = "npx --yes png-to-ico `"$png`" > `"$ico`""
  cmd /c $cmd | Out-Null

  if (-not (Test-Path -LiteralPath $ico)) {
    throw "Falha ao gerar ícone: $ico"
  }
  Write-Host "Ícone gerado: $ico"
}

function Find-ISCC {
  $candidates = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 7\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 7\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 7\ISCC.exe"
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  $cmd = Get-Command ISCC.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Get-FileSha256 {
  param([Parameter(Mandatory)][string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Update-BuildManifest {
  param(
    [Parameter(Mandatory)][pscustomobject]$Manifest,
    [Parameter(Mandatory)][string]$ReleasePath,
    [Parameter(Mandatory)][string]$LatestPath
  )

  $manifestPath = Join-Path $Root 'dist\manifest.json'
  $history = @()
  if (Test-Path -LiteralPath $manifestPath) {
    try {
      $existing = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($existing.builds) { $history = @($existing.builds) }
    } catch {}
  }

  $entry = [ordered]@{
    version = $Manifest.version
    productName = $Manifest.productName
    builtAt = (Get-Date).ToUniversalTime().ToString('o')
    releaseFile = (Split-Path -Leaf $ReleasePath)
    latestFile = 'latest\CardapioNimbusSetup.exe'
    sizeBytes = (Get-Item -LiteralPath $ReleasePath).Length
    sha256 = Get-FileSha256 -Path $ReleasePath
  }

  $filtered = @($history | Where-Object { $_.version -ne $Manifest.version })
  $filtered += ,$entry
  $sorted = $filtered | Sort-Object {
    try { [version]$_.version } catch { [version]'0.0.0' }
  } -Descending

  $payload = [ordered]@{
    productName = $Manifest.productName
    latestVersion = $Manifest.version
    latestRelease = $entry.releaseFile
    builds = @($sorted)
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $manifestPath) | Out-Null
  ($payload | ConvertTo-Json -Depth 6) + "`n" | Set-Content -LiteralPath $manifestPath -Encoding UTF8
}

$manifest = Read-VersionManifest

if ($Version) {
  if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Versão inválida: $Version (esperado major.minor.patch)"
  }
  $manifest.version = $Version
} elseif ($Bump) {
  $manifest.version = Bump-SemVer -Current $manifest.version -Part $Bump
}

Write-VersionManifest -Manifest $manifest
Sync-RuntimeConfig -Manifest $manifest
Ensure-Icon

$iscc = Find-ISCC
if (-not $iscc) {
  Write-Host 'Inno Setup não encontrado. Tentando instalar via winget…'
  winget install --id JRSoftware.InnoSetup -e --accept-package-agreements --accept-source-agreements
  $iscc = Find-ISCC
}
if (-not $iscc) {
  throw 'ISCC.exe não encontrado. Instale Inno Setup 6+ e rode build.ps1 de novo.'
}

$version = $manifest.version
$outputBase = "CardapioNimbusSetup-$version"
$releasesDir = Join-Path $Root 'dist\releases'
$latestDir = Join-Path $Root 'dist\latest'
New-Item -ItemType Directory -Force -Path $releasesDir | Out-Null
New-Item -ItemType Directory -Force -Path $latestDir | Out-Null

Write-Host "Compilando versão $version com: $iscc"
& $iscc `
  "/DMyAppVersion=$version" `
  "/DMyAppName=$($manifest.productName)" `
  "/DMyAppPublisher=$($manifest.publisher)" `
  "/DOutputBaseFilename=$outputBase" `
  (Join-Path $Root 'nimbus-cozinha.iss')

if ($LASTEXITCODE -ne 0) { throw "ISCC falhou com código $LASTEXITCODE" }

$built = Join-Path $Root "dist\$outputBase.exe"
if (-not (Test-Path -LiteralPath $built)) {
  throw "Setup não encontrado após compilação: $built"
}

$releasePath = Join-Path $releasesDir "$outputBase.exe"
$latestPath = Join-Path $latestDir 'CardapioNimbusSetup.exe'
Copy-Item -LiteralPath $built -Destination $releasePath -Force
Copy-Item -LiteralPath $built -Destination $latestPath -Force
Update-BuildManifest -Manifest $manifest -ReleasePath $releasePath -LatestPath $latestPath

Write-Host ''
Write-Host "OK - Cardapio Nimbus $version"
Write-Host "  Release : $releasePath"
Write-Host "  Latest  : $latestPath"
$manifestOut = Join-Path $Root 'dist\manifest.json'
Write-Host "  Manifest: $manifestOut"
Get-Item -LiteralPath $releasePath | Format-List FullName, Length, LastWriteTime
