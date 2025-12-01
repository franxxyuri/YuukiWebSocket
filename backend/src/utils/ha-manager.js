/**
 * 高可用性管理模块
 * 实现负载均衡、故障转移、资源监控和自动恢复功能
 */

import os from 'os';
import fs from 'fs';
import { configManager } from '../../config/config.mjs';

// 资源监控间隔（毫秒）
const MONITOR_INTERVAL = 5000;

// 资源阈值配置
const RESOURCE_THRESHOLDS = {
  cpu: 80, // CPU使用率阈值（%）
  memory: 85, // 内存使用率阈值（%）
  disk: 90, // 磁盘使用率阈值（%）
  connections: 90 // 连接数阈值（%）
};

// 服务状态
const SERVICE_STATES = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error',
  RECOVERING: 'recovering'
};

class HighAvailabilityManager {
  constructor() {
    this.services = new Map();
    this.monitorInterval = null;
    this.resourceHistory = [];
    this.isMonitoring = false;
    this.recoveryAttempts = new Map();
    this.loadBalancingEnabled = configManager.get('ha.enableLoadBalancing') || false;
    this.faultTransferEnabled = configManager.get('ha.enableFaultTransfer') || false;
    this.resourceMonitoringEnabled = configManager.get('ha.enableResourceMonitoring') || true;
    this.autoRecoveryEnabled = configManager.get('ha.enableAutoRecovery') || true;
    
    // 监听配置变化
    configManager.onConfigChange((newConfig) => {
      this.loadBalancingEnabled = newConfig.ha.enableLoadBalancing || false;
      this.faultTransferEnabled = newConfig.ha.enableFaultTransfer || false;
      this.resourceMonitoringEnabled = newConfig.ha.enableResourceMonitoring || true;
      this.autoRecoveryEnabled = newConfig.ha.enableAutoRecovery || true;
      
      console.log('高可用性配置已更新:', {
        loadBalancingEnabled: this.loadBalancingEnabled,
        faultTransferEnabled: this.faultTransferEnabled,
        resourceMonitoringEnabled: this.resourceMonitoringEnabled,
        autoRecoveryEnabled: this.autoRecoveryEnabled
      });
    });
  }
  
  /**
   * 注册服务
   * @param {String} serviceName 服务名称
   * @param {Object} service 服务实例
   * @param {Function} healthCheck 健康检查函数
   * @param {Function} recoveryAction 恢复操作函数
   */
  registerService(serviceName, service, healthCheck, recoveryAction) {
    this.services.set(serviceName, {
      name: serviceName,
      instance: service,
      healthCheck: healthCheck,
      recoveryAction: recoveryAction,
      status: SERVICE_STATES.RUNNING,
      lastHealthCheck: Date.now(),
      healthCheckResults: [],
      recoveryAttempts: 0,
      lastRecovery: null
    });
    
    console.log(`服务已注册: ${serviceName}`);
  }
  
  /**
   * 启动资源监控
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('资源监控已在运行');
      return;
    }
    
    this.isMonitoring = true;
    
    this.monitorInterval = setInterval(() => {
      this.monitorResources();
      this.checkServicesHealth();
    }, MONITOR_INTERVAL);
    
    console.log('资源监控已启动');
  }
  
  /**
   * 停止资源监控
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.isMonitoring = false;
      console.log('资源监控已停止');
    }
  }
  
  /**
   * 监控系统资源
   */
  monitorResources() {
    if (!this.resourceMonitoringEnabled) {
      return;
    }
    
    try {
      // 获取CPU使用率
      const cpuUsage = this.getCpuUsage();
      
      // 获取内存使用情况
      const memoryUsage = this.getMemoryUsage();
      
      // 获取磁盘使用情况
      const diskUsage = this.getDiskUsage();
      
      // 获取网络统计
      const networkStats = this.getNetworkStats();
      
      // 获取系统负载
      const loadAverage = os.loadavg();
      
      // 记录资源使用情况
      const resourceData = {
        timestamp: Date.now(),
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
        network: networkStats,
        loadAverage: loadAverage,
        uptime: os.uptime(),
        connections: this.getConnectionsCount()
      };
      
      // 保存资源历史记录（最多保存100条）
      this.resourceHistory.push(resourceData);
      if (this.resourceHistory.length > 100) {
        this.resourceHistory.shift();
      }
      
      // 检查资源阈值
      this.checkResourceThresholds(resourceData);
      
      console.log('资源监控数据:', {
        cpu: `${cpuUsage.toFixed(1)}%`,
        memory: `${memoryUsage.toFixed(1)}%`,
        disk: `${diskUsage.toFixed(1)}%`,
        load: loadAverage[0].toFixed(2)
      });
    } catch (error) {
      console.error('资源监控失败:', error.message);
    }
  }
  
  /**
   * 获取CPU使用率
   * @returns {Number} CPU使用率（%）
   */
  getCpuUsage() {
    // 使用os.loadavg()计算CPU使用率
    const loadAverage = os.loadavg()[0];
    const cpus = os.cpus().length;
    return Math.min((loadAverage / cpus) * 100, 100);
  }
  
  /**
   * 获取内存使用率
   * @returns {Number} 内存使用率（%）
   */
  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return (usedMemory / totalMemory) * 100;
  }
  
  /**
   * 获取磁盘使用率
   * @returns {Number} 磁盘使用率（%）
   */
  getDiskUsage() {
    try {
      // 获取当前目录的磁盘使用情况
      const diskStats = fs.statfsSync('.');
      const total = diskStats.blocks * diskStats.bsize;
      const free = diskStats.bfree * diskStats.bsize;
      const used = total - free;
      return (used / total) * 100;
    } catch (error) {
      console.error('获取磁盘使用率失败:', error.message);
      return 0;
    }
  }
  
  /**
   * 获取网络统计
   * @returns {Object} 网络统计信息
   */
  getNetworkStats() {
    const networkInterfaces = os.networkInterfaces();
    const stats = {
      interfaces: {},
      totalBytesIn: 0,
      totalBytesOut: 0
    };
    
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      stats.interfaces[name] = {
        addresses: interfaces.map(iface => iface.address),
        bytesIn: 0,
        bytesOut: 0
      };
    }
    
    return stats;
  }
  
  /**
   * 获取连接数
   * @returns {Number} 连接数
   */
  getConnectionsCount() {
    // 这里简化实现，实际应该从各个服务获取连接数
    let totalConnections = 0;
    
    for (const [serviceName, service] of this.services) {
      if (service.instance && typeof service.instance.getConnections === 'function') {
        totalConnections += service.instance.getConnections();
      }
    }
    
    return totalConnections;
  }
  
  /**
   * 检查资源阈值
   * @param {Object} resourceData 资源数据
   */
  checkResourceThresholds(resourceData) {
    const alerts = [];
    
    // 检查CPU阈值
    if (resourceData.cpu > RESOURCE_THRESHOLDS.cpu) {
      alerts.push(`CPU使用率过高: ${resourceData.cpu.toFixed(1)}%`);
    }
    
    // 检查内存阈值
    if (resourceData.memory > RESOURCE_THRESHOLDS.memory) {
      alerts.push(`内存使用率过高: ${resourceData.memory.toFixed(1)}%`);
    }
    
    // 检查磁盘阈值
    if (resourceData.disk > RESOURCE_THRESHOLDS.disk) {
      alerts.push(`磁盘使用率过高: ${resourceData.disk.toFixed(1)}%`);
    }
    
    // 检查连接数阈值
    const maxConnections = configManager.get('websocket.maxConnections') || 100;
    const connectionPercentage = (resourceData.connections / maxConnections) * 100;
    if (connectionPercentage > RESOURCE_THRESHOLDS.connections) {
      alerts.push(`连接数过高: ${resourceData.connections}/${maxConnections} (${connectionPercentage.toFixed(1)}%)`);
    }
    
    // 发送告警
    if (alerts.length > 0) {
      this.sendResourceAlert(alerts, resourceData);
    }
  }
  
  /**
   * 发送资源告警
   * @param {Array} alerts 告警信息
   * @param {Object} resourceData 资源数据
   */
  sendResourceAlert(alerts, resourceData) {
    console.warn('资源告警:', {
      timestamp: new Date().toISOString(),
      alerts: alerts,
      resourceData: resourceData
    });
    
    // 这里可以添加告警通知逻辑，如发送邮件、短信等
  }
  
  /**
   * 检查服务健康状态
   */
  async checkServicesHealth() {
    for (const [serviceName, service] of this.services) {
      try {
        const isHealthy = await service.healthCheck();
        
        // 记录健康检查结果
        service.healthCheckResults.push({
          timestamp: Date.now(),
          healthy: isHealthy
        });
        
        // 只保留最近10次健康检查结果
        if (service.healthCheckResults.length > 10) {
          service.healthCheckResults.shift();
        }
        
        service.lastHealthCheck = Date.now();
        
        if (isHealthy) {
          // 服务健康
          if (service.status !== SERVICE_STATES.RUNNING) {
            console.log(`服务恢复正常: ${serviceName}`);
            service.status = SERVICE_STATES.RUNNING;
            service.recoveryAttempts = 0;
            service.lastRecovery = null;
          }
        } else {
          // 服务不健康
          console.warn(`服务健康检查失败: ${serviceName}`);
          service.status = SERVICE_STATES.ERROR;
          
          // 尝试自动恢复
          if (this.autoRecoveryEnabled) {
            this.attemptRecovery(service);
          }
        }
      } catch (error) {
        console.error(`服务健康检查出错: ${serviceName}`, error.message);
        service.status = SERVICE_STATES.ERROR;
        
        // 尝试自动恢复
        if (this.autoRecoveryEnabled) {
          this.attemptRecovery(service);
        }
      }
    }
  }
  
  /**
   * 尝试恢复服务
   * @param {Object} service 服务对象
   */
  async attemptRecovery(service) {
    // 检查是否正在恢复中
    if (service.status === SERVICE_STATES.RECOVERING) {
      console.warn(`服务正在恢复中，跳过恢复尝试: ${service.name}`);
      return;
    }
    
    // 检查恢复尝试次数
    const maxRecoveryAttempts = 3;
    if (service.recoveryAttempts >= maxRecoveryAttempts) {
      console.error(`服务恢复失败次数过多，停止尝试: ${service.name}`);
      return;
    }
    
    try {
      service.status = SERVICE_STATES.RECOVERING;
      service.recoveryAttempts++;
      
      console.log(`开始恢复服务: ${service.name} (尝试次数: ${service.recoveryAttempts}/${maxRecoveryAttempts})`);
      
      // 执行恢复操作
      await service.recoveryAction();
      
      console.log(`服务恢复成功: ${service.name}`);
      service.status = SERVICE_STATES.RUNNING;
      service.lastRecovery = Date.now();
      
      // 重置恢复尝试次数
      service.recoveryAttempts = 0;
    } catch (error) {
      console.error(`服务恢复失败: ${service.name}`, error.message);
      service.status = SERVICE_STATES.ERROR;
      
      // 如果启用了故障转移，尝试故障转移
      if (this.faultTransferEnabled) {
        this.attemptFaultTransfer(service);
      }
    }
  }
  
  /**
   * 尝试故障转移
   * @param {Object} service 服务对象
   */
  attemptFaultTransfer(service) {
    console.log(`尝试故障转移: ${service.name}`);
    // 这里简化实现，实际应该有更复杂的故障转移逻辑
    // 例如：切换到备用服务实例、重新分配负载等
  }
  
  /**
   * 负载均衡
   * @param {Object} request 请求对象
   * @returns {Object} 选中的服务实例
   */
  loadBalance(request) {
    if (!this.loadBalancingEnabled || this.services.size === 0) {
      // 负载均衡未启用或没有服务，返回第一个服务
      return this.services.values().next().value;
    }
    
    // 这里简化实现，使用轮询算法
    const servicesArray = Array.from(this.services.values());
    const healthyServices = servicesArray.filter(service => service.status === SERVICE_STATES.RUNNING);
    
    if (healthyServices.length === 0) {
      // 没有健康的服务，返回第一个服务
      return servicesArray[0];
    }
    
    // 使用简单的轮询算法
    const selectedIndex = Math.floor(Date.now() / 1000) % healthyServices.length;
    return healthyServices[selectedIndex];
  }
  
  /**
   * 获取系统状态
   * @returns {Object} 系统状态信息
   */
  getSystemStatus() {
    const resourceData = this.resourceHistory[this.resourceHistory.length - 1] || {};
    
    // 获取服务状态
    const serviceStatus = {};
    for (const [serviceName, service] of this.services) {
      serviceStatus[serviceName] = {
        status: service.status,
        lastHealthCheck: service.lastHealthCheck,
        recoveryAttempts: service.recoveryAttempts,
        lastRecovery: service.lastRecovery
      };
    }
    
    return {
      timestamp: Date.now(),
      isMonitoring: this.isMonitoring,
      resourceMonitoringEnabled: this.resourceMonitoringEnabled,
      autoRecoveryEnabled: this.autoRecoveryEnabled,
      loadBalancingEnabled: this.loadBalancingEnabled,
      faultTransferEnabled: this.faultTransferEnabled,
      resourceData: resourceData,
      services: serviceStatus,
      resourceHistory: this.resourceHistory.slice(-10), // 返回最近10条记录
      uptime: os.uptime(),
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    };
  }
  
  /**
   * 获取服务状态
   * @param {String} serviceName 服务名称
   * @returns {Object|null} 服务状态信息
   */
  getServiceStatus(serviceName) {
    return this.services.get(serviceName) || null;
  }
  
  /**
   * 重置恢复尝试次数
   * @param {String} serviceName 服务名称
   */
  resetRecoveryAttempts(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      service.recoveryAttempts = 0;
      console.log(`已重置服务恢复尝试次数: ${serviceName}`);
      return true;
    }
    return false;
  }
  
  /**
   * 关闭高可用性管理器
   */
  close() {
    this.stopMonitoring();
    this.services.clear();
    this.resourceHistory = [];
    this.recoveryAttempts.clear();
    
    console.log('高可用性管理器已关闭');
  }
}

// 创建单例实例
const haManager = new HighAvailabilityManager();

export default haManager;