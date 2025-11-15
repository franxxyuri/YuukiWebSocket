@echo off
chcp 65001 >nul
title Windows-Android Connect 服务端

echo.
echo =========================================
echo    Windows-Android Connect 服务端
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

echo ✅ Node.js版本: 
node --version

echo.
echo 🚀 启动服务端...
echo.

:: 在后台启动服务端
start "Windows-Android Connect 服务端" /min node start-server.js

echo ✅ 服务端已在后台启动
echo 🌐 服务端监听端口: 8080
echo 💡 请确保客户端在同一网络中连接到此服务端
echo.
echo 按任意键关闭此窗口...
pause >nul