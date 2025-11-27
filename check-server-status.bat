@echo off
title Server Status Check

echo Checking if server is running...

REM Check if the specific node process is running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Server process is running
) else (
    echo Server process is NOT running
)

echo.
echo Checking listening ports...
netstat -an | findstr /R /C:"TCP.*:8928.*LISTENING" >NUL
if errorlevel 1 (
    echo Port 8928 is NOT listening
) else (
    echo Port 8928 IS listening
)

netstat -an | findstr /R /C:"TCP.*:8781.*LISTENING" >NUL
if errorlevel 1 (
    echo Port 8781 is NOT listening
) else (
    echo Port 8781 IS listening
)

echo.
echo Checking for processes from this directory...
wmic process where "name='node.exe'" get commandline | findstr MyApplication8 >NUL
if errorlevel 1 (
    echo No node processes found from this directory
) else (
    echo Node process IS running from this directory
)

pause