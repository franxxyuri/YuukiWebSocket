@echo off
title Windows-Android Connect - Separated Mode

echo ========================================
echo   Windows-Android Connect - Separated Mode
echo ========================================
echo.
echo 1. 启动后端服务 (端口: 8928)
echo 2. 启动前端服务 (端口: 8781)
echo 3. 启动设备发现服务 (UDP: 8190)
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Kill any existing node processes from this directory
echo Stopping any existing server processes...

REM Kill TCP listening processes on our ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8928') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8781') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8190') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8181') do taskkill /f /pid %%a >nul 2>&1

REM Kill UDP processes by finding node processes using our scripts
wmic process where "name='node.exe' and commandline like '%complete-server.js%'" call terminate >nul 2>&1
wmic process where "name='node.exe' and commandline like '%vite%'" call terminate >nul 2>&1

REM Kill any other node processes that might conflict
taskkill /f /im node.exe >nul 2>&1

echo Waiting for processes to stop...
timeout /t 3 /nobreak >nul

REM Install dependencies if not already installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
    echo Dependencies installed successfully
)

REM Start backend server in a new window
echo Starting backend server...
start "Backend Server" cmd /k "node backend/scripts/complete-server.js"

REM Wait for backend server to start
echo Waiting for backend server to start...
timeout /t 2 /nobreak >nul

REM Start frontend server in a new window
echo Starting frontend server...
start "Frontend Server" cmd /k "npm run dev:vite"

echo.
echo ========================================
echo   Services started successfully!
echo ========================================
echo.
echo Backend service running at: http://localhost:8928
echo Frontend service running at: http://localhost:8781
echo Device discovery service running at: UDP 8190
echo.
echo Press any key to exit...
pause >nul

REM Stop all servers when script exits
echo Stopping all servers...
taskkill /f /im node.exe >nul 2>&1
echo All servers stopped.