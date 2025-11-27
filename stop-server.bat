@echo off
title Stop Windows-Android Connect Server

echo 正在停止Windows-Android Connect服务器...
echo.

REM Kill specific processes by port
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8928') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8781') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8190') do taskkill /f /pid %%a >nul 2>&1

REM Kill any node processes that might be running server scripts
wmic process where "name='node.exe' and commandline like '%integrated-vite-server.js%'" call terminate >nul 2>&1
wmic process where "name='node.exe' and commandline like '%complete-server.js%'" call terminate >nul 2>&1

REM Alternative method if wmic doesn't work
taskkill /F /IM node.exe >nul 2>&1

echo 检查剩余的node进程...
tasklist /FI "IMAGENAME eq node.exe" | find /I /N "node.exe" >nul
if "%ERRORLEVEL%"=="0" (
    echo 仍然存在node进程，尝试强制终止...
    taskkill /F /IM node.exe >nul 2>&1
) else (
    echo 没有发现node进程
)

echo.
echo 服务器已停止
pause