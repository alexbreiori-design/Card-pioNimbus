#Requires -Version 5.1
<#
  Instalador Cardápio Nimbus (GUI).
  Pode rodar direto: clique direito → Executar com PowerShell
  Ou ser empacotado pelo Inno Setup (Setup.exe).

  Opção:
  - Iniciar com o sistema → pasta Inicializar do usuário
#>
param(
  [switch]$Quiet,
  [string]$InstallRoot = '',
  [bool]$StartWithWindows = $true,
  [bool]$LaunchNow = $true
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ProductName = 'Cardápio Nimbus'
$CompanyName = 'Cardápio Nimbus'
$DefaultUrl = 'https://cardapionimbus.com.br/admin/pedidos'
$ProductVersion = ''

function Get-InstallerConfig {
  $configPath = Join-Path (Get-ScriptDir) 'config.json'
  if (-not (Test-Path -LiteralPath $configPath)) { return $null }
  try {
    return Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    return $null
  }
}

$installerConfig = Get-InstallerConfig
if ($installerConfig?.productName) { $ProductName = [string]$installerConfig.productName }
if ($installerConfig?.adminUrl) { $DefaultUrl = [string]$installerConfig.adminUrl }
if ($installerConfig?.version) { $ProductVersion = [string]$installerConfig.version }

function Get-ScriptDir {
  if ($PSScriptRoot) { return $PSScriptRoot }
  return Split-Path -Parent $MyInvocation.MyCommand.Path
}

function Get-DesktopPath {
  $candidates = @(
    [Environment]::GetFolderPath('Desktop'),
    (Join-Path $env:USERPROFILE 'Desktop'),
    (Join-Path $env:USERPROFILE 'OneDrive\Desktop'),
    (Join-Path $env:USERPROFILE 'OneDrive\Área de Trabalho'),
    (Join-Path $env:USERPROFILE 'Área de Trabalho')
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  return [Environment]::GetFolderPath('Desktop')
}

function New-Shortcut {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$TargetPath,
    [string]$Arguments = '',
    [string]$WorkingDirectory = '',
    [string]$IconLocation = '',
    [string]$Description = ''
  )
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $w = New-Object -ComObject WScript.Shell
  $s = $w.CreateShortcut($Path)
  $s.TargetPath = $TargetPath
  if ($Arguments) { $s.Arguments = $Arguments }
  if ($WorkingDirectory) { $s.WorkingDirectory = $WorkingDirectory }
  if ($IconLocation) { $s.IconLocation = $IconLocation }
  if ($Description) { $s.Description = $Description }
  $s.WindowStyle = 1
  $s.Save()
}

function Install-CardapioNimbus {
  param(
    [bool]$WantStartWithWindows,
    [bool]$WantLaunchNow,
    [string]$Root
  )

  $src = Get-ScriptDir
  if (-not $Root) {
    $Root = Join-Path $env:LOCALAPPDATA 'CardapioNimbus\Cozinha'
  }

  New-Item -ItemType Directory -Force -Path $Root | Out-Null

  $files = @(
    'NimbusCozinha.launcher.ps1',
    'NimbusCozinha.vbs',
    'config.json',
    'assets\nimbus-cozinha.ico'
  )
  foreach ($rel in $files) {
    $from = Join-Path $src $rel
    if (-not (Test-Path -LiteralPath $from)) {
      throw "Arquivo ausente no pacote: $rel"
    }
    $to = Join-Path $Root $rel
    $toDir = Split-Path -Parent $to
    New-Item -ItemType Directory -Force -Path $toDir | Out-Null
    Copy-Item -LiteralPath $from -Destination $to -Force
  }

  $vbs = Join-Path $Root 'NimbusCozinha.vbs'
  $ico = Join-Path $Root 'assets\nimbus-cozinha.ico'
  $desktop = Get-DesktopPath
  $desktopLnk = Join-Path $desktop "$ProductName.lnk"
  $startMenuDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Cardápio Nimbus'
  $startMenuLnk = Join-Path $startMenuDir "$ProductName.lnk"

  New-Shortcut -Path $desktopLnk -TargetPath $vbs -WorkingDirectory $Root -IconLocation "$ico,0" `
    -Description 'Cardápio Nimbus — impressão silenciosa com --kiosk-printing'
  New-Shortcut -Path $startMenuLnk -TargetPath $vbs -WorkingDirectory $Root -IconLocation "$ico,0" `
    -Description 'Cardápio Nimbus — impressão silenciosa com --kiosk-printing'

  $startupNote = 'Não'
  if ($WantStartWithWindows) {
    $startupDir = [Environment]::GetFolderPath('Startup')
    $startupLnk = Join-Path $startupDir "$ProductName.lnk"
    New-Shortcut -Path $startupLnk -TargetPath $vbs -WorkingDirectory $Root -IconLocation "$ico,0" `
      -Description 'Inicia Cardápio Nimbus no logon'
    $startupNote = "Sim ($startupLnk)"
  } else {
    $startupLnk = Join-Path ([Environment]::GetFolderPath('Startup')) "$ProductName.lnk"
    if (Test-Path -LiteralPath $startupLnk) { Remove-Item -LiteralPath $startupLnk -Force }
  }

  if ($WantLaunchNow) {
    Start-Process -FilePath 'wscript.exe' -ArgumentList "`"$vbs`""
  }

  return @{
    root = $Root
    desktop = $desktopLnk
    startMenu = $startMenuLnk
    startup = $startupNote
  }
}

function Show-InstallerUi {
  $src = Get-ScriptDir
  $icoPath = Join-Path $src 'assets\nimbus-cozinha.ico'

  $form = New-Object System.Windows.Forms.Form
  $form.Text = if ($ProductVersion) { "$ProductName — Instalador v$ProductVersion" } else { "$ProductName — Instalador" }
  $form.Size = New-Object System.Drawing.Size(520, 380)
  $form.StartPosition = 'CenterScreen'
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  if (Test-Path -LiteralPath $icoPath) {
    $form.Icon = New-Object System.Drawing.Icon $icoPath
  }

  $title = New-Object System.Windows.Forms.Label
  $title.Text = if ($ProductVersion) { "$ProductName v$ProductVersion" } else { $ProductName }
  $title.Font = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
  $title.Location = New-Object System.Drawing.Point(24, 20)
  $title.AutoSize = $true

  $sub = New-Object System.Windows.Forms.Label
  $sub.Text = "Instala o atalho do admin com impressão silenciosa (`--kiosk-printing`).`nDefina a impressora térmica como padrão no Windows antes de usar."
  $sub.Font = New-Object System.Drawing.Font('Segoe UI', 9)
  $sub.Location = New-Object System.Drawing.Point(24, 56)
  $sub.Size = New-Object System.Drawing.Size(460, 48)

  $box = New-Object System.Windows.Forms.GroupBox
  $box.Text = 'Opções'
  $box.Location = New-Object System.Drawing.Point(24, 118)
  $box.Size = New-Object System.Drawing.Size(460, 80)

  $chkStart = New-Object System.Windows.Forms.CheckBox
  $chkStart.Text = 'Iniciar com o sistema'
  $chkStart.Checked = $true
  $chkStart.Location = New-Object System.Drawing.Point(20, 32)
  $chkStart.AutoSize = $true

  $box.Controls.AddRange(@($chkStart))

  $btnOk = New-Object System.Windows.Forms.Button
  $btnOk.Text = 'Instalar'
  $btnOk.Location = New-Object System.Drawing.Point(278, 220)
  $btnOk.Size = New-Object System.Drawing.Size(100, 32)
  $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::None

  $btnCancel = New-Object System.Windows.Forms.Button
  $btnCancel.Text = 'Cancelar'
  $btnCancel.Location = New-Object System.Drawing.Point(384, 220)
  $btnCancel.Size = New-Object System.Drawing.Size(100, 32)
  $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel

  $status = New-Object System.Windows.Forms.Label
  $status.Text = ''
  $status.Location = New-Object System.Drawing.Point(24, 268)
  $status.Size = New-Object System.Drawing.Size(460, 40)
  $status.ForeColor = [System.Drawing.Color]::DimGray

  $btnOk.Add_Click({
    try {
      $btnOk.Enabled = $false
      $status.Text = 'Instalando…'
      $form.Refresh()
      $result = Install-CardapioNimbus `
        -WantStartWithWindows:$chkStart.Checked `
        -WantLaunchNow:$true `
        -Root ''

      $msg = @"
Instalação concluída.

Atalho: $($result.desktop)
Iniciar com o Windows: $($result.startup)

Importante:
• Use sempre o atalho «$ProductName» (não o Chrome normal).
• Impressora térmica = padrão do Windows.
• Na 1ª abertura, faça login no admin (perfil dedicado).
• A impressão de comandas é automática (--kiosk-printing).
"@
      [System.Windows.Forms.MessageBox]::Show($msg, $ProductName, 'OK', 'Information') | Out-Null
      $form.Close()
    } catch {
      $btnOk.Enabled = $true
      $status.Text = "Erro: $($_.Exception.Message)"
      [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, $ProductName, 'OK', 'Error') | Out-Null
    }
  })

  $form.Controls.AddRange(@($title, $sub, $box, $btnOk, $btnCancel, $status))
  $form.CancelButton = $btnCancel
  [void]$form.ShowDialog()
}

if ($Quiet) {
  $result = Install-CardapioNimbus `
    -WantStartWithWindows:$StartWithWindows `
    -WantLaunchNow:$LaunchNow `
    -Root $InstallRoot
  $result | ConvertTo-Json -Depth 4
} else {
  Show-InstallerUi
}
