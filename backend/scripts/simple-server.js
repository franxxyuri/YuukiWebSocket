const http = require('http');
const fs = require('fs');
const path = require('path');

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  console.log('HTTP请求:', req.method, req.url);
  
  // 处理根路径请求，返回test-ui.html
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'test-ui.html'), (err, data) => {
      if (err) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('File not found');
      } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(data);
      }
    });
  } 
  // 处理其他静态文件请求
  else {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('File not found');
      } else {
        // 根据文件扩展名设置Content-Type
        const ext = path.extname(filePath);
        let contentType = 'text/plain';
        if (ext === '.html') contentType = 'text/html';
        else if (ext === '.js') contentType = 'text/javascript';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.json') contentType = 'application/json';
        
        res.writeHead(200, {'Content-Type': contentType});
        res.end(data);
      }
    });
  }
});

// 启动服务器
const PORT = 8827;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP服务器运行在: http://localhost:${PORT}`);
  console.log('请在浏览器中打开上述地址查看测试界面');
});

// 错误处理
server.on('error', (err) => {
  console.error('服务器错误:', err);
});