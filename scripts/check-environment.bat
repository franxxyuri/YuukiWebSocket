@echo off
title Environment Check

echo.
echo ========================================
echo   Environment Check
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found
    echo Please download and install Node.js from https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo SUCCESS: Node.js version: %NODE_VERSION%

REM Check npm
echo.
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not available
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo SUCCESS: npm version: %NPM_VERSION%

REM Check project dependencies
echo.
echo Checking project dependencies...
if not exist "%~dp0..\node_modules" (
    echo INFO: First run, installing dependencies...
    cd /d "%~dp0.."
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Dependency installation failed
        exit /b 1
    )
    echo SUCCESS: Dependency installation completed
) else (
    echo Checking dependency integrity...
    cd /d "%~dp0.."
    npm list --depth=0 >nul 2>&1
    if %errorlevel% neq 0 (
        echo INFO: Dependencies incomplete, reinstalling...
        npm install
        if %errorlevel% neq 0 (
            echo ERROR: Dependency installation failed
            exit /b 1
        )
        echo SUCCESS: Dependency reinstallation completed
    ) else (
        echo SUCCESS: Dependency check passed
    )
)

REM Check port usage
echo.
echo Checking port usage...
netstat -an | findstr ":8928" >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 8928 is already in use
    echo Please close the program using this port or modify the configuration
) else (
    echo SUCCESS: Port 8928 is available
)

netstat -an | findstr ":8781" >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 8781 is already in use
    echo Please close the program using this port or modify the configuration
) else (
    echo SUCCESS: Port 8781 is available
)

netstat -an | findstr ":8190" >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 8190 is already in use
    echo Please close the program using this port or modify the configuration
) else (
    echo SUCCESS: Port 8190 is available
)

REM Check critical files
echo.
echo Checking critical files...
if not exist "%~dp0..\backend\scripts\integrated-vite-server.js" (
    echo ERROR: integrated-vite-server.js not found
    exit /b 1
)
echo SUCCESS: Integrated server script exists

if not exist "%~dp0..\backend\config\config.mjs" (
    echo ERROR: config.mjs not found
    exit /b 1
)
echo SUCCESS: Configuration file exists

echo.
echo ========================================
echo   Environment check completed
echo ========================================
echo.

exit /b 0