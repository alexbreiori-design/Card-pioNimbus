#Requires -Version 5.1
<#
  Cardápio Nimbus — launcher
  Abre o admin com --kiosk-printing e perfil Chrome/Edge dedicado
  (funciona mesmo com outra janela do navegador já aberta).

  Sempre usa o primeiro encontrado nesta ordem:
  Chrome (Program Files) → Chrome (x86) → Chrome (user) → Edge (x86) → Edge.
  Não consulta o navegador padrão do Windows.
#>
param(
  [string]$AdminUrl = 'https://cardapionimbus.com.br/admin/pedidos'
)

$ErrorActionPreference = 'Stop'

function Find-Chromium {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($path in $candidates) {
    if ($path -and (Test-Path -LiteralPath $path)) { return $path }
  }
  return $null
}

$browser = Find-Chromium
if (-not $browser) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show(
    "Não encontrei Google Chrome nem Microsoft Edge.`nInstale o Chrome e abra o Cardápio Nimbus de novo.",
    'Cardápio Nimbus',
    'OK',
    'Error'
  ) | Out-Null
  exit 1
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileDir = Join-Path $env:LOCALAPPDATA 'CardapioNimbus\CozinhaChromeProfile'
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$configPath = Join-Path $root 'config.json'
if (Test-Path -LiteralPath $configPath) {
  try {
    $cfg = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($cfg.adminUrl) { $AdminUrl = [string]$cfg.adminUrl }
  } catch {}
}

$args = @(
  '--kiosk-printing',
  "--user-data-dir=$profileDir",
  '--no-first-run',
  '--disable-features=TranslateUI',
  "--app=$AdminUrl"
)

Start-Process -FilePath $browser -ArgumentList $args
