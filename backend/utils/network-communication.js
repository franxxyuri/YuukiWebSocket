const net = require('net');
const crypto = require('crypto');
const EventEmitter = require('events');

class NetworkCommunication extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.server = null;
    this.isServerRunning = false;
    this.port = 8826;
    
    // Security key (in actual application should read from config file)
    this.secretKey = crypto.randomBytes(32);
    
    // Supported message types
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

  // Start server
  async startServer(port = this.port) {
    if (this.isServerRunning) {
      console.log('Server already running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleNewConnection(socket);
      });

      this.server.on('error', (err) => {
        console.error('Server startup failed:', err);
        reject(err);
      });

      this.server.listen(port, () => {
        this.isServerRunning = true;
        this.port = port;
        console.log(`Server started, listening on port ${port}`);
        resolve();
      });
    });
  }

  // Stop server
  stopServer() {
    if (this.server && this.isServerRunning) {
      this.server.close(() => {
        this.isServerRunning = false;
        console.log('Server stopped');
        this.emit('server-stopped');
      });
    }
  }

  // Handle new connection
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

    console.log(`New connection established: ${connectionId}`);

    // Handle data reception
    socket.on('data', (data) => {
      this.handleDataReceived(connectionId, data);
    });

    // Handle connection close
    socket.on('close', () => {
      console.log(`Connection closed: ${connectionId}`);
      this.handleConnectionClose(connectionId);
    });

    // Handle errors
    socket.on('error', (err) => {
      console.error(`Connection error ${connectionId}:`, err);
      this.handleConnectionError(connectionId, err);
    });

    // Send connection confirmation
    this.sendMessage(connectionId, {
      type: 'connection_established',
      connectionId: connectionId,
      serverTime: Date.now()
    });

    this.emit('connection-established', connectionInfo);
  }

  // Handle received data
  handleDataReceived(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      connection.bytesReceived += data.length;

      // Parse JSON message
      const messageStr = data.toString();
      const messages = messageStr.split('\n').filter(msg => msg.trim());

      for (const messageStr of messages) {
        try {
          const message = JSON.parse(messageStr);
          this.processMessage(connectionId, message);
        } catch (parseError) {
          console.error(`Failed to parse message ${connectionId}:`, parseError);
          this.sendError(connectionId, 'invalid_message', 'Invalid message format');
        }
      }
    } catch (error) {
      console.error(`Failed to process data ${connectionId}:`, error);
    }
  }

  // Process message
  processMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.messageCount++;

    console.log(`Received message ${connectionId}:`, message.type);

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
        console.warn(`Unknown message type: ${message.type}`);
        this.sendError(connectionId, 'unknown_message_type', 'Unknown message type');
    }
  }

  // Handle device info
  handleDeviceInfo(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.deviceInfo = message.deviceInfo;
    connection.isAuthenticated = true;

    console.log(`Device authentication successful: ${message.deviceInfo.name} (${message.deviceInfo.platform})`);

    // Send authentication success confirmation
    this.sendMessage(connectionId, {
      type: 'authentication_success',
      serverDeviceInfo: this.getServerDeviceInfo()
    });

    this.emit('device-authenticated', connection);
  }

  // Handle heartbeat
  handleHeartbeat(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastHeartbeat = Date.now();

    // Respond to heartbeat
    this.sendMessage(connectionId, {
      type: this.messageTypes.HEARTBEAT,
      timestamp: Date.now()
    });
  }

  // Handle file transfer
  handleFileTransfer(connectionId, message) {
    console.log(`File transfer request: ${message.fileName}`);
    
    // Forward to UI layer for processing
    this.emit('file-transfer-request', {
      connectionId,
      ...message
    });
  }

  // Handle screen frame
  handleScreenFrame(connectionId, message) {
    // Forward screen frame data to UI layer
    this.emit('screen-frame-received', {
      connectionId,
      frameData: message.frameData,
      timestamp: message.timestamp
    });
  }

  // Handle control command
  handleControlCommand(connectionId, message) {
    console.log(`Control command: ${message.command}`);
    
    // Forward control command to UI layer
    this.emit('control-command-received', {
      connectionId,
      command: message.command,
      data: message.data
    });
  }

  // Handle control event
  handleControlEvent(connectionId, message) {
    console.log(`Control event: ${message.type}`);
    
    // Forward control event to UI layer
    this.emit('control-event-received', {
      connectionId,
      eventData: message.data
    });
  }

  // Handle notification
  handleNotification(connectionId, message) {
    console.log(`Notification: ${message.title}`);
    
    // Forward notification to UI layer
    this.emit('notification-received', {
      connectionId,
      notification: message.notification
    });
  }

  // Handle clipboard message
  handleClipboardMessage(connectionId, message) {
    console.log(`Clipboard sync`);
    
    // Forward clipboard data to UI layer
    this.emit('clipboard-synced', {
      connectionId,
      clipboardData: message.data
    });
  }

  // Handle acknowledgment
  handleAck(connectionId, message) {
    this.emit('message-acknowledged', {
      connectionId,
      messageId: message.messageId
    });
  }

  // Send message to specific device
  async sendMessageToDevice(deviceId, message) {
    const connection = this.getConnection(deviceId);
    if (!connection || !connection.socket) {
      throw new Error(`Device connection does not exist: ${deviceId}`);
    }
    
    return this.sendMessage(deviceId, message);
  }

  // Send message
  sendMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.socket) {
      console.warn(`Connection does not exist: ${connectionId}`);
      return false;
    }

    try {
      // Add message ID and timestamp
      message.messageId = this.generateMessageId();
      message.timestamp = Date.now();

      // Serialize message
      const messageStr = JSON.stringify(message) + '\n';
      const data = Buffer.from(messageStr);

      // Send data
      connection.socket.write(data);
      connection.bytesSent += data.length;

      return true;
    } catch (error) {
      console.error(`Failed to send message ${connectionId}:`, error);
      return false;
    }
  }

  // Send acknowledgment
  sendAck(connectionId, messageId) {
    return this.sendMessage(connectionId, {
      type: this.messageTypes.ACK,
      messageId: messageId
    });
  }

  // Send error
  sendError(connectionId, errorCode, errorMessage) {
    return this.sendMessage(connectionId, {
      type: this.messageTypes.ERROR,
      errorCode: errorCode,
      errorMessage: errorMessage
    });
  }

  // Handle connection close
  handleConnectionClose(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.emit('connection-closed', connection);
    }
  }

  // Handle connection error
  handleConnectionError(connectionId, error) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.emit('connection-error', connection, error);
    }
  }

  // Connect to device
  connectToDevice(deviceInfo) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const connectionId = this.generateConnectionId();

      console.log(`Connecting to device: ${deviceInfo.name} (${deviceInfo.ip}:${deviceInfo.port})`);

      socket.on('connect', () => {
        console.log(`Connection successful: ${connectionId}`);
        
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

        // Send device info
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
        console.log(`Connection closed: ${connectionId}`);
        this.handleConnectionClose(connectionId);
      });

      socket.on('error', (err) => {
        console.error(`Connection error ${connectionId}:`, err);
        this.handleConnectionError(connectionId, err);
        reject(err);
      });

      // Establish connection
      socket.connect(deviceInfo.port, deviceInfo.ip);
    });
  }

  // Disconnect from device
  disconnectFromDevice(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket) {
      connection.socket.end();
      return true;
    }
    return false;
  }

  // Get server device info
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

  // Get local IP address
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

  // Generate connection ID
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate message ID
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate device ID
  generateDeviceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Get connection status
  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  // Get all connections
  getAllConnections() {
    return Array.from(this.connections.values());
  }

  // Get active connections
  getActiveConnections() {
    return Array.from(this.connections.values()).filter(conn => 
      conn.isAuthenticated && (Date.now() - conn.lastHeartbeat < 60000)
    );
  }

  // Heartbeat check
  startHeartbeatCheck() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 120000; // 2 minute timeout

      for (const [connectionId, connection] of this.connections.entries()) {
        if (now - connection.lastHeartbeat > timeout) {
          console.log(`Heartbeat timeout, disconnecting: ${connectionId}`);
          this.disconnectFromDevice(connectionId);
        } else {
          // Send heartbeat
          this.sendMessage(connectionId, {
            type: this.messageTypes.HEARTBEAT,
            timestamp: now
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // Stop heartbeat check
  stopHeartbeatCheck() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Get network stats
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

  // Calculate average connection time
  calculateAverageConnectionTime() {
    const completedConnections = this.completedConnections || [];
    if (completedConnections.length === 0) return 0;

    const totalTime = completedConnections.reduce((sum, conn) => 
      sum + (conn.endTime - conn.startTime), 0);
    
    return totalTime / completedConnections.length;
  }

  // Destroy instance
  destroy() {
    // Stop all connections
    for (const connectionId of this.connections.keys()) {
      this.disconnectFromDevice(connectionId);
    }

    // Stop server
    this.stopServer();

    // Stop heartbeat check
    this.stopHeartbeatCheck();

    console.log('Network communication module destroyed');
  }
}

module.exports = NetworkCommunication;