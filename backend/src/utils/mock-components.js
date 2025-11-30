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

export {
  MockWebSocket,
  MockWebSocketServer,
  MockClientManager,
  MockMessageHandlers,
  MockRequest,
  MockResponse
};
