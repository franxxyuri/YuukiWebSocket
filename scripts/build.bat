@echo off
echo Windows-Android Connect 构建脚本
echo ================================

echo 正在构建Android应用...
cd /d "%~dp0..\app"
call gradlew build
if %errorlevel% neq 0 (
    echo Android应用构建失败
    exit /b %errorlevel%
)
cd /d "%~dp0.."

echo 正在安装Node.js依赖...
call npm install
if %errorlevel% neq 0 (
    echo Node.js依赖安装失败
    exit /b %errorlevel%
)

echo 正在构建Web前端...
call npm run build
if %errorlevel% neq 0 (
    echo Web前端构建失败
    exit /b %errorlevel%
)

echo 构建完成！
echo Android APK位置: app\build\outputs\apk\debug\app-debug.apk
echo Web前端构建位置: dist\