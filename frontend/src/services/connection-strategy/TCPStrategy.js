/**
 * TCP连接策略类
 * 实现TCP连接、消息发送和接收、事件处理等功能
 */

import ConnectionStrategy from './ConnectionStrategy';

class TCPStrategy extends ConnectionStrategy {
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
    
    // TCP特定配置
    this.port = options.port || 8928;
    this.host = options.host || 'localhost';
    this.encoding = options.encoding || 'utf8';
  }

  /**
   * 建立TCP连接
   * @param {string} serverUrl - TCP服务器地址
   * @returns {Promise<void>}
   */
  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      try {
        // 如果提供了新的serverUrl，则解析并更新配置
        if (serverUrl) {
          this.serverUrl = serverUrl;
          // 解析URL格式：tcp://host:port
          const url = new URL(serverUrl);
          this.host = url.hostname;
          this.port = parseInt(url.port) || 8928;
        }

        // 确保当前没有活跃连接
        if (this.socket && this._isConnected) {
          console.warn('TCP已经连接');
          resolve();
          return;
        }

        // 创建TCP socket连接
        const net = require('net');
        this.socket = new net.Socket();

        // 设置连接选项
        this.socket.setEncoding(this.encoding);

        // 连接事件
        this.socket.connect(this.port, this.host, () => {
          console.log(`TCP连接已建立: ${this.host}:${this.port}`);
          this._isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
          
          // 触发连接事件
          this.handleEvent('connect', {});
        });

        // 接收数据事件
        this.socket.on('data', (data) => {
          try {
            // TCP数据可能分块，需要处理粘包问题
            const messages = this.handleDataChunk(data.toString());
            messages.forEach(message => {
              console.log('收到TCP消息:', message);
              this.handleMessage(JSON.parse(message));
            });
          } catch (error) {
            console.error('解析TCP消息时出错:', error);
          }
        });

        // 连接关闭事件
        this.socket.on('close', (hadError) => {
          console.log('TCP连接已关闭', hadError ? '（有错误）' : '');
          this._isConnected = false;
          this.handleEvent('disconnect', { hadError });
          
          // 尝试自动重连
          if (this.autoReconnect) {
            this.reconnect();
          }
        });

        // 连接错误事件
        this.socket.on('error', (error) => {
          console.error('TCP连接错误:', error);
          this.handleEvent('error', error);
          reject(error);
        });

        // 超时事件
        this.socket.on('timeout', () => {
          console.error('TCP连接超时');
          this.handleEvent('timeout', '连接超时');
        });

      } catch (error) {
        console.error('初始化TCP连接时出错:', error);
        reject(error);
      }
    });
  }

  /**
   * 处理TCP数据块，解决粘包问题
   * @param {string} data - 接收到的数据块
   * @returns {Array} 解析后的消息数组
   */
  handleDataChunk(data) {
    // 简单的粘包处理：假设每条消息以\n分隔
    if (!this.buffer) {
      this.buffer = '';
    }
    
    this.buffer += data;
    const messages = [];
    let newlineIndex;
    
    // 提取完整的消息
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const message = this.buffer.substring(0, newlineIndex);
      if (message.trim()) {
        messages.push(message);
      }
      this.buffer = this.buffer.substring(newlineIndex + 1);
    }
    
    return messages;
  }

  /**
   * 关闭TCP连接
   */
  disconnect() {
    if (this.socket) {
      console.log('关闭TCP连接');
      this.socket.destroy();
      this.socket = null;
      this.isConnected = false;
      this.buffer = '';
    }
  }

  /**
   * 发送消息
   * @param {object} message - 要发送的消息对象
   */
  send(message) {
    if (!this.socket || !this._isConnected) {
      console.error('TCP未连接到服务器');
      return false;
    }

    try {
      // TCP消息以\n结尾，便于接收端解析
      this.socket.write(JSON.stringify(message) + '\n');
      return true;
    } catch (error) {
      console.error('发送TCP消息时出错:', error);
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
      reconnectAttempts: this.reconnectAttempts,
      connectionType: 'tcp'
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
    if (!this.socket || !this._isConnected) {
      return Promise.reject(new Error('TCP未连接到服务器'));
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
      this.socket.write(JSON.stringify(message) + '\n');

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
        console.error(`处理TCP事件 ${eventName} 时出错:`, error);
      }
    });
  }
  
  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    // 此方法可以在连接建立后调用，确保所有事件处理器正常工作
    console.log('TCP事件处理器已设置');
  }
  
  /**
   * 尝试重新连接
   */
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试TCP重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('TCP重连失败:', error);
        });
      }, this.reconnectDelay);
    }
  }
}

export default TCPStrategy;