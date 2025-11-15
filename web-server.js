// 服务器启动脚本，用于启动应用的后端服务部分
const http = require('http');
const fs = require('fs');
const path = require('path');

// 基本的HTTP服务器，用于提供前端文件
const server = http.createServer((req, res) => {
  console.log(`收到请求: ${req.url}`);
  
  let filePath = req.url;
  
  // 默认页面
  if (filePath === '/') {
    filePath = '/index.html';
  }
  
  // 构建完整的文件路径
  const fullPath = path.join(__dirname, filePath);
  
  // 检查文件是否存在
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      // 文件不存在，返回404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    // 根据文件扩展名设置内容类型
    const extname = path.extname(fullPath).toLowerCase();
    let contentType = 'text/html';
    
    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.woff':
        contentType = 'application/font-woff';
        break;
      case '.ttf':
        contentType = 'application/font-ttf';
        break;
      case '.eot':
        contentType = 'application/vnd.ms-fontobject';
        break;
      case '.otf':
        contentType = 'application/font-otf';
        break;
    }
    
    // 读取文件
    fs.readFile(fullPath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`服务器错误: ${err}`);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('您可以访问此地址查看应用的前端界面');
  console.log('但请注意：缺少Electron环境，某些功能可能无法正常工作');
});