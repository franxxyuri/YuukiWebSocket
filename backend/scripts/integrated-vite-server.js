import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces, hostname } from 'os';
import cors from 'cors';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// 导入配置文件
import config from '../config/config.mjs';

// 解决 ES 模块中 __dirname 不可用的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入依赖注入容器
import container from '../src/utils/di-container.js';

// 导入服务类
import WebSocketService from '../src/websocket/index.js';
import discoveryService from '../src/discovery/index.js';

// 导入组件
import clientManager from '../src/websocket/clientManager.js';
import messageHandlers from '../src/websocket/messageHandlers.js';

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

// 处理 favicon.ico 请求
app.get('/favicon.ico', (req, res) => {
  // 返回一个简单的2x2像素的透明PNG as favicon to avoid 404 errors
  const favicon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AgQDA0qGUv3ZgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAFklEQVQI12NkYGD4z8DAwMDAAAYAGggRAQFJw2sAAAAASUVORK5CYII=', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/x-icon',
    'Content-Length': favicon.length
  });
  res.end(favicon);
});

// 确保根路径指向正确的index.html文件
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, config.frontend.htmlEntries.main));
});

// 确保所有前端路由请求都能被正确处理
// 对于所有非API请求，让Vite中间件处理
app.get(['/devices', '/file-transfer', '/screen-share', '/remote-control', '/settings', '/debug'], (req, res) => {
    res.sendFile(path.join(__dirname, config.frontend.htmlEntries.main));
});

// 设备发现广播
function broadcastDeviceDiscovery() {
    // 调用DiscoveryService的broadcastDeviceDiscovery方法
    // 该方法会自动构建并发送广播消息
    discoveryService.broadcastDeviceDiscovery();
}

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
// 移除重复的根路径路由，保留第一个根路径路由

app.get('/api/devices', (req, res) => {
    const clientManager = container.get('clientManager');
    const clients = clientManager.getClients();
    const devices = [];
    for (const [clientId, client] of clients) {
        devices.push({
            id: clientId,
            type: client.type,
            ip: client.ip,
            connected: true
        });
    }
    res.json(devices);
});

app.get('/api/status', (req, res) => {
    const clientManager = container.get('clientManager');
    const androidDevice = clientManager.getAndroidDevice();
    const totalClients = clientManager.getClientCount();

    res.json({
        server: 'running',
        timestamp: Date.now(),
        androidConnected: !!androidDevice,
        totalClients: totalClients
    });
});



// 日志查看API

let logBuffer = [];

const MAX_LOG_ENTRIES = 1000; // 保留最近的1000条日志



// 添加一个全局的日志记录函数

function logMessage(message, level = 'info') {

    const logEntry = {

        timestamp: new Date().toISOString(),

        level: level,

        message: message

    };

    

    logBuffer.push(logEntry);

    if (logBuffer.length > MAX_LOG_ENTRIES) {

        logBuffer.shift(); // 移除最旧的日志

    }

    

    // 同时输出到控制台（避免递归调用）

    originalLog(`[${logEntry.timestamp}] [${level}] ${message}`);

}



// 重写控制台函数以捕获日志

const originalLog = console.log;

const originalError = console.error;

const originalWarn = console.warn;



console.log = function(...args) {

    // 直接调用原始log函数避免循环

    originalLog.apply(console, args);

    try {

        // 记录到缓冲区

        const logEntry = {

            timestamp: new Date().toISOString(),

            level: 'info',

            message: args.join(' ')

        };

        logBuffer.push(logEntry);

        if (logBuffer.length > MAX_LOG_ENTRIES) {

            logBuffer.shift();

        }

    } catch (e) {

        // 静默处理错误，避免影响正常日志输出

    }

};



console.error = function(...args) {

    originalError.apply(console, args);

    try {

        const logEntry = {

            timestamp: new Date().toISOString(),

            level: 'error',

            message: args.join(' ')

        };

        logBuffer.push(logEntry);

        if (logBuffer.length > MAX_LOG_ENTRIES) {

            logBuffer.shift();

        }

    } catch (e) {

        // 静默处理错误

    }

};



console.warn = function(...args) {

    originalWarn.apply(console, args);

    try {

        const logEntry = {

            timestamp: new Date().toISOString(),

            level: 'warn',

            message: args.join(' ')

        };

        logBuffer.push(logEntry);

        if (logBuffer.length > MAX_LOG_ENTRIES) {

            logBuffer.shift();

        }

    } catch (e) {

        // 静默处理错误

    }

};



// 提供日志API

app.get('/api/logs', (req, res) => {

    const count = parseInt(req.query.count) || 100;

    const level = req.query.level || null;

    const searchTerm = req.query.search || '';

    

    let filteredLogs = logBuffer;

    

    if (level) {

        filteredLogs = filteredLogs.filter(log => log.level === level);

    }

    

    if (searchTerm) {

        filteredLogs = filteredLogs.filter(log => 

            log.message.toLowerCase().includes(searchTerm.toLowerCase())

        );

    }

    

    // 返回最后count条日志

    const logsToSend = filteredLogs.slice(-count);

    res.json(logsToSend);

});



// 清除日志API

app.post('/api/logs/clear', (req, res) => {

    logBuffer = [];

    res.json({ success: true, message: '日志已清除' });

});

// WebSocket服务将由依赖注入容器初始化

// 启动Vite开发服务器
async function startViteServer() {
    const vite = await createServer({
        plugins: [react({
            // 添加额外的React插件配置
            jsxRuntime: 'automatic',
            include: /\.(jsx|tsx)$/,
            exclude: /node_modules/
        })],
        server: {
            port: config.vite.port,
            host: config.vite.host,
            strictPort: false,
            proxy: {
                // 将WebSocket请求代理到后端服务器
                '/ws': {
                    target: config.proxy.target,
                    ws: true,
                    changeOrigin: true
                },
                // 代理API请求
                '/api': {
                    target: config.proxy.apiTarget,
                    changeOrigin: true
                },
                // 代理设备相关API端点，但排除前端路由使用的/devices路径
                '/device': {
                    target: config.proxy.apiTarget,
                    changeOrigin: true
                },
                // 确保/devices路径不被代理，由前端路由处理
                '/devices': {
                    bypass: (req, res, options) => {
                        // 返回null表示不代理，让Vite处理
                        return null;
                    }
                }
            }
        },
        root: path.resolve(__dirname, '../../frontend'), // 设置为frontend目录
        publicDir: path.resolve(__dirname, '../../frontend/public'),
        build: {
            outDir: path.resolve(__dirname, '../../dist'),
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, config.frontend.htmlEntries.main),
                    'react-index': path.resolve(__dirname, config.frontend.htmlEntries.reactIndex)
                }
            }
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, config.frontend.aliases['@']),
                '@components': path.resolve(__dirname, config.frontend.aliases['@components']),
                '@pages': path.resolve(__dirname, config.frontend.aliases['@pages']),
                '@utils': path.resolve(__dirname, config.frontend.aliases['@utils']),
                '@hooks': path.resolve(__dirname, config.frontend.aliases['@hooks']),
                '@services': path.resolve(__dirname, config.frontend.aliases['@services']),
                '@store': path.resolve(__dirname, config.frontend.aliases['@store']),
                '@types': path.resolve(__dirname, config.frontend.aliases['@types']),
                // 添加React相关依赖的别名，确保能正确解析
                'react': path.resolve(__dirname, '../../node_modules/react'),
                'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
                'react/jsx-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-runtime'),
                'react/jsx-dev-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime')
            }
        }
    });
    
    // 使用Vite中间件
    app.use(vite.middlewares);
    
    // 启动Vite服务器
    await vite.listen();
    console.log(`Vite开发服务器已在端口${config.vite.port}启动`);
    
    return vite;
}

// 启动集成服务器
async function startServer() {
    try {
        // 启动Vite开发服务器
        const vite = await startViteServer();
        console.log('Vite开发服务器已启动');
        
        // 初始化WebSocket服务
        const websocketService = container.get('websocketService');
        websocketService.init(server);
        
        // 初始化设备发现服务
        discoveryService.init();
        
        // 启动主服务器 (使用配置的端口)
        // 确保使用环境变量中指定的端口
        const actualPort = parseInt(process.env.SERVER_PORT) || config.server.port;
        server.listen(actualPort, config.server.host, () => {
            const localIP = getLocalIP();
            console.log(`Windows主服务运行在: http://${localIP}:${actualPort}`);
            console.log(`Windows主服务运行在: http://${config.server.host}:${actualPort}`);
            console.log(`Vite开发服务器运行在: http://${localIP}:${config.vite.port}`);
            console.log(`Vite开发服务器运行在: http://${config.vite.host}:${config.vite.port}`);
            console.log('等待Android设备连接...');
        });
        
        // 启动设备发现广播
        setInterval(() => {
            broadcastDeviceDiscovery();
        }, 3000);
        
        // 立即发送一次广播
        setTimeout(() => {
            broadcastDeviceDiscovery();
        }, 1000);
        
    } catch (error) {
        console.error('启动服务器时出错:', error);
        process.exit(1);
    }
}

// 错误处理
server.on('error', (error) => {
    console.error('服务器错误:', error);
});

// 启动服务器
startServer();