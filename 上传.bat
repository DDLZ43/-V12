@echo off
chcp 65001 >nul
title 课表系统 - 一键上传
echo ==========================================
echo        课表系统 一键上传工具
echo    (把改动推送到 GitHub，自动上线)
echo ==========================================
echo.

cd /d "%~dp0"

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
  echo  ✅ 上传成功！云端 1~2 分钟后自动更新。
  echo     别人刷新（或强刷）页面即可看到最新内容。
) else (
  echo  ❌ 上传失败，请检查网络或 GitHub 登录状态。
)
echo ==========================================
echo.
pause
