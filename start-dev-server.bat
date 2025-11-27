@echo off
set SERVER_PORT=9928
set VITE_PORT=9781
set DISCOVERY_PORT=9190
set NETWORK_COMM_PORT=9826
echo Starting integrated server with alternative ports...
echo Main service port: %SERVER_PORT%
echo Vite frontend port: %VITE_PORT%
echo Discovery port: %DISCOVERY_PORT%
node backend/scripts/integrated-vite-server.js