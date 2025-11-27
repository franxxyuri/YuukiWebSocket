@echo off
title 启动服务

set MODE=%1
if "%MODE%"=="" set MODE=dev

echo.
echo ====================================
echo   启动服务 - %MODE% 模式
echo ====================================
echo.

if "%MODE%"=="dev" (
    echo 启动开发模式服务...
    echo 使用默认端口配置:
    echo   - WebSocket主服务: 8928
    echo   - Vite前端服务: 8781
    echo   - 设备发现服务: 8190
    echo.
    
    start "Windows-Android Connect Server" cmd /k "cd /d "%~dp0.." && node backend/scripts/integrated-vite-server.js"
    echo ✅ 开发服务器已启动
    goto :end
)

if "%MODE%"=="prod" (
    echo 启动生产模式服务...
    echo 生产模式使用优化配置
    echo.
    
    :: 设置生产环境变量
    set NODE_ENV=production
    
    start "Windows-Android Connect Server (Production)" cmd /k "cd /d "%~dp0.." && set NODE_ENV=production && node backend/scripts/integrated-vite-server.js"
    echo ✅ 生产服务器已启动
    goto :end
)

if "%MODE%"=="config" (
    echo 启动配置模式服务...
    echo 使用自定义端口配置
    echo.
    
    :: 设置环境变量 (可以从 .env 文件加载)
    if not "%SERVER_PORT%"=="" (
        echo 使用自定义主服务端口: %SERVER_PORT%
    ) else (
        set SERVER_PORT=8928
    )
    
    if not "%VITE_PORT%"=="" (
        echo 使用自定义Vite端口: %VITE_PORT%
    ) else (
        set VITE_PORT=8781
    )
    
    if not "%DISCOVERY_PORT%"=="" (
        echo 使用自定义发现端口: %DISCOVERY_PORT%
    ) else (
        set DISCOVERY_PORT=8190
    )
    
    start "Windows-Android Connect Server (Config)" cmd /k "cd /d "%~dp0.." && set SERVER_PORT=%SERVER_PORT% && set VITE_PORT=%VITE_PORT% && set DISCOVERY_PORT=%DISCOVERY_PORT% && node backend/scripts/integrated-vite-server.js"
    echo ✅ 配置模式服务器已启动
    goto :end
)

echo ❌ 未知模式: %MODE%
echo 支持的模式: dev, prod, config
exit /b 1

:end
echo.
echo 服务启动完成，请等待几秒钟让服务完全启动
echo.

exit /b 0