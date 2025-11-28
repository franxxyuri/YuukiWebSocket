/**
 * WebSocket连接策略类
 * 实现WebSocket连接、消息发送和接收、事件处理等功能
 */

class WebSocketStrategy {
  constructor(serverUrl, options = {}) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    // 初始化事件和回调容器
    this.eventHandlers = new Map();
    this.messageCallbacks = new Map();
    this.requestId = 0;
    
    // 配置项
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.autoReconnect = options.autoReconnect !== undefined ? options.autoReconnect : true;
    this.messageTimeout = options.messageTimeout || 30000; // 30秒默认超时
  }

  /**
   * 建立WebSocket连接
   * @param {string} serverUrl - WebSocket服务器地址
   * @returns {Promise<void>}
   */
  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      try {
        // 如果提供了新的serverUrl，则更新
        if (serverUrl) {
          this.serverUrl = serverUrl;
        }

        // 确保当前没有活跃连接
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          console.warn('WebSocket已经连接');
          resolve();
          return;
        }

        // 创建新的WebSocket连接
        this.socket = new WebSocket(this.serverUrl);

        // 设置连接打开事件
        this.socket.onopen = () => {
          console.log('WebSocket连接已建立');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
          
          // 触发连接事件
          this.handleEvent('connect', {});
        };

        // 设置接收消息事件
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('收到WebSocket消息:', message);
            this.handleMessage(message);
          } catch (error) {
            console.error('解析WebSocket消息时出错:', error);
          }
        };

        // 设置连接关闭事件
        this.socket.onclose = (event) => {
          console.log('WebSocket连接已关闭', event);
          this.isConnected = false;
          this.handleEvent('disconnect', { code: event.code, reason: event.reason });
          
          // 尝试自动重连
          if (this.autoReconnect) {
            this.reconnect();
          }
        };

        // 设置连接错误事件
        this.socket.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          this.handleEvent('error', error);
          reject(error);
        };
      } catch (error) {
        console.error('初始化WebSocket连接时出错:', error);
        reject(error);
      }
    });
  }

  /**
   * 关闭WebSocket连接
   */
  disconnect() {
    if (this.socket) {
      console.log('关闭WebSocket连接');
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * 发送消息
   * @param {object} message - 要发送的消息对象
   */
  send(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接到服务器');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('发送WebSocket消息时出错:', error);
      return false;
    }
  }

  /**
   * 发送命令
   * @param {string} command - 命令名称
   * @param {object} params - 命令参数
   */
  sendCommand(command, params = {}) {
    return this.send({
      type: 'command',
      command,
      params
    });
  }

  /**
   * 获取连接状态
   * @returns {object} 连接状态对象
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      serverUrl: this.serverUrl,
      reconnectAttempts: this.reconnectAttempts,
      connectionType: 'websocket'
    };
  }

  /**
   * 检查是否已连接
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this.isConnected;
  }
  
  /**
   * 注册事件处理器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 事件处理器函数
   */
  on(eventName, handler) {
    if (!this.eventHandlers) {
      this.eventHandlers = new Map();
    }
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(handler);
  }

  /**
   * 移除事件处理器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 要移除的事件处理器
   */
  off(eventName, handler) {
    if (this.eventHandlers && this.eventHandlers.has(eventName)) {
      const handlers = this.eventHandlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 发送带回调的请求
   * @param {string} type - 请求类型
   * @param {object} data - 请求数据
   * @returns {Promise<object>} 包含响应的Promise
   */
  sendRequest(type, data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket未连接到服务器'));
    }

    const requestId = ++this.requestId;
    const message = {
      type: type,
      requestId: requestId,
      ...data
    };

    return new Promise((resolve, reject) => {
      // 存储回调
      this.messageCallbacks.set(requestId, (response) => {
        if (response.success !== false) {
          resolve(response);
        } else {
          reject(new Error(response.error || '请求失败'));
        }
      });

      // 发送消息
      this.socket.send(JSON.stringify(message));

      // 设置超时
      setTimeout(() => {
        if (this.messageCallbacks.has(requestId)) {
          this.messageCallbacks.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, this.messageTimeout);
    });
  }
  
  /**
   * 处理接收到的消息
   * @param {object} message - 解析后的消息对象
   */
  handleMessage(message) {
    // 检查是否是响应消息（有requestId和callback）
    if (message.requestId && this.messageCallbacks.has(message.requestId)) {
      const callback = this.messageCallbacks.get(message.requestId);
      this.messageCallbacks.delete(message.requestId);
      callback(message);
      return;
    }

    // 根据消息类型触发事件
    if (message.type) {
      this.handleEvent(message.type, message);
    }
  }
  
  /**
   * 处理事件触发
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  handleEvent(eventName, data) {
    const handlers = this.eventHandlers?.get(eventName) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`处理WebSocket事件 ${eventName} 时出错:`, error);
      }
    });
  }
  
  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    // 此方法可以在连接建立后调用，确保所有事件处理器正常工作
    console.log('WebSocket事件处理器已设置');
  }
  
  /**
   * 尝试重新连接
   */
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试WebSocket重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('WebSocket重连失败:', error);
        });
      }, this.reconnectDelay);
    }
  }
}

export default WebSocketStrategy;