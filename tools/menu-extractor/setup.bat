@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === Nimbus Menu Extractor - setup Windows ===
echo.

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  set "PY=py -3"
  goto :have_python
)

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  python -c "import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
  if %ERRORLEVEL%==0 (
    set "PY=python"
    goto :have_python
  )
)

echo Python 3.10+ nao encontrado.
echo.
echo 1^) Baixe em: https://www.python.org/downloads/
echo 2^) No instalador, marque: "Add python.exe to PATH"
echo 3^) Marque tambem: "Install pip"
echo 4^) Feche e abra o terminal de novo, depois rode este setup.bat outra vez.
echo.
echo Se o Windows abrir a Microsoft Store ao digitar python, desative o alias:
echo   Configuracoes ^> Aplicativos ^> Configuracoes avancadas ^> Aliases de execucao
echo   Desligue "Instalador de aplicativo" para python.exe e python3.exe
echo.
pause
exit /b 1

:have_python
echo Usando: %PY%
%PY% --version
if errorlevel 1 (
  echo Falha ao executar Python.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Criando ambiente virtual .venv ...
  %PY% -m venv .venv
  if errorlevel 1 (
    echo Falha ao criar .venv
    pause
    exit /b 1
  )
)

echo Instalando dependencias...
call ".venv\Scripts\python.exe" -m pip install --upgrade pip
call ".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo Falha no pip install
  pause
  exit /b 1
)

echo Instalando Chromium do Playwright...
call ".venv\Scripts\python.exe" -m playwright install chromium
if errorlevel 1 (
  echo Falha no playwright install
  pause
  exit /b 1
)

echo.
echo Setup concluido.
echo Agora rode: run.bat
echo.
pause
exit /b 0
