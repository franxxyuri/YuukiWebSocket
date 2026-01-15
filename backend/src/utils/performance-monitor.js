/**
 * 性能监控系统
 * 实时监控 CPU、内存、网络等系统资源
 */

import os from 'os';
import logger from './logger.js';

class PerformanceMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 5000; // 默认 5 秒采样一次
    this.historySize = options.historySize || 100; // 保留最近 100 个数据点
    
    this.metrics = {
      cpu: [],
      memory: [],
      network: [],
      connections: []
    };
    
    this.alerts = [];
    this.thresholds = {
      cpu: options.cpuThreshold || 80, // CPU 使用率阈值 80%
      memory: options.memoryThreshold || 80, // 内存使用率阈值 80%
      connections: options.connectionsThreshold || 100 // 连接数阈值
    };
    
    this.monitoring = false;
    this.lastCPUInfo = null;
    
    logger.info('性能监控系统已初始化', {
      interval: this.interval,
      thresholds: this.thresholds
    });
  }

  /**
   * 开始监控
   */
  start() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.monitorLoop();
    
    logger.info('性能监控已启动');
  }

  /**
   * 停止监控
   */
  stop() {
    this.monitoring = false;
    logger.info('性能监控已停止');
  }

  /**
   * 监控循环
   */
  async monitorLoop() {
    while (this.monitoring) {
      try {
        await this.collectMetrics();
        await new Promise(resolve => setTimeout(resolve, this.interval));
      } catch (error) {
        logger.error('性能监控错误', { error: error.message });
      }
    }
  }

  /**
   * 收集性能指标
   */
  async collectMetrics() {
    const timestamp = Date.now();
    
    // 收集 CPU 使用率
    const cpuUsage = await this.getCPUUsage();
    this.addMetric('cpu', { timestamp, value: cpuUsage });
    
    // 收集内存使用率
    const memoryUsage = this.getMemoryUsage();
    this.addMetric('memory', { timestamp, value: memoryUsage });
    
    // 检查阈值
    this.checkThresholds(cpuUsage, memoryUsage);
  }

  /**
   * 获取 CPU 使用率
   * @returns {Promise<number>} CPU 使用率百分比
   */
  getCPUUsage() {
    return new Promise((resolve) => {
      const cpus = os.cpus();
      
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const currentCPUInfo = { idle: totalIdle, total: totalTick };
      
      if (this.lastCPUInfo) {
        const idleDiff = currentCPUInfo.idle - this.lastCPUInfo.idle;
        const totalDiff = currentCPUInfo.total - this.lastCPUInfo.total;
        const usage = 100 - (100 * idleDiff / totalDiff);
        
        this.lastCPUInfo = currentCPUInfo;
        resolve(Math.round(usage * 100) / 100);
      } else {
        this.lastCPUInfo = currentCPUInfo;
        resolve(0);
      }
    });
  }

  /**
   * 获取内存使用率
   * @returns {number} 内存使用率百分比
   */
  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;
    
    return Math.round(usage * 100) / 100;
  }

  /**
   * 添加指标数据
   * @param {string} type - 指标类型
   * @param {Object} data - 指标数据
   */
  addMetric(type, data) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }
    
    this.metrics[type].push(data);
    
    // 保持历史数据大小
    if (this.metrics[type].length > this.historySize) {
      this.metrics[type].shift();
    }
  }

  /**
   * 检查阈值并生成告警
   * @param {number} cpuUsage - CPU 使用率
   * @param {number} memoryUsage - 内存使用率
   */
  checkThresholds(cpuUsage, memoryUsage) {
    const alerts = [];
    
    if (cpuUsage > this.thresholds.cpu) {
      alerts.push({
        type: 'cpu',
        level: 'warning',
        message: `CPU 使用率过高: ${cpuUsage}%`,
        value: cpuUsage,
        threshold: this.thresholds.cpu,
        timestamp: Date.now()
      });
    }
    
    if (memoryUsage > this.thresholds.memory) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        message: `内存使用率过高: ${memoryUsage}%`,
        value: memoryUsage,
        threshold: this.thresholds.memory,
        timestamp: Date.now()
      });
    }
    
    // 记录告警
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      
      // 保持告警历史大小
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }
      
      // 记录日志
      alerts.forEach(alert => {
        logger.warn('性能告警', alert);
      });
    }
  }

  /**
   * 获取当前性能快照
   * @returns {Object} 性能快照
   */
  getSnapshot() {
    const getLatest = (type) => {
      const metrics = this.metrics[type];
      return metrics.length > 0 ? metrics[metrics.length - 1].value : 0;
    };
    
    return {
      cpu: getLatest('cpu'),
      memory: getLatest('memory'),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime()
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      timestamp: Date.now()
    };
  }

  /**
   * 获取历史数据
   * @param {string} type - 指标类型
   * @param {number} limit - 数据点数量
   * @returns {Array} 历史数据
   */
  getHistory(type, limit = 50) {
    const metrics = this.metrics[type] || [];
    return metrics.slice(-limit);
  }

  /**
   * 获取所有告警
   * @param {number} limit - 告警数量
   * @returns {Array} 告警列表
   */
  getAlerts(limit = 20) {
    return this.alerts.slice(-limit);
  }

  /**
   * 清除告警
   */
  clearAlerts() {
    this.alerts = [];
    logger.info('告警已清除');
  }

  /**
   * 获取统计摘要
   * @returns {Object} 统计摘要
   */
  getSummary() {
    const calculateAvg = (type) => {
      const metrics = this.metrics[type];
      if (metrics.length === 0) return 0;
      
      const sum = metrics.reduce((acc, m) => acc + m.value, 0);
      return Math.round((sum / metrics.length) * 100) / 100;
    };
    
    const calculateMax = (type) => {
      const metrics = this.metrics[type];
      if (metrics.length === 0) return 0;
      
      return Math.max(...metrics.map(m => m.value));
    };
    
    return {
      cpu: {
        current: this.metrics.cpu.length > 0 
          ? this.metrics.cpu[this.metrics.cpu.length - 1].value 
          : 0,
        average: calculateAvg('cpu'),
        max: calculateMax('cpu')
      },
      memory: {
        current: this.metrics.memory.length > 0 
          ? this.metrics.memory[this.metrics.memory.length - 1].value 
          : 0,
        average: calculateAvg('memory'),
        max: calculateMax('memory')
      },
      alerts: {
        total: this.alerts.length,
        recent: this.alerts.slice(-5)
      }
    };
  }

  /**
   * 重置所有数据
   */
  reset() {
    this.metrics = {
      cpu: [],
      memory: [],
      network: [],
      connections: []
    };
    this.alerts = [];
    logger.info('性能监控数据已重置');
  }
}

export default PerformanceMonitor;
