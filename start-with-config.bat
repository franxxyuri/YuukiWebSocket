@echo off
REM Windows-Android Connect 启动脚本 - 支持端口配置

echo 启动 Windows-Android Connect 服务...
echo.

REM 检查是否安装了Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 检查端口配置
set SERVER_PORT=%1
set VITE_PORT=%2
set DISCOVERY_PORT=%3

if "%SERVER_PORT%"=="" set SERVER_PORT=8828
if "%VITE_PORT%"=="" set VITE_PORT=8080
if "%DISCOVERY_PORT%"=="" set DISCOVERY_PORT=8090

echo 使用端口配置:
echo   主服务端口: %SERVER_PORT%
echo   Vite端口: %VITE_PORT%
echo   设备发现端口: %DISCOVERY_PORT%
echo.

REM 启动后端服务器 (在新窗口中)
echo 启动后端服务器...
start "Windows-Android Connect Server" cmd /k "node complete-server.js"

timeout /t 3 /nobreak >nul

REM 启动Vite开发服务器 (在新窗口中)
echo 启动Vite开发服务器...
set SERVER_PORT=%SERVER_PORT%
start "Vite Development Server" cmd /k "npx vite --config vite-config.js --port %VITE_PORT% --host 0.0.0.0"

echo.
echo 服务启动完成!
echo - 主服务器: http://localhost:%SERVER_PORT%
echo - Vite服务器: http://localhost:%VITE_PORT%
echo - 设备发现端口: UDP %DISCOVERY_PORT%
echo.
echo 按任意键继续...
pause >nul