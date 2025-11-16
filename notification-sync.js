/**
 * 通知同步管理器
 * 负责处理Android设备的通知并同步到Windows端
 */

class NotificationSync {
  constructor() {
    this.notifications = new Map();
    this.notificationCallbacks = [];
    this.isEnabled = false;
    
    // 通知过滤规则
    this.filters = {
      apps: [], // 特定应用通知
      keywords: [], // 关键词过滤
      blacklist: [] // 黑名单应用
    };
    
    // 通知显示设置
    this.displaySettings = {
      timeout: 5000, // 通知显示时间（毫秒）
      position: 'top-right', // 显示位置
      soundEnabled: true,
      maxNotifications: 10
    };
  }

  /**
   * 启用通知同步
   */
  enable() {
    this.isEnabled = true;
    console.log('🔔 通知同步已启用');
  }

  /**
   * 禁用通知同步
   */
  disable() {
    this.isEnabled = false;
    console.log('🔕 通知同步已禁用');
  }

  /**
   * 处理来自Android设备的通知
   */
  handleAndroidNotification(notificationData) {
    if (!this.isEnabled) return;

    try {
      // 验证通知数据
      if (!this.isValidNotification(notificationData)) {
        console.warn('⚠️ 无效的通知数据:', notificationData);
        return;
      }

      // 检查是否需要过滤
      if (this.shouldFilterNotification(notificationData)) {
        console.log('📋 通知被过滤:', notificationData.title);
        return;
      }

      // 生成通知ID
      const notificationId = this.generateNotificationId();
      
      // 创建通知对象
      const notification = {
        id: notificationId,
        title: notificationData.title || '新通知',
        text: notificationData.text || '',
        packageName: notificationData.packageName || 'unknown',
        app: notificationData.appName || 'Unknown App',
        timestamp: Date.now(),
        priority: notificationData.priority || 'default',
        icon: notificationData.icon || null,
        actions: notificationData.actions || [],
        raw: notificationData
      };

      // 存储通知
      this.notifications.set(notificationId, notification);

      // 限制通知数量
      this.limitNotificationCount();

      // 显示通知
      this.showNotification(notification);

      // 触发回调
      this.triggerNotificationCallbacks(notification);

      console.log(`🔔 收到通知: ${notification.title} (${notification.app})`);
    } catch (error) {
      console.error('处理通知时出错:', error);
    }
  }

  /**
   * 验证通知数据
   */
  isValidNotification(notificationData) {
    return notificationData && 
           (notificationData.title || notificationData.text) &&
           typeof notificationData === 'object';
  }

  /**
   * 检查是否需要过滤通知
   */
  shouldFilterNotification(notificationData) {
    const packageName = notificationData.packageName || 'unknown';

    // 检查黑名单
    if (this.filters.blacklist.length > 0 && 
        this.filters.blacklist.includes(packageName)) {
      return true;
    }

    // 检查白名单（如果设置了）
    if (this.filters.apps.length > 0 && 
        !this.filters.apps.includes(packageName)) {
      return true;
    }

    // 检查关键词过滤
    const content = (notificationData.title + ' ' + notificationData.text).toLowerCase();
    if (this.filters.keywords.length > 0) {
      return !this.filters.keywords.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
    }

    return false;
  }

  /**
   * 生成通知ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 显示通知
   */
  showNotification(notification) {
    // 使用Web Notifications API（如果可用）
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.showWebNotification(notification);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.showWebNotification(notification);
          }
        });
      }
    } else {
      // 使用自定义通知显示
      this.showCustomNotification(notification);
    }

    // 播放通知声音（如果启用）
    if (this.displaySettings.soundEnabled) {
      this.playNotificationSound();
    }
  }

  /**
   * 显示Web通知
   */
  showWebNotification(notification) {
    const webNotification = new Notification(notification.title, {
      body: notification.text,
      icon: notification.icon,
      tag: notification.id,
      requireInteraction: false
    });

    // 设置通知自动关闭
    setTimeout(() => {
      webNotification.close();
    }, this.displaySettings.timeout);

    // 处理通知点击
    webNotification.onclick = () => {
      console.log('通知被点击:', notification.id);
      this.handleNotificationClick(notification);
    };
  }

  /**
   * 显示自定义通知
   */
  showCustomNotification(notification) {
    // 创建自定义通知DOM元素
    const notificationEl = document.createElement('div');
    notificationEl.className = 'android-notification';
    notificationEl.innerHTML = `
      <div class="notification-header">
        <div class="app-icon">
          ${this.getAppIcon(notification.packageName)}
        </div>
        <div class="app-info">
          <div class="app-name">${notification.app}</div>
          <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
        </div>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-text">${notification.text}</div>
      </div>
      ${this.renderNotificationActions(notification.actions)}
    `;

    // 添加样式
    notificationEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px;
      z-index: 10000;
      border-left: 4px solid #2196F3;
      font-family: Arial, sans-serif;
      animation: slideInRight 0.3s ease-out;
    `;

    // 添加到页面
    document.body.appendChild(notificationEl);

    // 自动移除
    setTimeout(() => {
      if (notificationEl.parentElement) {
        notificationEl.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
          if (notificationEl.parentElement) {
            notificationEl.remove();
          }
        }, 300);
      }
    }, this.displaySettings.timeout);
  }

  /**
   * 获取应用图标
   */
  getAppIcon(packageName) {
    // 简单的默认图标
    return `<div style="width: 40px; height: 40px; background: #2196F3; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${packageName.substring(0, 2).toUpperCase()}</div>`;
  }

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * 渲染通知操作
   */
  renderNotificationActions(actions) {
    if (!actions || actions.length === 0) return '';

    const actionsHtml = actions.map(action => 
      `<button class="notification-action" data-action="${action.id}">
        ${action.title}
      </button>`
    ).join('');

    return `<div class="notification-actions">${actionsHtml}</div>`;
  }

  /**
   * 播放通知声音
   */
  playNotificationSound() {
    // 简单的提示音（可以使用实际音频文件）
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('无法播放提示音:', error);
    }
  }

  /**
   * 处理通知点击
   */
  handleNotificationClick(notification) {
    console.log('通知被点击:', notification.id);
    
    // 可以在这里添加打开相关应用的逻辑
    // 这通常需要与Android设备通信来实现
  }

  /**
   * 限制通知数量
   */
  limitNotificationCount() {
    if (this.notifications.size > this.displaySettings.maxNotifications) {
      // 删除最旧的通知
      const oldestId = this.notifications.keys().next().value;
      this.notifications.delete(oldestId);
    }
  }

  /**
   * 获取所有通知
   */
  getNotifications() {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取未读通知数量
   */
  getUnreadCount() {
    return this.notifications.size;
  }

  /**
   * 清除所有通知
   */
  clearAllNotifications() {
    this.notifications.clear();
    console.log('🗑️ 所有通知已清除');
  }

  /**
   * 清除指定通知
   */
  clearNotification(notificationId) {
    this.notifications.delete(notificationId);
    console.log(`🗑️ 通知已清除: ${notificationId}`);
  }

  /**
   * 添加通知回调
   */
  addNotificationCallback(callback) {
    this.notificationCallbacks.push(callback);
  }

  /**
   * 移除通知回调
   */
  removeNotificationCallback(callback) {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index > -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  /**
   * 触发通知回调
   */
  triggerNotificationCallbacks(notification) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('通知回调执行错误:', error);
      }
    });
  }

  /**
   * 设置过滤规则
   */
  setFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    console.log('🔧 通知过滤规则已更新:', this.filters);
  }

  /**
   * 设置显示设置
   */
  setDisplaySettings(settings) {
    this.displaySettings = { ...this.displaySettings, ...settings };
    console.log('🔧 通知显示设置已更新:', this.displaySettings);
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      notificationCount: this.notifications.size,
      filters: this.filters,
      displaySettings: this.displaySettings
    };
  }
}

// 如果在Node.js环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationSync;
} else if (typeof window !== 'undefined') {
  window.NotificationSync = NotificationSync;
}