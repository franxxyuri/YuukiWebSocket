import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  connect(serverUrl = 'http://localhost:8826') {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    this.setupEventListeners();
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('✅ 已连接到服务器');
        this.isConnected = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ 连接服务器失败:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('⚠️ 与服务器断开连接:', reason);
        this.isConnected = false;
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 已断开连接');
    }
  }

  setupEventListeners() {
    // 设备发现事件
    this.socket.on('device_discovered', (deviceInfo) => {
      this.handleEvent('device_discovered', deviceInfo);
    });

    // 设备状态更新事件
    this.socket.on('device_status_update', (statusInfo) => {
      this.handleEvent('device_status_update', statusInfo);
    });

    // 文件传输事件
    this.socket.on('file_transfer_progress', (progressInfo) => {
      this.handleEvent('file_transfer_progress', progressInfo);
    });

    this.socket.on('file_transfer_completed', (result) => {
      this.handleEvent('file_transfer_completed', result);
    });

    this.socket.on('file_transfer_error', (error) => {
      this.handleEvent('file_transfer_error', error);
    });

    // 屏幕流事件
    this.socket.on('screen_stream_data', (streamData) => {
      this.handleEvent('screen_stream_data', streamData);
    });

    // 控制事件
    this.socket.on('control_response', (response) => {
      this.handleEvent('control_response', response);
    });
  }

  handleEvent(eventName, data) {
    const handlers = this.eventHandlers.get(eventName) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`处理事件 ${eventName} 时出错:`, error);
      }
    });
  }

  // 注册事件处理器
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(handler);
  }

  // 移除事件处理器
  off(eventName, handler) {
    if (this.eventHandlers.has(eventName)) {
      const handlers = this.eventHandlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 发送设备发现请求
  startDeviceDiscovery() {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('start_device_discovery', (response) => {
        if (response.success) {
          resolve(response.devices || []);
        } else {
          reject(new Error(response.error || '设备发现失败'));
        }
      });
    });
  }

  // 停止设备发现
  stopDeviceDiscovery() {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('stop_device_discovery', (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || '停止设备发现失败'));
        }
      });
    });
  }

  // 获取已发现的设备
  getDiscoveredDevices() {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('get_discovered_devices', (response) => {
        if (response.success) {
          resolve(response.devices || []);
        } else {
          reject(new Error(response.error || '获取设备列表失败'));
        }
      });
    });
  }

  // 发送文件
  sendFile(filePath, targetDeviceId, options = {}) {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('send_file', {
        filePath,
        targetDeviceId,
        options
      }, (response) => {
        if (response.success) {
          resolve(response.transferInfo);
        } else {
          reject(new Error(response.error || '发送文件失败'));
        }
      });
    });
  }

  // 接收文件
  receiveFile(transferInfo, savePath = null) {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('receive_file', {
        transferInfo,
        savePath
      }, (response) => {
        if (response.success) {
          resolve(response.transferInfo);
        } else {
          reject(new Error(response.error || '接收文件失败'));
        }
      });
    });
  }

  // 开始屏幕投屏
  startScreenStreaming(deviceInfo) {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('start_screen_streaming', deviceInfo, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || '开始屏幕投屏失败'));
        }
      });
    });
  }

  // 停止屏幕投屏
  stopScreenStreaming(deviceInfo) {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('stop_screen_streaming', deviceInfo, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || '停止屏幕投屏失败'));
        }
      });
    });
  }

  // 启用远程控制
  enableRemoteControl(deviceInfo) {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('enable_remote_control', deviceInfo, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || '启用远程控制失败'));
        }
      });
    });
  }

  // 发送控制事件
  sendControlEvent(eventData) {
    if (!this.socket) return Promise.reject(new Error('未连接到服务器'));
    return new Promise((resolve, reject) => {
      this.socket.emit('send_control_event', eventData, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || '发送控制事件失败'));
        }
      });
    });
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket ? this.socket.id : null
    };
  }
}

// 创建全局实例
const websocketService = new WebSocketService();

export default websocketService;