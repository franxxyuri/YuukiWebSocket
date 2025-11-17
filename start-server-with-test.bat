@echo off
echo 正在启动Windows-Android Connect集成服务器...
echo 包含Windows主服务(8828端口)和Vite开发服务器(8080端口)
echo.

REM 启动集成服务器
start "Windows-Android Connect Server" node integrated-vite-server.js

REM 等待几秒钟让服务器启动
timeout /t 5 /nobreak >nul

REM 打开测试页面
echo 正在打开测试页面...
start http://localhost:8080/test-server-functions.html

echo.
echo 服务器已在后台运行
echo 测试页面已打开
echo 按任意键关闭此窗口...
pause >nul