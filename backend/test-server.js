// 简单的测试服务器脚本
import http from 'http';

const PORT = 9999;
const HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

server.listen(PORT, HOST, () => {
  console.log(`测试服务器运行在 http://${HOST}:${PORT}/`);
});

server.on('error', (error) => {
  console.error('服务器错误:', error);
});
