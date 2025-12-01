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
import validate, { validationRules } from './middleware/inputValidator.js';

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

// 导入高可用性管理器
import haManager from './utils/ha-manager.js';

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
    
    // 注册服务到高可用性管理器
    registerServicesToHA();
    
    // 启动资源监控
    haManager.startMonitoring();
});

// 注册服务到高可用性管理器
function registerServicesToHA() {
    try {
        // 注册WebSocket服务
        haManager.registerService(
            'websocket',
            websocketService,
            async () => {
                // WebSocket服务健康检查
                const clients = websocketService.getClients();
                return clients.size >= 0; // 只要服务运行，就认为健康
            },
            async () => {
                // WebSocket服务恢复操作
                console.log('正在恢复WebSocket服务...');
                // 这里可以添加WebSocket服务的恢复逻辑
                return true;
            }
        );
        
        // 注册设备发现服务
        haManager.registerService(
            'discovery',
            discoveryService,
            async () => {
                // 设备发现服务健康检查
                return true; // 简化实现，假设服务一直健康
            },
            async () => {
                // 设备发现服务恢复操作
                console.log('正在恢复设备发现服务...');
                discoveryService.init();
                return true;
            }
        );
        
        console.log('所有服务已注册到高可用性管理器');
    } catch (error) {
        console.error('注册服务到高可用性管理器失败:', error.message);
    }
}

// 错误处理
server.on('error', (error) => {
    console.error('服务器错误:', error);
    
    // 通知高可用性管理器
    haManager.sendResourceAlert(['服务器错误'], {
        error: error.message,
        timestamp: Date.now()
    });
});

// 添加系统状态API路由
app.get('/api/system/status', (req, res) => {
    try {
        const systemStatus = haManager.getSystemStatus();
        res.json({
            success: true,
            status: systemStatus,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '获取系统状态失败'
        });
    }
});

// 添加服务状态API路由
app.get('/api/services/status', (req, res) => {
    try {
        const systemStatus = haManager.getSystemStatus();
        res.json({
            success: true,
            services: systemStatus.services,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '获取服务状态失败'
        });
    }
});

// 添加资源监控API路由
app.get('/api/monitoring/resources', (req, res) => {
    try {
        const systemStatus = haManager.getSystemStatus();
        res.json({
            success: true,
            resourceData: systemStatus.resourceData,
            resourceHistory: systemStatus.resourceHistory,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '获取资源监控数据失败'
        });
    }
});

export default app;
export { container, haManager };

