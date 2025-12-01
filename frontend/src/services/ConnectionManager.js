/**
 * 连接管理器
 * 负责管理不同的连接策略，并提供统一的API接口给应用使用
 */
import WebSocketStrategy from './connection-strategy/WebSocketStrategy';
import MockConnectionStrategy from './connection-strategy/MockConnectionStrategy';
import TCPStrategy from './connection-strategy/TCPStrategy';
import KCPStrategy from './connection-strategy/KCPStrategy';
import configManager from './ConfigManager';

class ConnectionManager {
  constructor() {
    this.strategy = null;
    // 开发环境默认使用websocket模式
    const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
    this.config = {
      connectionType: 'websocket', // 开发环境默认使用websocket模式
      serverUrl: null,
      useMock: false, // 开发环境默认不使用模拟连接
      maxReconnectAttempts: 3,
      showConnectionErrors: true // 控制是否显示连接错误
    };
    
    // 连接状态管理
    this._isConnected = false;
    this.reconnectAttempts = 0;
    
    // 监听配置变化，自动更新连接策略
    configManager.on('connection', this.handleConfigChange.bind(this));
  }

  /**
   * 初始化连接管理器
   * @param {object} config - 配置选项
   */
  initialize(config = {}) {
    // 合并配置
    this.config = {
      ...this.config,
      ...config
    };
    
    // 从配置获取连接类型，默认为websocket
    const useMockMode = configManager.get('connection.mockMode', this.config.useMock);
    this.setConnectionType(useMockMode ? 'mock' : this.config.connectionType);
    
    console.log('[ConnectionManager] Initialized with config:', this.config);
    return this;
  }
  
  /**
   * 获取当前连接状态
   * @returns {object} 连接状态对象
   */
  getConnectionStatus() {
    // 如果有策略，优先使用策略的状态
    if (this.strategy) {
      const strategyStatus = this.strategy.getConnectionStatus();
      return {
        ...strategyStatus,
        reconnectAttempts: this.reconnectAttempts,
        isMockMode: this.config.useMock
      };
    }
    
    // 否则返回基本状态
    return {
      isConnected: this._isConnected,
      connectionType: this.config.connectionType,
      isMockMode: this.config.useMock,
      reconnectAttempts: this.reconnectAttempts,
      error: '连接策略未初始化'
    };
  }
  
  /**
   * 提供mock数据功能，用于无后端服务时的演示
   * @param {string} type - 数据类型
   * @returns {object|null} mock数据
   */
  getMockData(type) {
    const mockData = {
      deviceList: [
        {
          id: 'mock-device-1',
          name: '模拟设备1',
          model: 'Model-X',
          ip: '192.168.1.100',
          status: 'available',
          battery: 85
        },
        {
          id: 'mock-device-2',
          name: '模拟设备2',
          model: 'Model-Y',
          ip: '192.168.1.101',
          status: 'available',
          battery: 62
        }
      ],
      deviceInfo: {
        id: 'mock-device-1',
        name: '模拟设备1',
        model: 'Model-X',
        firmwareVersion: '1.2.3',
        battery: 85,
        status: 'connected',
        lastConnected: new Date().toLocaleString()
      }
    };
    
    return mockData[type] || null;
  }
  
  /**
   * 处理配置变化
   * @param {object} newConfig - 新的配置对象
   */
  handleConfigChange(newConfig) {
    const currentStrategy = this.config.connectionType;
    const newStrategy = newConfig.mockMode ? 'mock' : 'websocket';
    
    // 如果连接类型改变，切换策略
    if (currentStrategy !== newStrategy) {
      console.log(`连接类型从 ${currentStrategy} 切换到 ${newStrategy}`);
      this.setConnectionType(newStrategy);
      
      // 如果当前已连接，自动重新连接
      if (this.isConnected()) {
        this.reconnect().catch(err => {
          console.error('重新连接失败:', err);
        });
      }
    }
  }

  /**
   * 设置连接类型
   * @param {string} type - 连接类型 ('websocket' | 'mock' | 'tcp' | 'kcp')
   * @returns {ConnectionManager} 连接管理器实例，支持链式调用
   */
  setConnectionType(type) {
    this.config.connectionType = type;
    
    // 如果已经连接，先断开
    if (this.strategy && this.strategy.isConnected()) {
      this.strategy.disconnect();
    }
    
    // 获取连接配置
    const connectionConfig = configManager.get('connection', {});
    
    // 创建新的策略实例
    switch (type) {
      case 'mock':
        this.strategy = new MockConnectionStrategy(connectionConfig);
        console.log('已切换到模拟连接策略');
        break;
      case 'tcp':
        this.strategy = new TCPStrategy(connectionConfig);
        console.log('已切换到TCP连接策略');
        break;
      case 'kcp':
        this.strategy = new KCPStrategy(connectionConfig);
        console.log('已切换到KCP连接策略');
        break;
      case 'websocket':
      default:
        this.strategy = new WebSocketStrategy(connectionConfig);
        console.log('已切换到WebSocket连接策略');
        break;
    }
    
    // 注册策略事件监听器，转发到外部
    this.setupStrategyEventListeners();
    
    return this;
  }
  
  /**
   * 设置策略事件监听器
   * @private
   */
  setupStrategyEventListeners() {
    if (!this.strategy) return;
    
    // 监听策略的所有事件，并转发到外部
    const eventNames = ['connect', 'disconnect', 'error', 'deviceDiscovered', 'deviceConnected', 'deviceDisconnected', 'fileTransferStarted', 'fileTransferProgress', 'fileTransferCompleted', 'fileTransferFailed', 'screenShareStarted', 'screenShareStopped', 'screenFrameReceived', 'remoteControlEnabled', 'remoteControlDisabled', 'remoteControlError', 'clipboardContentReceived'];
    
    eventNames.forEach(eventName => {
      this.strategy.on(eventName, (data) => {
        // 确保事件名称被正确传递，而不是将事件对象作为事件名称
        this.triggerEvent(eventName, data);
      });
    });
  }
  
  /**
   * 触发事件
   * @private
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  triggerEvent(eventName, data) {
    // 这里可以添加事件日志
    console.log(`ConnectionManager 触发事件: ${eventName}`, data);
    
    // 转发事件给外部监听器
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`事件监听器错误 [${eventName}]:`, error);
      }
    });
  }
  
  /**
   * 存储事件监听器
   * @private
   */
  eventListeners = new Map();
  
  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 事件处理器函数
   * @returns {ConnectionManager} 连接管理器实例，支持链式调用
   */
  on(eventName, handler) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(handler);
    return this;
  }
  
  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 要移除的事件处理器
   * @returns {ConnectionManager} 连接管理器实例，支持链式调用
   */
  off(eventName, handler) {
    if (this.eventListeners.has(eventName)) {
      const listeners = this.eventListeners.get(eventName);
      const index = listeners.indexOf(handler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * 连接到服务器
   * @param {string} serverUrl - 服务器URL（可选，将覆盖配置中的URL）
   * @returns {Promise<void>} 连接成功时解析
   */
  async connect(serverUrl = null) {
    if (!this.strategy) {
      throw new Error('连接策略未初始化，请先调用initialize方法');
    }
    
    // 优先使用传入的URL，如果没有则从配置中获取，如果配置中也没有则使用默认值
    // 确保不使用带有/ws后缀的URL，因为WebSocketStrategy会直接使用完整URL
    const url = serverUrl || 
                configManager.get('connection.websocketUrl', this.config.serverUrl) || 
                null;
    
    // 清理URL，确保不包含/ws后缀
    const cleanUrl = url ? url.replace(/\/ws$/, '') : null;
    
    console.log(`正在连接到 ${this.config.connectionType} 服务器: ${cleanUrl}`);
    
    try {
      await this.strategy.connect(cleanUrl);
      console.log(`成功连接到 ${cleanUrl}`);
      this._isConnected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      this._isConnected = false;
      
      // 如果配置了自动重连且未达到最大尝试次数
      if (this.config.maxReconnectAttempts && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
        // 使用setTimeout进行延迟重连
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            this.connect(cleanUrl)
              .then(resolve)
              .catch(reject);
          }, 1000);
        });
      }
      
      // 记录错误
      if (this.config.showConnectionErrors) {
        console.error('连接失败:', error.message, error.stack);
      }
      
      // 抛出更友好的错误信息，包含原始错误
      const friendlyError = new Error(
        `无法连接到服务器: ${cleanUrl || '未指定URL'}。请确认后端服务正在运行，或检查网络连接。`
      );
      friendlyError.originalError = error;
      friendlyError.url = cleanUrl;
      friendlyError.connectionType = this.config.connectionType;
      throw friendlyError;
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.strategy) {
      this.strategy.disconnect();
    }
  }

  /**
   * 发送带回调的请求
   * @param {string} type - 请求类型
   * @param {object} data - 请求数据
   * @returns {Promise<object>} 包含响应的Promise
   */
  sendRequest(type, data) {
    if (!this.strategy) {
      return Promise.reject(new Error('连接策略未初始化'));
    }
    return this.strategy.sendRequest(type, data);
  }

  /**
   * 发送不带回调的命令
   * @param {string} type - 命令类型
   * @param {object} data - 命令数据
   */
  sendCommand(type, data) {
    if (!this.strategy) {
      throw new Error('连接策略未初始化');
    }
    return this.strategy.sendCommand(type, data);
  }

  

  /**
   * 更新配置
   * @param {object} newConfig - 新的配置对象
   * @returns {ConnectionManager} 连接管理器实例，支持链式调用
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    // 如果连接类型改变，重新设置连接策略
    if (newConfig.connectionType && newConfig.connectionType !== this.config.connectionType) {
      this.setConnectionType(newConfig.connectionType);
    }
    
    return this;
  }

  /**
   * 获取当前配置
   * @returns {object} 当前配置对象
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * 切换连接策略
   * @param {string} strategyType - 策略类型 ('websocket' | 'mock' | 'tcp' | 'kcp')
   * @returns {Promise<void>}
   */
  async switchStrategy(strategyType) {
    if (!['websocket', 'mock', 'tcp', 'kcp'].includes(strategyType)) {
      throw new Error(`不支持的连接策略类型: ${strategyType}`);
    }
    
    // 先断开现有连接
    if (this.strategy && this.strategy.isConnected()) {
      this.strategy.disconnect();
    }
    
    // 设置新的策略类型
    this.setConnectionType(strategyType);
    
    // 更新配置
    this.config.connectionType = strategyType;
    
    // 尝试重新连接（如果不是模拟模式）
    if (strategyType !== 'mock') {
      try {
        const url = configManager.get('connection.websocketUrl') || this.config.serverUrl;
        // 清理URL，确保不包含/ws后缀
        const cleanUrl = url.replace(/\/ws$/, '');
        await this.strategy.connect(cleanUrl);
        console.log(`已成功切换到${strategyType}策略并连接`);
      } catch (error) {
        console.error('切换策略后连接失败:', error.message);
        throw error;
      }
    }
  }
  
  /**
   * 获取当前策略类型
   * @returns {string} 当前连接策略类型
   */
  getCurrentStrategyType() {
    return this.config.connectionType;
  }
  
  /**
   * 重新连接到服务器
   * @returns {Promise<void>} 重连成功时解析
   */
  async reconnect() {
    if (!this.strategy) {
      throw new Error('连接策略未初始化');
    }
    
    console.log('正在重新连接...');
    
    try {
      // 先断开现有连接
      if (this.isConnected()) {
        this.disconnect();
      }
      
      // 等待一小段时间确保断开
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 重新连接
      await this.connect();
      console.log('重连成功');
    } catch (error) {
      console.error('重连失败:', error);
      throw error;
    }
  }
  
  /**
   * 设备管理相关方法
   */
  
  // 开始设备发现
  async startDeviceDiscovery() {
    if (this.config.connectionType === 'mock') {
      // 模拟模式下返回模拟数据
      const mockDevices = [
        {
          id: 'mock-device-1',
          name: 'Android Phone 1',
          model: 'Google Pixel 7',
          ip: '192.168.1.101',
          battery: 78,
          status: 'available',
          lastSeen: new Date().toISOString()
        },
        {
          id: 'mock-device-2',
          name: 'Android Tablet',
          model: 'Samsung Galaxy Tab S7',
          ip: '192.168.1.102',
          battery: 45,
          status: 'available',
          lastSeen: new Date().toISOString()
        },
        {
          id: 'mock-device-3',
          name: 'Android TV',
          model: 'Xiaomi Mi Box S',
          ip: '192.168.1.103',
          battery: 100,
          status: 'available',
          lastSeen: new Date().toISOString()
        }
      ];
      return mockDevices;
    }
    
    // 发送开始设备发现命令
    await this.sendCommand('start_device_discovery', {});
    // 不等待响应，设备发现结果将通过device_discovered事件返回
    return [];
  }

  // 停止设备发现
  async stopDeviceDiscovery() {
    if (this.config.connectionType === 'mock') {
      return Promise.resolve({ success: true });
    }
    return this.sendRequest('stop_device_discovery', {});
  }

  // 获取已发现的设备
  async getDiscoveredDevices() {
    if (this.config.connectionType === 'mock') {
      // 模拟模式下返回模拟数据
      const mockDevices = [
        {
          id: 'mock-device-1',
          name: 'Android Phone 1',
          model: 'Google Pixel 7',
          ip: '192.168.1.101',
          battery: 78,
          status: 'available',
          lastSeen: new Date().toISOString()
        },
        {
          id: 'mock-device-2',
          name: 'Android Tablet',
          model: 'Samsung Galaxy Tab S7',
          ip: '192.168.1.102',
          battery: 45,
          status: 'available',
          lastSeen: new Date().toISOString()
        },
        {
          id: 'mock-device-3',
          name: 'Android TV',
          model: 'Xiaomi Mi Box S',
          ip: '192.168.1.103',
          battery: 100,
          status: 'available',
          lastSeen: new Date().toISOString()
        }
      ];
      return mockDevices;
    }
    
    // 直接返回空数组，设备发现结果将通过device_discovered事件返回
    // 实际设备列表由DeviceDiscoveryService维护
    return [];
  }

  // 发送文件
  sendFile(filePath, targetDeviceId, options = {}) {
    return this.sendRequest('file_transfer', {
      action: 'send',
      filePath,
      targetDeviceId,
      options
    });
  }

  // 接收文件
  receiveFile(transferInfo, savePath = null) {
    return this.sendRequest('file_transfer', {
      action: 'receive',
      transferInfo,
      savePath
    });
  }
  
  // 获取设备文件列表
  getDeviceFiles(deviceId, path = '/') {
    return this.sendRequest('get_device_files', {
      deviceId,
      path
    });
  }
  
  // 上传文件
  uploadFile(deviceId, fileMetadata, options = {}) {
    return this.sendRequest('upload_file', {
      deviceId,
      fileMetadata,
      options
    });
  }
  
  // 下载文件
  downloadFile(deviceId, fileInfo, options = {}) {
    return this.sendRequest('download_file', {
      deviceId,
      fileName: fileInfo.name,
      filePath: fileInfo.path,
      fileSize: fileInfo.size,
      options
    });
  }
  
  // 取消文件传输
  cancelFileTransfer(transferId, type) {
    return this.sendRequest('cancel_file_transfer', {
      transferId,
      type
    });
  }

  // 开始屏幕投屏
  startScreenStreaming(deviceInfo, options = {}) {
    return this.sendRequest('control_command', {
      commandType: 'start_streaming',
      deviceId: typeof deviceInfo === 'string' ? deviceInfo : deviceInfo.id,
      options
    });
  }

  // 停止屏幕投屏
  stopScreenStreaming(deviceInfo) {
    return this.sendRequest('control_command', {
      commandType: 'stop_streaming',
      deviceId: typeof deviceInfo === 'string' ? deviceInfo : deviceInfo.id
    });
  }

  // 启用远程控制
  enableRemoteControl(deviceInfo) {
    return this.sendRequest('control_command', {
      commandType: 'enable_control',
      deviceId: typeof deviceInfo === 'string' ? deviceInfo : deviceInfo.id
    });
  }

  // 禁用远程控制
  disableRemoteControl(deviceId) {
    return this.sendRequest('disable_remote_control', { deviceId });
  }

  // 发送控制事件
  sendControlEvent(eventType, eventData) {
    return this.sendRequest('control_command', {
      commandType: 'send_event',
      eventType,
      ...eventData
    });
  }
  
  // 发送剪贴板内容
  async sendClipboardContent(content) {
    if (this.config.connectionType === 'mock') {
      // 模拟模式下直接返回成功
      return Promise.resolve({ success: true });
    }
    
    // WebSocket模式下发送请求
    return this.sendCommand('clipboard', {
      data: content,
      type: 'text',
      timestamp: Date.now()
    });
  }
  
  // 接收剪贴板内容（由WebSocket事件触发）
  handleClipboardContent(data) {
    // 触发剪贴板事件
    this.emit('clipboardContentReceived', data);
  }
  
  // 获取已连接的设备列表
  async getConnectedDevices() {
    if (this.config.connectionType === 'mock') {
      // 模拟模式下返回空列表
      return [];
    }
    
    // WebSocket模式下发送请求
    const response = await this.sendRequest('get_connected_devices', {});
    return response.devices || [];
  }
  
  // 连接到设备
  async connectDevice(deviceId) {
    if (this.config.connectionType === 'mock') {
      // 模拟模式下直接返回成功
      return Promise.resolve({ success: true });
    }
    
    // WebSocket模式下发送请求
    return this.sendRequest('connect_device', { deviceId });
  }
  
  // 直接连接到设备（P2P模式）
  async connectDirectlyToDevice(deviceInfo) {
    if (!deviceInfo || !deviceInfo.ip) {
      throw new Error('设备信息不完整，无法直接连接');
    }
    
    // 断开当前连接
    if (this.isConnected()) {
      await this.disconnect();
    }
    
    // 根据设备信息构建WebSocket URL
    const defaultPort = configManager.get('connection.defaultPort', 8928);
    const wsUrl = `ws://${deviceInfo.ip}:${deviceInfo.port || defaultPort}`;
    
    // 更新连接类型为websocket
    this.setConnectionType('websocket');
    
    // 直接连接到设备
    await this.connect(wsUrl);
    
    console.log(`已直接连接到设备: ${deviceInfo.name} (${wsUrl})`);
    return { success: true, device: deviceInfo };
  }
  
  // 断开设备连接
  async disconnectDevice(deviceId) {
    if (this.config.connectionType === 'mock') {
      // 模拟模式下直接返回成功
      return Promise.resolve({ success: true });
    }
    
    // WebSocket模式下发送请求
    return this.sendRequest('disconnect_device', { deviceId });
  }
}

// 创建单例实例
const connectionManager = new ConnectionManager();

// 初始化连接管理器
connectionManager.initialize({
  // 用户选择优先，默认使用websocket
  connectionType: window.location.search.includes('useMock=true') ||
                  window.location.search.includes('mock=true') 
    ? 'mock' 
    : 'websocket',
  serverUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_SERVER_URL) || null
});

export default connectionManager;