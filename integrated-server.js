const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { createServer } = require('vite');
const NetworkCommunication = require('./network-communication.js');

async function startServers() {
  const app = express();
  const server = http.createServer(app);
  
  // 创建 Socket.IO 服务器
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // 初始化网络通信模块
  const networkCommunication = new NetworkCommunication();
  const discoveredDevices = new Map();
  let deviceDiscoveryActive = false;

  // 在开发模式下使用 Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  } else {
    // 在生产模式下提供构建的静态文件
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // 提供测试页面
  app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-connection.html'));
  });

  // 设置 Socket.IO 事件处理
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // 处理设备发现请求
    socket.on('start_device_discovery', async (callback) => {
      try {
        console.log('Starting device discovery');
        deviceDiscoveryActive = true;
        
        // 启动网络通信服务（如果尚未启动）
        if (!networkCommunication.isServerRunning) {
          await networkCommunication.startServer(8827); // 使用不同端口以避免冲突
          networkCommunication.startHeartbeatCheck();
        }
        
        if (callback) {
          callback({ 
            success: true, 
            devices: Array.from(discoveredDevices.values()) 
          });
        }
      } catch (error) {
        console.error('Device discovery error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // 处理停止设备发现
    socket.on('stop_device_discovery', (callback) => {
      deviceDiscoveryActive = false;
      if (callback) {
        callback({ success: true });
      }
    });

    // 处理获取已发现设备
    socket.on('get_discovered_devices', (callback) => {
      if (callback) {
        callback({ 
          success: true, 
          devices: Array.from(discoveredDevices.values()) 
        });
      }
    });

    // 处理发送文件
    socket.on('send_file', async (data, callback) => {
      try {
        console.log('Sending file:', data);
        if (callback) {
          callback({ success: true, transferInfo: { id: 'mock_transfer_id' } });
        }
      } catch (error) {
        console.error('File transfer error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // 处理接收文件
    socket.on('receive_file', (data, callback) => {
      try {
        console.log('Receiving file:', data);
        if (callback) {
          callback({ success: true, transferInfo: data.transferInfo });
        }
      } catch (error) {
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // 处理开始屏幕投屏
    socket.on('start_screen_streaming', async (deviceInfo, callback) => {
      try {
        console.log('Starting screen streaming for:', deviceInfo);
        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // 处理停止屏幕投屏
    socket.on('stop_screen_streaming', (deviceInfo, callback) => {
      try {
        console.log('Stopping screen streaming for:', deviceInfo);
        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // 处理启用远程控制
    socket.on('enable_remote_control', async (deviceInfo, callback) => {
      try {
        console.log('Enabling remote control for:', deviceInfo);
        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // 处理发送控制事件
    socket.on('send_control_event', (eventData, callback) => {
      try {
        console.log('Sending control event:', eventData);
        
        // 广播控制事件响应
        io.emit('control_response', { 
          success: true, 
          eventId: eventData.id 
        });
        
        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // 处理断开连接
    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });
  });

  // 监听网络通信事件并转发到 WebSocket
  networkCommunication.on('device-authenticated', (connection) => {
    console.log('Device authenticated:', connection.deviceInfo);
    
    // 添加到已发现设备列表
    if (connection.deviceInfo) {
      discoveredDevices.set(connection.deviceInfo.deviceId, {
        id: connection.deviceInfo.deviceId,
        name: connection.deviceInfo.deviceName,
        type: connection.deviceInfo.platform,
        status: 'connected',
        ...connection.deviceInfo
      });
      
      // 广播设备发现事件到所有客户端
      io.emit('device_discovered', {
        id: connection.deviceInfo.deviceId,
        name: connection.deviceInfo.deviceName,
        type: connection.deviceInfo.platform,
        status: 'connected',
        ...connection.deviceInfo
      });
    }
  });

  networkCommunication.on('connection-closed', (connection) => {
    console.log('Device connection closed:', connection.id);
    
    // 更新设备状态
    if (connection.deviceInfo) {
      io.emit('device_status_update', {
        id: connection.deviceInfo.deviceId,
        status: 'disconnected'
      });
    }
  });

  networkCommunication.on('screen-frame-received', (data) => {
    io.emit('screen_stream_data', data);
  });

  networkCommunication.on('file-transfer-request', (data) => {
    io.emit('file_transfer_progress', data);
  });

  networkCommunication.on('control-event-received', (data) => {
    io.emit('control_response', data);
  });

  networkCommunication.on('notification-received', (data) => {
    io.emit('notification_received', data);
  });

  networkCommunication.on('clipboard-synced', (data) => {
    io.emit('clipboard_update', data);
  });

  // 启动服务器
  const PORT = 8826;
  server.listen(PORT, () => {
    console.log(`\n===============================================`);
    console.log(`Windows-Android Connect Server is running!`);
    console.log(`WebSocket Server: http://localhost:${PORT}`);
    console.log(`Test Page: http://localhost:${PORT}/test`);
    console.log(`===============================================\n`);
    console.log('Server features:');
    console.log('   - WebSocket communication');
    console.log('   - Device discovery via WebSocket');
    console.log('   - File transfer via WebSocket');
    console.log('   - Screen mirroring via WebSocket');
    console.log('   - Remote control via WebSocket');
    console.log('   - Notification sync via WebSocket');
    console.log('   - Clipboard sync via WebSocket');
    console.log('');
    console.log('Waiting for client connections...');
    console.log('Press Ctrl+C to stop the server...');
  });

  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\nStopping server...');
    networkCommunication.destroy();
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\nStopping server...');
    networkCommunication.destroy();
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  });
}

startServers().catch((error) => {
  console.error('Failed to start servers:', error);
  process.exit(1);
});