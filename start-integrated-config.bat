@echo off
REM 启动集成服务器，使用配置文件中的端口
echo 启动 Windows-Android Connect 集成服务器...
echo.

REM 设置环境变量
set SERVER_PORT=8828
set VITE_PORT=8080
set DISCOVERY_PORT=8090

REM 从 .env 文件加载环境变量
for /f "tokens=*" %%a in ('type .env ^| findstr SERVER_PORT') do set %%a
for /f "tokens=*" %%a in ('type .env ^| findstr VITE_PORT') do set %%a
for /f "tokens=*" %%a in ('type .env ^| findstr DISCOVERY_PORT') do set %%a

echo 使用端口配置:
echo   主服务端口: %SERVER_PORT%
echo   Vite端口: %VITE_PORT%
echo   设备发现端口: %DISCOVERY_PORT%
echo.

REM 启动集成服务器
echo 启动集成服务器...
node integrated-vite-server.js

pause