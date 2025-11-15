@echo off
chcp 65001 >nul
title Windows-Android Connect

echo.
echo =========================================
echo    Windows-Android Connect 启动器
echo =========================================
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到Node.js
    echo 请先安装Node.js (https://nodejs.org/)
    pause
    exit /b 1
)

:: 检查npm是否可用
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: npm不可用
    pause
    exit /b 1
)

echo ✅ Node.js版本: 
node --version

echo ✅ npm版本:
npm --version
echo.

:: 检查是否需要安装依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖包...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 🚀 启动Windows-Android Connect...
echo.

:: 启动应用
npm run start

if %errorlevel% neq 0 (
    echo.
    echo ❌ 应用启动失败
    echo.
    echo 💡 故障排除提示:
    echo    1. 确保所有依赖已安装: npm install
    echo    2. 检查Node.js版本是否为v18+
    echo    3. 尝试运行测试: node test-runner.js
    echo.
)

echo.
echo 应用已退出
pause