import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dgram from 'dgram';

// 创建Express应用和HTTP服务器
const app = express();
app.use(cors());
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocketServer({ server });

// 存储连接的客户端
const clients = new Map();

// 监听WebSocket连接
wss.on('connection', (ws) => {
  const clientId = Date.now().toString();
  clients.set(clientId, ws);
  
  console.log(`新的客户端连接: ${clientId}`);
  
  // 发送设备信息（模拟Web客户端）
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`收到消息:`, data);
      
      // 响应设备发现请求
      if (data.type === 'device_info') {
        ws.send(JSON.stringify({
          type: 'connected',
          message: '成功连接到WebSocket服务器'
        }));
      }
      
      // 响应设备发现请求
      if (data.type === 'get_discovered_devices') {
        // 返回模拟设备数据
        const mockDevices = [
          {
            deviceId: 'device-1',
            deviceName: 'Google Pixel 7',
            platform: 'android',
            ip: '192.168.1.101',
            port: 8928,
            lastSeen: Date.now()
          },
          {
            deviceId: 'device-2', 
            deviceName: 'Samsung Galaxy Tab S7',
            platform: 'android',
            ip: '192.168.1.102',
            port: 8928,
            lastSeen: Date.now()
          }
        ];
        
        ws.send(JSON.stringify({
          type: 'device_list',
          devices: mockDevices
        }));
      }
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  });
  
  // 监听断开连接
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`客户端断开连接: ${clientId}`);
  });
  
  // 监听错误
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});

// 设备发现服务
const discoveryPort = 8190;
const discoveryServer = dgram.createSocket('udp4');

discoveryServer.on('listening', () => {
  console.log(`设备发现服务在UDP端口 ${discoveryPort} 上运行`);
  discoveryServer.setBroadcast(true);
});

discoveryServer.on('message', (msg, rinfo) => {
  const message = msg.toString();
  console.log(`收到设备发现消息: ${message} from ${rinfo.address}:${rinfo.port}`);
});

discoveryServer.bind(discoveryPort);

// 启动服务器
const PORT = 3000; // 使用低权限端口
server.listen(PORT, () => {
  console.log(`WebSocket服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket连接URL: ws://localhost:${PORT}`);
});