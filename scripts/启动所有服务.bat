@echo off
title Windows-Android Connect

echo.
echo =========================================
echo    Windows-Android Connect 启动器
echo =========================================
echo.

:: 检查 Node.js 是否已安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到 Node.js
    echo 请先安装 Node.js (https://nodejs.org/)
    pause
    exit /b 1
)

echo Node.js 版本: 
node --version
echo.

:: 检查依赖是否需要安装
if not exist "%~dp0..\node_modules" (
    echo 首次运行，正在安装依赖...
    echo.
    cd /d "%~dp0.."
    npm install
    if %errorlevel% neq 0 (
        echo 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 启动 Windows-Android Connect...
echo.

:: 启动主服务器（后台运行）
echo 启动主服务器...
start "主服务器" /min cmd /c "cd /d "%~dp0.." && node complete-server.js"

:: 等待服务器启动
timeout /t 3 /nobreak >nul

:: 启动 Vite 开发服务器
echo 启动 Vite 开发服务器...
cd /d "%~dp0.."
npm run dev

if %errorlevel% neq 0 (
    echo.
    echo 应用启动失败
    echo.
    echo 故障排除提示:
    echo    1. 确保所有依赖已安装: npm install
    echo    2. 检查 Node.js 版本是否为 v18+
    echo    3. 尝试运行测试: node test-runner.js
    echo.
)

echo.
echo 应用已退出
pause