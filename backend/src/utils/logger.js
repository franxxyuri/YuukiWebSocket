/**
 * 统一日志系统
 * 提供结构化的日志记录功能
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_COLORS = {
  ERROR: '\x1b[31m', // 红色
  WARN: '\x1b[33m',  // 黄色
  INFO: '\x1b[36m',  // 青色
  DEBUG: '\x1b[90m', // 灰色
  RESET: '\x1b[0m'
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);
    this.enableColors = options.enableColors !== false;
    this.enableTimestamp = options.enableTimestamp !== false;
    this.prefix = options.prefix || '';
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, meta = {}) {
    const parts = [];
    
    // 时间戳
    if (this.enableTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }
    
    // 日志级别
    const levelStr = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    if (this.enableColors) {
      parts.push(`${LOG_COLORS[levelStr]}[${levelStr}]${LOG_COLORS.RESET}`);
    } else {
      parts.push(`[${levelStr}]`);
    }
    
    // 前缀
    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }
    
    // 消息
    parts.push(message);
    
    // 元数据
    if (Object.keys(meta).length > 0) {
      parts.push(JSON.stringify(meta, null, 2));
    }
    
    return parts.join(' ');
  }

  /**
   * 记录错误日志
   */
  error(message, meta = {}) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
      
      // 如果有错误对象，打印堆栈
      if (meta.error && meta.error.stack) {
        console.error(meta.error.stack);
      }
    }
  }

  /**
   * 记录警告日志
   */
  warn(message, meta = {}) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
    }
  }

  /**
   * 记录信息日志
   */
  info(message, meta = {}) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
    }
  }

  /**
   * 记录调试日志
   */
  debug(message, meta = {}) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }

  /**
   * 创建子日志器
   */
  child(prefix) {
    return new Logger({
      level: this.level,
      enableColors: this.enableColors,
      enableTimestamp: this.enableTimestamp,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix
    });
  }

  /**
   * 设置日志级别
   */
  setLevel(level) {
    if (typeof level === 'string') {
      this.level = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
    } else {
      this.level = level;
    }
  }
}

// 创建默认日志器
const defaultLogger = new Logger({
  prefix: 'WAC'
});

// 导出日志级别常量
export { LOG_LEVELS, Logger };

// 导出默认日志器
export default defaultLogger;
