@echo off
echo Windows-Android Connect Auto Start Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js not found, please install Node.js first
    pause
    exit /b 1
)

REM Check npm dependencies
echo Checking npm dependencies...
npm list --depth=0 >nul 2>&1
if errorlevel 1 (
    echo Installing npm dependencies...
    npm install
    if errorlevel 1 (
        echo Dependency installation failed
        pause
        exit /b 1
    )
)

echo.
echo Starting integrated server...
echo Please check server startup logs in the new command line window
echo.

REM Start integrated server
start "Windows-Android Connect Server" cmd /k "node integrated-vite-server.js"

echo.
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Opening test page...
start http://localhost:8080/test-server-functions.html

echo.
echo Server is running in background
echo Test page has been opened
echo.
echo Usage Instructions:
echo 1. Make sure ports 8828 and 8090 are not occupied by other programs
echo 2. If server startup fails, close programs occupying the ports and retry
echo 3. The test page contains all server-side function test tools
echo.
echo Press any key to close this window...
pause >nul