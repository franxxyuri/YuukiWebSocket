@echo off
REM 运行所有测试

echo 运行测试套件...
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 运行单元测试
echo 运行单元测试...
call npm test -- --run

if %errorlevel% neq 0 (
    echo 测试失败！
    pause
    exit /b 1
)

echo.
echo 所有测试通过！
pause
