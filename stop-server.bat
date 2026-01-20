@echo off
REM 停止所有服务器进程

echo 停止服务器...
echo.

REM 停止Node.js进程
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo 已停止Node.js进程
) else (
    echo 未找到运行的Node.js进程
)

echo.
echo 服务器已停止
pause
