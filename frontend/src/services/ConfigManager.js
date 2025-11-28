/**
 * 配置管理器
 * 负责统一管理应用的配置参数，支持本地存储持久化
 */
class ConfigManager {
  constructor() {
    this.config = this.getDefaultConfig();
    this.storageKey = 'app_config_v1';
    this.listeners = new Map();
    
    // 加载持久化的配置
    this.loadConfig();
  }

  /**
   * 获取默认配置
   * @returns {object} 默认配置对象
   */
  getDefaultConfig() {
    return {
      // 连接配置
      connection: {
        websocketUrl: 'ws://localhost:8781/ws',
        mockMode: process.env.NODE_ENV === 'development' && window.location.search.includes('useMock=true'),
        autoReconnect: true,
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        messageTimeout: 10000
      },
      
      // UI配置
      ui: {
        theme: 'light', // light or dark
        showNotifications: true,
        defaultLanguage: 'zh-CN',
        animationEnabled: true,
        fontSize: 'medium', // small, medium, large
        showStatusBar: true
      },
      
      // 功能配置
      features: {
        deviceDiscovery: {
          enabled: true,
          autoStart: false,
          scanInterval: 3000
        },
        screenSharing: {
          defaultQuality: 720, // 360, 720, 1080
          maxFps: 30,
          showStats: false,
          autoFit: true
        },
        remoteControl: {
          enabled: true,
          showVirtualKeyboard: false,
          touchSensitivity: 'medium' // low, medium, high
        },
        fileTransfer: {
          chunkSize: 1024 * 1024, // 1MB
          maxConcurrentTransfers: 2,
          showProgress: true,
          autoAccept: false
        }
      },
      
      // 缓存配置
      cache: {
        enabled: true,
        maxSizeMB: 50,
        clearInterval: 86400000 // 24小时
      },
      
      // 日志配置
      logging: {
        enabled: process.env.NODE_ENV === 'development',
        level: 'info', // error, warn, info, debug
        consoleEnabled: true,
        fileEnabled: false
      },
      
      // 用户偏好
      preferences: {
        lastConnectedDevice: null,
        rememberDevice: true,
        startMinimized: false,
        autoUpdateCheck: true
      }
    };
  }

  /**
   * 从本地存储加载配置
   */
  loadConfig() {
    try {
      const savedConfig = localStorage.getItem(this.storageKey);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        this.config = this.deepMerge(this.config, parsedConfig);
        console.log('✅ 配置已从本地存储加载');
      }
    } catch (error) {
      console.error('❌ 加载配置失败:', error);
      // 如果加载失败，使用默认配置
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * 保存配置到本地存储
   */
  saveConfig() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      console.log('✅ 配置已保存到本地存储');
    } catch (error) {
      console.error('❌ 保存配置失败:', error);
    }
  }

  /**
   * 获取完整配置
   * @returns {object} 当前配置对象
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 获取指定路径的配置值
   * @param {string} path - 配置路径，支持点号分隔，如 'connection.websocketUrl'
   * @param {*} defaultValue - 默认值，如果配置不存在
   * @returns {*} 配置值或默认值
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value === null || typeof value !== 'object' || !(key in value)) {
        return defaultValue;
      }
      value = value[key];
    }
    
    return value;
  }

  /**
   * 设置配置值
   * @param {string|object} key - 配置键名（字符串）或配置对象
   * @param {*} value - 配置值（当key为字符串时）
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  set(key, value) {
    if (typeof key === 'object') {
      // 批量更新配置
      this.config = this.deepMerge(this.config, key);
      this.notifyChanges(key);
    } else {
      // 单个配置更新
      const keys = key.split('.');
      let configPart = this.config;
      
      // 遍历到倒数第二个键
      for (let i = 0; i < keys.length - 1; i++) {
        const currentKey = keys[i];
        if (!(currentKey in configPart) || typeof configPart[currentKey] !== 'object') {
          configPart[currentKey] = {};
        }
        configPart = configPart[currentKey];
      }
      
      // 设置最后一个键的值
      const lastKey = keys[keys.length - 1];
      configPart[lastKey] = value;
      
      // 通知变化
      const change = {};
      change[key] = value;
      this.notifyChanges(change);
    }
    
    // 保存到本地存储
    this.saveConfig();
    
    return this;
  }

  /**
   * 重置配置到默认值
   * @param {string} path - 可选，配置路径，如果提供则只重置该路径下的配置
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  reset(path = null) {
    if (path) {
      // 重置特定路径的配置
      const defaultConfig = this.getDefaultConfig();
      const pathValue = this.getPathFromObject(defaultConfig, path);
      if (pathValue !== undefined) {
        this.set(path, pathValue);
      }
    } else {
      // 重置所有配置
      this.config = this.getDefaultConfig();
      this.saveConfig();
      this.notifyChanges(this.config);
    }
    
    return this;
  }

  /**
   * 从对象中获取路径对应的值
   * @param {object} obj - 源对象
   * @param {string} path - 路径字符串
   * @returns {*} 路径对应的值
   */
  getPathFromObject(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 深度合并两个对象
   * @param {object} target - 目标对象
   * @param {object} source - 源对象
   * @returns {object} 合并后的对象
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * 检查值是否为对象
   * @param {*} item - 要检查的值
   * @returns {boolean} 是否为对象
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 注册配置变化监听器
   * @param {string} path - 配置路径，使用 * 通配符监听所有变化
   * @param {function} listener - 监听器函数，接收 (newValue, oldValue, path) 参数
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  on(path, listener) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    this.listeners.get(path).push(listener);
    return this;
  }

  /**
   * 移除配置变化监听器
   * @param {string} path - 配置路径
   * @param {function} listener - 要移除的监听器函数
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  off(path, listener) {
    if (this.listeners.has(path)) {
      const listeners = this.listeners.get(path);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * 通知配置变化
   * @param {object} changes - 变化的配置对象
   */
  notifyChanges(changes) {
    // 通知特定路径的监听器
    Object.keys(changes).forEach(path => {
      const listeners = this.listeners.get(path) || [];
      const newValue = changes[path];
      const oldValue = this.get(path);
      
      listeners.forEach(listener => {
        try {
          listener(newValue, oldValue, path);
        } catch (error) {
          console.error(`配置监听器错误 (${path}):`, error);
        }
      });
    });
    
    // 通知通配符监听器
    const wildcardListeners = this.listeners.get('*') || [];
    wildcardListeners.forEach(listener => {
      try {
        listener(changes, this.config);
      } catch (error) {
        console.error('配置通配符监听器错误:', error);
      }
    });
  }

  /**
   * 清除所有本地存储的配置
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  clearConfig() {
    try {
      localStorage.removeItem(this.storageKey);
      this.config = this.getDefaultConfig();
      console.log('✅ 已清除所有存储的配置');
    } catch (error) {
      console.error('❌ 清除配置失败:', error);
    }
    return this;
  }

  /**
   * 导出配置为JSON字符串
   * @returns {string} 配置的JSON字符串
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 导入配置
   * @param {string|object} config - 配置字符串或对象
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  importConfig(config) {
    try {
      const importedConfig = typeof config === 'string' ? JSON.parse(config) : config;
      this.config = this.deepMerge(this.config, importedConfig);
      this.saveConfig();
      this.notifyChanges(this.config);
      console.log('✅ 配置导入成功');
    } catch (error) {
      console.error('❌ 配置导入失败:', error);
      throw new Error('无效的配置格式');
    }
    return this;
  }
  
  /**
   * 获取连接相关配置
   * @returns {object} 连接配置对象
   */
  getConnectionConfig() {
    return { ...this.config.connection };
  }
  
  /**
   * 更新连接配置
   * @param {object} connectionConfig - 新的连接配置
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  setConnectionConfig(connectionConfig) {
    return this.set('connection', {
      ...this.config.connection,
      ...connectionConfig
    });
  }
  
  /**
   * 获取UI相关配置
   * @returns {object} UI配置对象
   */
  getUIConfig() {
    return { ...this.config.ui };
  }
  
  /**
   * 更新UI配置
   * @param {object} uiConfig - 新的UI配置
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  setUIConfig(uiConfig) {
    return this.set('ui', {
      ...this.config.ui,
      ...uiConfig
    });
  }
  
  /**
   * 获取功能相关配置
   * @param {string} featureName - 可选，功能名称，如果提供则只返回该功能的配置
   * @returns {object} 功能配置对象
   */
  getFeaturesConfig(featureName = null) {
    if (featureName) {
      return { ...this.config.features[featureName] } || {};
    }
    return { ...this.config.features };
  }
  
  /**
   * 更新功能配置
   * @param {string} featureName - 功能名称
   * @param {object} featureConfig - 新的功能配置
   * @returns {ConfigManager} 配置管理器实例，支持链式调用
   */
  setFeatureConfig(featureName, featureConfig) {
    return this.set(`features.${featureName}`, {
      ...this.config.features[featureName],
      ...featureConfig
    });
  }
}

// 创建单例实例
const configManager = new ConfigManager();

export default configManager;