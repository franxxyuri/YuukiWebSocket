@echo off
echo 检查Electron版本39.2.0...
if not exist "node_modules\\electron\\electron.exe" (
  echo 请手动下载Electron 39.2.0 Windows 64位版本
  echo 下载地址: https://registry.npmmirror.com/electron/39.2.0/files/electron-39.2.0-win32-x64.zip
  echo 解压到: node_modules\\electron
  pause
  exit /b 1
)
echo Electron已就绪
npm run start
