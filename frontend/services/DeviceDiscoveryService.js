// DeviceDiscoveryService.js
// 真实设备发现服务，使用API服务进行设备发现

import apiService from '../src/services/api-service';

class DeviceDiscoveryService {
  constructor() {
    this.devices = [];
    this.listeners = new Map();
    this.isScanning = false;
    this.scanInterval = null;
    this.scanDelay = 1000; // 扫描延迟
    this.lastScanTime = null;
    
    // 初始化API服务的事件监听
    this.initApiListeners();
  }

  /**
   * 初始化API服务的事件监听
   * @private
   */
  initApiListeners() {
    // 监听设备发现事件
    apiService.on('deviceDiscovered', (device) => {
      this.handleDeviceDiscovered(device);
    });
    
    // 监听设备连接事件
    apiService.on('deviceConnected', (device) => {
      this.handleDeviceConnected(device);
    });
    
    // 监听设备断开事件
    apiService.on('deviceDisconnected', (device) => {
      this.handleDeviceDisconnected(device);
    });
  }

  /**
   * 处理设备发现事件
   * @private
   * @param {Object} device - 发现的设备对象
   */
  handleDeviceDiscovered(device) {
    // 检查设备是否已存在
    const existingIndex = this.devices.findIndex(d => d.deviceId === device.deviceId || d.ip === device.ip);
    
    if (existingIndex === -1) {
      // 添加新设备
      const newDevice = this.normalizeDeviceData(device);
      this.devices.push(newDevice);
      this.emit('deviceFound', newDevice);
      this.emit('scanCompleted', {
        timestamp: Date.now(),
        totalDevices: this.devices.length,
        newDevices: 1,
        devices: [...this.devices]
      });
    } else {
      // 更新现有设备
      const existingDevice = this.devices[existingIndex];
      const updatedDevice = {
        ...existingDevice,
        ...this.normalizeDeviceData(device),
        lastSeen: Date.now()
      };
      this.devices[existingIndex] = updatedDevice;
      this.emit('deviceStatusChanged', {
        device: updatedDevice,
        oldStatus: existingDevice.status,
        newStatus: updatedDevice.status,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 处理设备连接事件
   * @private
   * @param {Object} device - 连接的设备对象
   */
  handleDeviceConnected(device) {
    const existingIndex = this.devices.findIndex(d => d.deviceId === device.deviceId);
    if (existingIndex !== -1) {
      const existingDevice = this.devices[existingIndex];
      const updatedDevice = {
        ...existingDevice,
        status: 'connected',
        lastStatusChange: Date.now()
      };
      this.devices[existingIndex] = updatedDevice;
      this.emit('deviceStatusChanged', {
        device: updatedDevice,
        oldStatus: existingDevice.status,
        newStatus: 'connected',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 处理设备断开事件
   * @private
   * @param {Object} device - 断开的设备对象
   */
  handleDeviceDisconnected(device) {
    const existingIndex = this.devices.findIndex(d => d.deviceId === device.deviceId);
    if (existingIndex !== -1) {
      const existingDevice = this.devices[existingIndex];
      const updatedDevice = {
        ...existingDevice,
        status: 'disconnected',
        lastStatusChange: Date.now()
      };
      this.devices[existingIndex] = updatedDevice;
      this.emit('deviceStatusChanged', {
        device: updatedDevice,
        oldStatus: existingDevice.status,
        newStatus: 'disconnected',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 标准化设备数据格式
   * @private
   * @param {Object} device - 原始设备数据
   * @returns {Object} 标准化后的设备数据
   */
  normalizeDeviceData(device) {
    // 确保设备数据包含所有必要字段，与协议规范一致
    return {
      // 核心设备标识
      id: device.deviceId || device.id || `device-${Date.now()}`,
      deviceId: device.deviceId || device.id || `device-${Date.now()}`,
      
      // 设备基本信息
      name: device.deviceName || device.name || '未知设备',
      model: device.model || 'Unknown',
      platform: device.platform || 'android',
      type: device.platform || device.type || 'Android',
      manufacturer: device.manufacturer || 'Unknown',
      
      // 网络信息
      ip: device.ip,
      port: device.port || 8781,
      mac: device.mac || 'Unknown',
      
      // 设备状态
      status: device.status || 'available',
      lastSeen: device.lastSeen || Date.now(),
      lastStatusChange: Date.now(),
      firstSeen: device.firstSeen || Date.now(),
      
      // 设备能力
      capabilities: device.capabilities || ['file_transfer', 'screen_mirror', 'remote_control'],
      
      // UI相关字段
      icon: device.icon || 'smartphone',
      color: device.color || '#1890ff',
      
      // 电池信息（组件直接使用device.battery）
      battery: device.battery || device.metadata?.batteryLevel || 100,
      
      // 设备元数据
      metadata: device.metadata || {
        osVersion: device.version || 'Unknown',
        appVersion: '1.0.0',
        batteryLevel: device.battery || 100,
        storageTotal: 128,
        storageUsed: 0,
        screenResolution: '1920x1080'
      },
      
      // 性能指标
      performance: device.performance || {
        cpuUsage: 0,
        memoryUsage: 0,
        temperature: 30,
        fanspeed: 1000,
        networkIn: 0,
        networkOut: 0
      },
      
      // 连接信息
      connection: device.connection || {
        signalStrength: 5,
        latency: 20,
        bandwidth: 50,
        uptime: 0,
        protocol: 'WebSocket'
      }
    };
  }

  /**
   * 开始扫描设备
   * @param {boolean} continuous - 是否连续扫描
   * @param {number} interval - 连续扫描间隔（毫秒），默认为5000ms
   */
  async startScan(continuous = false, interval = 5000) {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.emit('scanStarted', { timestamp: Date.now() });
    
    try {
      // 使用API服务开始设备发现
      await apiService.startDeviceDiscovery();
      // 执行单次扫描
      await this.scan();
      
      // 如果需要连续扫描，设置定时器
      if (continuous) {
        this.scanInterval = setInterval(async () => {
          await this.scan();
        }, interval);
      }
    } catch (error) {
      console.error('开始设备发现失败:', error);
      this.emit('scanError', { error: error.message, timestamp: Date.now() });
      this.isScanning = false;
    }
    
    return this;
  }

  /**
   * 停止扫描
   */
  async stopScan() {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    try {
      // 使用API服务停止设备发现
      await apiService.stopDeviceDiscovery();
    } catch (error) {
      console.error('停止设备发现失败:', error);
    }
    
    this.emit('scanStopped', { timestamp: Date.now() });
    return this;
  }

  /**
   * 扫描设备
   * @private
   */
  async scan() {
    console.log('[DeviceDiscoveryService] 开始扫描设备...');
    
    try {
      // 使用API服务获取已发现的设备
      const discoveredDevices = await apiService.getDiscoveredDevices();
      
      // 更新设备列表
      const newDevices = [];
      const updatedDevices = [];
      
      // 处理每个发现的设备
      for (const device of discoveredDevices) {
        const normalizedDevice = this.normalizeDeviceData(device);
        const existingIndex = this.devices.findIndex(d => d.deviceId === normalizedDevice.deviceId || d.ip === normalizedDevice.ip);
        
        if (existingIndex === -1) {
          // 添加新设备
          this.devices.push(normalizedDevice);
          newDevices.push(normalizedDevice);
          this.emit('deviceFound', normalizedDevice);
        } else {
          // 更新现有设备
          const existingDevice = this.devices[existingIndex];
          const updatedDevice = {
            ...existingDevice,
            ...normalizedDevice,
            lastSeen: Date.now()
          };
          this.devices[existingIndex] = updatedDevice;
          updatedDevices.push(updatedDevice);
        }
      }
      
      this.lastScanTime = Date.now();
      
      this.emit('scanCompleted', {
        timestamp: this.lastScanTime,
        totalDevices: this.devices.length,
        newDevices: newDevices.length,
        devices: [...this.devices]
      });
      
      console.log(`[DeviceDiscoveryService] 扫描完成，发现 ${newDevices.length} 个新设备，更新 ${updatedDevices.length} 个设备，当前共 ${this.devices.length} 个设备`);
    } catch (error) {
      console.error('扫描设备失败:', error);
      this.emit('scanError', { error: error.message, timestamp: Date.now() });
    }
  }

  /**
   * 获取所有设备
   * @returns {Array} 设备列表
   */
  getDevices() {
    return [...this.devices];
  }

  /**
   * 根据ID获取设备
   * @param {string} deviceId - 设备ID
   * @returns {Object|null} 设备对象或null
   */
  getDeviceById(deviceId) {
    return this.devices.find(device => device.id === deviceId) || null;
  }

  /**
   * 根据类型获取设备
   * @param {string} deviceType - 设备类型
   * @returns {Array} 设备列表
   */
  getDevicesByType(deviceType) {
    return this.devices.filter(device => device.type === deviceType);
  }

  /**
   * 获取已连接的设备
   * @returns {Array} 已连接设备列表
   */
  getConnectedDevices() {
    return this.devices.filter(device => device.status === 'connected');
  }

  /**
   * 获取未连接的设备
   * @returns {Array} 未连接设备列表
   */
  getDisconnectedDevices() {
    return this.devices.filter(device => device.status === 'disconnected');
  }

  /**
   * 搜索设备
   * @param {string} query - 搜索关键词
   * @returns {Array} 匹配的设备列表
   */
  searchDevices(query) {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase();
    return this.devices.filter(device => 
      device.name.toLowerCase().includes(lowerQuery) ||
      device.id.toLowerCase().includes(lowerQuery) ||
      device.ip.toLowerCase().includes(lowerQuery) ||
      device.mac.toLowerCase().includes(lowerQuery) ||
      device.manufacturer.toLowerCase().includes(lowerQuery) ||
      device.model.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 过滤设备
   * @param {Object} filters - 过滤条件
   * @returns {Array} 过滤后的设备列表
   */
  filterDevices(filters) {
    return this.devices.filter(device => {
      // 检查每个过滤条件
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'minSignalStrength' && device.connection?.signalStrength < value) {
          return false;
        } else if (key === 'maxLatency' && device.connection?.latency > value) {
          return false;
        } else if (key === 'minBatteryLevel' && device.metadata?.batteryLevel < value) {
          return false;
        } else if (typeof value === 'string' && device[key] !== value) {
          return false;
        } else if (Array.isArray(value) && !value.includes(device[key])) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 手动添加设备
   * @param {Object} deviceData - 设备数据
   * @returns {Object} 添加的设备对象
   */
  addDevice(deviceData) {
    const device = {
      id: deviceData.id || `${deviceData.type.toLowerCase()}-${Date.now()}`,
      name: deviceData.name || `${deviceData.type} Device`,
      type: deviceData.type || 'Unknown',
      manufacturer: deviceData.manufacturer || 'Unknown',
      model: deviceData.model || 'Unknown',
      ip: deviceData.ip || `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      mac: deviceData.mac || this.generateRandomMacAddress(),
      status: deviceData.status || 'connected',
      lastSeen: Date.now(),
      lastStatusChange: Date.now(),
      firstSeen: Date.now(),
      icon: deviceData.icon || 'desktop',
      color: deviceData.color || '#1890ff',
      metadata: deviceData.metadata || this.generateDeviceMetadata(deviceData.type || 'Unknown'),
      performance: deviceData.performance || this.generateDevicePerformance(),
      connection: deviceData.connection || {
        signalStrength: 5,
        latency: 20,
        bandwidth: 50,
        uptime: 0,
        protocol: 'WebSocket'
      }
    };
    
    this.devices.push(device);
    
    this.emit('deviceAdded', {
      device,
      source: 'manual',
      timestamp: Date.now()
    });
    
    return device;
  }

  /**
   * 手动移除设备
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功移除
   */
  removeDevice(deviceId) {
    const index = this.devices.findIndex(device => device.id === deviceId);
    
    if (index === -1) {
      return false;
    }
    
    const removedDevice = this.devices.splice(index, 1)[0];
    
    this.emit('deviceRemoved', {
      device: removedDevice,
      reason: 'manual',
      timestamp: Date.now()
    });
    
    return true;
  }

  /**
   * 更新设备状态
   * @param {string} deviceId - 设备ID
   * @param {string} status - 新状态
   * @returns {boolean} 是否成功更新
   */
  updateDeviceStatus(deviceId, status) {
    const device = this.getDeviceById(deviceId);
    
    if (!device) {
      return false;
    }
    
    const oldStatus = device.status;
    device.status = status;
    device.lastStatusChange = Date.now();
    
    this.emit('deviceStatusChanged', {
      device,
      oldStatus,
      newStatus: status,
      timestamp: Date.now()
    });
    
    return true;
  }

  /**
   * 清空设备列表
   */
  clearDevices() {
    const oldDevices = [...this.devices];
    this.devices = [];
    
    this.emit('devicesCleared', {
      timestamp: Date.now(),
      clearedCount: oldDevices.length,
      devices: oldDevices
    });
  }

  /**
   * 获取扫描状态
   * @returns {Object} 扫描状态信息
   */
  getScanStatus() {
    return {
      isScanning: this.isScanning,
      lastScanTime: this.lastScanTime,
      deviceCount: this.devices.length,
      scanInterval: this.scanInterval ? true : false
    };
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
   * @param {Function} callback - 回调函数（可选）
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
        console.error(`[DeviceDiscoveryService] 事件回调执行错误 (${event}):`, error);
      }
    });
  }

  /**
   * 导出设备列表为JSON
   * @returns {string} JSON字符串
   */
  exportDevices() {
    return JSON.stringify(this.devices, null, 2);
  }

  /**
   * 从JSON导入设备列表
   * @param {string} jsonData - JSON字符串
   * @returns {number} 导入的设备数量
   */
  importDevices(jsonData) {
    try {
      const importedDevices = JSON.parse(jsonData);
      if (!Array.isArray(importedDevices)) {
        throw new Error('Invalid device data format');
      }
      
      // 更新导入设备的时间戳
      importedDevices.forEach(device => {
        device.lastSeen = Date.now();
        device.lastStatusChange = Date.now();
      });
      
      this.devices = [...importedDevices];
      
      this.emit('devicesImported', {
        timestamp: Date.now(),
        importedCount: importedDevices.length,
        devices: [...this.devices]
      });
      
      return importedDevices.length;
    } catch (error) {
      console.error('[DeviceDiscoveryService] 导入设备失败:', error);
      this.emit('importError', { error: error.message, timestamp: Date.now() });
      return 0;
    }
  }
}

// 创建单例实例
const deviceDiscoveryService = new DeviceDiscoveryService();

export default deviceDiscoveryService;