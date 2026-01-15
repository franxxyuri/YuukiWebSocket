/**
 * 消息队列系统
 * 实现高效的消息处理、批处理和优先级管理
 */

import logger from './logger.js';

// 消息优先级
const PRIORITY = {
  CRITICAL: 0,  // 关键消息（如心跳、连接控制）
  HIGH: 1,      // 高优先级（如控制命令）
  NORMAL: 2,    // 普通消息（如数据传输）
  LOW: 3        // 低优先级（如日志、统计）
};

class MessageQueue {
  constructor(options = {}) {
    this.queues = new Map(); // 按优先级分组的队列
    this.processing = false;
    this.batchSize = options.batchSize || 10;
    this.processInterval = options.processInterval || 10; // 10ms
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.stats = {
      processed: 0,
      dropped: 0,
      errors: 0
    };
    
    // 初始化优先级队列
    Object.values(PRIORITY).forEach(priority => {
      this.queues.set(priority, []);
    });
    
    // 启动处理循环
    this.startProcessing();
    
    logger.info('消息队列已初始化', {
      batchSize: this.batchSize,
      processInterval: this.processInterval
    });
  }

  /**
   * 添加消息到队列
   * @param {Object} message - 消息对象
   * @param {number} priority - 优先级
   * @param {Function} handler - 处理函数
   * @returns {boolean} 是否成功添加
   */
  enqueue(message, priority = PRIORITY.NORMAL, handler) {
    if (!this.queues.has(priority)) {
      logger.warn('无效的消息优先级', { priority });
      priority = PRIORITY.NORMAL;
    }

    const queue = this.queues.get(priority);
    
    // 检查队列大小
    if (queue.length >= this.maxQueueSize) {
      logger.warn('队列已满，丢弃消息', {
        priority,
        queueSize: queue.length,
        message: message.type
      });
      this.stats.dropped++;
      return false;
    }

    // 添加到队列
    queue.push({
      message,
      handler,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 启动消息处理循环
   */
  startProcessing() {
    if (this.processing) return;
    
    this.processing = true;
    this.processLoop();
  }

  /**
   * 停止消息处理循环
   */
  stopProcessing() {
    this.processing = false;
  }

  /**
   * 消息处理循环
   */
  async processLoop() {
    while (this.processing) {
      try {
        await this.processBatch();
        
        // 等待下一个处理周期
        await new Promise(resolve => setTimeout(resolve, this.processInterval));
      } catch (error) {
        logger.error('消息处理循环错误', { error });
        this.stats.errors++;
      }
    }
  }

  /**
   * 批量处理消息
   */
  async processBatch() {
    // 按优先级处理消息
    for (const priority of Object.values(PRIORITY).sort()) {
      const queue = this.queues.get(priority);
      
      if (queue.length === 0) continue;

      // 获取一批消息
      const batch = queue.splice(0, this.batchSize);
      
      // 并行处理批次中的消息
      await Promise.allSettled(
        batch.map(item => this.processMessage(item))
      );
    }
  }

  /**
   * 处理单个消息
   * @param {Object} item - 队列项
   */
  async processMessage(item) {
    const { message, handler, timestamp } = item;
    
    try {
      // 计算消息延迟
      const delay = Date.now() - timestamp;
      if (delay > 1000) {
        logger.warn('消息处理延迟', {
          type: message.type,
          delay: `${delay}ms`
        });
      }

      // 执行处理函数
      await handler(message);
      
      this.stats.processed++;
    } catch (error) {
      logger.error('消息处理失败', {
        type: message.type,
        error: error.message
      });
      this.stats.errors++;
    }
  }

  /**
   * 获取队列统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const queueSizes = {};
    this.queues.forEach((queue, priority) => {
      queueSizes[priority] = queue.length;
    });

    return {
      ...this.stats,
      queueSizes,
      totalQueued: Object.values(queueSizes).reduce((a, b) => a + b, 0)
    };
  }

  /**
   * 清空所有队列
   */
  clear() {
    this.queues.forEach(queue => queue.length = 0);
    logger.info('消息队列已清空');
  }

  /**
   * 销毁队列
   */
  destroy() {
    this.stopProcessing();
    this.clear();
    logger.info('消息队列已销毁');
  }
}

// 导出优先级常量
export { PRIORITY };

// 导出默认实例
export default MessageQueue;
