@echo off
title Fake ESP32 test
cd /d "%~dp0"
if exist "%USERPROFILE%\anaconda3\python.exe" (set "PY=%USERPROFILE%\anaconda3\python.exe") else (set "PY=python")
echo Sending an OVERHEATED package reading (41 C) like the ESP32 would...
"%PY%" esp32\fake_esp32.py --temp 41
echo.
echo Check the dashboard - a new Quarantined scan should appear.
pause
