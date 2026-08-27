@echo off
rem ====================================================
rem  Baisa Primary School - One-click upload tool
rem  Push local changes to GitHub (auto deploy)
rem  Pure ASCII version - works on any Windows
rem ====================================================
title Baisa Upload Tool
cd /d "%~dp0"

echo ==========================================
echo   Baisa Schedule - One Click Upload
echo ==========================================
echo.

rem ---- auto detect system proxy (Clash) ----
set "SYSPROXY="
for /f "tokens=3" %%P in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer 2^>nul') do set "SYSPROXY=%%P"
if defined SYSPROXY (
  echo  [OK] System proxy found: %SYSPROXY%
) else (
  set "SYSPROXY=127.0.0.1:7897"
  echo  [..] No system proxy, using default: %SYSPROXY%
)

rem ---- set git proxy for this session ----
git config http.proxy http://%SYSPROXY%
git config https.proxy http://%SYSPROXY%
echo  [..] Git proxy set : http://%SYSPROXY%
echo.

echo ==========================================
echo  Need Clash running to push to GitHub.
echo  If push fails, open Clash (System Proxy).
echo ==========================================
echo.

echo [1/3] Checking for changes...
git add -A
git status --short

set CHANGES=0
git status --short | findstr /r "." >nul && set CHANGES=1

if "%CHANGES%"=="0" (
  echo.
  echo  [WARN] No changes found to upload.
  echo  If you changed data.json, save it first.
  echo  Press any key to exit...
  pause >nul
  exit /b
)

echo.
echo [2/3] Committing changes...
set TS=%date:~-4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%
git commit -m "Update data %TS%"

echo.
echo [3/3] Pushing to GitHub...
git push origin main

echo.
echo ==========================================
if %errorlevel%==0 (
  echo  [SUCCESS] Upload ok! Cloud updates in 1-2 min.
  echo  Others refresh page to see latest data.
) else (
  echo  [FAIL] Upload failed. Check network / Clash.
  echo  Make sure Clash System Proxy is on, retry.
)
echo ==========================================
echo.
pause
