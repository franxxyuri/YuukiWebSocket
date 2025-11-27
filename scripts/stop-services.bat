@echo off
title Stop Services

echo.
echo ========================================
echo   Stop All Services
echo ========================================
echo.

echo Stopping Node.js processes...
taskkill /f /im node.exe 2>nul

echo Stopping npm processes...
taskkill /f /im npm.cmd 2>nul

echo Stopping Vite processes...
taskkill /f /im vite.exe 2>nul

echo.
echo Checking port usage...

REM Check and force close processes using ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8928"') do (
    echo Closing process %%a using port 8928...
    taskkill /f /pid %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8781"') do (
    echo Closing process %%a using port 8781...
    taskkill /f /pid %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8190"') do (
    echo Closing process %%a using port 8190...
    taskkill /f /pid %%a 2>nul
)

echo.
echo SUCCESS: All services stopped
echo.

pause