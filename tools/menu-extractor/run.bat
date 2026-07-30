@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Ambiente .venv nao encontrado.
  echo Rode setup.bat primeiro.
  pause
  exit /b 1
)

echo Abrindo http://127.0.0.1:8765
echo Para parar: Ctrl+C
echo.
start "" "http://127.0.0.1:8765"
call ".venv\Scripts\python.exe" app.py
pause
