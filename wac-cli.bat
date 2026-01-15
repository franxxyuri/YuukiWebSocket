@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Windows-Android Connect 统一命令行工具
:: 高可用启动和管理系统

title WAC - Windows-Android Connect

:: 颜色定义
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

:: 配置
set "NODE_CMD=node"
set "NPM_CMD=npm"

:: 显示 Logo
echo.
echo %BLUE%╔═══════════════════════════════════════════════════════════╗%RESET%
echo %BLUE%║                                                           ║%RESET%
echo %BLUE%║        Windows-Android Connect (WAC)                      ║%RESET%
echo %BLUE%║        统一命令行工具 v2.0                                 ║%RESET%
echo %BLUE%║                                                           ║%RESET%
echo %BLUE%╚═══════════════════════════════════════════════════════════╝%RESET%
echo.

:: 检查参数
if "%1"=="" goto :show_menu
if "%1"=="start" goto :start_service
if "%1"=="stop" goto :stop_service
if "%1"=="restart" goto :restart_service
if "%1"=="status" goto :check_status
if "%1"=="test" goto :run_tests
if "%1"=="dev" goto :dev_mode
if "%1"=="build" goto :build_project
if "%1"=="clean" goto :clean_project
if "%1"=="help" goto :show_help
goto :invalid_command

:show_menu
echo %YELLOW%请选择操作：%RESET%
echo.
echo   %GREEN%1%RESET% - 启动服务 (生产模式)
echo   %GREEN%2%RESET% - 启动服务 (开发模式)
echo   %GREEN%3%RESET% - 停止服务
echo   %GREEN%4%RESET% - 重启服务
echo   %GREEN%5%RESET% - 查看状态
echo   %GREEN%6%RESET% - 运行测试
echo   %GREEN%7%RESET% - 构建项目
echo   %GREEN%8%RESET% - 清理项目
echo   %GREEN%9%RESET% - 查看帮助
echo   %RED%0%RESET% - 退出
echo.
set /p choice=%YELLOW%请输入选项 (0-9): %RESET%

if "%choice%"=="1" goto :start_service
if "%choice%"=="2" goto :dev_mode
if "%choice%"=="3" goto :stop_service
if "%choice%"=="4" goto :restart_service
if "%choice%"=="5" goto :check_status
if "%choice%"=="6" goto :run_tests
if "%choice%"=="7" goto :build_project
if "%choice%"=="8" goto :clean_project
if "%choice%"=="9" goto :show_help
if "%choice%"=="0" goto :exit
goto :invalid_choice

:start_service
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %GREEN%启动服务 (生产模式)%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.

:: 检查环境
call :check_environment
if errorlevel 1 goto :error_exit

:: 验证配置
echo %YELLOW%[1/4]%RESET% 验证配置...
%NODE_CMD% test-fixes.js >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ 配置验证失败%RESET%
    goto :error_exit
)
echo %GREEN%✓ 配置验证通过%RESET%

:: 检查端口
echo %YELLOW%[2/4]%RESET% 检查端口占用...
call :check_ports
if errorlevel 1 (
    echo %YELLOW%! 端口被占用，尝试清理...%RESET%
    call :cleanup_ports
)
echo %GREEN%✓ 端口检查完成%RESET%

:: 启动服务
echo %YELLOW%[3/4]%RESET% 启动后端服务...
start "WAC Backend" /MIN %NODE_CMD% backend/scripts/integrated-vite-server.js
timeout /t 3 /nobreak >nul
echo %GREEN%✓ 后端服务已启动%RESET%

:: 验证启动
echo %YELLOW%[4/4]%RESET% 验证服务状态...
timeout /t 2 /nobreak >nul
call :check_status
if errorlevel 1 (
    echo %RED%✗ 服务启动失败%RESET%
    goto :error_exit
)

echo.
echo %GREEN%═══════════════════════════════════════════════════════════%RESET%
echo %GREEN%✓ 服务启动成功！%RESET%
echo %GREEN%═══════════════════════════════════════════════════════════%RESET%
echo.
echo %YELLOW%访问地址：%RESET%
echo   前端: http://localhost:8781
echo   API:  http://localhost:8928/api
echo.
goto :end

:dev_mode
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %GREEN%启动服务 (开发模式)%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.

call :check_environment
if errorlevel 1 goto :error_exit

echo %YELLOW%启动开发服务器...%RESET%
%NPM_CMD% run dev:integrated
goto :end

:stop_service
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %YELLOW%停止服务%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.

:: 停止 Node.js 进程
echo %YELLOW%正在停止服务...%RESET%
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

:: 清理端口
call :cleanup_ports

echo %GREEN%✓ 服务已停止%RESET%
goto :end

:restart_service
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %YELLOW%重启服务%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.

call :stop_service
timeout /t 2 /nobreak >nul
call :start_service
goto :end

:check_status
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %YELLOW%服务状态%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.

:: 检查进程
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if errorlevel 1 (
    echo %RED%✗ 服务未运行%RESET%
    exit /b 1
) else (
    echo %GREEN%✓ 服务正在运行%RESET%
)

:: 检查端口
netstat -ano | findstr ":8928" >nul
if errorlevel 1 (
    echo %RED%✗ 后端端口 8928 未监听%RESET%
) else (
    echo %GREEN%✓ 后端端口 8928 正常%RESET%
)

netstat -ano | findstr ":8781" >nul
if errorlevel 1 (
    echo %RED%✗ 前端端口 8781 未监听%RESET%
) else (
    echo %GREEN%✓ 前端端口 8781 正常%RESET%
)

echo.
goto :end

:run_tests
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %YELLOW%运行测试%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.

echo %YELLOW%[1/2]%RESET% 运行配置测试...
%NODE_CMD% test-fixes.js
if errorlevel 1 goto :error_exit

echo.
echo %YELLOW%[2/2]%RESET% 运行优化测试...
%NODE_CMD% test-optimizations.js
if errorlevel 1 goto :error_exit

echo.
echo %GREEN%✓ 所有测试通过%RESET%
goto :end

:build_project
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %YELLOW%构建项目%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.

%NPM_CMD% run build
if errorlevel 1 goto :error_exit

echo %GREEN%✓ 构建完成%RESET%
goto :end

:clean_project
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %YELLOW%清理项目%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.

echo %YELLOW%清理 node_modules...%RESET%
if exist node_modules rmdir /s /q node_modules

echo %YELLOW%清理构建文件...%RESET%
if exist dist rmdir /s /q dist

echo %GREEN%✓ 清理完成%RESET%
goto :end

:show_help
echo.
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo %YELLOW%使用帮助%RESET%
echo %BLUE%═══════════════════════════════════════════════════════════%RESET%
echo.
echo %YELLOW%命令格式：%RESET%
echo   wac-cli [command]
echo.
echo %YELLOW%可用命令：%RESET%
echo   %GREEN%start%RESET%    - 启动服务 (生产模式)
echo   %GREEN%dev%RESET%      - 启动服务 (开发模式)
echo   %GREEN%stop%RESET%     - 停止服务
echo   %GREEN%restart%RESET%  - 重启服务
echo   %GREEN%status%RESET%   - 查看服务状态
echo   %GREEN%test%RESET%     - 运行测试
echo   %GREEN%build%RESET%    - 构建项目
echo   %GREEN%clean%RESET%    - 清理项目
echo   %GREEN%help%RESET%     - 显示帮助
echo.
echo %YELLOW%示例：%RESET%
echo   wac-cli start
echo   wac-cli dev
echo   wac-cli status
echo.
goto :end

:check_environment
echo %YELLOW%检查环境...%RESET%

:: 检查 Node.js
%NODE_CMD% --version >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ Node.js 未安装%RESET%
    exit /b 1
)
echo %GREEN%✓ Node.js 已安装%RESET%

:: 检查 npm
%NPM_CMD% --version >nul 2>&1
if errorlevel 1 (
    echo %RED%✗ npm 未安装%RESET%
    exit /b 1
)
echo %GREEN%✓ npm 已安装%RESET%

:: 检查依赖
if not exist node_modules (
    echo %YELLOW%! 依赖未安装，正在安装...%RESET%
    %NPM_CMD% install
    if errorlevel 1 (
        echo %RED%✗ 依赖安装失败%RESET%
        exit /b 1
    )
)
echo %GREEN%✓ 依赖已安装%RESET%

exit /b 0

:check_ports
netstat -ano | findstr ":8928" >nul
if not errorlevel 1 exit /b 1

netstat -ano | findstr ":8781" >nul
if not errorlevel 1 exit /b 1

exit /b 0

:cleanup_ports
echo %YELLOW%清理端口占用...%RESET%

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8928"') do (
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8781"') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul
exit /b 0

:invalid_command
echo %RED%✗ 无效的命令: %1%RESET%
echo 使用 'wac-cli help' 查看帮助
goto :error_exit

:invalid_choice
echo %RED%✗ 无效的选项%RESET%
timeout /t 2 /nobreak >nul
goto :show_menu

:error_exit
echo.
echo %RED%═══════════════════════════════════════════════════════════%RESET%
echo %RED%✗ 操作失败%RESET%
echo %RED%═══════════════════════════════════════════════════════════%RESET%
echo.
pause
exit /b 1

:end
echo.
pause
exit /b 0

:exit
echo.
echo %YELLOW%再见！%RESET%
timeout /t 1 /nobreak >nul
exit /b 0
