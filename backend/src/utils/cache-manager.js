/**
 * 多级缓存管理系统
 * 实现内存缓存、LRU 策略和自动过期
 */

import logger from './logger.js';

class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 默认 5 分钟
    this.cache = new Map();
    this.accessOrder = []; // LRU 访问顺序
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
    
    // 启动定期清理
    this.startCleanup();
    
    logger.info('缓存管理器已初始化', {
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
    });
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl = this.defaultTTL) {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    // 设置缓存
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });

    // 更新访问顺序
    this.updateAccessOrder(key);
    
    this.stats.sets++;
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值，如果不存在或已过期则返回 null
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      return null;
    }

    // 更新访问顺序
    this.updateAccessOrder(key);
    
    this.stats.hits++;
    return item.value;
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }
    
    return true;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {boolean} 是否成功删除
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
    }
    return deleted;
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    logger.info('缓存已清空');
  }

  /**
   * 更新访问顺序（LRU）
   * @param {string} key - 缓存键
   */
  updateAccessOrder(key) {
    // 移除旧位置
    this.removeFromAccessOrder(key);
    
    // 添加到末尾（最近访问）
    this.accessOrder.push(key);
  }

  /**
   * 从访问顺序中移除
   * @param {string} key - 缓存键
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 驱逐最少使用的缓存（LRU）
   */
  evictLRU() {
    if (this.accessOrder.length === 0) return;
    
    // 获取最少使用的键
    const lruKey = this.accessOrder[0];
    
    // 删除缓存
    this.cache.delete(lruKey);
    this.accessOrder.shift();
    
    this.stats.evictions++;
    
    logger.debug('LRU 驱逐', { key: lruKey });
  }

  /**
   * 启动定期清理过期缓存
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 停止定期清理
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('清理过期缓存', { count: cleaned });
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    this.stopCleanup();
    this.clear();
    logger.info('缓存管理器已销毁');
  }
}

export default CacheManager;
