@echo off
title Port Cleanup Tool

echo 清理Windows-Android Connect使用的端口...
echo.

REM 获取使用端口8190/9190的进程ID（UDP）
for /f "tokens=5" %%a in ('netstat -anb -p UDP ^| findstr :8190') do (
    echo 发现使用UDP端口8190的进程PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -anb -p UDP ^| findstr :9190') do (
    echo 发现使用UDP端口9190的进程PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM 获取使用端口8928/9928的进程ID（TCP）
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8928') do (
    echo 发现使用TCP端口8928的进程PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :9928') do (
    echo 发现使用TCP端口9928的进程PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM 获取使用端口8781/9781的进程ID（TCP）
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8781') do (
    echo 发现使用TCP端口8781的进程PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :9781') do (
    echo 发现使用TCP端口9781的进程PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM 获取使用端口8181/9181的进程ID（TCP）
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8181') do (
    echo 发现使用TCP端口8181的进程PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :9181') do (
    echo 发现使用TCP端口9181的进程PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM 终止所有node进程
echo 终止所有node.exe进程...
taskkill /f /im node.exe >nul 2>&1

echo.
echo 等待进程终止...
timeout /t 3 /nobreak >nul

REM 检查是否还有node进程在运行
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo 警告: 仍有node进程在运行
) else (
    echo 确认: 没有node进程在运行
)

echo.
echo 端口清理完成
pause