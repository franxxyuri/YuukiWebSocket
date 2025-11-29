/**
 * API服务层
 * 统一封装所有核心服务功能，提供给前端组件使用
 * 作为组件和底层服务之间的中间层，降低耦合度
 */

import connectionManager from './ConnectionManager';
import configManager from './ConfigManager';

class APIService {
  constructor() {
    // 存储事件监听器
    this.eventListeners = new Map();
    
    // 初始化连接管理器的事件监听
    this.initEventListeners();
  }
  
  /**
   * 初始化事件监听器
   */
  initEventListeners() {
    // 监听连接状态变化
    connectionManager.on('connected', this.handleConnectionChange.bind(this));
    connectionManager.on('disconnected', this.handleConnectionChange.bind(this));
    connectionManager.on('connectionError', this.handleConnectionError.bind(this));
    
    // 监听设备相关事件
    connectionManager.on('deviceDiscovered', this.triggerEvent.bind(this));
    connectionManager.on('deviceConnected', this.triggerEvent.bind(this));
    connectionManager.on('deviceDisconnected', this.triggerEvent.bind(this));
    
    // 监听文件传输相关事件
    connectionManager.on('fileTransferStarted', this.triggerEvent.bind(this));
    connectionManager.on('fileTransferProgress', this.triggerEvent.bind(this));
    connectionManager.on('fileTransferCompleted', this.triggerEvent.bind(this));
    connectionManager.on('fileTransferFailed', this.triggerEvent.bind(this));
    
    // 监听屏幕共享相关事件
    connectionManager.on('screenShareStarted', this.triggerEvent.bind(this));
    connectionManager.on('screenShareStopped', this.triggerEvent.bind(this));
    connectionManager.on('screenFrameReceived', this.triggerEvent.bind(this));
    
    // 监听远程控制相关事件
    connectionManager.on('remoteControlEnabled', this.triggerEvent.bind(this));
    connectionManager.on('remoteControlDisabled', this.triggerEvent.bind(this));
    connectionManager.on('remoteControlError', this.triggerEvent.bind(this));
    
    // 监听剪贴板相关事件
    connectionManager.on('clipboardContentReceived', this.triggerEvent.bind(this));
  }
  
  /**
   * 处理连接状态变化
   * @param {object} event - 连接事件
   */
  handleConnectionChange(event) {
    const isConnected = event.type === 'connected';
    this.triggerEvent('connectionStateChanged', { isConnected, event });
  }
  
  /**
   * 处理连接错误
   * @param {Error} error - 连接错误
   */
  handleConnectionError(error) {
    this.triggerEvent('connectionError', error);
  }
  
  /**
   * 触发事件
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  triggerEvent(eventName, data) {
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`事件监听器错误 [${eventName}]:`, error);
      }
    });
  }
  
  // ========== 连接管理相关API ==========
  
  /**
   * 连接到服务器
   * @param {string} url - 可选，连接URL
   * @returns {Promise} 连接结果Promise
   */
  async connect(url) {
    return connectionManager.connect(url);
  }
  
  /**
   * 断开连接
   * @returns {Promise} 断开结果Promise
   */
  async disconnect() {
    return connectionManager.disconnect();
  }
  
  /**
   * 检查连接状态
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return connectionManager.isConnected();
  }
  
  /**
   * 获取连接状态详情
   * @returns {object} 连接状态对象
   */
  getConnectionStatus() {
    return connectionManager.getConnectionStatus();
  }
  
  /**
   * 切换连接策略
   * @param {string} strategyType - 策略类型 ('websocket' 或 'mock')
   * @returns {boolean} 是否切换成功
   */
  switchConnectionStrategy(strategyType) {
    try {
      connectionManager.switchStrategy(strategyType);
      return true;
    } catch (error) {
      console.error('切换连接策略失败:', error);
      return false;
    }
  }
  
  /**
   * 获取当前连接策略类型
   * @returns {string} 当前连接策略类型
   */
  getCurrentConnectionStrategy() {
    return connectionManager.connectionType;
  }
  
  // ========== 事件监听相关API ==========
  
  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {function} callback - 回调函数
   * @returns {APIService} API服务实例，支持链式调用
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
    return this;
  }
  
  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {function} callback - 回调函数，如果不提供则移除所有该事件的监听器
   * @returns {APIService} API服务实例，支持链式调用
   */
  off(eventName, callback) {
    if (this.eventListeners.has(eventName)) {
      if (callback) {
        const listeners = this.eventListeners.get(eventName);
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      } else {
        // 如果没有提供回调，移除所有监听器
        this.eventListeners.delete(eventName);
      }
    }
    return this;
  }
  
  // ========== 设备发现相关API ==========
  
  /**
   * 开始设备发现
   * @returns {Promise<Array>} 发现的设备列表
   */
  async startDeviceDiscovery() {
    return connectionManager.startDeviceDiscovery();
  }
  
  /**
   * 停止设备发现
   * @returns {Promise} 停止结果Promise
   */
  async stopDeviceDiscovery() {
    return connectionManager.stopDeviceDiscovery();
  }
  
  /**
   * 获取已发现的设备列表
   * @returns {Promise<Array>} 设备列表
   */
  async getDiscoveredDevices() {
    return connectionManager.getDiscoveredDevices();
  }
  
  /**
   * 连接到设备
   * @param {string} deviceId - 设备ID
   * @returns {Promise} 连接结果Promise
   */
  async connectDevice(deviceId) {
    return connectionManager.connectDevice(deviceId);
  }
  
  /**
   * 直接连接到设备（P2P模式）
   * @param {object} deviceInfo - 设备信息对象，包含ip、port等
   * @returns {Promise} 连接结果Promise
   */
  async connectDirectlyToDevice(deviceInfo) {
    return connectionManager.connectDirectlyToDevice(deviceInfo);
  }
  
  /**
   * 断开设备连接
   * @param {string} deviceId - 设备ID
   * @returns {Promise} 断开结果Promise
   */
  async disconnectDevice(deviceId) {
    return connectionManager.disconnectDevice(deviceId);
  }
  
  /**
   * 获取已连接的设备列表
   * @returns {Promise<Array>} 已连接设备列表
   */
  async getConnectedDevices() {
    return connectionManager.getConnectedDevices();
  }
  
  // ========== 文件传输相关API ==========
  
  /**
   * 获取设备文件列表
   * @param {string} deviceId - 设备ID
   * @param {string} path - 目录路径
   * @returns {Promise<Array>} 文件列表
   */
  async getDeviceFiles(deviceId, path = '/') {
    return connectionManager.getDeviceFiles(deviceId, path);
  }
  
  /**
   * 上传文件到设备
   * @param {string} deviceId - 设备ID
   * @param {File|Array<File>} files - 文件对象或文件数组
   * @param {string} destinationPath - 目标路径
   * @returns {Promise} 上传结果Promise
   */
  async uploadFile(deviceId, files, destinationPath = '/') {
    return connectionManager.uploadFile(deviceId, files, destinationPath);
  }
  
  /**
   * 从设备下载文件
   * @param {string} deviceId - 设备ID
   * @param {string|Array<string>} fileIds - 文件ID或文件ID数组
   * @returns {Promise} 下载结果Promise
   */
  async downloadFile(deviceId, fileIds) {
    return connectionManager.downloadFile(deviceId, fileIds);
  }
  
  /**
   * 删除设备上的文件
   * @param {string} deviceId - 设备ID
   * @param {string|Array<string>} fileIds - 文件ID或文件ID数组
   * @returns {Promise} 删除结果Promise
   */
  async deleteFile(deviceId, fileIds) {
    return connectionManager.deleteFile(deviceId, fileIds);
  }
  
  /**
   * 获取文件传输历史
   * @param {string} deviceId - 可选，设备ID
   * @returns {Promise<Array>} 文件传输历史记录
   */
  async getFileTransferHistory(deviceId = null) {
    return connectionManager.getFileTransferHistory(deviceId);
  }
  
  // ========== 屏幕共享相关API ==========
  
  /**
   * 开始屏幕共享
   * @param {string} deviceId - 设备ID
   * @param {object} options - 共享选项（分辨率、帧率等）
   * @returns {Promise} 共享结果Promise
   */
  async startScreenShare(deviceId, options = {}) {
    // 如果没有提供选项，从配置中获取
    const defaultOptions = configManager.get('features.screenSharing', {});
    const mergedOptions = { ...defaultOptions, ...options };
    
    return connectionManager.startScreenShare(deviceId, mergedOptions);
  }
  
  /**
   * 停止屏幕共享
   * @param {string} deviceId - 设备ID
   * @returns {Promise} 停止结果Promise
   */
  async stopScreenShare(deviceId) {
    return connectionManager.stopScreenShare(deviceId);
  }
  
  /**
   * 设置屏幕共享质量
   * @param {string} deviceId - 设备ID
   * @param {number} quality - 质量级别（1-10）
   * @returns {Promise} 设置结果Promise
   */
  async setScreenShareQuality(deviceId, quality) {
    return connectionManager.setScreenShareQuality(deviceId, quality);
  }
  
  // ========== 远程控制相关API ==========
  
  /**
   * 启用远程控制
   * @param {string} deviceId - 设备ID
   * @returns {Promise} 控制结果Promise
   */
  async enableRemoteControl(deviceId) {
    return connectionManager.enableRemoteControl(deviceId);
  }
  
  /**
   * 禁用远程控制
   * @param {string} deviceId - 设备ID
   * @returns {Promise} 禁用结果Promise
   */
  async disableRemoteControl(deviceId) {
    return connectionManager.disableRemoteControl(deviceId);
  }
  
  /**
   * 发送控制命令到设备
   * @param {string} deviceId - 设备ID
   * @param {string} command - 命令类型
   * @param {object} params - 命令参数
   * @returns {Promise} 命令执行结果Promise
   */
  async sendControlCommand(deviceId, command, params) {
    return connectionManager.sendControlCommand(deviceId, command, params);
  }
  
  /**
   * 发送触摸事件到设备
   * @param {string} deviceId - 设备ID
   * @param {string} action - 动作类型（touchDown, touchMove, touchUp）
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {Promise} 发送结果Promise
   */
  async sendTouchEvent(deviceId, action, x, y) {
    return connectionManager.sendTouchEvent(deviceId, action, x, y);
  }
  
  /**
   * 发送按键事件到设备
   * @param {string} deviceId - 设备ID
   * @param {string|number} keyCode - 键码
   * @param {boolean} isDown - 是否按下
   * @returns {Promise} 发送结果Promise
   */
  async sendKeyEvent(deviceId, keyCode, isDown = true) {
    return connectionManager.sendKeyEvent(deviceId, keyCode, isDown);
  }
  
  // ========== 剪贴板同步相关API ==========
  
  /**
   * 发送剪贴板内容
   * @param {string} content - 剪贴板内容
   * @returns {Promise} 发送结果Promise
   */
  async sendClipboardContent(content) {
    return connectionManager.sendClipboardContent(content);
  }
  
  /**
   * 监听剪贴板内容变化
   * @param {function} callback - 回调函数
   * @returns {APIService} API服务实例，支持链式调用
   */
  onClipboardContentReceived(callback) {
    return this.on('clipboardContentReceived', callback);
  }
  
  /**
   * 移除剪贴板内容变化监听器
   * @param {function} callback - 回调函数
   * @returns {APIService} API服务实例，支持链式调用
   */
  offClipboardContentReceived(callback) {
    return this.off('clipboardContentReceived', callback);
  }
  
  // ========== 配置管理相关API ==========
  
  /**
   * 获取配置
   * @param {string} path - 可选，配置路径
   * @param {*} defaultValue - 可选，默认值
   * @returns {*} 配置值
   */
  getConfig(path = null, defaultValue = undefined) {
    if (path) {
      return configManager.get(path, defaultValue);
    }
    return configManager.getConfig();
  }
  
  /**
   * 设置配置
   * @param {string|object} key - 配置键或配置对象
   * @param {*} value - 配置值（当key为字符串时）
   * @returns {APIService} API服务实例，支持链式调用
   */
  setConfig(key, value) {
    configManager.set(key, value);
    return this;
  }
  
  /**
   * 重置配置
   * @param {string} path - 可选，配置路径
   * @returns {APIService} API服务实例，支持链式调用
   */
  resetConfig(path = null) {
    configManager.reset(path);
    return this;
  }
  
  /**
   * 获取连接配置
   * @returns {object} 连接配置对象
   */
  getConnectionConfig() {
    return configManager.getConnectionConfig();
  }
  
  /**
   * 更新连接配置
   * @param {object} connectionConfig - 连接配置
   * @returns {APIService} API服务实例，支持链式调用
   */
  setConnectionConfig(connectionConfig) {
    configManager.setConnectionConfig(connectionConfig);
    return this;
  }
  
  /**
   * 获取UI配置
   * @returns {object} UI配置对象
   */
  getUIConfig() {
    return configManager.getUIConfig();
  }
  
  /**
   * 更新UI配置
   * @param {object} uiConfig - UI配置
   * @returns {APIService} API服务实例，支持链式调用
   */
  setUIConfig(uiConfig) {
    configManager.setUIConfig(uiConfig);
    return this;
  }
  
  /**
   * 获取功能配置
   * @param {string} featureName - 可选，功能名称
   * @returns {object} 功能配置对象
   */
  getFeaturesConfig(featureName = null) {
    return configManager.getFeaturesConfig(featureName);
  }
  
  /**
   * 更新功能配置
   * @param {string} featureName - 功能名称
   * @param {object} featureConfig - 功能配置
   * @returns {APIService} API服务实例，支持链式调用
   */
  setFeatureConfig(featureName, featureConfig) {
    configManager.setFeatureConfig(featureName, featureConfig);
    return this;
  }
  
  // ========== 工具方法 ==========
  
  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * 验证设备ID是否有效
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否有效
   */
  isValidDeviceId(deviceId) {
    return typeof deviceId === 'string' && deviceId.trim().length > 0;
  }
  
  /**
   * 检查是否支持某个功能
   * @param {string} featureName - 功能名称
   * @returns {boolean} 是否支持
   */
  isFeatureSupported(featureName) {
    const featureConfig = this.getFeaturesConfig(featureName);
    return featureConfig && featureConfig.enabled !== false;
  }
  
  /**
   * 清理资源
   */
  destroy() {
    // 移除所有事件监听器
    this.eventListeners.clear();
    
    // 断开连接
    if (connectionManager.isConnected) {
      connectionManager.disconnect();
    }
    
    console.log('API服务已销毁');
  }
  
  /**
   * 获取模拟数据
   * @param {string} type - 数据类型
   * @returns {*} 模拟数据
   */
  getMockData(type) {
    // 转发给connectionManager
    return connectionManager.getMockData(type);
  }
}

// 创建单例实例
const apiService = new APIService();

export default apiService;