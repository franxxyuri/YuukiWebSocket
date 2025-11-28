// DeviceDiscoveryService.js
// 模拟设备发现服务，用于前端调试和测试

class DeviceDiscoveryService {
  constructor() {
    this.devices = [];
    this.listeners = new Map();
    this.isScanning = false;
    this.scanInterval = null;
    this.scanDelay = 1000; // 模拟扫描延迟
    this.lastScanTime = null;
    
    // 预设的模拟设备模板
    this.deviceTemplates = [
      {
        type: 'Android',
        manufacturers: ['Google', 'Samsung', 'Xiaomi', 'OPPO', 'vivo', 'OnePlus'],
        models: ['Pixel 7', 'Galaxy S23', 'Mi 13', 'Find X6', 'X90 Pro', '11 Pro'],
        icon: 'smartphone',
        color: '#3f8600'
      },
      {
        type: 'Windows',
        manufacturers: ['Microsoft', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer'],
        models: ['Surface Pro 9', 'XPS 15', 'Spectre x360', 'ThinkPad X1', 'ROG Zephyrus', 'Swift 5'],
        icon: 'desktop',
        color: '#1890ff'
      },
      {
        type: 'iOS',
        manufacturers: ['Apple'],
        models: ['iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone SE'],
        icon: 'smartphone',
        color: '#fa8c16'
      },
      {
        type: 'macOS',
        manufacturers: ['Apple'],
        models: ['MacBook Pro 16', 'MacBook Air M2', 'iMac 24', 'Mac Studio'],
        icon: 'laptop',
        color: '#1890ff'
      },
      {
        type: 'Linux',
        manufacturers: ['Ubuntu', 'Fedora', 'Debian', 'Arch', 'Manjaro'],
        models: ['Desktop', 'Laptop', 'Server', 'Development VM'],
        icon: 'desktop',
        color: '#52c41a'
      }
    ];
  }

  /**
   * 开始扫描设备
   * @param {boolean} continuous - 是否连续扫描
   * @param {number} interval - 连续扫描间隔（毫秒），默认为5000ms
   */
  startScan(continuous = false, interval = 5000) {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.emit('scanStarted', { timestamp: Date.now() });
    
    // 执行单次扫描
    this.scan();
    
    // 如果需要连续扫描，设置定时器
    if (continuous) {
      this.scanInterval = setInterval(() => {
        this.scan();
      }, interval);
    }
    
    return this;
  }

  /**
   * 停止扫描
   */
  stopScan() {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    this.emit('scanStopped', { timestamp: Date.now() });
    return this;
  }

  /**
   * 扫描设备
   * @private
   */
  scan() {
    console.log('[DeviceDiscoveryService] 开始扫描设备...');
    
    // 模拟扫描延迟
    setTimeout(() => {
      // 随机添加0-3个新设备
      const newDeviceCount = Math.floor(Math.random() * 4);
      const newDevices = [];
      
      for (let i = 0; i < newDeviceCount; i++) {
        const newDevice = this.createRandomDevice();
        
        // 检查设备是否已存在
        const exists = this.devices.some(device => device.id === newDevice.id || device.ip === newDevice.ip);
        if (!exists) {
          this.devices.push(newDevice);
          newDevices.push(newDevice);
          this.emit('deviceFound', newDevice);
        }
      }
      
      // 随机改变1-2个现有设备的状态
      const deviceCount = this.devices.length;
      if (deviceCount > 0) {
        const statusChangeCount = Math.min(Math.floor(Math.random() * 3), deviceCount);
        
        for (let i = 0; i < statusChangeCount; i++) {
          const randomIndex = Math.floor(Math.random() * deviceCount);
          const device = this.devices[randomIndex];
          
          // 切换设备状态
          const oldStatus = device.status;
          const newStatus = oldStatus === 'connected' ? 'disconnected' : 'connected';
          
          device.status = newStatus;
          device.lastStatusChange = Date.now();
          
          this.emit('deviceStatusChanged', {
            device,
            oldStatus,
            newStatus,
            timestamp: Date.now()
          });
        }
      }
      
      // 随机移除0-1个设备（下线）
      if (deviceCount > newDeviceCount && Math.random() > 0.5) {
        const removeIndex = Math.floor(Math.random() * deviceCount);
        const removedDevice = this.devices.splice(removeIndex, 1)[0];
        
        this.emit('deviceRemoved', {
          device: removedDevice,
          reason: 'offline',
          timestamp: Date.now()
        });
      }
      
      this.lastScanTime = Date.now();
      
      this.emit('scanCompleted', {
        timestamp: this.lastScanTime,
        totalDevices: this.devices.length,
        newDevices: newDevices.length,
        devices: [...this.devices]
      });
      
      console.log(`[DeviceDiscoveryService] 扫描完成，发现 ${newDevices.length} 个新设备，当前共 ${this.devices.length} 个设备`);
    }, this.scanDelay);
  }

  /**
   * 创建随机设备
   * @private
   * @returns {Object} 随机生成的设备对象
   */
  createRandomDevice() {
    // 随机选择设备类型
    const templateIndex = Math.floor(Math.random() * this.deviceTemplates.length);
    const template = this.deviceTemplates[templateIndex];
    
    // 随机选择制造商和型号
    const manufacturer = template.manufacturers[Math.floor(Math.random() * template.manufacturers.length)];
    const model = template.models[Math.floor(Math.random() * template.models.length)];
    
    // 生成随机IP地址（192.168.1.x网段）
    const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    
    // 生成随机ID
    const id = `${template.type.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 随机生成MAC地址
    const mac = this.generateRandomMacAddress();
    
    // 随机设备状态（80%概率已连接）
    const status = Math.random() > 0.2 ? 'connected' : 'disconnected';
    
    // 生成设备名称
    const name = `${manufacturer} ${model}`;
    
    return {
      id,
      name,
      type: template.type,
      manufacturer,
      model,
      ip,
      mac,
      status,
      lastSeen: Date.now(),
      lastStatusChange: Date.now(),
      firstSeen: Date.now(),
      icon: template.icon,
      color: template.color,
      // 生成随机的设备元数据
      metadata: this.generateDeviceMetadata(template.type),
      // 生成随机的性能指标
      performance: this.generateDevicePerformance(),
      // 生成随机的连接信息
      connection: {
        signalStrength: Math.floor(Math.random() * 4) + 1, // 1-5格信号
        latency: Math.floor(Math.random() * 100) + 5, // 5-105ms延迟
        bandwidth: Math.floor(Math.random() * 100) + 10, // 10-110Mbps带宽
        uptime: Math.floor(Math.random() * 86400000), // 0-24小时在线时间
        protocol: Math.random() > 0.5 ? 'WebSocket' : 'MQTT'
      }
    };
  }

  /**
   * 生成随机MAC地址
   * @private
   * @returns {string} MAC地址
   */
  generateRandomMacAddress() {
    const hexDigits = '0123456789ABCDEF';
    let mac = '';
    
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':';
      mac += hexDigits.charAt(Math.floor(Math.random() * 16));
      mac += hexDigits.charAt(Math.floor(Math.random() * 16));
    }
    
    return mac;
  }

  /**
   * 生成设备元数据
   * @private
   * @param {string} deviceType - 设备类型
   * @returns {Object} 设备元数据
   */
  generateDeviceMetadata(deviceType) {
    const metadata = {
      osVersion: this.generateRandomOsVersion(deviceType),
      appVersion: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
      batteryLevel: deviceType === 'Windows' || deviceType === 'macOS' ? null : Math.floor(Math.random() * 100) + 1,
      storageTotal: Math.floor(Math.random() * 1024) + 128, // 128-1152 GB
      storageUsed: Math.floor(Math.random() * 512) + 10, // 10-522 GB
      screenResolution: deviceType === 'Windows' || deviceType === 'macOS' 
        ? ['1920x1080', '2560x1440', '3840x2160'][Math.floor(Math.random() * 3)]
        : ['1080x2400', '1200x2778', '1344x2992'][Math.floor(Math.random() * 3)]
    };
    
    // 添加设备类型特定的元数据
    if (deviceType === 'Android') {
      metadata.androidVersion = ['11', '12', '13', '14'][Math.floor(Math.random() * 4)];
      metadata.sdkVersion = Math.floor(Math.random() * 10) + 30; // API 30-39
    } else if (deviceType === 'iOS') {
      metadata.iosVersion = ['15.7', '16.5', '17.0', '17.2'][Math.floor(Math.random() * 4)];
      metadata.deviceIdiom = ['phone', 'pad'][Math.floor(Math.random() * 2)];
    }
    
    return metadata;
  }

  /**
   * 生成随机操作系统版本
   * @private
   * @param {string} deviceType - 设备类型
   * @returns {string} 操作系统版本
   */
  generateRandomOsVersion(deviceType) {
    const versions = {
      Windows: ['Windows 10', 'Windows 11', 'Windows Server 2019', 'Windows Server 2022'],
      macOS: ['macOS Monterey', 'macOS Ventura', 'macOS Sonoma'],
      Linux: ['Ubuntu 22.04', 'Fedora 38', 'Debian 12', 'Arch Linux', 'Manjaro 22.1'],
      Android: ['Android 11', 'Android 12', 'Android 13', 'Android 14'],
      iOS: ['iOS 15', 'iOS 16', 'iOS 17']
    };
    
    const typeVersions = versions[deviceType] || ['Unknown'];
    return typeVersions[Math.floor(Math.random() * typeVersions.length)];
  }

  /**
   * 生成设备性能指标
   * @private
   * @returns {Object} 设备性能指标
   */
  generateDevicePerformance() {
    return {
      cpuUsage: Math.floor(Math.random() * 100), // 0-100%
      memoryUsage: Math.floor(Math.random() * 100), // 0-100%
      temperature: Math.floor(Math.random() * 40) + 30, // 30-70°C
      fanspeed: Math.floor(Math.random() * 3000) + 1000, // 1000-4000 RPM
      networkIn: Math.floor(Math.random() * 100), // 0-100 Mbps
      networkOut: Math.floor(Math.random() * 50) // 0-50 Mbps
    };
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