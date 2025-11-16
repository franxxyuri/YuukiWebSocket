@echo off
title Windows-Android Connect Server

echo.
echo =========================================
echo    Windows-Android Connect Server
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

echo Node.js version: 
node --version

echo.
echo Starting server...
echo.

:: Start the server in background
start "Windows-Android Connect Server" /min node start-server.js

echo Server started in background
echo Server listening on port: 8826
echo Make sure client connects from the same network
echo.
echo Press any key to close this window...
pause >nul