@echo off
echo Starting Windows-Android Connect Servers...
echo.

echo Starting backend server (port 8928)...
start /b cmd /c "cd /d "%~dp0.." && node backend/scripts/complete-server.js"

timeout /t 3 /nobreak >nul

echo Starting Vite development server (port 8781)...

start /b cmd /c "cd /d "%~dp0.." && npx vite --config vite-config.js --host 0.0.0.0 --port 8781"



echo.

echo Servers started!

echo - Backend server: http://localhost:8928

echo - Vite server: http://localhost:8781

echo - Vite server will proxy WebSocket requests to backend server

echo.

echo Press any key to exit...

pause >nul