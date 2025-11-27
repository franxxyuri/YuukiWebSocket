@echo off
echo 正在启动集成服务器...
echo 当前时间: %date% %time%
echo 启动目录: %cd%
cd /d "%~dp0.."
node --version
echo 启动服务器...
node integrated-vite-server.js > server-startup.log 2>&1
echo 服务器已停止运行，日志已保存到 server-startup.log
type server-startup.log
pause