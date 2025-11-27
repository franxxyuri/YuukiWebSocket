/**
 * 剪贴板同步管理器
 * 负责在Windows和Android设备之间同步剪贴板内容
 */

class ClipboardSync {
  constructor() {
    this.isEnabled = false;
    this.lastContent = '';
    this.lastSyncTime = 0;
    this.syncCallbacks = [];
    this.history = [];
    this.maxHistorySize = 50;
    
    // 同步设置
    this.settings = {
      autoSync: true,
      syncDelay: 500, // 毫秒
      contentTypes: ['text', 'image'], // 支持的内容类型
      maxSize: 10 * 1024 * 1024, // 最大10MB
      excludePatterns: [] // 排除模式
    };
    
    // 防抖定时器
    this.debounceTimer = null;
  }

  /**
   * 启用剪贴板同步
   */
  enable() {
    this.isEnabled = true;
    console.log('📋 剪贴板同步已启用');
    
    // 开始监听剪贴板变化
    this.startClipboardMonitoring();
  }

  /**
   * 禁用剪贴板同步
   */
  disable() {
    this.isEnabled = false;
    console.log('📋 剪贴板同步已禁用');
    
    // 停止监听剪贴板变化
    this.stopClipboardMonitoring();
  }

  /**
   * 开始监听剪贴板变化
   */
  startClipboardMonitoring() {
    // 在浏览器环境中使用定时器轮询
    if (typeof window !== 'undefined') {
      this.clipboardPollInterval = setInterval(() => {
        this.checkClipboardContent();
      }, this.settings.syncDelay);
    }
    
    console.log('📋 开始监听剪贴板变化');
  }

  /**
   * 停止监听剪贴板变化
   */
  stopClipboardMonitoring() {
    if (this.clipboardPollInterval) {
      clearInterval(this.clipboardPollInterval);
      this.clipboardPollInterval = null;
    }
    
    console.log('📋 停止监听剪贴板变化');
  }

  /**
   * 检查剪贴板内容
   */
  async checkClipboardContent() {
    if (!this.isEnabled || !navigator.clipboard) return;

    try {
      // 读取文本内容
      const text = await navigator.clipboard.readText();
      
      // 检查内容是否发生变化
      if (text !== this.lastContent) {
        this.lastContent = text;
        
        // 检查是否需要排除
        if (!this.shouldExcludeContent(text)) {
          // 防抖处理
          this.debounceSync(text);
        }
      }
    } catch (error) {
      // 在某些浏览器中可能无法读取剪贴板
      console.debug('无法读取剪贴板内容:', error);
    }
  }

  /**
   * 防抖同步
   */
  debounceSync(content) {
    // 清除之前的定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // 设置新的定时器
    this.debounceTimer = setTimeout(() => {
      this.syncClipboardContent(content);
    }, this.settings.syncDelay);
  }

  /**
   * 同步剪贴板内容
   */
  async syncClipboardContent(content) {
    if (!this.isEnabled) return;
    
    // 检查内容大小
    if (content.length > this.settings.maxSize) {
      console.warn('📋 剪贴板内容过大，跳过同步');
      return;
    }
    
    // 检查内容是否为空
    if (!content.trim()) {
      console.debug('📋 剪贴板内容为空，跳过同步');
      return;
    }
    
    // 更新同步时间
    this.lastSyncTime = Date.now();
    
    // 添加到历史记录
    this.addToHistory(content);
    
    // 创建同步数据
    const syncData = {
      type: 'text',
      content: content,
      timestamp: this.lastSyncTime,
      deviceId: this.getDeviceId()
    };
    
    // 触发同步回调
    this.triggerSyncCallbacks(syncData);
    
    console.log('📋 剪贴板内容已同步:', content.substring(0, 50) + '...');
  }

  /**
   * 处理来自其他设备的剪贴板内容
   */
  handleRemoteClipboardContent(syncData) {
    if (!this.isEnabled) return;
    
    try {
      // 验证数据
      if (!this.isValidSyncData(syncData)) {
        console.warn('📋 无效的同步数据:', syncData);
        return;
      }
      
      // 检查是否是重复内容
      if (syncData.content === this.lastContent) {
        console.debug('📋 重复的剪贴板内容，跳过更新');
        return;
      }
      
      // 更新本地剪贴板
      this.updateLocalClipboard(syncData.content);
      
      // 更新状态
      this.lastContent = syncData.content;
      this.lastSyncTime = syncData.timestamp;
      
      // 添加到历史记录
      this.addToHistory(syncData.content);
      
      console.log('📋 接收到远程剪贴板内容:', syncData.content.substring(0, 50) + '...');
    } catch (error) {
      console.error('处理远程剪贴板内容时出错:', error);
    }
  }

  /**
   * 更新本地剪贴板
   */
  async updateLocalClipboard(content) {
    if (!navigator.clipboard) {
      console.warn('📋 当前环境不支持剪贴板API');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(content);
      console.log('📋 本地剪贴板已更新');
    } catch (error) {
      console.error('更新本地剪贴板失败:', error);
    }
  }

  /**
   * 验证同步数据
   */
  isValidSyncData(syncData) {
    return syncData && 
           syncData.content !== undefined && 
           typeof syncData.timestamp === 'number' &&
           syncData.type && this.settings.contentTypes.includes(syncData.type);
  }

  /**
   * 检查是否需要排除内容
   */
  shouldExcludeContent(content) {
    if (!this.settings.excludePatterns.length) return false;
    
    return this.settings.excludePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return content.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(content);
      }
      return false;
    });
  }

  /**
   * 添加到历史记录
   */
  addToHistory(content) {
    const historyItem = {
      content: content,
      timestamp: Date.now(),
      size: content.length
    };
    
    this.history.unshift(historyItem);
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取设备ID
   */
  getDeviceId() {
    // 简单的设备ID生成（在实际应用中可能需要更复杂的逻辑）
    if (typeof window !== 'undefined' && window.localStorage) {
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    }
    return 'unknown_device';
  }

  /**
   * 获取历史记录
   */
  getHistory() {
    return this.history.slice();
  }

  /**
   * 清除历史记录
   */
  clearHistory() {
    this.history = [];
    console.log('🗑️ 剪贴板历史记录已清除');
  }

  /**
   * 恢复历史记录项
   */
  async restoreHistoryItem(index) {
    if (index >= 0 && index < this.history.length) {
      const item = this.history[index];
      await this.updateLocalClipboard(item.content);
      this.lastContent = item.content;
      console.log('📋 历史记录已恢复');
    }
  }

  /**
   * 添加同步回调
   */
  addSyncCallback(callback) {
    this.syncCallbacks.push(callback);
  }

  /**
   * 移除同步回调
   */
  removeSyncCallback(callback) {
    const index = this.syncCallbacks.indexOf(callback);
    if (index > -1) {
      this.syncCallbacks.splice(index, 1);
    }
  }

  /**
   * 触发同步回调
   */
  triggerSyncCallbacks(syncData) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(syncData);
      } catch (error) {
        console.error('同步回调执行错误:', error);
      }
    });
  }

  /**
   * 设置同步设置
   */
  setSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    console.log('🔧 剪贴板同步设置已更新:', this.settings);
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      lastSyncTime: this.lastSyncTime,
      lastContentPreview: this.lastContent.substring(0, 50) + (this.lastContent.length > 50 ? '...' : ''),
      historyCount: this.history.length,
      settings: this.settings
    };
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.disable();
    this.syncCallbacks = [];
    this.history = [];
    console.log('📋 剪贴板同步管理器已销毁');
  }
}

// 如果在Node.js环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClipboardSync;
} else if (typeof window !== 'undefined') {
  window.ClipboardSync = ClipboardSync;
}