@echo off
REM Windows-Android Connect - 启动脚本
REM 启动后端服务器和前端开发服务器

echo 启动 Windows-Android Connect...
echo.

REM 启动后端服务器
echo 启动后端服务器 (端口 3000)...
start "Backend Server" cmd /k "npm start"

REM 等待后端启动
timeout /t 3 /nobreak

REM 启动前端开发服务器
echo 启动前端开发服务器 (端口 5173)...
start "Frontend Dev Server" cmd /k "npm run dev:vite"

echo.
echo 服务器已启动！
echo 后端: http://localhost:3000
echo 前端: http://localhost:5173
echo.
pause
