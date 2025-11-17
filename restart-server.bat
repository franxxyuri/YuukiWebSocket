@echo off
title Windows-Android Connect Server Restart Script

echo.
echo =========================================
echo    Windows-Android Connect Server Restart
echo =========================================
echo.

echo Stopping existing server processes...
taskkill /f /im node.exe 2>nul

echo.
echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo Starting main server (background)...
start "Main Server" /min node complete-server.js

echo.
echo Starting Vite development server (background)...
start "Vite Server" /min node start-vite-server.js

echo.
echo Server restart completed!
echo.
echo Main server will run on port 8828

echo Vite development server will run on port 8080
echo.
echo Device discovery service will run on port 8090
echo.
echo Press any key to exit...
pause >nul