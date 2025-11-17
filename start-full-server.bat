@echo off
echo 正在启动Windows-Android Connect集成服务器...
echo 包含Windows主服务(8828端口)和Vite开发服务器(8080端口)
echo.

REM 检查node是否可用
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请确保已安装Node.js
    pause
    exit /b 1
)

REM 检查npm依赖
echo 检查npm依赖...
npm list --depth=0 >nul 2>&1
if errorlevel 1 (
    echo 安装npm依赖...
    npm install
)

echo.
echo 启动集成服务器...

REM 启动集成服务器
node integrated-vite-server.js

echo.
echo 服务器已关闭
pause