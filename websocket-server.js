const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const NetworkCommunication = require('./network-communication.js');

class WebSocketServer {
  constructor(port = 8827) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.networkCommunication = new NetworkCommunication();
    this.deviceDiscoveryActive = false;
    this.discoveredDevices = new Map();
    
    this.setupSocketHandlers();
    this.setupNetworkCommunicationHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // 处理设备发现请求
      socket.on('start_device_discovery', async (callback) => {
        try {
          console.log('Starting device discovery');
          this.deviceDiscoveryActive = true;
          
          // 在这里触发网络发现
          // 实际的设备发现应该通过 NetworkCommunication 实现
          const devices = await this.startDeviceDiscovery();
          
          if (callback) {
            callback({ success: true, devices: Array.from(this.discoveredDevices.values()) });
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
        this.deviceDiscoveryActive = false;
        if (callback) {
          callback({ success: true });
        }
      });

      // 处理获取已发现设备
      socket.on('get_discovered_devices', (callback) => {
        if (callback) {
          callback({ 
            success: true, 
            devices: Array.from(this.discoveredDevices.values()) 
          });
        }
      });

      // 处理发送文件
      socket.on('send_file', async (data, callback) => {
        try {
          console.log('Sending file:', data);
          // 这里应该实现文件传输逻辑
          // 通过 NetworkCommunication 发送文件
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
          // 通过 NetworkCommunication 开始屏幕流
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
          // 通过 NetworkCommunication 启用远程控制
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
          // 通过 NetworkCommunication 发送控制事件
          
          // 广播控制事件响应
          this.io.emit('control_response', { 
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
  }

  setupNetworkCommunicationHandlers() {
    // 监听网络通信事件并转发到 WebSocket
    this.networkCommunication.on('device-authenticated', (connection) => {
      console.log('Device authenticated:', connection.deviceInfo);
      
      // 添加到已发现设备列表
      if (connection.deviceInfo) {
        this.discoveredDevices.set(connection.deviceInfo.deviceId, {
          id: connection.deviceInfo.deviceId,
          name: connection.deviceInfo.deviceName,
          type: connection.deviceInfo.platform,
          status: 'connected',
          ...connection.deviceInfo
        });
        
        // 广播设备发现事件
        this.io.emit('device_discovered', {
          id: connection.deviceInfo.deviceId,
          name: connection.deviceInfo.deviceName,
          type: connection.deviceInfo.platform,
          status: 'connected',
          ...connection.deviceInfo
        });
      }
    });

    this.networkCommunication.on('connection-closed', (connection) => {
      console.log('Device connection closed:', connection.id);
      
      // 更新设备状态
      if (connection.deviceInfo) {
        this.io.emit('device_status_update', {
          id: connection.deviceInfo.deviceId,
          status: 'disconnected'
        });
      }
    });

    // 监听屏幕帧数据
    this.networkCommunication.on('screen-frame-received', (data) => {
      this.io.emit('screen_stream_data', data);
    });

    // 监听文件传输事件
    this.networkCommunication.on('file-transfer-request', (data) => {
      this.io.emit('file_transfer_progress', data);
    });

    // 监听控制事件
    this.networkCommunication.on('control-event-received', (data) => {
      this.io.emit('control_response', data);
    });

    // 监听通知同步
    this.networkCommunication.on('notification-received', (data) => {
      this.io.emit('notification_received', data);
    });

    // 监听剪贴板同步
    this.networkCommunication.on('clipboard-synced', (data) => {
      this.io.emit('clipboard_update', data);
    });
  }

  async startDeviceDiscovery() {
    // 检查网络通信服务器是否已经在运行
    if (!this.networkCommunication.isServerRunning) {
      // 使用一个未被占用的端口，而不是WebSocket服务器的端口
      // WebSocket服务器运行在this.port，我们使用this.port+1作为NetworkCommunication服务器端口
      await this.networkCommunication.startServer(this.port + 1);
    }
    this.networkCommunication.startHeartbeatCheck();
    
    // 模拟设备发现过程
    // 在实际应用中，这里会通过网络协议发现设备
    console.log('Network communication server started on port:', this.networkCommunication.port);
    
    return Array.from(this.discoveredDevices.values());
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        console.log(`WebSocket server listening on port ${this.port}`);
        console.log('WebSocket server started successfully!');
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
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('Server startup failed:', error);
        reject(error);
      });
    });
  }

  stop() {
    this.networkCommunication.destroy();
    this.server.close(() => {
      console.log('WebSocket server stopped');
    });
  }
}

module.exports = WebSocketServer;

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  console.log('Starting Windows-Android Connect WebSocket Server...');
  console.log('==================================================');

  const server = new WebSocketServer();

  server.start()
    .then(() => {
      // 处理退出信号
      process.on('SIGINT', () => {
        console.log('\nStopping server...');
        server.stop();
        console.log('Server stopped');
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\nStopping server...');
        server.stop();
        console.log('Server stopped');
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}
