@echo off
chcp 65001 >nul
title 课表系统 - 一键上传
echo ==========================================
echo        课表系统 一键上传工具
echo    (自动检测代理 + 推送 GitHub)
echo ==========================================
echo.

cd /d "%~dp0"

rem --- auto detect system proxy (Clash) ---
set "SYSPROXY="
for /f "tokens=3" %%P in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer 2^>nul') do set "SYSPROXY=%%P"
if defined SYSPROXY (
  echo  [?] 检测到系统代理：%SYSPROXY%
) else (
  set "SYSPROXY=127.0.0.1:7897"
  echo  [!] 未检测到系统代理，回退默认 %SYSPROXY%
)

rem --- set git proxy for this session ---
git config http.proxy http://%SYSPROXY%
git config https.proxy http://%SYSPROXY%
echo      git 已配置代理：http://%SYSPROXY%
echo.
echo  提示：推送 GitHub 需开启 Clash 代理。
echo        若上方显示"未检测到系统代理"，
echo        请在 Clash 里打开【系统代理】开关后重试。
echo.

echo [1/3] 检查是否有改动...
git add -A
git status --short

set CHANGES=0
git status --short | findstr /r "." >nul && set CHANGES=1

if "%CHANGES%"=="0" (
  echo.
  echo  [提示] 当前没有需要上传的改动，
  echo  如果你刚改过 data.json，请先保存文件再运行本脚本。
  echo  按任意键退出...
  pause >nul
  exit /b
)

echo.
echo [2/3] 提交改动...
set TS=%date:~0,4%-%date:~5,2%-%date:~8,2%_%time:~0,2%:%time:~3,2%
git commit -m "更新数据 %TS%"

echo.
echo [3/3] 推送到 GitHub...
git push origin main

echo.
echo ==========================================
if %errorlevel%==0 (
  echo  [OK] 上传成功！云端 1~2 分钟后自动更新。
  echo     别人刷新（或强刷）页面即可看到最新内容。
) else (
  echo  [FAIL] 上传失败，请检查网络或 GitHub 状态。
  echo      若代理未生效，请开启 Clash 系统代理后重试。
)
echo ==========================================
echo.
pause