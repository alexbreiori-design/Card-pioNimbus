; Cardápio Nimbus — Inno Setup 6
; Compilar: .\build.ps1
; Ou manual: ISCC.exe /DMyAppVersion=1.1.0 nimbus-cozinha.iss

#ifndef MyAppName
  #define MyAppName "Cardápio Nimbus"
#endif
#ifndef MyAppPublisher
  #define MyAppPublisher "Cardápio Nimbus"
#endif
#ifndef MyAppVersion
  #define MyAppVersion "1.1.0"
#endif
#ifndef MyAppURL
  #define MyAppURL "https://cardapionimbus.com.br"
#endif
#ifndef OutputBaseFilename
  #define OutputBaseFilename "CardapioNimbusSetup-" + MyAppVersion
#endif

[Setup]
AppId={{A7C3E9F1-4B2D-4E8A-9C1F-0D6B8A5E2F34}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
DefaultDirName={localappdata}\CardapioNimbus\Cozinha
DefaultGroupName=Cardápio Nimbus
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=dist
OutputBaseFilename={#OutputBaseFilename}
SetupIconFile=assets\nimbus-cozinha.ico
UninstallDisplayIcon={app}\assets\nimbus-cozinha.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=no
RestartIfNeededByRun=no

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
Source: "NimbusCozinha.launcher.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "NimbusCozinha.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "config.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "Install-NimbusCozinha.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\nimbus-cozinha.ico"; DestDir: "{app}\assets"; Flags: ignoreversion

[Icons]
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\NimbusCozinha.vbs"; WorkingDir: "{app}"; IconFilename: "{app}\assets\nimbus-cozinha.ico"; Comment: "Cardápio Nimbus {#MyAppVersion} — impressão silenciosa"
Name: "{userprograms}\Cardápio Nimbus\{#MyAppName}"; Filename: "{app}\NimbusCozinha.vbs"; WorkingDir: "{app}"; IconFilename: "{app}\assets\nimbus-cozinha.ico"; Comment: "Cardápio Nimbus {#MyAppVersion} — impressão silenciosa"

[Run]
Filename: "{app}\NimbusCozinha.vbs"; Description: "Abrir Cardápio Nimbus agora"; Flags: nowait postinstall skipifsilent shellexec

[Code]
var
  OptionsPage: TWizardPage;
  ChkStartWithWindows: TNewCheckBox;

procedure CreateStartupShortcut;
var
  StartupDir, LnkPath: string;
begin
  StartupDir := ExpandConstant('{userstartup}');
  LnkPath := StartupDir + '\{#MyAppName}.lnk';
  ForceDirectories(StartupDir);
  CreateShellLink(
    LnkPath,
    'Inicia Cardápio Nimbus no logon',
    ExpandConstant('{app}\NimbusCozinha.vbs'),
    '',
    ExpandConstant('{app}'),
    ExpandConstant('{app}\assets\nimbus-cozinha.ico'),
    0,
    SW_SHOWNORMAL
  );
end;

procedure RemoveStartupShortcut;
var
  LnkPath: string;
begin
  LnkPath := ExpandConstant('{userstartup}\{#MyAppName}.lnk');
  if FileExists(LnkPath) then
    DeleteFile(LnkPath);
end;

procedure InitializeWizard;
begin
  OptionsPage := CreateCustomPage(
    wpSelectDir,
    'Opções do Cardápio Nimbus',
    'Escolha como o atalho deve se comportar neste computador.'
  );

  ChkStartWithWindows := TNewCheckBox.Create(OptionsPage);
  ChkStartWithWindows.Parent := OptionsPage.Surface;
  ChkStartWithWindows.Caption := 'Iniciar com o sistema';
  ChkStartWithWindows.Checked := True;
  ChkStartWithWindows.Top := ScaleY(8);
  ChkStartWithWindows.Left := ScaleX(0);
  ChkStartWithWindows.Width := OptionsPage.SurfaceWidth;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep <> ssPostInstall then Exit;

  if ChkStartWithWindows.Checked then
    CreateStartupShortcut
  else
    RemoveStartupShortcut;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    RemoveStartupShortcut;
end;
