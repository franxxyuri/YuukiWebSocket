@echo off
title 停止服务

echo.
echo ====================================
echo   停止所有服务
echo ====================================
echo.

echo 正在停止 Node.js 进程...
taskkill /f /im node.exe 2>nul

echo 正在停止 npm 进程...
taskkill /f /im npm.cmd 2>nul

echo 正在停止 Vite 进程...
taskkill /f /im vite.exe 2>nul

echo.
echo 检查端口占用情况...

:: 检查并强制关闭占用端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8928"') do (
    echo 正在关闭占用端口8928的进程 %%a...
    taskkill /f /pid %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8781"') do (
    echo 正在关闭占用端口8781的进程 %%a...
    taskkill /f /pid %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8190"') do (
    echo 正在关闭占用端口8190的进程 %%a...
    taskkill /f /pid %%a 2>nul
)

echo.
echo ✅ 所有服务已停止
echo.

pause