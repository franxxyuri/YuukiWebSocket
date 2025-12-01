/**
 * 模拟组件
 * 用于测试，提供模拟的依赖实现
 */

// 模拟WebSocket连接
class MockWebSocket {
  constructor() {
    this.readyState = this.OPEN;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.onopen = null;
    this.sentMessages = [];
    this.closed = false;
    this.error = null;
    this.eventListeners = {};
  }

  static get CONNECTING() { return 0; }
  static get OPEN() { return 1; }
  static get CLOSING() { return 2; }
  static get CLOSED() { return 3; }

  send(data) {
    if (this.readyState !== this.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(code, reason) {
    this.readyState = this.CLOSED;
    this.closed = true;
    if (this.onclose) {
      this.onclose({ code, reason });
    }
    // 调用事件监听器
    if (this.eventListeners.close) {
      this.eventListeners.close.forEach(listener => listener({ code, reason }));
    }
  }

  // 添加事件监听器
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    
    // 同时设置传统的on*属性，以兼容不同的WebSocket客户端实现
    if (event === 'message') {
      this.onmessage = callback;
    } else if (event === 'close') {
      this.onclose = callback;
    } else if (event === 'error') {
      this.onerror = callback;
    } else if (event === 'open') {
      this.onopen = callback;
    }
  }

  // 模拟接收消息
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
    // 调用事件监听器
    if (this.eventListeners.message) {
      this.eventListeners.message.forEach(listener => listener({ data }));
    }
  }

  // 模拟错误
  simulateError(error) {
    this.error = error;
    if (this.onerror) {
      this.onerror(error);
    }
    // 调用事件监听器
    if (this.eventListeners.error) {
      this.eventListeners.error.forEach(listener => listener(error));
    }
  }

  // 模拟连接打开
  simulateOpen() {
    if (this.onopen) {
      this.onopen();
    }
    // 调用事件监听器
    if (this.eventListeners.open) {
      this.eventListeners.open.forEach(listener => listener());
    }
  }
}

// 模拟WebSocket服务器
class MockWebSocketServer {
  constructor(options) {
    this.options = options;
    this.clients = new Set();
    this.onconnection = null;
    this.onerror = null;
    this.onclose = null;
    this.connections = [];
  }

  on(event, callback) {
    switch (event) {
      case 'connection':
        this.onconnection = callback;
        break;
      case 'error':
        this.onerror = callback;
        break;
      case 'close':
        this.onclose = callback;
        break;
    }
  }

  // 模拟新连接
  simulateConnection(ws, request) {
    this.connections.push(ws);
    if (this.onconnection) {
      this.onconnection(ws, request);
    }
  }

  close() {
    if (this.onclose) {
      this.onclose();
    }
  }
}

// 模拟客户端管理器
class MockClientManager {
  constructor() {
    this.clients = new Map();
    this.androidDevice = null;
    this.sentMessages = [];
    this.broadcastMessages = [];
    this.webBroadcastMessages = [];
    this.androidMessages = [];
  }

  addClient(ws, request) {
    const clientId = `mock-client-${Date.now()}`;
    this.clients.set(clientId, {
      ws,
      type: 'unknown',
      ip: request.socket.remoteAddress,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    });
    return clientId;
  }

  removeClient(clientId) {
    this.clients.delete(clientId);
  }

  getClient(clientId) {
    return this.clients.get(clientId);
  }

  getClients() {
    return this.clients;
  }

  getAndroidDevice() {
    return this.androidDevice;
  }

  updateClient(clientId, updates) {
    const client = this.clients.get(clientId);
    if (client) {
      Object.assign(client, updates);
      if (updates.platform === 'android') {
        this.androidDevice = {
          id: clientId,
          info: updates,
          ws: client.ws
        };
      }
    }
  }

  sendToClient(clientId, message, reliable = false) {
    this.sentMessages.push({ clientId, message, reliable });
    return true;
  }

  broadcastToWebClients(message, excludeClientId = null, reliable = false) {
    this.webBroadcastMessages.push({ message, excludeClientId, reliable });
    return this.clients.size;
  }

  broadcastToAllClients(message, excludeClientId = null, reliable = false) {
    this.broadcastMessages.push({ message, excludeClientId, reliable });
    return this.clients.size;
  }

  sendToAndroidDevice(message, reliable = false) {
    this.androidMessages.push({ message, reliable });
    return true;
  }

  updateLastActivity(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  getClientCount() {
    return this.clients.size;
  }

  cleanupInactiveClients(timeout = 300000) {
    return 0;
  }
}

// 模拟消息处理器
class MockMessageHandlers {
  constructor() {
    this.handledMessages = [];
  }

  async handleMessage(ws, clientId, message) {
    this.handledMessages.push({ ws, clientId, message });
  }
}

// 模拟HTTP请求
class MockRequest {
  constructor(options = {}) {
    this.method = options.method || 'GET';
    this.url = options.url || '/';
    this.headers = options.headers || {};
    this.body = options.body || null;
    this.socket = {
      remoteAddress: options.remoteAddress || '127.0.0.1'
    };
  }
}

// 模拟HTTP响应
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.sent = false;
    this.sentData = null;
    this.sentStatus = null;
  }

  setHeader(name, value) {
    this.headers[name] = value;
  }

  getHeader(name) {
    return this.headers[name];
  }

  status(code) {
    this.sentStatus = code;
    return this;
  }

  json(data) {
    this.sent = true;
    this.sentData = JSON.stringify(data);
    this.setHeader('Content-Type', 'application/json');
  }

  send(data) {
    this.sent = true;
    this.sentData = data;
  }

  end(data) {
    this.sent = true;
    if (data) {
      this.sentData = data;
    }
  }
}

// Mock数据生成器
class MockDataGenerator {
  constructor() {
    this.deviceTypes = ['android', 'windows', 'ios', 'web'];
    this.platforms = ['android', 'windows', 'ios', 'web'];
    this.connectionTypes = ['websocket', 'http', 'tcp', 'kcp', 'udp'];
    this.capabilities = ['file_transfer', 'screen_mirror', 'remote_control', 'notification', 'clipboard_sync'];
    this.statuses = ['connected', 'disconnected', 'connecting', 'disconnecting', 'error'];
    this.errorTypes = ['network_error', 'authentication_error', 'timeout', 'internal_error', 'invalid_request'];
  }

  // 生成随机设备ID
  generateDeviceId() {
    return `device-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
  }

  // 生成随机客户端ID
  generateClientId() {
    return `client-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
  }

  // 生成随机设备名称
  generateDeviceName(type) {
    const prefixes = {
      android: ['Android', 'Samsung', 'Google', 'Xiaomi', 'Huawei'],
      windows: ['Windows', 'PC', 'Laptop', 'Desktop'],
      ios: ['iPhone', 'iPad', 'iOS'],
      web: ['Web', 'Browser', 'Chrome', 'Firefox', 'Safari']
    };
    const prefix = prefixes[type] || prefixes.web;
    return `${prefix[Math.floor(Math.random() * prefix.length)]} ${Math.floor(Math.random() * 1000)}`;
  }

  // 生成随机IP地址
  generateIpAddress() {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }

  // 生成随机设备信息
  generateDeviceInfo(options = {}) {
    const type = options.type || this.deviceTypes[Math.floor(Math.random() * this.deviceTypes.length)];
    const platform = options.platform || this.platforms[Math.floor(Math.random() * this.platforms.length)];
    
    return {
      deviceId: options.deviceId || this.generateDeviceId(),
      deviceName: options.deviceName || this.generateDeviceName(type),
      type,
      platform,
      ip: options.ip || this.generateIpAddress(),
      port: options.port || Math.floor(Math.random() * 65535) + 1,
      status: options.status || this.statuses[Math.floor(Math.random() * this.statuses.length)],
      capabilities: options.capabilities || this.capabilities.slice(0, Math.floor(Math.random() * this.capabilities.length) + 1),
      connectionType: options.connectionType || this.connectionTypes[Math.floor(Math.random() * this.connectionTypes.length)],
      connectedAt: options.connectedAt || Date.now() - Math.floor(Math.random() * 3600000),
      lastSeen: options.lastSeen || Date.now(),
      version: options.version || `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
      manufacturer: options.manufacturer || ['Samsung', 'Google', 'Xiaomi', 'Huawei', 'Apple', 'Microsoft'][Math.floor(Math.random() * 6)],
      model: options.model || `Model-${Math.floor(Math.random() * 1000)}`
    };
  }

  // 生成随机客户端信息
  generateClientInfo(options = {}) {
    return {
      clientId: options.clientId || this.generateClientId(),
      type: options.type || this.deviceTypes[Math.floor(Math.random() * this.deviceTypes.length)],
      ip: options.ip || this.generateIpAddress(),
      connectedAt: options.connectedAt || Date.now() - Math.floor(Math.random() * 3600000),
      lastActivity: options.lastActivity || Date.now(),
      platform: options.platform || this.platforms[Math.floor(Math.random() * this.platforms.length)],
      connectionType: options.connectionType || this.connectionTypes[Math.floor(Math.random() * this.connectionTypes.length)],
      capabilities: options.capabilities || this.capabilities.slice(0, Math.floor(Math.random() * this.capabilities.length) + 1)
    };
  }

  // 生成随机错误信息
  generateErrorInfo(options = {}) {
    return {
      errorCode: options.errorCode || this.errorTypes[Math.floor(Math.random() * this.errorTypes.length)],
      errorMessage: options.errorMessage || `Mock error: ${Math.random().toString(36).substr(2, 9)}`,
      timestamp: options.timestamp || Date.now(),
      details: options.details || {
        requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
        retryable: options.retryable || Math.random() > 0.5,
        retryAfter: options.retryAfter || Math.floor(Math.random() * 10000) + 1000
      }
    };
  }

  // 生成随机消息
  generateMessage(options = {}) {
    const messageTypes = ['device_discovery', 'connection_request', 'data_transfer', 'command', 'response', 'error', 'heartbeat'];
    
    return {
      type: options.type || messageTypes[Math.floor(Math.random() * messageTypes.length)],
      timestamp: options.timestamp || Date.now(),
      data: options.data || {
        payload: `Mock payload: ${Math.random().toString(36).substr(2, 9)}`,
        sequence: Math.floor(Math.random() * 10000),
        correlationId: `corr-${Math.random().toString(36).substr(2, 9)}`
      },
      from: options.from || this.generateDeviceId(),
      to: options.to || this.generateDeviceId()
    };
  }

  // 生成随机测试结果
  generateTestResult(options = {}) {
    const testTypes = ['unit', 'integration', 'functional', 'performance', 'stress', 'security'];
    const testStatuses = ['pass', 'fail', 'skip', 'pending'];
    
    return {
      testId: options.testId || `test-${Math.random().toString(36).substr(2, 9)}`,
      testName: options.testName || `Mock Test ${Math.floor(Math.random() * 1000)}`,
      testType: options.testType || testTypes[Math.floor(Math.random() * testTypes.length)],
      status: options.status || testStatuses[Math.floor(Math.random() * testStatuses.length)],
      duration: options.duration || Math.floor(Math.random() * 10000) + 100,
      startTime: options.startTime || Date.now() - Math.floor(Math.random() * 3600000),
      endTime: options.endTime || Date.now(),
      error: options.error || (Math.random() > 0.8 ? this.generateErrorInfo() : null),
      assertions: options.assertions || {
        passed: Math.floor(Math.random() * 100) + 1,
        failed: Math.floor(Math.random() * 10),
        total: Math.floor(Math.random() * 100) + 1
      },
      details: options.details || {
        environment: {
          nodeVersion: 'v18.16.0',
          os: 'Windows 10',
          cpu: 'Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz',
          memory: '16 GB'
        },
        metadata: {
          buildId: `build-${Math.random().toString(36).substr(2, 9)}`,
          commitId: Math.random().toString(36).substr(2, 7),
          branch: 'main'
        }
      }
    };
  }

  // 生成随机配置
  generateConfig(options = {}) {
    return {
      server: {
        port: options.serverPort || Math.floor(Math.random() * 65535) + 1,
        host: options.serverHost || '0.0.0.0',
        name: options.serverName || 'Windows-Android Connect Server',
        version: options.serverVersion || `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`
      },
      discovery: {
        port: options.discoveryPort || Math.floor(Math.random() * 65535) + 1,
        broadcastInterval: options.broadcastInterval || Math.floor(Math.random() * 10000) + 1000
      },
      websocket: {
        maxConnections: options.maxConnections || Math.floor(Math.random() * 1000) + 100,
        pingInterval: options.pingInterval || Math.floor(Math.random() * 60000) + 10000,
        pingTimeout: options.pingTimeout || Math.floor(Math.random() * 120000) + 20000
      },
      features: {
        websocket: options.websocketEnabled !== undefined ? options.websocketEnabled : Math.random() > 0.1,
        deviceDiscovery: options.deviceDiscoveryEnabled !== undefined ? options.deviceDiscoveryEnabled : Math.random() > 0.1,
        fileTransfer: options.fileTransferEnabled !== undefined ? options.fileTransferEnabled : Math.random() > 0.1,
        screenMirror: options.screenMirrorEnabled !== undefined ? options.screenMirrorEnabled : Math.random() > 0.1,
        remoteControl: options.remoteControlEnabled !== undefined ? options.remoteControlEnabled : Math.random() > 0.1
      }
    };
  }

  // 生成随机系统状态
  generateSystemStatus(options = {}) {
    return {
      server: {
        status: options.serverStatus || this.statuses[Math.floor(Math.random() * this.statuses.length)],
        uptime: options.uptime || Math.floor(Math.random() * 86400000),
        cpuUsage: options.cpuUsage || Math.floor(Math.random() * 100),
        memoryUsage: options.memoryUsage || Math.floor(Math.random() * 100),
        diskUsage: options.diskUsage || Math.floor(Math.random() * 100),
        networkTraffic: {
          incoming: options.incomingTraffic || Math.floor(Math.random() * 1000000),
          outgoing: options.outgoingTraffic || Math.floor(Math.random() * 1000000)
        }
      },
      services: {
        websocket: {
          status: options.websocketStatus || this.statuses[Math.floor(Math.random() * this.statuses.length)],
          connections: options.websocketConnections || Math.floor(Math.random() * 100)
        },
        discovery: {
          status: options.discoveryStatus || this.statuses[Math.floor(Math.random() * this.statuses.length)],
          broadcastCount: options.broadcastCount || Math.floor(Math.random() * 1000)
        },
        fileTransfer: {
          status: options.fileTransferStatus || this.statuses[Math.floor(Math.random() * this.statuses.length)],
          activeTransfers: options.activeTransfers || Math.floor(Math.random() * 10)
        }
      },
      devices: {
        total: options.totalDevices || Math.floor(Math.random() * 100),
        connected: options.connectedDevices || Math.floor(Math.random() * 50),
        disconnected: options.disconnectedDevices || Math.floor(Math.random() * 50)
      },
      timestamp: Date.now()
    };
  }

  // 生成随机文件信息
  generateFileInfo(options = {}) {
    const fileTypes = ['image', 'video', 'audio', 'document', 'archive', 'other'];
    const fileExtensions = {
      image: ['jpg', 'png', 'gif', 'bmp', 'webp'],
      video: ['mp4', 'avi', 'mov', 'mkv', 'flv'],
      audio: ['mp3', 'wav', 'ogg', 'flac', 'aac'],
      document: ['txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz'],
      other: ['exe', 'dll', 'bin', 'dat']
    };
    
    const type = options.type || fileTypes[Math.floor(Math.random() * fileTypes.length)];
    const extension = options.extension || fileExtensions[type][Math.floor(Math.random() * fileExtensions[type].length)];
    
    return {
      fileName: options.fileName || `file-${Math.floor(Math.random() * 10000)}.${extension}`,
      type,
      extension,
      size: options.size || Math.floor(Math.random() * 1024 * 1024 * 100), // 0-100MB
      path: options.path || `/files/${Math.floor(Math.random() * 1000)}/${Math.floor(Math.random() * 1000)}.${extension}`,
      createdAt: options.createdAt || Date.now() - Math.floor(Math.random() * 3600000 * 24 * 30),
      modifiedAt: options.modifiedAt || Date.now() - Math.floor(Math.random() * 3600000 * 24 * 7),
      owner: options.owner || this.generateDeviceId(),
      checksum: options.checksum || Math.random().toString(36).substr(2, 32)
    };
  }
}

// Mock自测服务
class MockSelfTestService {
  constructor() {
    this.dataGenerator = new MockDataGenerator();
    this.testResults = [];
    this.mockDevices = [];
    this.mockClients = [];
    this.mockMessages = [];
    this.isRunning = false;
  }

  // 生成多个设备信息
  generateDevices(count = 5) {
    this.mockDevices = [];
    for (let i = 0; i < count; i++) {
      this.mockDevices.push(this.dataGenerator.generateDeviceInfo());
    }
    return this.mockDevices;
  }

  // 生成多个客户端信息
  generateClients(count = 5) {
    this.mockClients = [];
    for (let i = 0; i < count; i++) {
      this.mockClients.push(this.dataGenerator.generateClientInfo());
    }
    return this.mockClients;
  }

  // 生成多个测试结果
  generateTestResults(count = 10) {
    this.testResults = [];
    for (let i = 0; i < count; i++) {
      this.testResults.push(this.dataGenerator.generateTestResult());
    }
    return this.testResults;
  }

  // 生成多个消息
  generateMessages(count = 20) {
    this.mockMessages = [];
    for (let i = 0; i < count; i++) {
      this.mockMessages.push(this.dataGenerator.generateMessage());
    }
    return this.mockMessages;
  }

  // 运行模拟自测
  async runMockSelfTest(options = {}) {
    this.isRunning = true;
    
    const testResults = [];
    const testCount = options.testCount || 10;
    const delay = options.delay || 100;
    
    // 模拟测试执行
    for (let i = 0; i < testCount; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const testResult = this.dataGenerator.generateTestResult({
        testName: `Mock Test ${i + 1}`,
        status: Math.random() > 0.2 ? 'pass' : 'fail' // 80% pass rate
      });
      
      testResults.push(testResult);
    }
    
    this.testResults = testResults;
    this.isRunning = false;
    
    return {
      success: true,
      testCount: testCount,
      passed: testResults.filter(result => result.status === 'pass').length,
      failed: testResults.filter(result => result.status === 'fail').length,
      skipped: testResults.filter(result => result.status === 'skip').length,
      duration: testResults.reduce((sum, result) => sum + result.duration, 0),
      results: testResults,
      timestamp: Date.now()
    };
  }

  // 模拟设备连接
  simulateDeviceConnection(deviceInfo = {}) {
    const device = this.dataGenerator.generateDeviceInfo({
      status: 'connected',
      ...deviceInfo
    });
    this.mockDevices.push(device);
    return device;
  }

  // 模拟设备断开连接
  simulateDeviceDisconnection(deviceId) {
    const device = this.mockDevices.find(d => d.deviceId === deviceId);
    if (device) {
      device.status = 'disconnected';
      device.lastSeen = Date.now();
      return device;
    }
    return null;
  }

  // 模拟设备发现
  simulateDeviceDiscovery(count = 3) {
    const discoveredDevices = [];
    for (let i = 0; i < count; i++) {
      const device = this.dataGenerator.generateDeviceInfo({
        status: 'discovered',
        lastSeen: Date.now()
      });
      this.mockDevices.push(device);
      discoveredDevices.push(device);
    }
    return discoveredDevices;
  }

  // 模拟错误场景
  simulateErrorScenario(errorType) {
    const errorInfo = this.dataGenerator.generateErrorInfo({ errorCode: errorType });
    return {
      success: false,
      error: errorInfo,
      timestamp: Date.now()
    };
  }

  // 模拟高负载场景
  simulateHighLoad(options = {}) {
    const loadLevel = options.loadLevel || Math.floor(Math.random() * 5) + 1; // 1-5
    const clientCount = options.clientCount || loadLevel * 20;
    const messageCount = options.messageCount || loadLevel * 100;
    
    this.generateClients(clientCount);
    this.generateMessages(messageCount);
    
    const systemStatus = this.dataGenerator.generateSystemStatus({
      serverStatus: 'connected',
      serverCpuUsage: 50 + loadLevel * 10,
      serverMemoryUsage: 60 + loadLevel * 8,
      websocketConnections: clientCount,
      totalDevices: clientCount,
      connectedDevices: clientCount
    });
    
    return {
      success: true,
      loadLevel: loadLevel,
      clientCount: clientCount,
      messageCount: messageCount,
      systemStatus: systemStatus,
      timestamp: Date.now()
    };
  }

  // 重置所有模拟数据
  reset() {
    this.mockDevices = [];
    this.mockClients = [];
    this.mockMessages = [];
    this.testResults = [];
    this.isRunning = false;
    
    return {
      success: true,
      message: '所有模拟数据已重置',
      timestamp: Date.now()
    };
  }

  // 获取当前模拟状态
  getMockStatus() {
    return {
      isRunning: this.isRunning,
      devices: {
        total: this.mockDevices.length,
        connected: this.mockDevices.filter(d => d.status === 'connected').length,
        disconnected: this.mockDevices.filter(d => d.status === 'disconnected').length
      },
      clients: this.mockClients.length,
      messages: this.mockMessages.length,
      testResults: this.testResults.length,
      timestamp: Date.now()
    };
  }
}

// 创建单例实例
const mockDataGenerator = new MockDataGenerator();
const mockSelfTestService = new MockSelfTestService();

export {
  MockWebSocket,
  MockWebSocketServer,
  MockClientManager,
  MockMessageHandlers,
  MockRequest,
  MockResponse,
  MockDataGenerator,
  MockSelfTestService,
  mockDataGenerator,
  mockSelfTestService
};
