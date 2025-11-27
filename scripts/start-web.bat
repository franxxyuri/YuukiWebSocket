@echo off
title Windows-Android Connect Web

echo.
echo =========================================
echo    Windows-Android Connect Web Launcher
echo =========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js not found
    echo Please install Node.js first (https://nodejs.org/)
    pause
    exit /b 1
)

:: Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm not available
    pause
    exit /b 1
)

echo Node.js version: 
node --version

echo npm version:
npm --version
echo.

:: Check if dependencies need to be installed
if not exist "%~dp0..\node_modules" (
    echo First run, installing dependencies...
    echo.
    cd /d "%~dp0.."
    npm install
    if %errorlevel% neq 0 (
        echo Dependency installation failed
        pause
        exit /b 1
    )
)

echo.
echo Starting Windows-Android Connect Web Server...
echo.

:: Start the WebSocket server in background
echo Starting WebSocket server...
start "WebSocket Server" /min cmd /c "cd /d "%~dp0.." && npm run server"

:: Wait a moment for the server to start
timeout /t 3 /nobreak >nul

:: Start the Vite development server
echo Starting Vite development server...
cd /d "%~dp0.."
npm run dev

if %errorlevel% neq 0 (
    echo.
    echo Application failed to start
    echo.
    echo Troubleshooting tips:
    echo    1. Make sure all dependencies are installed: npm install
    echo    2. Check Node.js version is v18+
    echo    3. Try running tests: node test-runner.js
    echo.
)

echo.
echo Application exited
pause