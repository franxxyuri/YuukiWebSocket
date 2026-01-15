@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 清理旧脚本工具
title 清理旧脚本

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

echo.
echo %BLUE%╔═══════════════════════════════════════════════════════════╗%RESET%
echo %BLUE%║                                                           ║%RESET%
echo %BLUE%║        清理旧脚本工具                                      ║%RESET%
echo %BLUE%║                                                           ║%RESET%
echo %BLUE%╚═══════════════════════════════════════════════════════════╝%RESET%
echo.

echo %YELLOW%此工具将帮助你清理已被整合的旧脚本文件%RESET%
echo.
echo %YELLOW%将要删除的文件：%RESET%
echo.
echo   - start-dev-server.bat
echo   - start-separated.bat
echo   - quick-start-dev.bat
echo   - quick-start-alt-ports.bat
echo   - check-server-status.bat
echo   - port-cleanup.bat
echo   - test-server.js
echo   - test-websocket.js
echo   - test-device-discovery.js
echo   - test-simple-server.js
echo   - test-strategy-switch.js
echo.
echo %RED%警告：此操作不可恢复！%RESET%
echo.
set /p confirm=%YELLOW%确认删除这些文件？(y/N): %RESET%

if /i not "%confirm%"=="y" (
    echo.
    echo %YELLOW%操作已取消%RESET%
    goto :end
)

echo.
echo %BLUE%开始清理...%RESET%
echo.

set count=0

:: 删除启动脚本
if exist start-dev-server.bat (
    del /f start-dev-server.bat
    echo %GREEN%✓%RESET% 已删除 start-dev-server.bat
    set /a count+=1
)

if exist start-separated.bat (
    del /f start-separated.bat
    echo %GREEN%✓%RESET% 已删除 start-separated.bat
    set /a count+=1
)

if exist quick-start-dev.bat (
    del /f quick-start-dev.bat
    echo %GREEN%✓%RESET% 已删除 quick-start-dev.bat
    set /a count+=1
)

if exist quick-start-alt-ports.bat (
    del /f quick-start-alt-ports.bat
    echo %GREEN%✓%RESET% 已删除 quick-start-alt-ports.bat
    set /a count+=1
)

:: 删除管理脚本
if exist check-server-status.bat (
    del /f check-server-status.bat
    echo %GREEN%✓%RESET% 已删除 check-server-status.bat
    set /a count+=1
)

if exist port-cleanup.bat (
    del /f port-cleanup.bat
    echo %GREEN%✓%RESET% 已删除 port-cleanup.bat
    set /a count+=1
)

:: 删除测试脚本
if exist test-server.js (
    del /f test-server.js
    echo %GREEN%✓%RESET% 已删除 test-server.js
    set /a count+=1
)

if exist test-websocket.js (
    del /f test-websocket.js
    echo %GREEN%✓%RESET% 已删除 test-websocket.js
    set /a count+=1
)

if exist test-device-discovery.js (
    del /f test-device-discovery.js
    echo %GREEN%✓%RESET% 已删除 test-device-discovery.js
    set /a count+=1
)

if exist test-simple-server.js (
    del /f test-simple-server.js
    echo %GREEN%✓%RESET% 已删除 test-simple-server.js
    set /a count+=1
)

if exist test-strategy-switch.js (
    del /f test-strategy-switch.js
    echo %GREEN%✓%RESET% 已删除 test-strategy-switch.js
    set /a count+=1
)

:: 删除旧的 start.bat（如果存在且不是新版本）
if exist start.bat (
    findstr /C:"WAC" start.bat >nul 2>&1
    if errorlevel 1 (
        del /f start.bat
        echo %GREEN%✓%RESET% 已删除旧版 start.bat
        set /a count+=1
    )
)

:: 删除旧的 stop-server.bat（如果存在）
if exist stop-server.bat (
    del /f stop-server.bat
    echo %GREEN%✓%RESET% 已删除 stop-server.bat
    set /a count+=1
)

echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %GREEN%✓ 清理完成！%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.
echo %YELLOW%统计信息：%RESET%
echo   已删除文件: %count% 个
echo.
echo %YELLOW%现在你可以使用新的统一 CLI：%RESET%
echo   %GREEN%wac-cli%RESET% - 查看菜单
echo   %GREEN%wac-cli start%RESET% - 启动服务
echo   %GREEN%wac-cli help%RESET% - 查看帮助
echo.

:end
pause
exit /b 0
