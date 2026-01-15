/**
 * 高可用服务管理器
 * 实现服务的自动重启、健康检查和故障恢复
 */

import logger from './logger.js';
import { EventEmitter } from 'events';

class ServiceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.services = new Map();
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30秒
    this.maxRestartAttempts = options.maxRestartAttempts || 3;
    this.restartDelay = options.restartDelay || 5000; // 5秒
    this.healthCheckTimer = null;
    
    this.stats = {
      totalRestarts: 0,
      totalFailures: 0,
      uptime: Date.now()
    };
    
    logger.info('服务管理器已初始化', {
      healthCheckInterval: this.healthCheckInterval,
      maxRestartAttempts: this.maxRestartAttempts
    });
  }

  /**
   * 注册服务
   * @param {string} name - 服务名称
   * @param {Object} service - 服务实例
   * @param {Function} healthCheck - 健康检查函数
   * @param {Function} restart - 重启函数
   */
  register(name, service, healthCheck, restart) {
    if (this.services.has(name)) {
      logger.warn('服务已存在，将被覆盖', { name });
    }

    this.services.set(name, {
      name,
      service,
      healthCheck,
      restart,
      status: 'running',
      restartAttempts: 0,
      lastHealthCheck: Date.now(),
      lastRestart: null,
      errors: []
    });

    logger.info('服务已注册', { name });
    this.emit('service:registered', { name });
  }

  /**
   * 注销服务
   * @param {string} name - 服务名称
   */
  unregister(name) {
    if (!this.services.has(name)) {
      logger.warn('服务不存在', { name });
      return false;
    }

    this.services.delete(name);
    logger.info('服务已注销', { name });
    this.emit('service:unregistered', { name });
    return true;
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      logger.warn('健康检查已在运行');
      return;
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);

    logger.info('健康检查已启动');
    this.emit('healthcheck:started');
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.info('健康检查已停止');
      this.emit('healthcheck:stopped');
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    logger.debug('执行健康检查', {
      services: this.services.size
    });

    for (const [name, serviceInfo] of this.services) {
      try {
        const isHealthy = await serviceInfo.healthCheck();
        serviceInfo.lastHealthCheck = Date.now();

        if (!isHealthy) {
          logger.warn('服务健康检查失败', { name });
          await this.handleUnhealthyService(name, serviceInfo);
        } else {
          // 重置重启计数
          if (serviceInfo.restartAttempts > 0) {
            logger.info('服务已恢复', { name });
            serviceInfo.restartAttempts = 0;
            serviceInfo.status = 'running';
          }
        }
      } catch (error) {
        logger.error('健康检查异常', {
          name,
          error: error.message
        });
        await this.handleUnhealthyService(name, serviceInfo);
      }
    }
  }

  /**
   * 处理不健康的服务
   * @param {string} name - 服务名称
   * @param {Object} serviceInfo - 服务信息
   */
  async handleUnhealthyService(name, serviceInfo) {
    serviceInfo.status = 'unhealthy';
    serviceInfo.errors.push({
      timestamp: Date.now(),
      message: '健康检查失败'
    });

    // 保留最近 10 个错误
    if (serviceInfo.errors.length > 10) {
      serviceInfo.errors.shift();
    }

    this.emit('service:unhealthy', { name });

    // 检查是否需要重启
    if (serviceInfo.restartAttempts < this.maxRestartAttempts) {
      await this.restartService(name);
    } else {
      logger.error('服务重启次数超过限制', {
        name,
        attempts: serviceInfo.restartAttempts
      });
      serviceInfo.status = 'failed';
      this.stats.totalFailures++;
      this.emit('service:failed', { name });
    }
  }

  /**
   * 重启服务
   * @param {string} name - 服务名称
   */
  async restartService(name) {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      logger.error('服务不存在', { name });
      return false;
    }

    serviceInfo.restartAttempts++;
    serviceInfo.status = 'restarting';
    this.stats.totalRestarts++;

    logger.info('正在重启服务', {
      name,
      attempt: serviceInfo.restartAttempts,
      maxAttempts: this.maxRestartAttempts
    });

    this.emit('service:restarting', {
      name,
      attempt: serviceInfo.restartAttempts
    });

    try {
      // 等待一段时间再重启
      await new Promise(resolve => setTimeout(resolve, this.restartDelay));

      // 执行重启
      await serviceInfo.restart();

      serviceInfo.lastRestart = Date.now();
      serviceInfo.status = 'running';

      logger.info('服务重启成功', { name });
      this.emit('service:restarted', { name });

      return true;
    } catch (error) {
      logger.error('服务重启失败', {
        name,
        error: error.message
      });

      serviceInfo.errors.push({
        timestamp: Date.now(),
        message: `重启失败: ${error.message}`
      });

      this.emit('service:restart:failed', {
        name,
        error: error.message
      });

      return false;
    }
  }

  /**
   * 手动重启服务
   * @param {string} name - 服务名称
   */
  async manualRestart(name) {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      logger.error('服务不存在', { name });
      return false;
    }

    // 重置重启计数
    serviceInfo.restartAttempts = 0;

    return await this.restartService(name);
  }

  /**
   * 获取服务状态
   * @param {string} name - 服务名称
   * @returns {Object} 服务状态
   */
  getServiceStatus(name) {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      return null;
    }

    return {
      name: serviceInfo.name,
      status: serviceInfo.status,
      restartAttempts: serviceInfo.restartAttempts,
      lastHealthCheck: serviceInfo.lastHealthCheck,
      lastRestart: serviceInfo.lastRestart,
      recentErrors: serviceInfo.errors.slice(-5)
    };
  }

  /**
   * 获取所有服务状态
   * @returns {Array} 服务状态列表
   */
  getAllServicesStatus() {
    const statuses = [];
    
    for (const [name, serviceInfo] of this.services) {
      statuses.push({
        name: serviceInfo.name,
        status: serviceInfo.status,
        restartAttempts: serviceInfo.restartAttempts,
        lastHealthCheck: serviceInfo.lastHealthCheck,
        lastRestart: serviceInfo.lastRestart,
        errorCount: serviceInfo.errors.length
      });
    }

    return statuses;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const uptime = Date.now() - this.stats.uptime;
    
    return {
      ...this.stats,
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      totalServices: this.services.size,
      healthyServices: Array.from(this.services.values())
        .filter(s => s.status === 'running').length,
      unhealthyServices: Array.from(this.services.values())
        .filter(s => s.status === 'unhealthy').length,
      failedServices: Array.from(this.services.values())
        .filter(s => s.status === 'failed').length
    };
  }

  /**
   * 格式化运行时间
   * @param {number} ms - 毫秒数
   * @returns {string} 格式化的时间
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRestarts: 0,
      totalFailures: 0,
      uptime: Date.now()
    };
    logger.info('统计信息已重置');
  }

  /**
   * 销毁服务管理器
   */
  destroy() {
    this.stopHealthCheck();
    this.services.clear();
    this.removeAllListeners();
    logger.info('服务管理器已销毁');
  }
}

// 创建单例实例
const serviceManager = new ServiceManager();

export { ServiceManager };
export default serviceManager;
