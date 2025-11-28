// LogService.js
// 日志记录和状态监控服务，提供全面的调试和监控能力

class LogService {
  constructor() {
    // 日志级别常量
    this.LOG_LEVELS = {
      TRACE: 0,
      DEBUG: 1,
      INFO: 2,
      WARN: 3,
      ERROR: 4,
      FATAL: 5
    };
    
    // 日志级别名称映射
    this.LEVEL_NAMES = {
      0: 'TRACE',
      1: 'DEBUG',
      2: 'INFO', 
      3: 'WARN',
      4: 'ERROR',
      5: 'FATAL'
    };
    
    // 日志分类常量
    this.LOG_CATEGORIES = {
      SYSTEM: 'system',
      WEBSOCKET: 'websocket',
      DEVICE_DISCOVERY: 'device_discovery',
      FILE_TRANSFER: 'file_transfer',
      REMOTE_CONTROL: 'remote_control',
      SCREEN_SHARE: 'screen_share',
      UI: 'ui',
      NETWORK: 'network',
      STORAGE: 'storage',
      CUSTOM: 'custom'
    };
    
    // 默认配置
    this.config = {
      currentLevel: this.LOG_LEVELS.DEBUG, // 默认日志级别
      enableConsole: true, // 是否输出到控制台
      enableStorage: true, // 是否持久化存储
      maxStoredLogs: 1000, // 最大存储日志数量
      storageKey: 'debug_logs', // 存储键名
      timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS', // 时间戳格式
      autoFlushInterval: 5000, // 自动刷新间隔（毫秒）
      colorizeConsole: true, // 控制台彩色输出
      enablePerformanceTracking: true // 是否启用性能跟踪
    };
    
    // 日志缓存
    this.logCache = [];
    
    // 事件监听器
    this.listeners = new Map();
    
    // 性能跟踪数据
    this.performanceData = new Map();
    
    // 系统状态监控
    this.systemStatus = {
      memoryUsage: 0,
      networkStatus: 'online',
      uptime: Date.now(),
      activeServices: {
        websocket: false,
        deviceDiscovery: false,
        fileTransfer: false,
        remoteControl: false,
        screenShare: false
      }
    };
    
    // 自动刷新定时器
    this.autoFlushTimer = null;
    
    // 初始化服务
    this.initialize();
  }

  /**
   * 初始化服务
   */
  initialize() {
    // 从存储加载配置和日志（如果启用）
    if (this.config.enableStorage && this.canUseLocalStorage()) {
      try {
        const storedConfig = localStorage.getItem(`${this.config.storageKey}_config`);
        if (storedConfig) {
          this.config = { ...this.config, ...JSON.parse(storedConfig) };
        }
        
        // 恢复存储的日志（如果需要）
        this.loadStoredLogs();
      } catch (error) {
        this.error('Failed to load stored logs or config', { error: error.message });
      }
    }
    
    // 设置自动刷新定时器
    this.startAutoFlush();
    
    // 设置系统状态监控
    this.setupSystemMonitoring();
    
    this.info('LogService initialized', { 
      level: this.LEVEL_NAMES[this.config.currentLevel],
      timestamp: this.formatTimestamp(Date.now())
    });
  }

  /**
   * 检查是否可以使用localStorage
   * @returns {boolean} 是否可以使用
   */
  canUseLocalStorage() {
    try {
      const test = '__log_service_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 加载存储的日志
   */
  loadStoredLogs() {
    try {
      const storedLogs = localStorage.getItem(this.config.storageKey);
      if (storedLogs) {
        const logs = JSON.parse(storedLogs);
        if (Array.isArray(logs)) {
          // 限制加载的日志数量
          this.logCache = logs.slice(-this.config.maxStoredLogs);
          this.info(`Loaded ${this.logCache.length} logs from storage`);
        }
      }
    } catch (error) {
      this.error('Failed to load logs from storage', { error: error.message });
    }
  }

  /**
   * 保存日志到存储
   */
  saveLogsToStorage() {
    if (!this.config.enableStorage || !this.canUseLocalStorage()) {
      return;
    }
    
    try {
      // 只存储最近的日志
      const logsToStore = this.logCache.slice(-this.config.maxStoredLogs);
      localStorage.setItem(this.config.storageKey, JSON.stringify(logsToStore));
      
      // 保存配置
      localStorage.setItem(`${this.config.storageKey}_config`, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  /**
   * 设置自动刷新
   */
  startAutoFlush() {
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
    }
    
    this.autoFlushTimer = setInterval(() => {
      this.flush();
    }, this.config.autoFlushInterval);
  }

  /**
   * 设置系统监控
   */
  setupSystemMonitoring() {
    // 监听在线状态变化
    window.addEventListener('online', () => this.updateNetworkStatus('online'));
    window.addEventListener('offline', () => this.updateNetworkStatus('offline'));
    
    // 定期更新内存使用（模拟）
    setInterval(() => {
      this.updateMemoryUsage();
    }, 10000);
    
    // 初始更新
    this.updateNetworkStatus(navigator.onLine ? 'online' : 'offline');
    this.updateMemoryUsage();
  }

  /**
   * 更新网络状态
   * @param {string} status - 网络状态
   */
  updateNetworkStatus(status) {
    if (this.systemStatus.networkStatus !== status) {
      this.systemStatus.networkStatus = status;
      this.info('Network status changed', { status });
      this.emit('networkStatusChanged', { status });
    }
  }

  /**
   * 更新内存使用（模拟）
   */
  updateMemoryUsage() {
    // 在浏览器中，我们可以使用performance API或简单模拟
    try {
      // 使用performance.memory（仅在Chrome中可用）
      if (performance && performance.memory) {
        this.systemStatus.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
      } else {
        // 模拟内存使用
        this.systemStatus.memoryUsage = Math.round((this.logCache.length * 500) / 1024 / 1024); // 估算
      }
    } catch (error) {
      this.systemStatus.memoryUsage = 0;
    }
  }

  /**
   * 更新服务状态
   * @param {string} serviceName - 服务名称
   * @param {boolean} isActive - 是否激活
   */
  updateServiceStatus(serviceName, isActive) {
    if (this.systemStatus.activeServices[serviceName] !== undefined) {
      this.systemStatus.activeServices[serviceName] = isActive;
      this.info('Service status changed', { 
        service: serviceName, 
        active: isActive 
      });
      this.emit('serviceStatusChanged', { 
        service: serviceName, 
        active: isActive 
      });
    }
  }

  /**
   * 格式化时间戳
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化后的时间
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    
    // 提取日期和时间部分
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    
    // 替换格式字符串中的占位符
    return this.config.timestampFormat
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('SSS', milliseconds);
  }

  /**
   * 获取日志级别的颜色代码
   * @param {number} level - 日志级别
   * @returns {string} CSS颜色值
   */
  getLevelColor(level) {
    switch (level) {
      case this.LOG_LEVELS.TRACE:
        return '#999999'; // 灰色
      case this.LOG_LEVELS.DEBUG:
        return '#0066CC'; // 蓝色
      case this.LOG_LEVELS.INFO:
        return '#00AA00'; // 绿色
      case this.LOG_LEVELS.WARN:
        return '#FFAA00'; // 橙色
      case this.LOG_LEVELS.ERROR:
        return '#CC0000'; // 红色
      case this.LOG_LEVELS.FATAL:
        return '#880000'; // 深红色
      default:
        return '#000000'; // 黑色
    }
  }

  /**
   * 创建日志对象
   * @param {number} level - 日志级别
   * @param {string} category - 日志分类
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   * @returns {Object} 日志对象
   */
  createLogObject(level, category, message, data = {}) {
    return {
      id: Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      formattedTimestamp: this.formatTimestamp(Date.now()),
      level,
      levelName: this.LEVEL_NAMES[level],
      category,
      message,
      data,
      // 可选的上下文信息
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };
  }

  /**
   * 记录日志到控制台
   * @param {Object} log - 日志对象
   */
  logToConsole(log) {
    if (!this.config.enableConsole) return;
    
    // 构建控制台消息
    const prefix = `[${log.formattedTimestamp}] [${log.levelName}] [${log.category}]`;
    const consoleArgs = [prefix, log.message];
    
    // 如果有数据，添加到参数列表
    if (Object.keys(log.data).length > 0) {
      consoleArgs.push(log.data);
    }
    
    // 根据日志级别选择控制台方法
    let consoleMethod = console.log;
    switch (log.level) {
      case this.LOG_LEVELS.TRACE:
        consoleMethod = console.debug || console.log;
        break;
      case this.LOG_LEVELS.DEBUG:
        consoleMethod = console.debug || console.log;
        break;
      case this.LOG_LEVELS.INFO:
        consoleMethod = console.info || console.log;
        break;
      case this.LOG_LEVELS.WARN:
        consoleMethod = console.warn;
        break;
      case this.LOG_LEVELS.ERROR:
      case this.LOG_LEVELS.FATAL:
        consoleMethod = console.error;
        break;
    }
    
    // 彩色输出（如果启用）
    if (this.config.colorizeConsole && typeof window !== 'undefined') {
      const color = this.getLevelColor(log.level);
      const coloredPrefix = `%c${prefix}`;
      const style = `color: ${color}; font-weight: bold`;
      consoleMethod(coloredPrefix, style, log.message, log.data);
    } else {
      consoleMethod(...consoleArgs);
    }
  }

  /**
   * 记录日志的核心方法
   * @param {number} level - 日志级别
   * @param {string} category - 日志分类
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  log(level, category, message, data = {}) {
    // 检查日志级别
    if (level < this.config.currentLevel) return;
    
    // 创建日志对象
    const logObject = this.createLogObject(level, category, message, data);
    
    // 添加到缓存
    this.logCache.push(logObject);
    
    // 输出到控制台
    this.logToConsole(logObject);
    
    // 触发日志事件
    this.emit('log', logObject);
    
    // 如果是严重错误，可以触发特殊处理
    if (level >= this.LOG_LEVELS.ERROR) {
      this.emit('error', logObject);
    }
  }

  /**
   * 记录跟踪日志
   * @param {string} message - 日志消息
   * @param {string} category - 日志分类
   * @param {Object} data - 附加数据
   */
  trace(message, category = this.LOG_CATEGORIES.SYSTEM, data = {}) {
    this.log(this.LOG_LEVELS.TRACE, category, message, data);
  }

  /**
   * 记录调试日志
   * @param {string} message - 日志消息
   * @param {string} category - 日志分类
   * @param {Object} data - 附加数据
   */
  debug(message, category = this.LOG_CATEGORIES.SYSTEM, data = {}) {
    this.log(this.LOG_LEVELS.DEBUG, category, message, data);
  }

  /**
   * 记录信息日志
   * @param {string} message - 日志消息
   * @param {string} category - 日志分类
   * @param {Object} data - 附加数据
   */
  info(message, category = this.LOG_CATEGORIES.SYSTEM, data = {}) {
    this.log(this.LOG_LEVELS.INFO, category, message, data);
  }

  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   * @param {string} category - 日志分类
   * @param {Object} data - 附加数据
   */
  warn(message, category = this.LOG_CATEGORIES.SYSTEM, data = {}) {
    this.log(this.LOG_LEVELS.WARN, category, message, data);
  }

  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   * @param {string} category - 日志分类
   * @param {Object} data - 附加数据
   */
  error(message, category = this.LOG_CATEGORIES.SYSTEM, data = {}) {
    // 如果数据包含Error对象，提取有用信息
    if (data.error instanceof Error) {
      data = {
        ...data,
        error: {
          message: data.error.message,
          stack: data.error.stack,
          name: data.error.name
        }
      };
    }
    
    this.log(this.LOG_LEVELS.ERROR, category, message, data);
  }

  /**
   * 记录致命错误日志
   * @param {string} message - 日志消息
   * @param {string} category - 日志分类
   * @param {Object} data - 附加数据
   */
  fatal(message, category = this.LOG_CATEGORIES.SYSTEM, data = {}) {
    // 如果数据包含Error对象，提取有用信息
    if (data.error instanceof Error) {
      data = {
        ...data,
        error: {
          message: data.error.message,
          stack: data.error.stack,
          name: data.error.name
        }
      };
    }
    
    this.log(this.LOG_LEVELS.FATAL, category, message, data);
  }

  /**
   * 刷新日志（保存到存储）
   */
  flush() {
    // 检查是否需要保存
    if (this.config.enableStorage && this.logCache.length > 0) {
      this.saveLogsToStorage();
    }
  }

  /**
   * 设置日志级别
   * @param {number|string} level - 日志级别
   */
  setLevel(level) {
    // 支持通过字符串设置
    if (typeof level === 'string') {
      const levelUpper = level.toUpperCase();
      for (const [key, value] of Object.entries(this.LOG_LEVELS)) {
        if (key === levelUpper) {
          this.config.currentLevel = value;
          this.info(`Log level set to ${key}`, { level: value });
          return;
        }
      }
    } 
    // 直接设置数字级别
    else if (typeof level === 'number' && level >= 0 && level <= 5) {
      this.config.currentLevel = level;
      this.info(`Log level set to ${this.LEVEL_NAMES[level]}`, { level });
      return;
    }
    
    this.error('Invalid log level', { level });
  }

  /**
   * 获取当前日志级别
   * @returns {number} 日志级别
   */
  getLevel() {
    return this.config.currentLevel;
  }

  /**
   * 获取当前日志级别名称
   * @returns {string} 日志级别名称
   */
  getLevelName() {
    return this.LEVEL_NAMES[this.config.currentLevel];
  }

  /**
   * 获取所有日志
   * @param {Object} filters - 筛选条件
   * @returns {Array} 日志数组
   */
  getLogs(filters = {}) {
    let filteredLogs = [...this.logCache];
    
    // 应用筛选条件
    if (filters.level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= filters.level);
    }
    
    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.data).toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime);
    }
    
    if (filters.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime);
    }
    
    // 排序（默认按时间倒序）
    if (filters.sortBy === 'timestamp' || !filters.sortBy) {
      filteredLogs.sort((a, b) => filters.sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp);
    }
    
    // 分页
    if (filters.limit) {
      const offset = filters.offset || 0;
      filteredLogs = filteredLogs.slice(offset, offset + filters.limit);
    }
    
    return filteredLogs;
  }

  /**
   * 清除日志
   * @param {Object} options - 清除选项
   */
  clearLogs(options = {}) {
    // 清除缓存
    if (options.cache !== false) {
      this.logCache = [];
      this.info('Log cache cleared');
    }
    
    // 清除存储
    if (options.storage !== false && this.canUseLocalStorage()) {
      try {
        localStorage.removeItem(this.config.storageKey);
        this.info('Stored logs cleared');
      } catch (error) {
        this.error('Failed to clear stored logs', { error: error.message });
      }
    }
  }

  /**
   * 导出日志
   * @param {Object} filters - 筛选条件
   * @param {string} format - 导出格式 ('json', 'text')
   * @returns {string} 导出内容
   */
  exportLogs(filters = {}, format = 'json') {
    const logs = this.getLogs(filters);
    
    if (format === 'json') {
      return JSON.stringify({
        exportTime: this.formatTimestamp(Date.now()),
        logCount: logs.length,
        logs: logs
      }, null, 2);
    } 
    else if (format === 'text') {
      return logs.map(log => {
        let line = `[${log.formattedTimestamp}] [${log.levelName}] [${log.category}] ${log.message}`;
        if (Object.keys(log.data).length > 0) {
          line += ' ' + JSON.stringify(log.data);
        }
        return line;
      }).join('\n');
    }
    
    return '';
  }

  /**
   * 下载日志文件
   * @param {Object} filters - 筛选条件
   * @param {string} format - 导出格式 ('json', 'text')
   */
  downloadLogs(filters = {}, format = 'json') {
    const content = this.exportLogs(filters, format);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug_logs_${this.formatTimestamp(Date.now()).replace(/[:.]/g, '-')}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    this.info('Logs downloaded', { format, logCount: this.getLogs(filters).length });
  }

  /**
   * 开始性能跟踪
   * @param {string} key - 跟踪键名
   */
  startPerf(key) {
    if (!this.config.enablePerformanceTracking) return;
    
    this.performanceData.set(key, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
    
    this.debug('Performance tracking started', this.LOG_CATEGORIES.SYSTEM, { key });
  }

  /**
   * 结束性能跟踪
   * @param {string} key - 跟踪键名
   * @returns {number|null} 持续时间（毫秒）或null
   */
  endPerf(key) {
    if (!this.config.enablePerformanceTracking) return null;
    
    const perfData = this.performanceData.get(key);
    if (!perfData || perfData.endTime !== null) {
      this.warn('Performance tracking not found or already ended', this.LOG_CATEGORIES.SYSTEM, { key });
      return null;
    }
    
    perfData.endTime = performance.now();
    perfData.duration = perfData.endTime - perfData.startTime;
    
    this.debug('Performance tracking ended', this.LOG_CATEGORIES.SYSTEM, { 
      key, 
      duration: perfData.duration.toFixed(2) + 'ms' 
    });
    
    return perfData.duration;
  }

  /**
   * 获取性能跟踪数据
   * @param {string} key - 跟踪键名
   * @returns {Object|null} 性能数据或null
   */
  getPerfData(key) {
    return this.performanceData.get(key) || null;
  }

  /**
   * 获取所有性能跟踪数据
   * @returns {Object} 所有性能数据
   */
  getAllPerfData() {
    const result = {};
    this.performanceData.forEach((value, key) => {
      result[key] = { ...value };
    });
    return result;
  }

  /**
   * 清除性能跟踪数据
   * @param {string} key - 跟踪键名（可选，不提供则清除所有）
   */
  clearPerfData(key) {
    if (key) {
      this.performanceData.delete(key);
      this.debug('Performance data cleared for key', this.LOG_CATEGORIES.SYSTEM, { key });
    } else {
      this.performanceData.clear();
      this.debug('All performance data cleared', this.LOG_CATEGORIES.SYSTEM);
    }
  }

  /**
   * 获取系统状态
   * @returns {Object} 系统状态
   */
  getSystemStatus() {
    return {
      ...this.systemStatus,
      uptime: Date.now() - this.systemStatus.uptime,
      logCount: this.logCache.length,
      memoryUsageMB: this.systemStatus.memoryUsage
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
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数（可选，不提供则移除所有）
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
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
        console.error(`LogService event callback error (${event}):`, error);
      }
    });
  }

  /**
   * 获取服务统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    // 按级别统计日志数量
    const levelCounts = {};
    Object.values(this.LOG_LEVELS).forEach(level => {
      levelCounts[this.LEVEL_NAMES[level]] = this.logCache.filter(log => log.level === level).length;
    });
    
    // 按分类统计日志数量
    const categoryCounts = {};
    Object.values(this.LOG_CATEGORIES).forEach(category => {
      categoryCounts[category] = this.logCache.filter(log => log.category === category).length;
    });
    
    return {
      totalLogs: this.logCache.length,
      levelCounts,
      categoryCounts,
      oldestLogTime: this.logCache.length > 0 ? this.logCache[0].timestamp : null,
      newestLogTime: this.logCache.length > 0 ? this.logCache[this.logCache.length - 1].timestamp : null,
      storageUsage: this.canUseLocalStorage() ? 
        localStorage.getItem(this.config.storageKey)?.length || 0 : 0,
      perfTrackCount: this.performanceData.size
    };
  }

  /**
   * 重置服务状态
   */
  reset() {
    // 清除日志
    this.clearLogs();
    
    // 清除性能数据
    this.clearPerfData();
    
    // 重置系统状态
    this.systemStatus = {
      memoryUsage: 0,
      networkStatus: navigator.onLine ? 'online' : 'offline',
      uptime: Date.now(),
      activeServices: {
        websocket: false,
        deviceDiscovery: false,
        fileTransfer: false,
        remoteControl: false,
        screenShare: false
      }
    };
    
    this.info('LogService reset', this.LOG_CATEGORIES.SYSTEM);
  }

  /**
   * 销毁服务
   */
  destroy() {
    // 停止自动刷新
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
    }
    
    // 保存最终日志
    this.flush();
    
    // 清除事件监听器
    this.listeners.clear();
    
    // 重置状态
    this.reset();
    
    this.info('LogService destroyed', this.LOG_CATEGORIES.SYSTEM);
  }

  /**
   * 注册全局错误处理
   */
  registerGlobalErrorHandler() {
    // 捕获未处理的Promise错误
    window.addEventListener('unhandledrejection', event => {
      this.error('Unhandled Promise rejection', this.LOG_CATEGORIES.SYSTEM, {
        error: {
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack
        }
      });
    });
    
    // 捕获全局错误
    window.addEventListener('error', event => {
      this.error('Global error', this.LOG_CATEGORIES.SYSTEM, {
        error: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      });
    });
    
    this.info('Global error handlers registered', this.LOG_CATEGORIES.SYSTEM);
  }
}

// 创建单例实例
const logService = new LogService();

// 导出服务和常用方法的简写
export default logService;
export { logService as logger };