@echo off
title 打开测试页面

echo.
echo ====================================
echo   打开测试页面
echo ====================================
echo.

:: 确定Vite端口
set VITE_PORT=8781
if not "%VITE_PORT%"=="" (
    echo 使用Vite端口: %VITE_PORT%
) else (
    echo 使用默认Vite端口: 8781
)

echo.
echo 正在打开测试页面...
echo.

:: 打开主要测试页面
echo 打开服务端功能测试页面...
start http://localhost:%VITE_PORT%/test-server-functions.html
timeout /t 1 /nobreak >nul

:: 打开其他测试页面
echo 打开连接测试页面...
start http://localhost:%VITE_PORT%/test-connection.html
timeout /t 1 /nobreak >nul

echo 打开UI测试页面...
start http://localhost:%VITE_PORT%/test-ui.html
timeout /t 1 /nobreak >nul

echo 打开Android客户端测试页面...
start http://localhost:%VITE_PORT%/test-android-client.html
timeout /t 1 /nobreak >nul

:: 打开主要应用页面
echo.
echo 打开主要应用页面...
start http://localhost:%VITE_PORT%/
timeout /t 1 /nobreak >nul

echo 打开屏幕镜像页面...
start http://localhost:%VITE_PORT%/pages/screen-stream.html
timeout /t 1 /nobreak >nul

echo.
echo ====================================
echo   测试页面已打开
echo ====================================
echo.
echo 已打开的页面:
echo   - 服务端功能测试: http://localhost:%VITE_PORT%/test-server-functions.html
echo   - 连接测试: http://localhost:%VITE_PORT%/test-connection.html
echo   - UI测试: http://localhost:%VITE_PORT%/test-ui.html
echo   - Android客户端测试: http://localhost:%VITE_PORT%/test-android-client.html
echo   - 主应用: http://localhost:%VITE_PORT%/
echo   - 屏幕镜像: http://localhost:%VITE_PORT%/pages/screen-stream.html
echo.
echo 请确保服务器已启动并且端口 %VITE_PORT% 可访问
echo.

exit /b 0