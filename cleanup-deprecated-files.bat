@echo off
echo 正在删除所有废弃的 .deprecated 文件...
del /f /q "start-integrated-server.bat.deprecated" 2>nul
del /f /q "start-full-server.bat.deprecated" 2>nul
del /f /q "start-server-with-test.bat.deprecated" 2>nul
del /f /q "start-test-environment.bat.deprecated" 2>nul
echo 已删除所有 .deprecated 文件！
del /f /q "cleanup-deprecated-files.bat" 2>nul