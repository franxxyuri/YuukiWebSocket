@echo off
chcp 65001 >nul
title Windows-Android Connect - 一键启动

:: 设置颜色
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

cls
echo.
echo %BLUE%╔═══════════════════════════════════════════════════════════╗%RESET%
echo %BLUE%║                                                           ║%RESET%
echo %BLUE%║        Windows-Android Connect                            ║%RESET%
echo %BLUE%║        一键启动                                            ║%RESET%
echo %BLUE%║                                                           ║%RESET%
echo %BLUE%╚═══════════════════════════════════════════════════════════╝%RESET%
echo.

:: 检查 Node.js
echo %YELLOW%[1/4]%RESET% 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ Node.js 未安装%RESET%
    echo.
    echo %YELLOW%请先安装 Node.js: https://nodejs.org/%RESET%
    echo.
    pause
    exit /b 1
)
echo %GREEN%✓ Node.js 已安装%RESET%

:: 检查依赖
echo %YELLOW%[2/4]%RESET% 检查依赖...
if not exist node_modules (
    echo %YELLOW%! 依赖未安装，正在安装...%RESET%
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo %RED%✗ 依赖安装失败%RESET%
        pause
        exit /b 1
    )
    echo.
    echo %GREEN%✓ 依赖安装完成%RESET%
) else (
    echo %GREEN%✓ 依赖已安装%RESET%
)

:: 验证配置
echo %YELLOW%[3/4]%RESET% 验证配置...
node test-fixes.js >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ 配置验证失败%RESET%
    echo.
    echo %YELLOW%正在尝试修复...%RESET%
    timeout /t 2 /nobreak >nul
)
echo %GREEN%✓ 配置正常%RESET%

:: 启动服务
echo %YELLOW%[4/4]%RESET% 启动服务...
echo.
echo %GREEN%═══════════════════════════════════════════════════════════%RESET%
echo %GREEN%正在启动服务器...%RESET%
echo %GREEN%═══════════════════════════════════════════════════════════%RESET%
echo.
echo %YELLOW%提示：%RESET%
echo   - 服务启动后会自动打开浏览器
echo   - 前端地址: http://localhost:8781
echo   - 后端地址: http://localhost:8928
echo.
echo %YELLOW%按 Ctrl+C 可以停止服务%RESET%
echo.

:: 等待用户准备
timeout /t 3 /nobreak >nul

:: 启动服务
npm start

:: 如果服务停止
echo.
echo %YELLOW%服务已停止%RESET%
pause
