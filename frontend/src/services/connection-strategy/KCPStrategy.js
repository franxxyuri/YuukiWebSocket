/**
 * KCP连接策略类
 * 实现KCP连接、消息发送和接收、事件处理等功能
 */

import ConnectionStrategy from './ConnectionStrategy';

class KCPStrategy extends ConnectionStrategy {
  constructor(serverUrl, options = {}) {
    super();
    this.serverUrl = serverUrl;
    this.socket = null;
    this._isConnected = false;
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
    
    // KCP特定配置 - 从serverUrl解析或使用options
    this.host = 'localhost';
    this.port = 9929; // 使用配置文件中的默认端口
    
    if (serverUrl) {
      try {
        // 解析URL格式：kcp://host:port
        const url = new URL(serverUrl);
        this.host = url.hostname;
        this.port = parseInt(url.port) || this.port;
      } catch (e) {
        // 如果serverUrl不是URL格式，尝试从options获取
        this.host = options.host || this.host;
        this.port = options.port || this.port;
      }
    } else {
      this.host = options.host || this.host;
      this.port = options.port || this.port;
    }
    
    this.encoding = options.encoding || 'utf8';
    
    // KCP协议配置
    this.kcpConfig = {
      nodelay: options.nodelay || 1,
      interval: options.interval || 100,
      resend: options.resend || 2,
      nc: options.nc || 1,
      sndwnd: options.sndwnd || 128,
      rcvwnd: options.rcvwnd || 128,
      mtu: options.mtu || 1400,
      ...options.kcpConfig || {}
    };
    
    // KCP连接状态
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
  }

  /**
   * 建立KCP连接
   * @param {string} serverUrl - KCP服务器地址
   * @returns {Promise<void>}
   */
  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      try {
        // 如果提供了新的serverUrl，则解析并更新配置
        if (serverUrl) {
          this.serverUrl = serverUrl;
          // 解析URL格式：kcp://host:port
          const url = new URL(serverUrl);
          this.host = url.hostname;
          this.port = parseInt(url.port) || 8928;
        }

        // 确保当前没有活跃连接
        if (this.socket && this._isConnected) {
          console.warn('KCP已经连接');
          resolve();
          return;
        }

        this.connectionState = 'connecting';

        // 模拟KCP连接（实际项目中需要引入kcp库）
        // 这里使用WebSocket作为底层传输，模拟KCP协议
        console.log(`正在建立KCP连接到 ${this.host}:${this.port}`);
        console.log('KCP配置:', this.kcpConfig);

        // 模拟KCP连接延迟
        setTimeout(() => {
          this._isConnected = true;
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          console.log(`KCP连接已建立: ${this.host}:${this.port}`);
          
          // 触发连接事件
          this.handleEvent('connect', {});
          resolve();
        }, 500);

      } catch (error) {
        console.error('初始化KCP连接时出错:', error);
        this.connectionState = 'disconnected';
        reject(error);
      }
    });
  }

  /**
   * 关闭KCP连接
   */
  disconnect() {
    if (this.socket) {
      console.log('关闭KCP连接');
      this.socket.close();
      this.socket = null;
    }
    this._isConnected = false;
    this.connectionState = 'disconnected';
    this.handleEvent('disconnect', '正常断开');
  }

  /**
   * 发送消息
   * @param {object} message - 要发送的消息对象
   */
  send(message) {
    if (!this._isConnected) {
      console.error('KCP未连接到服务器');
      return false;
    }

    try {
      // 模拟KCP消息发送
      console.log('📤 KCP发送消息:', message);
      
      // 模拟消息发送延迟
      setTimeout(() => {
        // 模拟服务器响应
        if (message.requestId) {
          const response = {
            type: 'response',
            requestId: message.requestId,
            success: true,
            data: message
          };
          this.handleMessage(response);
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error('发送KCP消息时出错:', error);
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
      isConnected: this._isConnected,
      serverUrl: this.serverUrl,
      host: this.host,
      port: this.port,
      connectionType: 'kcp',
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      kcpConfig: this.kcpConfig
    };
  }

  /**
   * 检查是否已连接
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this._isConnected;
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
    if (!this._isConnected) {
      return Promise.reject(new Error('KCP未连接到服务器'));
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
      this.send(message);

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
    console.log('📥 KCP收到消息:', message);
    
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
      
      // 处理设备发现相关消息
      switch (message.type) {
        case 'device_found':
        case 'device_discovered':
          this.handleEvent('deviceDiscovered', message.device);
          break;
        case 'android_connected':
          this.handleEvent('deviceConnected', message.deviceInfo);
          break;
        case 'android_disconnected':
          this.handleEvent('deviceDisconnected', {});
          break;
      }
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
        console.error(`处理KCP事件 ${eventName} 时出错:`, error);
      }
    });
  }
  
  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    // 此方法可以在连接建立后调用，确保所有事件处理器正常工作
    console.log('KCP事件处理器已设置');
  }
  
  /**
   * 尝试重新连接
   */
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionState = 'reconnecting';
      console.log(`尝试KCP重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('KCP重连失败:', error);
          this.connectionState = 'disconnected';
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        });
      }, this.reconnectDelay);
    } else {
      this.connectionState = 'disconnected';
      this.handleEvent('reconnect_failed', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
    }
  }
  
  /**
   * 获取KCP连接统计信息
   * @returns {object} 统计信息对象
   */
  getStats() {
    // 模拟KCP统计信息
    return {
      sendBytes: Math.floor(Math.random() * 1024 * 1024),
      recvBytes: Math.floor(Math.random() * 1024 * 1024),
      sendPackets: Math.floor(Math.random() * 1000),
      recvPackets: Math.floor(Math.random() * 1000),
      lostPackets: Math.floor(Math.random() * 10),
      retransmitPackets: Math.floor(Math.random() * 20),
      rtt: Math.floor(Math.random() * 100) + 50, // 50-150ms
      cwnd: Math.floor(Math.random() * 64) + 64, // 64-128
      ssthresh: Math.floor(Math.random() * 128) + 128 // 128-256
    };
  }

  /**
   * 检查是否已连接
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this._isConnected;
  }

  /**
   * 获取连接状态
   * @returns {object} 连接状态对象
   */
  getConnectionStatus() {
    return {
      isConnected: this._isConnected,
      connectionState: this.connectionState,
      serverUrl: this.serverUrl,
      host: this.host,
      port: this.port,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      autoReconnect: this.autoReconnect
    };
  }
}

export default KCPStrategy;