@echo off
title 环境检查

echo.
echo ====================================
echo   环境检查
echo ====================================
echo.

:: 检查Node.js
echo 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到Node.js
    echo 请从 https://nodejs.org/ 下载并安装Node.js
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%

:: 检查npm
echo.
echo 检查 npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: npm不可用
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm 版本: %NPM_VERSION%

:: 检查项目依赖
echo.
echo 检查项目依赖...
if not exist "%~dp0..\node_modules" (
    echo 📦 首次运行，正在安装依赖...
    cd /d "%~dp0.."
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo 检查依赖完整性...
    cd /d "%~dp0.."
    npm list --depth=0 >nul 2>&1
    if %errorlevel% neq 0 (
        echo 📦 依赖不完整，正在重新安装...
        npm install
        if %errorlevel% neq 0 (
            echo ❌ 依赖安装失败
            exit /b 1
        )
        echo ✅ 依赖重新安装完成
    ) else (
        echo ✅ 依赖检查通过
    )
)

:: 检查端口占用
echo.
echo 检查端口占用...
netstat -an | findstr ":8928" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  警告: 端口8928已被占用
    echo 请关闭占用该端口的程序或修改配置
) else (
    echo ✅ 端口8928可用
)

netstat -an | findstr ":8781" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  警告: 端口8781已被占用
    echo 请关闭占用该端口的程序或修改配置
) else (
    echo ✅ 端口8781可用
)

netstat -an | findstr ":8190" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  警告: 端口8190已被占用
    echo 请关闭占用该端口的程序或修改配置
) else (
    echo ✅ 端口8190可用
)

:: 检查关键文件
echo.
echo 检查关键文件...
if not exist "%~dp0..\backend\scripts\integrated-vite-server.js" (
    echo ❌ 错误: 找不到 integrated-vite-server.js
    exit /b 1
)
echo ✅ 集成服务器脚本存在

if not exist "%~dp0..\backend\config\config.mjs" (
    echo ❌ 错误: 找不到配置文件 config.mjs
    exit /b 1
)
echo ✅ 配置文件存在

echo.
echo ====================================
echo   环境检查完成
echo ====================================
echo.

exit /b 0