import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces, hostname } from 'os';
import cors from 'cors';
import dgram from 'dgram';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// 导入配置文件
import config from './config.mjs';

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

// 创建WebSocket服务器 (8828端口)
const wss = new WebSocketServer({ server });

// 存储连接的客户端
const clients = new Map();
let androidDevice = null; // 存储连接的Android设备

// 设备发现端口 (从配置文件读取)
const discoveryPort = config.discovery.port;
const discoveryServer = dgram.createSocket('udp4');

// 设备发现广播
function broadcastDeviceDiscovery() {
    const deviceInfo = {
        deviceId: 'windows-pc-' + hostname(),
        deviceName: hostname(),
        platform: 'windows',
        version: '1.0.0',
        capabilities: ['file_transfer', 'screen_mirror', 'remote_control', 'notification', 'clipboard_sync']
    };

    const message = `WINDOWS_DEVICE:${deviceInfo.deviceId}:${deviceInfo.deviceName}:${deviceInfo.version}`;
    const buffer = Buffer.from(message);

    discoveryServer.send(buffer, 0, buffer.length, discoveryPort, '255.255.255.255', (err) => {
        if (err) console.error('广播错误:', err);
    });
}

// UDP监听器
discoveryServer.on('listening', () => {
    console.log(`设备发现服务在UDP端口 ${discoveryPort} 上运行`);
    discoveryServer.setBroadcast(true);
});

discoveryServer.on('message', (msg, rinfo) => {
    const message = msg.toString();
    console.log(`收到设备发现消息: ${message} from ${rinfo.address}:${rinfo.port}`);
    
    // 处理Android设备的发现消息
    if (message.startsWith('ANDROID_DEVICE:')) {
        const parts = message.split(':');
        const deviceInfo = {
            deviceId: parts[1],
            deviceName: parts[2],
            platform: 'android',
            ip: rinfo.address,
            port: rinfo.port,
            lastSeen: Date.now()
        };
        
        console.log(`发现Android设备: ${deviceInfo.deviceName} (${deviceInfo.ip})`);
        
        // 向所有Web客户端广播设备信息
        broadcastToWebClients({
            type: 'device_found',
            device: deviceInfo
        });
    }
});

discoveryServer.bind(discoveryPort);

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
    res.sendFile(path.join(__dirname, 'screen-stream.html'));
});

app.get('/api/devices', (req, res) => {
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

    res.json({

        server: 'running',

        timestamp: Date.now(),

        androidConnected: !!androidDevice,

        totalClients: clients.size

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

// 处理WebSocket连接
wss.on('connection', (ws, request) => {
    console.log('新客户端连接:', request.socket.remoteAddress);
    
    // 生成客户端ID
    const clientId = 'client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // 存储客户端连接
    clients.set(clientId, {
        ws: ws,
        type: 'unknown', // 'android' or 'web'
        ip: request.socket.remoteAddress
    });
    
    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'connection_established',
        clientId: clientId,
        timestamp: Date.now()
    }));
    
    console.log('已发送欢迎消息给客户端:', clientId);
    
    // 处理消息
    ws.on('message', (data) => {
        try {
            // 记录接收到的原始数据长度
            console.log('收到原始数据长度:', data.length, 'bytes');
            
            const message = JSON.parse(data);
            console.log('收到消息:', message.type, '来自客户端:', clientId);
            
            // 根据消息类型处理
            switch (message.type) {
                case 'device_info':
                    console.log('处理设备信息消息，设备平台:', message.deviceInfo?.platform);
                    handleDeviceInfo(clientId, message.deviceInfo);
                    break;
                case 'screen_frame':
                    console.log('处理屏幕帧消息，时间戳:', message.timestamp);
                    handleScreenFrame(clientId, message);
                    break;
                case 'file_transfer':
                    console.log('处理文件传输消息，动作:', message.action);
                    handleFileTransfer(clientId, message);
                    break;
                case 'control_command':
                    console.log('处理控制命令消息，命令类型:', message.commandType);
                    handleControlCommand(clientId, message);
                    break;
                case 'clipboard':
                    console.log('处理剪贴板消息，数据长度:', message.data?.length);
                    handleClipboard(clientId, message);
                    break;
                case 'notification':
                    console.log('处理通知消息，标题:', message.title);
                    handleNotification(clientId, message);
                    break;
                case 'heartbeat':
                    console.log('处理心跳消息');
                    handleHeartbeat(clientId, message);
                    break;
                case 'start_device_discovery':
                    console.log('处理开始设备发现请求');
                    handleStartDeviceDiscovery(clientId, message);
                    break;
                case 'stop_device_discovery':
                    console.log('处理停止设备发现请求');
                    handleStopDeviceDiscovery(clientId, message);
                    break;
                case 'get_discovered_devices':
                    console.log('处理获取已发现设备请求');
                    handleGetDiscoveredDevices(clientId, message);
                    break;
                default:
                    console.log('未知消息类型:', message.type, '完整消息:', JSON.stringify(message));
                    break;
            }
        } catch (error) {
            console.error('处理消息时出错:', error, '原始数据:', data.toString());
        }
    });
    
    // 处理连接关闭
    ws.on('close', (code, reason) => {
        console.log('客户端断开连接:', clientId, '关闭代码:', code, '原因:', reason.toString());
        const client = clients.get(clientId);
        if (client) {
            console.log('断开的客户端信息 - 类型:', client.type, 'IP:', client.ip);
            if (client.type === 'android' && androidDevice && androidDevice.id === clientId) {
                androidDevice = null;
                console.log('Android设备已断开连接');
                
                // 向所有Web客户端广播设备断开连接信息
                broadcastToWebClients({
                    type: 'android_disconnected'
                });
            }
            clients.delete(clientId);
            console.log('客户端连接已从列表中移除，剩余客户端数:', clients.size);
        } else {
            console.log('未找到客户端信息，可能是连接尚未完全建立就断开了');
        }
    });
    
    // 处理错误
    ws.on('error', (error) => {
        console.error('WebSocket错误:', error, '客户端ID:', clientId);
    });
});

// 处理设备信息
function handleDeviceInfo(clientId, deviceInfo) {
    console.log('收到设备信息:', deviceInfo, '客户端ID:', clientId);
    
    const client = clients.get(clientId);
    if (client) {
        console.log('更新客户端信息 - 原类型:', client.type, '新类型:', deviceInfo.platform);
        client.type = deviceInfo.platform;
        client.deviceInfo = deviceInfo;
        
        if (deviceInfo.platform === 'android') {
            androidDevice = {
                id: clientId,
                info: deviceInfo,
                ws: client.ws,
                connectedAt: Date.now()
            };
            console.log('Android设备已连接:', deviceInfo.deviceName, '设备ID:', deviceInfo.deviceId);
            
            // 向所有Web客户端广播设备连接信息
            const message = {
                type: 'android_connected',
                deviceInfo: deviceInfo
            };
            console.log('广播Android设备连接消息:', JSON.stringify(message));
            broadcastToWebClients(message);
        }
        
        console.log('客户端类型已更新为:', client.type);
    } else {
        console.log('未找到客户端:', clientId);
    }
    
    // 向所有Web客户端广播设备信息
    const broadcastMessage = {
        type: 'device_connected',
        deviceInfo: deviceInfo,
        clientId: clientId
    };
    console.log('广播设备连接消息:', JSON.stringify(broadcastMessage));
    broadcastToWebClients(broadcastMessage);
}

// 处理屏幕帧
function handleScreenFrame(clientId, message) {
    console.log('收到屏幕帧:', message.timestamp);
    
    // 广播屏幕帧给所有Web客户端
    broadcastToWebClients({
        type: 'screen_frame',
        frameData: message.frameData,
        timestamp: message.timestamp
    }, clientId); // 排除发送方
}

// 处理文件传输
function handleFileTransfer(clientId, message) {
    console.log('收到文件传输消息:', message.action);
    
    // 转发给其他客户端（如Web前端）
    broadcastToWebClients({
        type: 'file_transfer',
        ...message,
        sourceClientId: clientId
    }, clientId);
}

// 处理控制命令
function handleControlCommand(clientId, message) {
    console.log('收到控制命令:', message.commandType);
    
    // 如果是Web客户端发送的控制命令，转发给Android设备
    const client = clients.get(clientId);
    if (client && client.type === 'web') {
        if (androidDevice && androidDevice.ws) {
            androidDevice.ws.send(JSON.stringify(message));
            console.log('控制命令已转发给Android设备');
        } else {
            console.log('没有连接的Android设备');
            // 发送错误消息给Web客户端
            client.ws.send(JSON.stringify({
                type: 'error',
                message: '没有连接的Android设备'
            }));
        }
    }
}

// 处理剪贴板同步
function handleClipboard(clientId, message) {
    console.log('收到剪贴板消息:', message.data.substring(0, 50) + '...');
    
    // 转发给所有其他客户端（实现双向同步）
    broadcastToAllClients({
        type: 'clipboard',
        ...message,
        sourceClientId: clientId
    }, clientId);
}

// 处理通知
function handleNotification(clientId, message) {
    console.log('收到通知消息:', message.title);
    
    // 转发给所有Web客户端
    broadcastToWebClients({
        type: 'notification',
        ...message,
        sourceClientId: clientId
    }, clientId);
}

// 处理心跳
function handleHeartbeat(clientId, message) {
    console.log('收到心跳:', clientId);
    
    // 回复心跳
    const client = clients.get(clientId);
    if (client) {
        client.ws.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
        }));
    }
}

// 处理开始设备发现请求
function handleStartDeviceDiscovery(clientId, message) {
    console.log('开始设备发现请求');
    
    // 发送确认消息
    const client = clients.get(clientId);
    if (client) {
        client.ws.send(JSON.stringify({
            type: 'start_device_discovery_response',
            success: true
        }));
    }
}

// 处理停止设备发现请求
function handleStopDeviceDiscovery(clientId, message) {
    console.log('停止设备发现请求');
    
    // 发送确认消息
    const client = clients.get(clientId);
    if (client) {
        client.ws.send(JSON.stringify({
            type: 'stop_device_discovery_response',
            success: true
        }));
    }
}

// 处理获取已发现设备请求
function handleGetDiscoveredDevices(clientId, message) {
    console.log('获取已发现设备请求');
    
    // 返回当前连接的设备列表
    const devices = [];
    if (androidDevice) {
        devices.push(androidDevice.info);
    }
    
    const client = clients.get(clientId);
    if (client) {
        client.ws.send(JSON.stringify({
            type: 'get_discovered_devices_response',
            success: true,
            devices: devices
        }));
    }
}

// 向所有Web客户端广播消息
function broadcastToWebClients(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    console.log('开始广播消息到Web客户端:', message.type, '排除客户端:', excludeClientId);
    
    let broadcastCount = 0;
    for (const [clientId, client] of clients) {
        if (client.type === 'web' && clientId !== excludeClientId) {
            try {
                console.log('向Web客户端发送消息:', clientId, '消息类型:', message.type);
                client.ws.send(messageStr);
                broadcastCount++;
            } catch (error) {
                console.error('广播消息失败:', error, '客户端ID:', clientId);
            }
        }
    }
    
    console.log('消息广播完成，共发送给', broadcastCount, '个Web客户端');
}

// 向所有客户端广播消息
function broadcastToAllClients(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    
    for (const [clientId, client] of clients) {
        if (clientId !== excludeClientId) {
            try {
                client.ws.send(messageStr);
            } catch (error) {
                console.error('广播消息失败:', error);
            }
        }
    }
}

// 启动Vite开发服务器
async function startViteServer() {
    const vite = await createServer({
        plugins: [react()],
        server: {
            port: 8080,
            host: '0.0.0.0',
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
                    }
            }
        },
        root: '.',
        publicDir: 'public',
        build: {
            outDir: 'dist',
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    test: path.resolve(__dirname, 'test-ui.html'),
                    screen: path.resolve(__dirname, 'screen-stream.html')
                }
            }
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@pages': path.resolve(__dirname, './src/pages'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@hooks': path.resolve(__dirname, './src/hooks'),
                '@services': path.resolve(__dirname, './src/services'),
                '@store': path.resolve(__dirname, './src/store'),
                '@types': path.resolve(__dirname, './src/types')
            }
        }
    });
    
    // 使用Vite中间件
    app.use(vite.middlewares);
    
    // 启动Vite服务器
    await vite.listen();
    console.log('Vite开发服务器已在端口8080启动');
    
    return vite;
}

// 启动集成服务器
async function startServer() {
    try {
        // 启动Vite开发服务器
        const vite = await startViteServer();
        console.log('Vite开发服务器已启动');
        
        // 启动主服务器 (8828端口)
        server.listen(8828, () => {
            const localIP = getLocalIP();
            console.log(`Windows主服务运行在: http://${localIP}:8828`);
            console.log(`Windows主服务运行在: http://localhost:8828`);
            console.log(`Vite开发服务器运行在: http://${localIP}:8080`);
            console.log(`Vite开发服务器运行在: http://localhost:8080`);
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