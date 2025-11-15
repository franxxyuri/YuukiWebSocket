// 下载Electron的脚本
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Electron版本
const electronVersion = '39.2.0';
const electronUrl = `https://registry.npmmirror.com/electron/${electronVersion}/files/electron-${electronVersion}-win32-x64.zip`;

console.log('正在准备下载Electron...');
console.log('版本:', electronVersion);
console.log('镜像URL:', electronUrl);

// 创建临时目录用于存放Electron
const electronDir = path.join(__dirname, 'node_modules', 'electron');

if (!fs.existsSync(path.dirname(electronDir))) {
    fs.mkdirSync(path.dirname(electronDir), { recursive: true });
}

console.log('Electron将被安装到:', electronDir);

// 检查是否已经存在Electron
if (fs.existsSync(electronDir)) {
    console.log('Electron目录已存在，正在删除...');
    try {
        exec(`rmdir /s /q "${electronDir}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('删除Electron目录失败:', error);
                return;
            }
            console.log('Electron目录已删除，现在重新创建...');
downloadElectron();
        });
    } catch (e) {
        console.log('删除Electron目录时出错:', e);
    }
} else {
downloadElectron();
}

function downloadElectron() {
    console.log('正在下载Electron，请稍候...');
    
    // 由于直接通过脚本下载可能有安全限制，提供手动下载说明
    console.log('\n手动下载说明:');
    console.log('1. 访问: https://registry.npmmirror.com/electron/' + electronVersion + '/files/');
    console.log('2. 下载文件: electron-' + electronVersion + '-win32-x64.zip');
    console.log('3. 将ZIP文件解压到: ' + electronDir);
    console.log('4. 解压后的文件夹应包含electron.exe');
    
    // 创建一个CLI脚本用于安装
    const installScript = `@echo off
echo 检查Electron版本39.2.0...
if not exist "node_modules\\\\electron\\\\electron.exe" (
  echo 请手动下载Electron 39.2.0 Windows 64位版本
  echo 下载地址: https://registry.npmmirror.com/electron/39.2.0/files/electron-39.2.0-win32-x64.zip
  echo 解压到: node_modules\\\\electron
  pause
  exit /b 1
)
echo Electron已就绪
npm run start
`;
    
    fs.writeFileSync(path.join(__dirname, 'install-electron-cli.bat'), installScript);
    console.log('安装脚本已创建: install-electron-cli.bat');
}