// 简化版集成服务器测试
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces, hostname } from 'os';
import cors from 'cors';
import dgram from 'dgram';

// 解决 ES 模块中 __dirname 不可用的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 启用CORS
app.use(cors());

// 静态文件服务
app.use(express.static('.'));
app.use('/frontend', express.static('../frontend'));

// 创建WebSocket服务器 (8928端口)
const wss = new WebSocketServer({ server });

// 存储连接的客户端
const clients = new Map();

// 设备发现端口 (8091端口)
const discoveryPort = 8091;
const discoveryServer = dgram.createSocket('udp4');

// 获取本机IP地址
function getLocalIP() {
    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const netInterface = interfaces[name];
        for (const net of netInterface) {
            if (net.internal || net.family !== 'IPv4') continue;
            if (net.address.startsWith('192.168.') || 
                net.address.startsWith('10.') || 
                net.address.startsWith('172.')) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

// 路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        server: 'running',
        timestamp: Date.now(),
        totalClients: clients.size
    });
});

// 启动主服务器 (8828端口)
server.listen(8928, () => {
    const localIP = getLocalIP();
    console.log(`Windows主服务运行在: http://${localIP}:8928`);
    console.log(`Windows主服务运行在: http://localhost:8928`);
    console.log('服务器已启动');
});

// 错误处理
server.on('error', (error) => {
    console.error('服务器错误:', error);
});