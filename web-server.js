const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 配置CORS以支持Vite开发服务器
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8826", "http://127.0.0.1:5173", "http://127.0.0.1:8826"],
  methods: ["GET", "POST"],
  credentials: true
}));

// 配置静态文件服务
app.use(express.static('dist'));

// 创建Socket.IO服务器
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:8826", "http://127.0.0.1:5173", "http://127.0.0.1:8826"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 模拟设备列表
let discoveredDevices = [
  {
    id: 'android-device-1',
    name: '我的Android设备',
    type: 'Android',
    status: '已连接',
    ip: '192.168.1.100',
    port: 8827
  }
];

// 存储活跃连接
const activeConnections = new Map();

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('📱 新客户端连接:', socket.id);

  // 响应设备发现请求
  socket.on('start_device_discovery', (callback) => {
    console.log('🔍 开始设备发现');
    // 模拟设备发现过程
    setTimeout(() => {
      callback({
        success: true,
        devices: discoveredDevices
      });
      
      // 向客户端发送发现的设备
      socket.emit('device_discovered', discoveredDevices[0]);
    }, 1000);
  });

  // 响应停止设备发现请求
  socket.on('stop_device_discovery', (callback) => {
    console.log('🔍 停止设备发现');
    callback({
      success: true
    });
  });

  // 响应获取已发现设备请求
  socket.on('get_discovered_devices', (callback) => {
    callback({
      success: true,
      devices: discoveredDevices
    });
  });

  // 响应发送文件请求
  socket.on('send_file', (data, callback) => {
    console.log('📁 收到发送文件请求:', data);
    // 模拟文件传输
    setTimeout(() => {
      callback({
        success: true,
        transferInfo: {
          id: `transfer_${Date.now()}`,
          fileName: data.filePath.split('/').pop(),
          status: 'transferring',
          progress: 0
        }
      });
    }, 500);
  });

  // 响应接收文件请求
  socket.on('receive_file', (data, callback) => {
    console.log('📥 收到接收文件请求:', data);
    callback({
      success: true,
      transferInfo: {
        id: `transfer_${Date.now()}`,
        fileName: 'received_file',
        status: 'receiving',
        progress: 0
      }
    });
  });

  // 响应开始屏幕投屏请求
  socket.on('start_screen_streaming', (deviceInfo, callback) => {
    console.log('📱 开始屏幕投屏:', deviceInfo.name);
    callback({
      success: true,
      message: '屏幕投屏已启动'
    });
    
    // 模拟发送屏幕流数据
    const interval = setInterval(() => {
      if (activeConnections.has(socket.id)) {
        socket.emit('screen_stream_data', {
          frame: 'mock_frame_data',
          timestamp: Date.now()
        });
      } else {
        clearInterval(interval);
      }
    }, 100);
  });

  // 响应停止屏幕投屏请求
  socket.on('stop_screen_streaming', (deviceInfo, callback) => {
    console.log('📱 停止屏幕投屏:', deviceInfo.name);
    callback({
      success: true,
      message: '屏幕投屏已停止'
    });
  });

  // 响应启用远程控制请求
  socket.on('enable_remote_control', (deviceInfo, callback) => {
    console.log('🎮 启用远程控制:', deviceInfo.name);
    callback({
      success: true,
      message: '远程控制已启用'
    });
  });

  // 响应发送控制事件请求
  socket.on('send_control_event', (eventData, callback) => {
    console.log('🎮 收到控制事件:', eventData);
    callback({
      success: true,
      message: '控制事件已发送'
    });
  });

  // 客户端断开连接
  socket.on('disconnect', (reason) => {
    console.log('🔌 客户端断开连接:', socket.id, '原因:', reason);
    activeConnections.delete(socket.id);
  });

  // 将连接添加到活跃连接列表
  activeConnections.set(socket.id, {
    socket: socket,
    connectedAt: new Date()
  });
});

// 启动服务器
const PORT = process.env.PORT || 8826;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器启动成功，监听端口: ${PORT}`);
  console.log(`🔗 WebSocket端点: ws://localhost:${PORT}`);
  console.log(`🌐 访问应用: http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🔄 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});