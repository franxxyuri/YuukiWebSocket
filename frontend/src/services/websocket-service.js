// WebSocket服务，处理前端与后端的实时通信
class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.reconnectTimer = null;
    this.url = null;
    this.pendingMessages = [];
    this.connectionCallbacks = {
      onOpen: null,
      onClose: null,
      onError: null,
      onReconnectFailed: null
    };
    this.heartbeatInterval = null;
    this.heartbeatTimeout = 30000; // 30秒心跳
  }

  // 连接到WebSocket服务器
  connect(serverUrl, options = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket已经连接');
      return;
    }

    this.url = serverUrl;
    
    // 保存连接回调
    if (options.onOpen) this.connectionCallbacks.onOpen = options.onOpen;
    if (options.onClose) this.connectionCallbacks.onClose = options.onClose;
    if (options.onError) this.connectionCallbacks.onError = options.onError;

    try {
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = (event) => {
        console.log('WebSocket连接已建立');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // 启动心跳
        this.startHeartbeat();
        
        // 发送所有等待的消息
        this.flushPendingMessages();
        
        // 调用用户的onOpen回调
        if (this.connectionCallbacks.onOpen) {
          this.connectionCallbacks.onOpen(event);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket连接已关闭:', event.code, event.reason);
        this.isConnected = false;
        
        // 停止心跳
        this.stopHeartbeat();
        
        // 调用用户的onClose回调
        if (this.connectionCallbacks.onClose) {
          this.connectionCallbacks.onClose(event);
        }
        
        // 尝试重新连接（非正常关闭时）
        if (event.code !== 1000) { // 1000 表示正常关闭
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        
        // 调用用户的onError回调
        if (this.connectionCallbacks.onError) {
          this.connectionCallbacks.onError(error);
        }
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      this.scheduleReconnect();
    }
  }

  // 断开连接
  disconnect() {
    // 取消重连
    this.cancelReconnect();
    
    // 停止心跳
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, '客户端主动断开'); // 1000 表示正常关闭
      this.ws = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      console.log('WebSocket已手动断开连接');
    }
  }
  
  // 启动心跳
  startHeartbeat() {
    // 清除之前的心跳
    this.stopHeartbeat();
    
    // 设置心跳定时器
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, this.heartbeatTimeout);
    
    console.log('心跳已启动');
  }
  
  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('心跳已停止');
    }
  }

  // 发送消息
  send(type, data = {}) {
    const message = { type, ...data };
    const messageString = JSON.stringify(message);

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(messageString);
      console.log('已发送消息:', type);
    } else {
      // 连接未建立，将消息加入等待队列
      this.pendingMessages.push(messageString);
      console.log('连接未建立，消息已加入等待队列:', type);
    }
  }

  // 处理接收到的消息
  handleMessage(data) {
    const { type } = data;
    
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`处理消息类型 ${type} 的处理器出错:`, error);
        }
      });
    } else {
      console.warn(`未注册消息类型 ${type} 的处理器`);
    }
  }

  // 注册消息处理器
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type).add(handler);
    
    // 返回取消注册的函数
    return () => {
      this.off(type, handler);
    };
  }

  // 取消注册消息处理器
  off(type, handler) {
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).delete(handler);
      
      // 如果没有处理器了，删除类型
      if (this.messageHandlers.get(type).size === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  // 重新连接
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`将在 ${delay}ms 后尝试重新连接，第 ${this.reconnectAttempts + 1} 次`);
      
      // 清除之前的重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`开始第 ${this.reconnectAttempts} 次重连尝试...`);
        this.connect(this.url, this.connectionCallbacks);
      }, delay);
    } else {
      console.error('达到最大重连次数，停止重连');
      // 触发重连失败事件
      if (this.connectionCallbacks.onReconnectFailed) {
        this.connectionCallbacks.onReconnectFailed();
      }
    }
  }
  
  // 取消重连
  cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      console.log('已取消重连');
    }
  }
  
  // 重置重连计数
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
    this.cancelReconnect();
  }

  // 发送等待的消息
  flushPendingMessages() {
    if (this.pendingMessages.length === 0) return;
    
    console.log(`发送 ${this.pendingMessages.length} 个等待的消息`);
    
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      this.ws.send(message);
    }
  }

  // 获取连接状态
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws?.readyState,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // 设备发现相关方法
  startDeviceDiscovery() {
    this.send('start_device_discovery');
  }

  stopDeviceDiscovery() {
    this.send('stop_device_discovery');
  }

  getDiscoveredDevices() {
    this.send('get_discovered_devices');
  }

  // 文件传输相关方法
  sendFile(deviceId, fileData) {
    this.send('file_transfer', {
      targetDeviceId: deviceId,
      file: fileData
    });
  }

  // 屏幕共享相关方法
  startScreenSharing(options = {}) {
    this.send('start_screen_sharing', options);
  }

  stopScreenSharing() {
    this.send('stop_screen_sharing');
  }

  // 远程控制相关方法
  sendControlCommand(deviceId, command) {
    this.send('control_command', {
      targetDeviceId: deviceId,
      command: command
    });
  }
}

// 导出单例实例
const websocketService = new WebSocketService();
export default websocketService;
