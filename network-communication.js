const net = require('net');
const crypto = require('crypto');
const EventEmitter = require('events');

class NetworkCommunication extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.server = null;
    this.isServerRunning = false;
    this.port = 8080;
    
    // 安全密钥（实际应用应该从配置文件读取）
    this.secretKey = crypto.randomBytes(32);
    
    // 支持的消息类型
    this.messageTypes = {
      DEVICE_INFO: 'device_info',
      FILE_TRANSFER: 'file_transfer',
      SCREEN_FRAME: 'screen_frame',
      CONTROL_COMMAND: 'control_command',
      NOTIFICATION: 'notification',
      CLIPBOARD: 'clipboard',
      HEARTBEAT: 'heartbeat',
      ACK: 'ack',
      ERROR: 'error'
    };
  }

  // 启动服务器
  async startServer(port = this.port) {
    if (this.isServerRunning) {
      console.log('服务器已在运行');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleNewConnection(socket);
      });

      this.server.on('error', (err) => {
        console.error('服务器启动失败:', err);
        reject(err);
      });

      this.server.listen(port, () => {
        this.isServerRunning = true;
        this.port = port;
        console.log(`🌐 服务器已启动，监听端口 ${port}`);
        resolve();
      });
    });
  }

  // 停止服务器
  stopServer() {
    if (this.server && this.isServerRunning) {
      this.server.close(() => {
        this.isServerRunning = false;
        console.log('🛑 服务器已停止');
        this.emit('server-stopped');
      });
    }
  }

  // 处理新的连接
  handleNewConnection(socket) {
    const connectionId = this.generateConnectionId();
    const connectionInfo = {
      id: connectionId,
      socket: socket,
      deviceInfo: null,
      isAuthenticated: false,
      lastHeartbeat: Date.now(),
      messageCount: 0,
      bytesReceived: 0,
      bytesSent: 0
    };

    this.connections.set(connectionId, connectionInfo);

    console.log(`📱 新连接建立: ${connectionId}`);

    // 处理数据接收
    socket.on('data', (data) => {
      this.handleDataReceived(connectionId, data);
    });

    // 处理连接关闭
    socket.on('close', () => {
      console.log(`❌ 连接关闭: ${connectionId}`);
      this.handleConnectionClose(connectionId);
    });

    // 处理错误
    socket.on('error', (err) => {
      console.error(`连接错误 ${connectionId}:`, err);
      this.handleConnectionError(connectionId, err);
    });

    // 发送连接确认
    this.sendMessage(connectionId, {
      type: 'connection_established',
      connectionId: connectionId,
      serverTime: Date.now()
    });

    this.emit('connection-established', connectionInfo);
  }

  // 处理接收到的数据
  handleDataReceived(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      connection.bytesReceived += data.length;

      // 解析JSON消息
      const messageStr = data.toString();
      const messages = messageStr.split('\n').filter(msg => msg.trim());

      for (const messageStr of messages) {
        try {
          const message = JSON.parse(messageStr);
          this.processMessage(connectionId, message);
        } catch (parseError) {
          console.error(`解析消息失败 ${connectionId}:`, parseError);
          this.sendError(connectionId, 'invalid_message', '消息格式错误');
        }
      }
    } catch (error) {
      console.error(`处理数据失败 ${connectionId}:`, error);
    }
  }

  // 处理消息
  processMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.messageCount++;

    console.log(`📨 收到消息 ${connectionId}:`, message.type);

    switch (message.type) {
      case this.messageTypes.DEVICE_INFO:
        this.handleDeviceInfo(connectionId, message);
        break;

      case this.messageTypes.HEARTBEAT:
        this.handleHeartbeat(connectionId, message);
        break;

      case this.messageTypes.FILE_TRANSFER:
        this.handleFileTransfer(connectionId, message);
        break;

      case this.messageTypes.SCREEN_FRAME:
        this.handleScreenFrame(connectionId, message);
        break;

      case this.messageTypes.CONTROL_COMMAND:
        this.handleControlCommand(connectionId, message);
        break;

      case 'control_event':
        this.handleControlEvent(connectionId, message);
        break;

      case this.messageTypes.NOTIFICATION:
        this.handleNotification(connectionId, message);
        break;

      case this.messageTypes.CLIPBOARD:
        this.handleClipboardMessage(connectionId, message);
        break;

      case this.messageTypes.ACK:
        this.handleAck(connectionId, message);
        break;

      default:
        console.warn(`未知消息类型: ${message.type}`);
        this.sendError(connectionId, 'unknown_message_type', '未知消息类型');
    }
  }

  // 处理设备信息
  handleDeviceInfo(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.deviceInfo = message.deviceInfo;
    connection.isAuthenticated = true;

    console.log(`✅ 设备认证成功: ${message.deviceInfo.name} (${message.deviceInfo.platform})`);

    // 发送认证成功确认
    this.sendMessage(connectionId, {
      type: 'authentication_success',
      serverDeviceInfo: this.getServerDeviceInfo()
    });

    this.emit('device-authenticated', connection);
  }

  // 处理心跳
  handleHeartbeat(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastHeartbeat = Date.now();

    // 回应心跳
    this.sendMessage(connectionId, {
      type: this.messageTypes.HEARTBEAT,
      timestamp: Date.now()
    });
  }

  // 处理文件传输
  handleFileTransfer(connectionId, message) {
    console.log(`📁 文件传输请求: ${message.fileName}`);
    
    // 转发给UI层处理
    this.emit('file-transfer-request', {
      connectionId,
      ...message
    });
  }

  // 处理屏幕帧
  handleScreenFrame(connectionId, message) {
    // 转发屏幕帧数据给UI层
    this.emit('screen-frame-received', {
      connectionId,
      frameData: message.frameData,
      timestamp: message.timestamp
    });
  }

  // 处理控制命令
  handleControlCommand(connectionId, message) {
    console.log(`🎮 控制命令: ${message.command}`);
    
    // 转发控制命令给UI层
    this.emit('control-command-received', {
      connectionId,
      command: message.command,
      data: message.data
    });
  }

  // 处理控制事件
  handleControlEvent(connectionId, message) {
    console.log(`🎮 控制事件: ${message.type}`);
    
    // 转发控制事件给UI层
    this.emit('control-event-received', {
      connectionId,
      eventData: message.data
    });
  }

  // 处理通知
  handleNotification(connectionId, message) {
    console.log(`🔔 通知: ${message.title}`);
    
    // 转发通知给UI层
    this.emit('notification-received', {
      connectionId,
      notification: message.notification
    });
  }

  // 处理剪贴板消息
  handleClipboardMessage(connectionId, message) {
    console.log(`📋 剪贴板同步`);
    
    // 转发剪贴板数据给UI层
    this.emit('clipboard-synced', {
      connectionId,
      clipboardData: message.data
    });
  }

  // 处理确认
  handleAck(connectionId, message) {
    this.emit('message-acknowledged', {
      connectionId,
      messageId: message.messageId
    });
  }

  // 发送消息给特定设备
  async sendMessageToDevice(deviceId, message) {
    const connection = this.getConnection(deviceId);
    if (!connection || !connection.socket) {
      throw new Error(`设备连接不存在: ${deviceId}`);
    }
    
    return this.sendMessage(deviceId, message);
  }

  // 发送消息
  sendMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.socket) {
      console.warn(`连接不存在: ${connectionId}`);
      return false;
    }

    try {
      // 添加消息ID和时间戳
      message.messageId = this.generateMessageId();
      message.timestamp = Date.now();

      // 序列化消息
      const messageStr = JSON.stringify(message) + '\n';
      const data = Buffer.from(messageStr);

      // 发送数据
      connection.socket.write(data);
      connection.bytesSent += data.length;

      return true;
    } catch (error) {
      console.error(`发送消息失败 ${connectionId}:`, error);
      return false;
    }
  }

  // 发送确认
  sendAck(connectionId, messageId) {
    return this.sendMessage(connectionId, {
      type: this.messageTypes.ACK,
      messageId: messageId
    });
  }

  // 发送错误
  sendError(connectionId, errorCode, errorMessage) {
    return this.sendMessage(connectionId, {
      type: this.messageTypes.ERROR,
      errorCode: errorCode,
      errorMessage: errorMessage
    });
  }

  // 处理连接关闭
  handleConnectionClose(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.emit('connection-closed', connection);
    }
  }

  // 处理连接错误
  handleConnectionError(connectionId, error) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.emit('connection-error', connection, error);
    }
  }

  // 连接到设备
  connectToDevice(deviceInfo) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const connectionId = this.generateConnectionId();

      console.log(`🔗 连接到设备: ${deviceInfo.name} (${deviceInfo.ip}:${deviceInfo.port})`);

      socket.on('connect', () => {
        console.log(`✅ 连接成功: ${connectionId}`);
        
        const connection = {
          id: connectionId,
          socket: socket,
          deviceInfo: deviceInfo,
          isAuthenticated: false,
          lastHeartbeat: Date.now(),
          messageCount: 0,
          bytesReceived: 0,
          bytesSent: 0,
          isClient: true
        };

        this.connections.set(connectionId, connection);

        // 发送设备信息
        this.sendMessage(connectionId, {
          type: this.messageTypes.DEVICE_INFO,
          deviceInfo: this.getServerDeviceInfo()
        });

        this.emit('connected-to-device', connection);
        resolve(connection);
      });

      socket.on('data', (data) => {
        this.handleDataReceived(connectionId, data);
      });

      socket.on('close', () => {
        console.log(`❌ 连接关闭: ${connectionId}`);
        this.handleConnectionClose(connectionId);
      });

      socket.on('error', (err) => {
        console.error(`连接错误 ${connectionId}:`, err);
        this.handleConnectionError(connectionId, err);
        reject(err);
      });

      // 建立连接
      socket.connect(deviceInfo.port, deviceInfo.ip);
    });
  }

  // 断开连接
  disconnectFromDevice(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket) {
      connection.socket.end();
      return true;
    }
    return false;
  }

  // 获取服务器设备信息
  getServerDeviceInfo() {
    const os = require('os');
    return {
      deviceId: this.generateDeviceId(),
      deviceName: 'Windows-PC',
      platform: 'windows',
      version: '1.0.0',
      ip: this.getLocalIP(),
      port: this.port,
      capabilities: [
        'file_transfer',
        'screen_mirror',
        'remote_control',
        'notification',
        'clipboard_sync'
      ],
      systemInfo: {
        os: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }
    };
  }

  // 获取本地IP地址
  getLocalIP() {
    const networkInterfaces = require('os').networkInterfaces();
    
    for (const [name, nets] of Object.entries(networkInterfaces)) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1';
  }

  // 生成连接ID
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成消息ID
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成设备ID
  generateDeviceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // 获取连接状态
  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  // 获取所有连接
  getAllConnections() {
    return Array.from(this.connections.values());
  }

  // 获取活跃连接
  getActiveConnections() {
    return Array.from(this.connections.values()).filter(conn => 
      conn.isAuthenticated && (Date.now() - conn.lastHeartbeat < 60000)
    );
  }

  // 心跳检查
  startHeartbeatCheck() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 120000; // 2分钟超时

      for (const [connectionId, connection] of this.connections.entries()) {
        if (now - connection.lastHeartbeat > timeout) {
          console.log(`心跳超时，断开连接: ${connectionId}`);
          this.disconnectFromDevice(connectionId);
        } else {
          // 发送心跳
          this.sendMessage(connectionId, {
            type: this.messageTypes.HEARTBEAT,
            timestamp: now
          });
        }
      }
    }, 30000); // 每30秒检查一次
  }

  // 停止心跳检查
  stopHeartbeatCheck() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 获取网络统计信息
  getNetworkStats() {
    const connections = this.getAllConnections();
    const activeConnections = this.getActiveConnections();
    
    const totalBytesReceived = connections.reduce((sum, conn) => sum + conn.bytesReceived, 0);
    const totalBytesSent = connections.reduce((sum, conn) => sum + conn.bytesSent, 0);
    const totalMessages = connections.reduce((sum, conn) => sum + conn.messageCount, 0);

    return {
      serverRunning: this.isServerRunning,
      serverPort: this.port,
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      totalBytesReceived,
      totalBytesSent,
      totalMessages,
      averageConnectionTime: this.calculateAverageConnectionTime()
    };
  }

  // 计算平均连接时间
  calculateAverageConnectionTime() {
    const completedConnections = this.completedConnections || [];
    if (completedConnections.length === 0) return 0;

    const totalTime = completedConnections.reduce((sum, conn) => 
      sum + (conn.endTime - conn.startTime), 0);
    
    return totalTime / completedConnections.length;
  }

  // 销毁实例
  destroy() {
    // 停止所有连接
    for (const connectionId of this.connections.keys()) {
      this.disconnectFromDevice(connectionId);
    }

    // 停止服务器
    this.stopServer();

    // 停止心跳检查
    this.stopHeartbeatCheck();

    console.log('🌐 网络通信模块已销毁');
  }
}

module.exports = NetworkCommunication;