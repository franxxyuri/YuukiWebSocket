import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { networkInterfaces, hostname } from 'os';
import cors from 'cors';
import dgram from 'dgram';
import crypto from 'crypto';

// 导入配置文件
import config from './config.mjs';

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 启用CORS
app.use(cors());

// 静态文件服务
app.use(express.static('.'));

// 创建WebSocket服务器
const wss = new WebSocketServer({ server });

// 存储连接的客户端
const clients = new Map();
let androidDevice = null; // 存储连接的Android设备

// 设备发现端口
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

    discoveryServer.send(buffer, 0, buffer.length, 8090, '255.255.255.255', (err) => {

        if (err) console.error('广播错误:', err);

    });
}

// UDP监听器
discoveryServer.on('listening', () => {
    console.log('设备发现服务在UDP端口 8090 上运行');
    discoveryServer.setBroadcast(true);
    
    // 每3秒广播一次
    setInterval(() => {
        broadcastDeviceDiscovery();
    }, 3000);
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

discoveryServer.bind(8090);

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
    
    // 处理消息
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('收到消息:', message.type);
            
            // 根据消息类型处理
            switch (message.type) {
                case 'device_info':
                    handleDeviceInfo(clientId, message.deviceInfo);
                    break;
                case 'screen_frame':
                    handleScreenFrame(clientId, message);
                    break;
                case 'file_transfer':
                    handleFileTransfer(clientId, message);
                    break;
                case 'control_command':
                    handleControlCommand(clientId, message);
                    break;
                case 'clipboard':
                    handleClipboard(clientId, message);
                    break;
                case 'notification':
                    handleNotification(clientId, message);
                    break;
                case 'heartbeat':
                    handleHeartbeat(clientId, message);
                    break;
                case 'start_device_discovery':
                    handleStartDeviceDiscovery(clientId, message);
                    break;
                case 'stop_device_discovery':
                    handleStopDeviceDiscovery(clientId, message);
                    break;
                case 'get_discovered_devices':
                    handleGetDiscoveredDevices(clientId, message);
                    break;
                default:
                    console.log('未知消息类型:', message.type);
                    break;
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
        }
    });
    
    // 处理连接关闭
    ws.on('close', () => {
        console.log('客户端断开连接:', clientId);
        const client = clients.get(clientId);
        if (client && client.type === 'android') {
            androidDevice = null;
            console.log('Android设备已断开连接');
        }
        clients.delete(clientId);
    });
    
    // 处理错误
    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
    });
});

// 处理设备信息
function handleDeviceInfo(clientId, deviceInfo) {
    console.log('收到设备信息:', deviceInfo);
    
    const client = clients.get(clientId);
    if (client) {
        client.type = deviceInfo.platform;
        
        if (deviceInfo.platform === 'android') {
            androidDevice = {
                id: clientId,
                info: deviceInfo,
                ws: client.ws
            };
            console.log('Android设备已连接:', deviceInfo.deviceName);
            
            // 向所有Web客户端广播设备连接信息
            broadcastToWebClients({
                type: 'android_connected',
                deviceInfo: deviceInfo
            });
        }
    }
    
    // 向所有Web客户端广播设备信息
    broadcastToWebClients({
        type: 'device_connected',
        deviceInfo: deviceInfo,
        clientId: clientId
    });
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
    
    for (const [clientId, client] of clients) {
        if (client.type === 'web' && clientId !== excludeClientId) {
            try {
                client.ws.send(messageStr);
            } catch (error) {
                console.error('广播消息失败:', error);
            }
        }
    }
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

// 启动服务器
const PORT = config.server.port;
const HOST = config.server.host;
server.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log(`服务器运行在: http://${localIP}:${PORT}`);
    console.log(`服务器运行在: http://${HOST}:${PORT}`);
    console.log('等待Android设备连接...');
    
    // 定期广播设备发现信息
    setInterval(() => {
        broadcastDeviceDiscovery();
    }, 3000);
});

// 错误处理
server.on('error', (error) => {
    console.error('服务器错误:', error);
});