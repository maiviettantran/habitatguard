@echo off
title HabitatGuard launcher
cd /d "%~dp0backend"

rem Stop an older HabitatGuard server that may still be using port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

rem Prefer Anaconda Python if it exists, otherwise use python on PATH
if exist "%USERPROFILE%\anaconda3\python.exe" (set "PY=%USERPROFILE%\anaconda3\python.exe") else (set "PY=python")
echo Using Python: %PY%

echo Installing backend packages (first run only takes a minute)...
"%PY%" -m pip install -r requirements.txt > "%~dp0setup_log.txt" 2>&1
if errorlevel 1 (
  echo pip install FAILED - see setup_log.txt
  pause
  exit /b 1
)

if not exist "%~dp0frontend\dist\index.html" (
  echo Dashboard build missing. Building it with npm...
  cd /d "%~dp0frontend"
  call npm install >> "%~dp0setup_log.txt" 2>&1
  call npm run build >> "%~dp0setup_log.txt" 2>&1
  cd /d "%~dp0backend"
)

echo Starting server at http://localhost:8000
start "HabitatGuard server - close this window to stop" "%PY%" -m uvicorn app:app --host 0.0.0.0 --port 8000
timeout /t 6 /nobreak >nul
start "" http://localhost:8000
echo.
echo HabitatGuard is running. Dashboard: http://localhost:8000
echo Close the "HabitatGuard server" window to stop it.
timeout /t 10
