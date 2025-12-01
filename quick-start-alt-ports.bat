@echo off
title Quick Start - Alternative Ports

echo ========================================
echo   Quick Start - Alternative Ports
echo ========================================
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Kill any existing node processes from this directory
echo Stopping any existing server processes...

REM Kill TCP listening processes on our ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :9928') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :9781') do taskkill /f /pid %%a >nul 2>&1

REM Kill UDP processes by finding node processes using our scripts
wmic process where "name='node.exe' and commandline like '%integrated-vite-server.js%'" call terminate >nul 2>&1
wmic process where "name='node.exe' and commandline like '%complete-server.js%'" call terminate >nul 2>&1

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

REM Start the integrated server with alternative ports
echo Starting integrated server with alternative ports...
set SERVER_PORT=9928
set VITE_PORT=9781
node backend/scripts/integrated-vite-server.js

echo.
echo Server stopped or encountered an error
pause