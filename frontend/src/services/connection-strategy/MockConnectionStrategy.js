/**
 * 模拟连接策略
 * 用于开发环境下的测试，提供模拟数据和响应
 */
import ConnectionStrategy from './ConnectionStrategy';

class MockConnectionStrategy extends ConnectionStrategy {
  constructor(config = {}) {
    super();
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.messageCallbacks = new Map();
    this.requestId = 0;
    this.serverUrl = null;
    this.config = config;
    
    // 模拟设备数据 - 可通过配置覆盖
    this.mockDevices = config.mockDevices || [
      {
        id: 'mock-device-1',
        name: 'Google Pixel 7',
        platform: 'android',
        model: 'Pixel 7',
        version: '13.0',
        ip: '192.168.1.101',
        port: 8928,
        status: 'online',
        lastSeen: Date.now()
      },
      {
        id: 'mock-device-2',
        name: 'Samsung Galaxy Tab S7',
        platform: 'android',
        model: 'Galaxy Tab S7',
        version: '12.0',
        ip: '192.168.1.102',
        port: 8928,
        status: 'online',
        lastSeen: Date.now()
      }
    ];
    
    // 模拟文件传输数据
    this.mockFileTransfers = [];
    
    // 模拟屏幕流帧ID
    this.frameId = 0;
  }

  /**
   * 模拟连接
   * @param {string} serverUrl - 服务器URL
   * @returns {Promise<void>} 连接成功时解析
   */
  connect(serverUrl = 'mock://localhost:8781/ws') {
    return new Promise((resolve) => {
      console.log('✅ 模拟连接到服务器:', serverUrl);
      this.serverUrl = serverUrl;
      this.isConnected = true;
      
      // 模拟连接成功事件
      setTimeout(() => {
        this.handleEvent('connect', { serverUrl });
      }, 100);
      
      resolve();
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    console.log('🔌 模拟断开连接');
    this.isConnected = false;
    this.messageCallbacks.clear();
    this.handleEvent('disconnect', '正常断开');
  }

  /**
   * 模拟发送消息
   * @param {string} message - 要发送的消息
   */
  send(message) {
    if (!this.isConnected) {
      throw new Error('模拟连接未连接');
    }
    console.log('📤 模拟发送消息:', message);
  }

  /**
   * 发送带回调的请求
   * @param {string} type - 请求类型
   * @param {object} data - 请求数据
   * @returns {Promise<object>} 包含响应的Promise
   */
  sendRequest(type, data) {
    if (!this.isConnected) {
      return Promise.reject(new Error('模拟连接未连接到服务器'));
    }

    const requestId = this.generateRequestId();
    
    // 模拟不同类型的请求响应
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (type) {
          case 'get_discovered_devices':
            resolve({
              success: true,
              devices: this.mockDevices,
              requestId
            });
            break;
            
          case 'stop_device_discovery':
            resolve({
              success: true,
              message: '设备发现已停止',
              requestId
            });
            break;
            
          case 'file_transfer':
            if (data.action === 'send') {
              const transferId = `transfer-${Date.now()}`;
              this.mockFileTransfers.push({
                id: transferId,
                type: 'send',
                deviceId: data.targetDeviceId,
                filePath: data.filePath,
                status: 'completed',
                progress: 100,
                startTime: Date.now(),
                endTime: Date.now() + 2000
              });
              
              // 模拟进度更新事件
              setTimeout(() => {
                this.handleEvent('file_transfer_progress', {
                  transferId,
                  progress: 100,
                  status: 'completed'
                });
              }, 500);
              
              resolve({
                success: true,
                transferId,
                message: '文件传输已开始',
                requestId
              });
            }
            break;
            
          case 'control_command':
            if (data.commandType === 'enable_control') {
              resolve({
                success: true,
                message: '远程控制已启用',
                requestId
              });
            } else if (data.commandType === 'start_streaming') {
              // 模拟屏幕流启动
              this.startMockScreenStream();
              resolve({
                success: true,
                message: '屏幕流已开始',
                requestId
              });
            } else if (data.commandType === 'stop_streaming') {
              this.stopMockScreenStream();
              resolve({
                success: true,
                message: '屏幕流已停止',
                requestId
              });
            }
            break;
            
          case 'disable_remote_control':
            resolve({
              success: true,
              message: '远程控制已禁用',
              requestId
            });
            break;
            
          case 'stream_control':
          case 'audio_control':
          case 'stream_settings':
            resolve({
              success: true,
              message: '设置已应用',
              requestId
            });
            break;
            
          default:
            resolve({
              success: true,
              message: `模拟请求成功: ${type}`,
              requestId
            });
        }
      }, 200);
    });
  }

  /**
   * 发送不带回调的命令
   * @param {string} type - 命令类型
   * @param {object} data - 命令数据
   */
  sendCommand(type, data) {
    if (!this.isConnected) {
      throw new Error('模拟连接未连接到服务器');
    }

    console.log('📤 模拟发送命令:', type, data);
    
    // 模拟设备发现
    if (type === 'start_device_discovery') {
      // 模拟延迟后发现设备
      setTimeout(() => {
        this.mockDevices.forEach(device => {
          this.handleEvent('device_discovered', device);
        });
      }, 500);
    }
  }

  /**
   * 注册事件处理器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 事件处理器函数
   */
  on(eventName, handler) {
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
    if (this.eventHandlers.has(eventName)) {
      const handlers = this.eventHandlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 生成请求ID
   * @returns {number} 新的请求ID
   */
  generateRequestId() {
    return ++this.requestId;
  }

  /**
   * 处理事件触发
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  handleEvent(eventName, data) {
    const handlers = this.eventHandlers.get(eventName) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`处理模拟事件 ${eventName} 时出错:`, error);
      }
    });
  }

  /**
   * 开始模拟屏幕流
   */
  startMockScreenStream() {
    // 每秒发送15帧模拟数据
    this.screenStreamInterval = setInterval(() => {
      this.frameId++;
      const frameData = {
        frameId: this.frameId,
        timestamp: Date.now(),
        width: 1280,
        height: 720,
        format: 'jpeg',
        data: `mock-frame-data-${this.frameId}`, // 模拟帧数据
        fps: 15,
        quality: 0.8
      };
      this.handleEvent('screen_stream_data', frameData);
      
      // 同时发送屏幕帧事件以兼容旧代码
      this.handleEvent('screen_frame', frameData);
      
      // 发送状态更新
      this.handleEvent('stream_status', {
        resolution: '1280x720',
        fps: 15,
        latency: Math.floor(Math.random() * 30) + 20, // 20-50ms延迟
        bitrate: '2.5 Mbps'
      });
    }, 66); // ~15fps
  }

  /**
   * 停止模拟屏幕流
   */
  stopMockScreenStream() {
    if (this.screenStreamInterval) {
      clearInterval(this.screenStreamInterval);
      this.screenStreamInterval = null;
    }
  }

  /**
   * 获取连接状态
   * @returns {object} 连接状态对象
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      connectionType: 'mock',
      serverUrl: this.serverUrl,
      mockDevices: this.mockDevices.length
    };
  }

  /**
   * 检查是否已连接
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this.isConnected;
  }
}

export default MockConnectionStrategy;