// WebSocketService.js
// 模拟WebSocket服务，用于前端调试和测试

class WebSocketService {
  constructor() {
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.messageQueue = [];
    this.autoReconnect = true;
    this.simulationDelay = 100;
    
    // 模拟服务器消息队列
    this.serverMessageQueue = [];
    
    // 预设的模拟响应
    this.mockResponses = {
      ping: {
        type: 'pong',
        data: { timestamp: Date.now() }
      },
      getDevices: {
        type: 'deviceList',
        data: [
          { id: 'android-001', type: 'Android', name: 'Pixel 7', ip: '192.168.1.101', status: 'connected' },
          { id: 'windows-001', type: 'Windows', name: 'Desktop PC', ip: '192.168.1.102', status: 'connected' },
          { id: 'android-002', type: 'Android', name: 'Samsung Galaxy', ip: '192.168.1.103', status: 'disconnected' },
        ]
      },
      getStatus: {
        type: 'systemStatus',
        data: {
          cpuUsage: 12,
          memoryUsage: 256,
          networkLatency: 8,
          uptime: '2h 15m'
        }
      }
    };
  }

  /**
   * 连接到模拟WebSocket服务器
   * @param {string} url - WebSocket URL（模拟使用）
   */
  connect(url = 'ws://localhost:8928') {
    console.log(`[WebSocketService] 尝试连接到 ${url}`);
    
    // 模拟连接延迟
    setTimeout(() => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // 触发连接成功事件
      this.emit('open', { type: 'open', target: this });
      this.emit('connected', { url });
      
      // 处理队列中的消息
      this.flushMessageQueue();
      
      // 开始模拟服务器消息推送
      this.startSimulatedServerMessages();
    }, this.simulationDelay);
    
    return this;
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.isConnected = false;
    this.emit('close', { type: 'close', target: this });
    this.emit('disconnected', {});
    this.stopSimulatedServerMessages();
    return this;
  }

  /**
   * 发送消息
   * @param {Object|string} message - 要发送的消息
   */
  send(message) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (!this.isConnected) {
      // 如果未连接，将消息加入队列
      this.messageQueue.push(messageStr);
      console.warn(`[WebSocketService] 消息已加入队列（当前未连接）: ${messageStr}`);
      return false;
    }
    
    console.log(`[WebSocketService] 发送消息: ${messageStr}`);
    
    // 模拟发送延迟
    setTimeout(() => {
      // 触发发送事件
      this.emit('messageSent', { data: messageStr });
      
      // 处理模拟响应
      this.handleMockResponse(message);
    }, this.simulationDelay);
    
    return true;
  }

  /**
   * 处理模拟响应
   * @param {Object|string} message - 原始消息
   */
  handleMockResponse(message) {
    const msgObj = typeof message === 'string' ? JSON.parse(message) : message;
    const responseType = msgObj.type || msgObj.action;
    
    if (this.mockResponses[responseType]) {
      // 模拟服务器响应延迟
      setTimeout(() => {
        const response = this.mockResponses[responseType];
        this.receiveMessage(response);
      }, this.simulationDelay * 2);
    }
  }

  /**
   * 模拟接收服务器消息
   * @param {Object} message - 接收到的消息
   */
  receiveMessage(message) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`[WebSocketService] 接收消息: ${messageStr}`);
    
    // 触发消息接收事件
    this.emit('message', { data: messageStr });
    this.emit('dataReceived', message);
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数（可选，如果不提供则移除所有该事件的监听器）
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return this;
    
    if (callback) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
    
    return this;
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {Object} data - 事件数据
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WebSocketService] 事件回调执行错误 (${event}):`, error);
      }
    });
  }

  /**
   * 刷新消息队列
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * 重新连接
   */
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketService] 达到最大重连次数');
      this.emit('reconnectFailed', { attempts: this.reconnectAttempts });
      return false;
    }
    
    this.reconnectAttempts++;
    console.log(`[WebSocketService] 第 ${this.reconnectAttempts} 次尝试重连...`);
    
    this.emit('reconnecting', { attempts: this.reconnectAttempts });
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
    
    return true;
  }

  /**
   * 设置自动重连
   * @param {boolean} enabled - 是否启用自动重连
   */
  setAutoReconnect(enabled) {
    this.autoReconnect = enabled;
    return this;
  }

  /**
   * 设置重连间隔
   * @param {number} interval - 重连间隔（毫秒）
   */
  setReconnectInterval(interval) {
    this.reconnectInterval = interval;
    return this;
  }

  /**
   * 设置最大重连次数
   * @param {number} attempts - 最大重连次数
   */
  setMaxReconnectAttempts(attempts) {
    this.maxReconnectAttempts = attempts;
    return this;
  }

  /**
   * 添加模拟响应
   * @param {string} requestType - 请求类型
   * @param {Object} response - 响应内容
   */
  addMockResponse(requestType, response) {
    this.mockResponses[requestType] = response;
    return this;
  }

  /**
   * 移除模拟响应
   * @param {string} requestType - 请求类型
   */
  removeMockResponse(requestType) {
    delete this.mockResponses[requestType];
    return this;
  }

  /**
   * 开始模拟服务器消息推送
   */
  startSimulatedServerMessages() {
    this.serverMessageInterval = setInterval(() => {
      if (this.isConnected) {
        this.simulateServerMessage();
      }
    }, 5000); // 每5秒模拟一次服务器推送
  }

  /**
   * 停止模拟服务器消息推送
   */
  stopSimulatedServerMessages() {
    if (this.serverMessageInterval) {
      clearInterval(this.serverMessageInterval);
      this.serverMessageInterval = null;
    }
  }

  /**
   * 模拟服务器消息
   */
  simulateServerMessage() {
    const messageTypes = [
      // 状态更新消息
      () => ({
        type: 'statusUpdate',
        data: {
          timestamp: Date.now(),
          cpuUsage: Math.floor(Math.random() * 100),
          memoryUsage: Math.floor(Math.random() * 512) + 128,
          networkLatency: Math.floor(Math.random() * 50) + 5
        }
      }),
      
      // 设备状态变化消息
      () => {
        const statuses = ['connected', 'disconnected'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        return {
          type: 'deviceStatusChange',
          data: {
            deviceId: `device-${Math.floor(Math.random() * 1000)}`,
            status: randomStatus,
            timestamp: Date.now()
          }
        };
      },
      
      // 系统通知消息
      () => {
        const notifications = [
          '系统运行正常',
          '检测到新的网络连接',
          '服务器负载适中',
          '数据库备份完成'
        ];
        
        return {
          type: 'notification',
          data: {
            message: notifications[Math.floor(Math.random() * notifications.length)],
            level: 'info',
            timestamp: Date.now()
          }
        };
      },
      
      // 心跳消息
      () => ({
        type: 'ping',
        data: {
          timestamp: Date.now()
        }
      })
    ];
    
    // 随机选择一种消息类型
    const messageGenerator = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    const serverMessage = messageGenerator();
    
    this.receiveMessage(serverMessage);
  }

  /**
   * 获取连接状态
   * @returns {boolean} 连接状态
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * 获取连接信息
   * @returns {Object} 连接信息
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      messageQueueLength: this.messageQueue.length,
      autoReconnect: this.autoReconnect,
      connectedTime: this.connectedTime
    };
  }

  /**
   * 模拟网络错误
   */
  simulateNetworkError() {
    console.log('[WebSocketService] 模拟网络错误');
    this.disconnect();
    this.emit('error', { type: 'error', error: new Error('Network error simulation') });
    
    // 如果启用了自动重连，尝试重连
    if (this.autoReconnect) {
      setTimeout(() => this.reconnect(), this.reconnectInterval);
    }
  }

  /**
   * 模拟服务器响应延迟
   */
  simulateLatency(milliseconds) {
    this.simulationDelay = milliseconds;
    return this;
  }

  /**
   * 清除所有监听器
   */
  clearListeners() {
    this.listeners.clear();
    return this;
  }
}

// 创建单例实例
const wsService = new WebSocketService();

export default wsService;