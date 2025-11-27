@echo off
title Windows-Android Connect Unified Launcher

setlocal enabledelayedexpansion

REM Set default mode
set MODE=
set OPEN_TEST=false

REM Check if command line arguments are provided
if "%~1"=="" (
    REM Show interactive menu if no arguments provided
    goto :show_menu
) else (
    REM Parse command line arguments if provided
    if /i "%1"=="dev" (
        set MODE=dev
        set OPEN_TEST=false
        goto :continue_with_mode
    )
    if /i "%1"=="test" (
        set MODE=dev
        set OPEN_TEST=true
        goto :continue_with_mode
    )
    if /i "%1"=="prod" (
        set MODE=prod
        set OPEN_TEST=false
        goto :continue_with_mode
    )
    if /i "%1"=="config" (
        set MODE=config
        set OPEN_TEST=false
        goto :continue_with_mode
    )
    if /i "%1"=="help" (
        echo.
        echo Windows-Android Connect Unified Launcher
        echo ========================================
        echo.
        echo Usage: start-unified.bat [mode]
        echo.
        echo Modes:
        echo   dev     - Development mode (default)
        echo   test    - Test mode (development + open test pages)
        echo   prod    - Production mode
        echo   config  - Config mode (use custom port config)
        echo   help    - Show this help information
        echo.
        echo Examples:
        echo   start-unified.bat dev
        echo   start-unified.bat test
        echo   start-unified.bat prod
        echo.
        pause
        exit /b 0
    )
    echo Unknown parameter: %1
    echo.
    goto :show_menu
)

:show_menu
echo.
echo Windows-Android Connect Unified Launcher
echo ========================================
echo.
echo Please select a mode:
echo.
echo   1. Development mode (dev)
echo   2. Test mode (dev + open test pages)
echo   3. Production mode (prod)
echo   4. Config mode (config)
echo   5. Help
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    set MODE=dev
    set OPEN_TEST=false
) else if "%choice%"=="2" (
    set MODE=dev
    set OPEN_TEST=true
) else if "%choice%"=="3" (
    set MODE=prod
    set OPEN_TEST=false
) else if "%choice%"=="4" (
    set MODE=config
    set OPEN_TEST=false
) else if "%choice%"=="5" (
    goto :show_help
) else (
    echo Invalid choice. Please enter 1, 2, 3, 4, or 5.
    pause
    goto :main_menu
)

:continue_with_mode

echo.
echo ========================================
echo   Windows-Android Connect Unified Launcher
echo ========================================
echo.

REM Check environment
call "%~dp0check-environment.bat"
if !errorlevel! neq 0 (
    echo Environment check failed, please resolve the above issues and try again
    pause
    exit /b 1
)

echo.
echo Launch mode: !MODE!
if "!OPEN_TEST!"=="true" (
    echo Will automatically open test pages
)
echo.

REM Start services based on mode
if "!MODE!"=="dev" (
    echo Starting development mode...
    start "Integrated Server" /min cmd /c "cd /d "%~dp0.." && node backend/scripts/integrated-vite-server.js"
    if !errorlevel! neq 0 (
        echo Service startup failed
        pause
        exit /b 1
    )
)

if "!MODE!"=="prod" (
    echo Starting production mode...
    start "Production Server" /min cmd /c "cd /d "%~dp0.." && node backend/scripts/complete-server.js"
    if !errorlevel! neq 0 (
        echo Service startup failed
        pause
        exit /b 1
    )
)

if "!MODE!"=="config" (
    echo Starting config mode...
    start "Config Server" /min cmd /c "cd /d "%~dp0.." && node backend/scripts/integrated-vite-server.js"
    if !errorlevel! neq 0 (
        echo Service startup failed
        pause
        exit /b 1
    )
)

echo Waiting for services to start...
timeout /t 5 /nobreak >nul

REM Open test pages (if needed)
if "!OPEN_TEST!"=="true" (
    echo.
    echo Opening test pages...
    call "%~dp0open-test-pages.bat"
)

REM Show service information
echo.
echo ========================================
echo   Services started successfully
echo ========================================
echo.
echo Service addresses:
echo   - Main service: http://localhost:8928
echo   - Frontend interface: http://localhost:8781
echo   - Test page: http://localhost:8781/test-server-functions.html
echo.
echo Usage notes:
echo   1. Ensure ports 8928 and 8190 are not in use
echo   2. Android client can connect to: ws://localhost:8928/ws
echo   3. Press Ctrl+C to stop services
echo.

REM Keep window open
echo Press any key to exit...
pause >nul

goto :eof

:show_help
echo.
echo Windows-Android Connect Unified Launcher
echo ========================================
echo.
echo Modes:
echo   dev     - Development mode (default)
echo   test    - Test mode (development + open test pages)
echo   prod    - Production mode
echo   config  - Config mode (use custom port config)
echo   help    - Show this help information
echo.
pause
goto :main_menu

:main_menu
goto :show_menu