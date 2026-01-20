@echo off
REM 开发模式启动脚本 - 启动后端和前端开发服务器

echo 启动开发环境...
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 启动后端服务器
echo 启动后端服务器 (端口 3000)...
start "Backend Dev Server" cmd /k "npm run dev"

REM 等待后端启动
timeout /t 3 /nobreak

REM 启动前端开发服务器
echo 启动前端开发服务器 (端口 5173)...
start "Frontend Dev Server" cmd /k "npm run dev:vite"

echo.
echo 开发环境已启动！
echo 后端: http://localhost:3000
echo 前端: http://localhost:5173
echo.
echo 按任意键关闭此窗口...
pause
