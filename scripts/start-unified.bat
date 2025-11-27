@echo off
title Windows-Android Connect 统一启动器

setlocal enabledelayedexpansion

:: 设置默认模式
set MODE=dev
set OPEN_TEST=false
set SHOW_HELP=false

:: 解析命令行参数
:parse_args
if "%1"=="" goto :args_done
if /i "%1"=="dev" (
    set MODE=dev
    shift
    goto :parse_args
)
if /i "%1"=="test" (
    set MODE=dev
    set OPEN_TEST=true
    shift
    goto :parse_args
)
if /i "%1"=="prod" (
    set MODE=prod
    shift
    goto :parse_args
)
if /i "%1"=="config" (
    set MODE=config
    shift
    goto :parse_args
)
if /i "%1"=="help" (
    set SHOW_HELP=true
    shift
    goto :parse_args
)
if /i "%1"=="-h" (
    set SHOW_HELP=true
    shift
    goto :parse_args
)
if /i "%1"=="--help" (
    set SHOW_HELP=true
    shift
    goto :parse_args
)
echo 未知参数: %1
set SHOW_HELP=true
shift
goto :parse_args

:args_done

:: 显示帮助信息
if "%SHOW_HELP%"=="true" (
    echo.
    echo Windows-Android Connect 统一启动器
    echo ====================================
    echo.
    echo 用法: start-unified.bat [模式]
    echo.
    echo 模式:
    echo   dev     - 开发模式 (默认)
    echo   test    - 测试模式 (开发模式 + 打开测试页面)
    echo   prod    - 生产模式
    echo   config  - 配置模式 (使用自定义端口配置)
    echo   help    - 显示此帮助信息
    echo.
    echo 示例:
    echo   start-unified.bat dev
    echo   start-unified.bat test
    echo   start-unified.bat prod
    echo.
    pause
    exit /b 0
)

echo.
echo ====================================
echo   Windows-Android Connect 统一启动器
echo ====================================
echo.

:: 检查环境
call "%~dp0check-environment.bat"
if %errorlevel% neq 0 (
    echo 环境检查失败，请解决上述问题后重试
    pause
    exit /b 1
)

echo.
echo 启动模式: %MODE%
if "%OPEN_TEST%"=="true" (
    echo 将自动打开测试页面
)
echo.

:: 根据模式启动服务
if "%MODE%"=="dev" (
    echo 启动开发模式...
    call "%~dp0start-services.bat" dev
    if %errorlevel% neq 0 (
        echo 服务启动失败
        pause
        exit /b 1
    )
)

if "%MODE%"=="prod" (
    echo 启动生产模式...
    call "%~dp0start-services.bat" prod
    if %errorlevel% neq 0 (
        echo 服务启动失败
        pause
        exit /b 1
    )
)

if "%MODE%"=="config" (
    echo 启动配置模式...
    call "%~dp0start-services.bat" config
    if %errorlevel% neq 0 (
        echo 服务启动失败
        pause
        exit /b 1
    )
)

:: 等待服务启动
echo.
echo 等待服务启动完成...
timeout /t 5 /nobreak >nul

:: 打开测试页面 (如果需要)
if "%OPEN_TEST%"=="true" (
    echo.
    echo 打开测试页面...
    call "%~dp0open-test-pages.bat"
)

:: 显示服务信息
echo.
echo ====================================
echo   服务启动完成
echo ====================================
echo.
echo 服务地址:
echo   - 主服务: http://localhost:8928
echo   - 前端界面: http://localhost:8781
echo   - 测试页面: http://localhost:8781/test-server-functions.html
echo.
echo 使用说明:
echo   1. 确保端口8928和8190未被占用
echo   2. Android客户端可连接到: ws://localhost:8928/ws
echo   3. 按 Ctrl+C 停止服务
echo.

:: 保持窗口打开
echo 按任意键退出...
pause >nul