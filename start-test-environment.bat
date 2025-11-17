@echo off
echo Windows-Android Connect 一键启动脚本
echo ======================================
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 检查npm依赖
echo 检查npm依赖...
npm list --depth=0 >nul 2>&1
if errorlevel 1 (
    echo 安装npm依赖...
    npm install
    if errorlevel 1 (
        echo 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 启动集成服务器...
echo 请在新打开的命令行窗口中查看服务器启动日志
echo.

REM 启动集成服务器
start "Windows-Android Connect Server" cmd /k "node integrated-vite-server.js"

echo.
echo 等待服务器启动完成...
timeout /t 5 /nobreak >nul

echo.
echo 打开测试页面...
start http://localhost:8080/test-server-functions.html

echo.
echo 服务器已在后台运行
echo 测试页面已打开
echo.
echo 使用说明:
echo 1. 请确保端口8828和8090未被其他程序占用
echo 2. 如果服务器启动失败，请关闭占用端口的程序后重试
echo 3. 测试页面包含所有服务端功能的测试工具
echo.
echo 按任意键关闭此窗口...
pause >nul