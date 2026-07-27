@echo off
chcp 65001 >nul
setlocal EnableExtensions

:: ============================================================
:: Nimbus — atalho da cozinha (impressão sem diálogo do Windows)
::
:: O que este arquivo faz:
::  1) Localiza o Google Chrome (ou Edge)
::  2) Cria um atalho na Área de Trabalho
::  3) Abre o admin já com --kiosk-printing
::
:: Uso:
::  - Dê dois cliques neste .bat UMA VEZ para criar o atalho
::  - Depois use só o atalho "Nimbus Cozinha" na Área de Trabalho
::
:: Importante:
::  - Defina a impressora térmica como PADRÃO no Windows
::  - Deixe esta janela aberta no PC da cozinha
::  - Se o Windows avisar "Windows protegeu o seu PC", use
::    "Mais informações" → "Executar assim mesmo"
:: ============================================================

:: --- URL do admin (altere se for staging ou local) ---
set "ADMIN_URL=https://cardapionimbus.com.br/admin/pedidos"
:: set "ADMIN_URL=https://staging.cardapionimbus.com.br/admin/pedidos"
:: set "ADMIN_URL=http://localhost:3010/admin/pedidos"

set "SHORTCUT_NAME=Nimbus Cozinha"
set "DESKTOP=%USERPROFILE%\Desktop"
if exist "%USERPROFILE%\OneDrive\Desktop" set "DESKTOP=%USERPROFILE%\OneDrive\Desktop"
if exist "%USERPROFILE%\OneDrive\Área de Trabalho" set "DESKTOP=%USERPROFILE%\OneDrive\Área de Trabalho"
if exist "%USERPROFILE%\Área de Trabalho" set "DESKTOP=%USERPROFILE%\Área de Trabalho"

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

:: Fallback: Microsoft Edge (também Chromium)
if not defined CHROME if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "CHROME=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined CHROME if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "CHROME=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if not defined CHROME (
  echo.
  echo [ERRO] Nao encontrei Google Chrome nem Microsoft Edge.
  echo Instale o Chrome e execute este arquivo de novo.
  echo.
  pause
  exit /b 1
)

echo.
echo Navegador: %CHROME%
echo URL:       %ADMIN_URL%
echo Atalho:    %DESKTOP%\%SHORTCUT_NAME%.lnk
echo.

:: Cria o atalho na Area de Trabalho
:: --kiosk-printing = imprime sem abrir o assistente do Windows
:: --app=URL        = janela dedicada (sem abas), mais estavel na cozinha
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%DESKTOP%\%SHORTCUT_NAME%.lnk');" ^
  "$s.TargetPath='%CHROME%';" ^
  "$s.Arguments='--kiosk-printing --app=\"%ADMIN_URL%\"';" ^
  "$s.WorkingDirectory=Split-Path '%CHROME%';" ^
  "$s.WindowStyle=1;" ^
  "$s.Description='Cardapio Nimbus - cozinha (impressao silenciosa)';" ^
  "$s.Save()"

if errorlevel 1 (
  echo [ERRO] Falha ao criar o atalho.
  pause
  exit /b 1
)

echo [OK] Atalho criado.
echo Abrindo o admin em modo cozinha...
echo.

start "" "%CHROME%" --kiosk-printing --app="%ADMIN_URL%"

echo Pronto.
echo Da proxima vez, use o atalho "%SHORTCUT_NAME%" na Area de Trabalho.
echo.
pause
endlocal
