// 简单测试服务器
import http from 'http';

const PORT = 8928;
const HOST = '127.0.0.1';

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  console.log('收到请求:', req.method, req.url);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('简单测试服务器响应!\n');
});

// 启动服务器
server.listen(PORT, HOST, () => {
  console.log(`简单测试服务器运行在 http://${HOST}:${PORT}/`);
  console.log('按 Ctrl+C 停止服务器');
});

// 错误处理
server.on('error', (error) => {
  console.error('服务器错误:', error);
  process.exit(1);
});