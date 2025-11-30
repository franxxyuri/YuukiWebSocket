import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';

// 解决 ES 模块中 __dirname 不可用的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 导入依赖注入容器
import container from './utils/di-container.js';

// 导入配置
import config from './config/config.js';

// 导入中间件
import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';

// 导入路由
import apiRoutes from './routes/api.js';
import pageRoutes from './routes/pages.js';
import staticRoutes from './routes/static.js';

// 导入服务类
import WebSocketService from './websocket/index.js';
import discoveryService from './discovery/index.js';

// 导入组件
import clientManager from './websocket/clientManager.js';
import messageHandlers from './websocket/messageHandlers.js';

// 注册服务到依赖注入容器
container.register('clientManager', () => clientManager, true);
container.register('messageHandlers', () => messageHandlers, true);
container.register('websocketService', (di) => {
  return new WebSocketService({
    clientManager: di.get('clientManager'),
    messageHandlers: di.get('messageHandlers')
  });
}, true);

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 启用CORS
app.use(cors());

// 启用中间件
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 注册简单测试路由
app.get('/test', (req, res) => {
  console.log('收到测试请求:', req.method, req.url);
  res.send('测试成功!');
});

// 注册路由
app.use('/api', apiRoutes);
app.use('/pages', pageRoutes);
app.use(staticRoutes);

// 注册错误处理中间件
app.use(errorHandler);

// 初始化WebSocket服务
const websocketService = container.get('websocketService');
websocketService.init(server);

// 初始化设备发现服务
discoveryService.init();

// 启动服务器
const PORT = config.server.port;
const HOST = config.server.host;
server.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log(`服务器运行在: http://${localIP}:${PORT}`);
    console.log(`服务器运行在: http://${HOST}:${PORT}`);
    console.log('等待Android设备连接...');
});

// 错误处理
server.on('error', (error) => {
    console.error('服务器错误:', error);
});

export default app;
export { container };

