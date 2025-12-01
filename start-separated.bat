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

REM 设置默认端口
set SERVER_PORT=8928
set VITE_PORT=8781
set DISCOVERY_PORT=8190

REM 从环境变量覆盖默认端口
if not "%SERVER_PORT%" == "" set SERVER_PORT=%SERVER_PORT%
if not "%VITE_PORT%" == "" set VITE_PORT=%VITE_PORT%
if not "%DISCOVERY_PORT%" == "" set DISCOVERY_PORT=%DISCOVERY_PORT%

REM Kill any existing node processes from this directory
echo Stopping any existing server processes...

REM Kill TCP listening processes on our ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :%SERVER_PORT%') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :%VITE_PORT%') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :%DISCOVERY_PORT%') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :8181') do taskkill /f /pid %%a >nul 2>&1

REM Kill UDP processes by finding node processes using our scripts
wmic process where "name='node.exe' and commandline like '%complete-server.js%'" call terminate >nul 2>&1
wmic process where "name='node.exe' and commandline like '%vite%'" call terminate >nul 2>&1

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
start "Backend Server" cmd /k "set SERVER_PORT=%SERVER_PORT% && set DISCOVERY_PORT=%DISCOVERY_PORT% && node backend/scripts/complete-server.js"

REM Wait for backend server to start
echo Waiting for backend server to start...
timeout /t 2 /nobreak >nul

REM Start frontend server in a new window
echo Starting frontend server...
start "Frontend Server" cmd /k "set VITE_PORT=%VITE_PORT% && npm run dev:vite"

echo.
echo ========================================
echo   Services started successfully!
echo ========================================
echo.
echo Backend service running at: http://localhost:%SERVER_PORT%
echo Frontend service running at: http://localhost:%VITE_PORT%
echo Device discovery service running at: UDP %DISCOVERY_PORT%
echo.
echo Press any key to exit...
pause >nul

REM Stop all servers when script exits
echo Stopping all servers...
wmic process where "name='node.exe' and commandline like '%complete-server.js%'" call terminate >nul 2>&1
wmic process where "name='node.exe' and commandline like '%vite%'" call terminate >nul 2>&1
echo All servers stopped.