// Electron手动安装脚本
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');

console.log('Electron手动安装脚本');
console.log('========================');

// 检查是否已存在Electron
const electronPath = path.join(__dirname, 'node_modules', 'electron');
if (fs.existsSync(electronPath)) {
  console.log('⚠️  Electron目录已存在');
  // 检查是否完整安装
  const electronExecutable = path.join(electronPath, 'electron.exe');
  if (fs.existsSync(electronExecutable)) {
    console.log('✅ Electron已正确安装');
    process.exit(0);
  } else {
    console.log('❌ Electron安装不完整，需要重新安装');
  }
} else {
  console.log('ℹ️  Electron未安装');
}

console.log('\n请按照以下步骤手动安装Electron：');
console.log('1. 访问 Electron 发布页面：https://github.com/electron/electron/releases');
console.log('2. 下载适用于 Windows 的最新版本 Electron (electron-vXX.X.X-win32-x64.zip)');
console.log('3. 解压下载的文件');
console.log('4. 将解压后的文件夹重命名为 "electron"');
console.log('5. 将该文件夹放置在以下路径：');
console.log('   ' + path.join(__dirname, 'node_modules'));
console.log('6. 然后运行: npm start');

console.log('\n或者，您可以尝试使用代理下载：');
console.log('npm config set proxy http://127.0.0.1:10808');
console.log('npm config set https-proxy http://127.0.0.1:10808');
console.log('npm install electron --save-dev --verbose');