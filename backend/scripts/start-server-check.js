import { spawn } from 'child_process';

console.log('正在启动集成服务器...');

const server = spawn('node', ['integrated-vite-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

server.stdout.on('data', (data) => {
  console.log(`服务器输出: ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`服务器错误: ${data}`);
});

server.on('close', (code) => {
  console.log(`服务器进程退出，代码: ${code}`);
});