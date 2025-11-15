// 手动启动脚本，用于在Electron无法通过npm安装时启动应用
const { spawn } = require('child_process');
const path = require('path');

console.log('尝试手动启动Windows-Android Connect应用...');

// 检查是否已安装Electron
try {
  const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron.cmd');
  console.log('检查Electron路径:', electronPath);
  
  // 如果Electron存在，则使用它启动应用
  const electronProcess = spawn('node', [path.join(__dirname, 'node_modules', 'electron', 'cli.js'), '.'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  electronProcess.on('error', (err) => {
    console.error('启动Electron时出错:', err.message);
    console.log('请确保已正确安装Electron: npm install electron --save-dev');
  });

  electronProcess.on('close', (code) => {
    console.log(`Electron进程已退出，退出码: ${code}`);
  });
} catch (error) {
  console.log('Electron未安装或安装不完整，尝试其他启动方式...');
  
  // 如果Electron未安装，显示错误信息
  console.log('错误：Electron未正确安装。');
  console.log('请尝试以下步骤：');
  console.log('1. 检查网络连接');
  console.log('2. 确保代理设置正确 (npm config set proxy http://127.0.0.1:10808)');
  console.log('3. 运行: npm install electron --save-dev');
  console.log('4. 然后运行: npm start');
}