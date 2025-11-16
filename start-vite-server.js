import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

console.log('启动Vite开发服务器...');
console.log('主页面: http://localhost:3000');
console.log('测试页面: http://localhost:3000/test-ui.html');
console.log('屏幕投屏页面: http://localhost:3000/screen-stream.html');

// 使用spawn启动vite命令
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
  stdio: 'inherit',
  shell: true
});

viteProcess.on('error', (err) => {
  console.error('启动Vite开发服务器时出错:', err);
});

viteProcess.on('close', (code) => {
  console.log(`Vite开发服务器已退出，退出码: ${code}`);
});