@echo off
echo Starting Windows-Android Connect Servers...
echo.

echo Starting backend server (port 8828)...
start /b cmd /c "node complete-server.js"

timeout /t 3 /nobreak >nul

echo Starting Vite development server (port 3000)...
start /b cmd /c "npx vite --host 0.0.0.0 --port 3000"

echo.
echo Servers started!
echo - Backend server: http://localhost:8828
echo - Vite server: http://localhost:3000
echo - Vite server will proxy WebSocket requests to backend server
echo.
echo Press any key to exit...
pause >nul