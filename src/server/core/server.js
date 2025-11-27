const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { networkInterfaces } = require('os');
const cors = require('cors');
const dgram = require('dgram');
const fs = require('fs').promises;
const config = require('../../../../backend/config/config.cjs');

class WindowsAndroidConnectServer {
  constructor(port = config.server.port) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    
    // 启用CORS
    this.app.use(cors());
    
    // 静态文件服务
    this.app.use(express.static('.'));
    
    // 创建WebSocket服务器
    this.wss = new WebSocket.Server({ server: this.server });
    
    // 存储连接的客户端
    this.clients = new Map();
    this.androidDevice = null; // 存储连接的Android设备
    this.discoveredDevices = new Map(); // 存储发现的设备
    
    // 设备发现服务
    this.discoveryPort = config.discovery.port;
    this.discoveryServer = dgram.createSocket('udp4');
    this.discoveryInterval = null;
    
    // 初始化路由
    this.setupRoutes();
    
    // 初始化WebSocket处理
    this.setupWebSocketHandlers();
    
    // 初始化设备发现服务
    this.setupDiscoveryServer();
  }
  
  // 设置路由
  setupRoutes() {
    // 主页路由
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../frontend/index.html'));
    });
    
    // API路由
    this.app.get('/api/devices', (req, res) => {
      const devices = [];
      for (const [clientId, client] of this.clients) {
        devices.push({
          id: clientId,
          type: client.type,
          ip: client.ip,
          connected: true
        });
      }
      res.json(devices);
    });
    
    this.app.get('/api/status', (req, res) => {
      res.json({
        server: 'running',
        timestamp: Date.now(),
        androidConnected: !!this.androidDevice,
        totalClients: this.clients.size
      });
    });
    
    this.app.get('/api/discovered-devices', (req, res) => {
      const devices = [];
      for (const [deviceId, device] of this.discoveredDevices) {
        devices.push(device);
      }
      res.json(devices);
    });
  }
  
  // 设置WebSocket处理
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, request) => {
      console.log('新客户端连接:', request.socket.remoteAddress);
      
      // 生成客户端ID
      const clientId = 'client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // 存储客户端连接
      this.clients.set(clientId, {
        ws: ws,
        type: 'unknown', // 'android' or 'web'
        ip: request.socket.remoteAddress,
        connectedAt: Date.now()
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
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('处理消息时出错:', error);
        }
      });
      
      // 处理连接关闭
      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });
      
      // 处理错误
      ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
      });
    });
  }
  
  // 设置设备发现服务
  setupDiscoveryServer() {
    // 设备发现广播
    this.discoveryServer.on('listening', () => {
      console.log(`设备发现服务在UDP端口 ${this.discoveryPort} 上运行`);
      this.discoveryServer.setBroadcast(true);
    });
    
    // 监听UDP消息
    this.discoveryServer.on('message', (msg, rinfo) => {
      this.handleDiscoveryMessage(msg, rinfo);
    });
    
    // 错误处理
    this.discoveryServer.on('error', (error) => {
      console.error('设备发现服务错误:', error);
    });
  }
  
  // 处理消息
  handleMessage(clientId, message) {
    console.log('收到消息:', message.type);
    
    // 根据消息类型处理
    switch (message.type) {
      case 'device_info':
        this.handleDeviceInfo(clientId, message.deviceInfo);
        break;
      case 'screen_frame':
        this.handleScreenFrame(clientId, message);
        break;
      case 'file_transfer':
        this.handleFileTransfer(clientId, message);
        break;
      case 'control_command':
        this.handleControlCommand(clientId, message);
        break;
      case 'clipboard':
        this.handleClipboard(clientId, message);
        break;
      case 'notification':
        this.handleNotification(clientId, message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(clientId, message);
        break;
      case 'start_device_discovery':
        this.handleStartDeviceDiscovery(clientId, message);
        break;
      case 'stop_device_discovery':
        this.handleStopDeviceDiscovery(clientId, message);
        break;
      case 'get_discovered_devices':
        this.handleGetDiscoveredDevices(clientId, message);
        break;
      default:
        console.log('未知消息类型:', message.type);
        break;
    }
  }
  
  // 处理设备信息
  handleDeviceInfo(clientId, deviceInfo) {
    console.log('收到设备信息:', deviceInfo);
    
    const client = this.clients.get(clientId);
    if (client) {
      client.type = deviceInfo.platform;
      client.deviceInfo = deviceInfo;
      
      if (deviceInfo.platform === 'android') {
        this.androidDevice = {
          id: clientId,
          info: deviceInfo,
          ws: client.ws,
          connectedAt: Date.now()
        };
        console.log('Android设备已连接:', deviceInfo.deviceName);
        
        // 向所有Web客户端广播设备连接信息
        this.broadcastToWebClients({
          type: 'android_connected',
          deviceInfo: deviceInfo
        });
      }
    }
    
    // 向所有Web客户端广播设备信息
    this.broadcastToWebClients({
      type: 'device_connected',
      deviceInfo: deviceInfo,
      clientId: clientId
    });
  }
  
  // 处理屏幕帧
  handleScreenFrame(clientId, message) {
    console.log('收到屏幕帧:', message.timestamp);
    
    // 广播屏幕帧给所有Web客户端
    this.broadcastToWebClients({
      type: 'screen_frame',
      frameData: message.frameData,
      timestamp: message.timestamp
    }, clientId); // 排除发送方
  }
  
  // 处理文件传输
  handleFileTransfer(clientId, message) {
    console.log('收到文件传输消息:', message.action);
    
    // 转发给其他客户端（如Web前端）
    this.broadcastToWebClients({
      type: 'file_transfer',
      ...message,
      sourceClientId: clientId
    }, clientId);
  }
  
  // 处理控制命令
  handleControlCommand(clientId, message) {
    console.log('收到控制命令:', message.commandType);
    
    // 如果是Web客户端发送的控制命令，转发给Android设备
    const client = this.clients.get(clientId);
    if (client && client.type === 'web') {
      if (this.androidDevice && this.androidDevice.ws) {
        this.androidDevice.ws.send(JSON.stringify(message));
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
  handleClipboard(clientId, message) {
    console.log('收到剪贴板消息:', message.data.substring(0, 50) + '...');
    
    // 转发给所有其他客户端（实现双向同步）
    this.broadcastToAllClients({
      type: 'clipboard',
      ...message,
      sourceClientId: clientId
    }, clientId);
  }
  
  // 处理通知
  handleNotification(clientId, message) {
    console.log('收到通知消息:', message.title);
    
    // 转发给所有Web客户端
    this.broadcastToWebClients({
      type: 'notification',
      ...message,
      sourceClientId: clientId
    }, clientId);
  }
  
  // 处理心跳
  handleHeartbeat(clientId, message) {
    console.log('收到心跳:', clientId);
    
    // 回复心跳
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now()
      }));
    }
  }
  
  // 处理开始设备发现请求
  handleStartDeviceDiscovery(clientId, message) {
    console.log('开始设备发现请求');
    
    // 启动设备发现广播
    if (!this.discoveryInterval) {
      this.startDeviceDiscovery();
    }
    
    // 发送确认消息
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({
        type: 'start_device_discovery_response',
        success: true
      }));
    }
  }
  
  // 处理停止设备发现请求
  handleStopDeviceDiscovery(clientId, message) {
    console.log('停止设备发现请求');
    
    // 停止设备发现广播
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    // 发送确认消息
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({
        type: 'stop_device_discovery_response',
        success: true
      }));
    }
  }
  
  // 处理获取已发现设备请求
  handleGetDiscoveredDevices(clientId, message) {
    console.log('获取已发现设备请求');
    
    // 返回当前发现的设备列表
    const devices = [];
    for (const [deviceId, device] of this.discoveredDevices) {
      devices.push(device);
    }
    
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({
        type: 'get_discovered_devices_response',
        success: true,
        devices: devices
      }));
    }
  }
  
  // 处理设备发现消息
  handleDiscoveryMessage(msg, rinfo) {
    const message = msg.toString();
    console.log(`收到设备发现消息: ${message} from ${rinfo.address}:${rinfo.port}`);
    
    // 处理Android设备的发现消息
    if (message.startsWith('ANDROID_DEVICE:')) {
      const parts = message.split(':');
      const deviceId = parts[1];
      const deviceInfo = {
        deviceId: deviceId,
        deviceName: parts[2],
        platform: 'android',
        ip: rinfo.address,
        port: rinfo.port,
        lastSeen: Date.now()
      };
      
      // 更新或添加设备到发现列表
      this.discoveredDevices.set(deviceId, deviceInfo);
      console.log(`发现Android设备: ${deviceInfo.deviceName} (${deviceInfo.ip})`);
      
      // 向所有Web客户端广播设备信息
      this.broadcastToWebClients({
        type: 'device_found',
        device: deviceInfo
      });
    }
  }
  
  // 处理客户端断开连接
  handleClientDisconnect(clientId) {
    console.log('客户端断开连接:', clientId);
    const client = this.clients.get(clientId);
    if (client) {
      if (client.type === 'android' && this.androidDevice && this.androidDevice.id === clientId) {
        this.androidDevice = null;
        console.log('Android设备已断开连接');
        
        // 向所有Web客户端广播设备断开连接信息
        this.broadcastToWebClients({
          type: 'android_disconnected'
        });
      }
      this.clients.delete(clientId);
    }
  }
  
  // 设备发现广播
  broadcastDeviceDiscovery() {
    const deviceInfo = {
      deviceId: 'windows-pc-' + require('os').hostname(),
      deviceName: require('os').hostname(),
      platform: 'windows',
      version: '1.0.0',
      capabilities: ['file_transfer', 'screen_mirror', 'remote_control', 'notification', 'clipboard_sync']
    };

    const message = `WINDOWS_DEVICE:${deviceInfo.deviceId}:${deviceInfo.deviceName}:${deviceInfo.version}`;
    const buffer = Buffer.from(message);

    this.discoveryServer.send(buffer, 0, buffer.length, this.discoveryPort, '255.255.255.255', (err) => {
      if (err) console.error('广播错误:', err);
    });
  }
  
  // 启动设备发现
  startDeviceDiscovery() {
    this.discoveryServer.bind(this.discoveryPort);
    
    // 每3秒广播一次
    this.discoveryInterval = setInterval(() => {
      this.broadcastDeviceDiscovery();
    }, 3000);
    
    // 立即发送一次广播
    this.broadcastDeviceDiscovery();
  }
  
  // 向所有Web客户端广播消息
  broadcastToWebClients(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    
    for (const [clientId, client] of this.clients) {
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
  broadcastToAllClients(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          console.error('广播消息失败:', error);
        }
      }
    }
  }
  
  // 获取本机IP地址
  getLocalIP() {
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
  
  // 启动服务器
  async start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        const localIP = this.getLocalIP();
        console.log(`服务器运行在: http://${localIP}:${this.port}`);
        console.log(`服务器运行在: http://localhost:${this.port}`);
        console.log('等待Android设备连接...');
        
        // 启动设备发现服务
        this.startDeviceDiscovery();
        
        resolve();
      });
      
      this.server.on('error', (error) => {
        console.error('服务器错误:', error);
        reject(error);
      });
    });
  }
  
  // 停止服务器
  async stop() {
    // 停止设备发现广播
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    // 关闭设备发现服务器
    this.discoveryServer.close();
    
    // 关闭所有WebSocket连接
    for (const [clientId, client] of this.clients) {
      try {
        client.ws.close();
      } catch (error) {
        console.error('关闭客户端连接时出错:', error);
      }
    }
    
    // 关闭HTTP服务器
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('服务器已停止');
        resolve();
      });
    });
  }
}

module.exports = WindowsAndroidConnectServer;