@echo off
title Windows-Android Connect 启动器
chcp 65001 >nul
cls

:main_menu
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                Windows-Android Connect 启动器                ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  请选择启动模式：                                              ║
echo ║                                                              ║
echo ║  1. 开发模式 (Development)                                   ║
echo ║  2. 测试模式 (Testing)                                       ║
echo ║  3. 生产模式 (Production)                                     ║
echo ║  4. 配置模式 (Custom Config)                                  ║
echo ║                                                              ║
echo ║  5. 环境检查                                                  ║
echo ║  6. 打开测试页面                                              ║
echo ║  7. 重启服务器                                                ║
echo ║  8. 构建项目                                                  ║
echo ║  9. 停止所有服务                                              ║
echo ║                                                              ║
echo ║  0. 退出                                                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set /p choice="请输入选项 (0-9): "

if "%choice%"=="1" goto dev_mode
if "%choice%"=="2" goto test_mode
if "%choice%"=="3" goto prod_mode
if "%choice%"=="4" goto config_mode
if "%choice%"=="5" goto check_env
if "%choice%"=="6" goto open_test
if "%choice%"=="7" goto restart_server
if "%choice%"=="8" goto build_project
if "%choice%"=="9" goto stop_services
if "%choice%"=="0" goto exit_program

echo 无效选项，请重新选择！
timeout /t 2 >nul
goto main_menu

:dev_mode
echo.
echo 正在启动开发模式...
call scripts\start-unified.bat dev
goto main_menu

:test_mode
echo.
echo 正在启动测试模式...
call scripts\start-unified.bat test
goto main_menu

:prod_mode
echo.
echo 正在启动生产模式...
call scripts\start-unified.bat prod
goto main_menu

:config_mode
echo.
echo 正在启动配置模式...
call scripts\start-unified.bat config
goto main_menu

:check_env
echo.
echo 正在检查环境...
call scripts\check-environment.bat
echo.
pause
goto main_menu

:open_test
echo.
echo 正在打开测试页面...
call scripts\open-test-pages.bat
goto main_menu

:restart_server
echo.
echo 正在重启服务器...
call scripts\restart-server.bat
goto main_menu

:build_project
echo.
echo 正在构建项目...
call scripts\build.bat
echo.
pause
goto main_menu

:stop_services
echo.
echo 正在停止所有服务...
call scripts\stop-services.bat
goto main_menu

:exit_program
echo.
echo 感谢使用 Windows-Android Connect！
timeout /t 2 >nul
exit /b 0