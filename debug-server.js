import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { networkInterfaces, hostname } from 'os';
import cors from 'cors';
import dgram from 'dgram';
import { fileURLToPath } from 'url';

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('当前目录:', __dirname);
console.log('尝试发送文件路径:', path.join(__dirname, 'screen-stream.html'));

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 启用CORS
app.use(cors());

// 静态文件服务
app.use(express.static('.'));

// 路由
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'screen-stream.html');
    console.log('发送文件:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('发送文件失败:', err);
            res.status(500).send('服务器内部错误');
        }
    });
});

app.get('/test', (req, res) => {
    res.send('<h1>测试页面</h1><p>如果能看到这段文字，说明服务器正常工作</p>');
});

// 启动服务器
const PORT = process.env.PORT || 8828;
server.listen(PORT, () => {
    console.log(`调试服务器运行在: http://localhost:${PORT}`);
});