/**
 * 智能设备发现系统
 * 根据网络状况和设备活跃度动态调整广播策略
 */

import logger from './logger.js';

class SmartDiscovery {
  constructor(options = {}) {
    // 配置参数
    this.minInterval = options.minInterval || 3000;  // 最小广播间隔 3秒
    this.maxInterval = options.maxInterval || 30000; // 最大广播间隔 30秒
    this.currentInterval = options.initialInterval || 5000; // 当前间隔
    
    // 设备缓存
    this.deviceCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 60000; // 缓存超时 60秒
    
    // 网络状态
    this.networkQuality = 'good'; // good, fair, poor
    this.failedBroadcasts = 0;
    this.successfulBroadcasts = 0;
    
    // 统计信息
    this.stats = {
      totalBroadcasts: 0,
      cachedResponses: 0,
      intervalAdjustments: 0
    };
    
    logger.info('智能设备发现系统已初始化', {
      minInterval: this.minInterval,
      maxInterval: this.maxInterval,
      currentInterval: this.currentInterval
    });
  }

  /**
   * 添加设备到缓存
   * @param {Object} device - 设备信息
   */
  cacheDevice(device) {
    const key = device.deviceId || device.ip;
    
    this.deviceCache.set(key, {
      ...device,
      cachedAt: Date.now(),
      lastSeen: Date.now()
    });
    
    // 设置缓存过期清理
    setTimeout(() => {
      if (this.deviceCache.has(key)) {
        const cached = this.deviceCache.get(key);
        if (Date.now() - cached.lastSeen > this.cacheTimeout) {
          this.deviceCache.delete(key);
          logger.debug('设备缓存已过期', { deviceId: key });
        }
      }
    }, this.cacheTimeout);
  }

  /**
   * 从缓存获取设备
   * @param {string} deviceId - 设备ID
   * @returns {Object|null} 设备信息
   */
  getCachedDevice(deviceId) {
    const device = this.deviceCache.get(deviceId);
    
    if (device) {
      // 检查缓存是否过期
      if (Date.now() - device.cachedAt < this.cacheTimeout) {
        this.stats.cachedResponses++;
        return device;
      } else {
        this.deviceCache.delete(deviceId);
      }
    }
    
    return null;
  }

  /**
   * 获取所有缓存的设备
   * @returns {Array} 设备列表
   */
  getAllCachedDevices() {
    const devices = [];
    const now = Date.now();
    
    this.deviceCache.forEach((device, key) => {
      if (now - device.cachedAt < this.cacheTimeout) {
        devices.push(device);
      } else {
        this.deviceCache.delete(key);
      }
    });
    
    return devices;
  }

  /**
   * 更新设备最后可见时间
   * @param {string} deviceId - 设备ID
   */
  updateDeviceLastSeen(deviceId) {
    const device = this.deviceCache.get(deviceId);
    if (device) {
      device.lastSeen = Date.now();
    }
  }

  /**
   * 记录广播结果
   * @param {boolean} success - 是否成功
   */
  recordBroadcast(success) {
    this.stats.totalBroadcasts++;
    
    if (success) {
      this.successfulBroadcasts++;
      this.failedBroadcasts = Math.max(0, this.failedBroadcasts - 1);
    } else {
      this.failedBroadcasts++;
      this.successfulBroadcasts = Math.max(0, this.successfulBroadcasts - 1);
    }
    
    // 更新网络质量评估
    this.updateNetworkQuality();
    
    // 调整广播间隔
    this.adjustBroadcastInterval();
  }

  /**
   * 更新网络质量评估
   */
  updateNetworkQuality() {
    const total = this.successfulBroadcasts + this.failedBroadcasts;
    if (total === 0) return;
    
    const successRate = this.successfulBroadcasts / total;
    
    if (successRate > 0.8) {
      this.networkQuality = 'good';
    } else if (successRate > 0.5) {
      this.networkQuality = 'fair';
    } else {
      this.networkQuality = 'poor';
    }
  }

  /**
   * 动态调整广播间隔
   */
  adjustBroadcastInterval() {
    const oldInterval = this.currentInterval;
    
    // 根据网络质量和设备数量调整
    const deviceCount = this.deviceCache.size;
    
    if (this.networkQuality === 'good' && deviceCount > 0) {
      // 网络好且有设备，可以降低广播频率
      this.currentInterval = Math.min(
        this.currentInterval * 1.2,
        this.maxInterval
      );
    } else if (this.networkQuality === 'poor' || deviceCount === 0) {
      // 网络差或无设备，提高广播频率
      this.currentInterval = Math.max(
        this.currentInterval * 0.8,
        this.minInterval
      );
    }
    
    // 四舍五入到整数
    this.currentInterval = Math.round(this.currentInterval);
    
    if (oldInterval !== this.currentInterval) {
      this.stats.intervalAdjustments++;
      logger.info('广播间隔已调整', {
        from: oldInterval,
        to: this.currentInterval,
        networkQuality: this.networkQuality,
        deviceCount
      });
    }
  }

  /**
   * 获取当前广播间隔
   * @returns {number} 广播间隔（毫秒）
   */
  getBroadcastInterval() {
    return this.currentInterval;
  }

  /**
   * 判断是否需要广播
   * @returns {boolean} 是否需要广播
   */
  shouldBroadcast() {
    // 如果有活跃设备且网络质量好，可以降低广播频率
    if (this.deviceCache.size > 0 && this.networkQuality === 'good') {
      // 随机跳过一些广播
      return Math.random() > 0.3; // 70% 的概率广播
    }
    
    return true;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      currentInterval: this.currentInterval,
      networkQuality: this.networkQuality,
      cachedDevices: this.deviceCache.size,
      successfulBroadcasts: this.successfulBroadcasts,
      failedBroadcasts: this.failedBroadcasts
    };
  }

  /**
   * 清空设备缓存
   */
  clearCache() {
    this.deviceCache.clear();
    logger.info('设备缓存已清空');
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalBroadcasts: 0,
      cachedResponses: 0,
      intervalAdjustments: 0
    };
    this.successfulBroadcasts = 0;
    this.failedBroadcasts = 0;
    logger.info('统计信息已重置');
  }
}

export default SmartDiscovery;
