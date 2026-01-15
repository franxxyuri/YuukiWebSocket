/**
 * 优化的 WebSocket 服务
 * 集成消息队列、压缩、缓存等优化功能
 */

import { WebSocketServer } from 'ws';
import MessageQueue, { PRIORITY } from '../utils/message-queue.js';
import CacheManager from '../utils/cache-manager.js';
import compression from '../utils/compression.js';
import logger from '../utils/logger.js';

class OptimizedWebSocketService {
  constructor(dependencies = {}) {
    this.wss = null;
    this.server = null;
    
    // 依赖注入
    this.clientManager = dependencies.clientManager;
    this.messageHandlers = dependencies.messageHandlers;
    this.WebSocketServerImpl = dependencies.WebSocketServerImpl || WebSocketServer;
    
    if (!this.clientManager) {
      throw new Error('clientManager is required');
    }
    
    if (!this.messageHandlers) {
      throw new Error('messageHandlers is required');
    }
    
    // 初始化优化组件
    this.messageQueue = new MessageQueue({
      batchSize: 20,
      processInterval: 5,
      maxQueueSize: 2000
    });
    
    this.cache = new CacheManager({
      maxSize: 500,
      defaultTTL: 300000 // 5 分钟
    });
    
    // 配置选项
    this.enableCompression = dependencies.enableCompression !== false;
    this.compressionThreshold = dependencies.compressionThreshold || 1024; // 1KB
    
    // 统计信息
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      compressionSaved: 0
    };
    
    logger.info('优化的 WebSocket 服务已初始化', {
      enableCompression: this.enableCompression,
      compressionThreshold: this.compressionThreshold
    });
  }

  /**
   * 初始化 WebSocket 服务
   * @param {http.Server} server - HTTP 服务器实例
   */
  init(server) {
    this.server = server;
    this.wss = new this.WebSocketServerImpl({ 
      server,
      perMessageDeflate: this.enableCompression ? {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: this.compressionThreshold
      } : false
    });
    
    // 注册事件监听器
    this.registerEventListeners();
    
    logger.info('优化的 WebSocket 服务已启动');
  }

  /**
   * 注册事件监听器
   */
  registerEventListeners() {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleError.bind(this));
    this.wss.on('close', this.handleClose.bind(this));
  }

  /**
   * 处理新连接
   * @param {WebSocket} ws - WebSocket 连接实例
   * @param {http.IncomingMessage} request - HTTP 请求对象
   */
  handleConnection(ws, request) {
    const clientId = this.clientManager.addClient(ws, request);
    logger.info('新客户端连接', {
      clientId,
      ip: request.socket.remoteAddress
    });
    
    // 发送欢迎消息
    this.sendMessage(ws, {
      type: 'connection_established',
      clientId: clientId,
      features: {
        compression: this.enableCompression,
        messageQueue: true,
        cache: true
      },
      timestamp: Date.now()
    });
    
    // 注册客户端事件监听器
    this.registerClientEventListeners(ws, clientId);
  }

  /**
   * 注册客户端事件监听器
   * @param {WebSocket} ws - WebSocket 连接实例
   * @param {string} clientId - 客户端ID
   */
  registerClientEventListeners(ws, clientId) {
    ws.on('message', (data) => {
      this.handleMessage(ws, clientId, data);
    });
    
    ws.on('close', () => {
      this.handleClientClose(clientId);
    });
    
    ws.on('error', (error) => {
      this.handleClientError(clientId, error);
    });
    
    // 添加 pong 监听器（心跳响应）
    ws.on('pong', () => {
      this.clientManager.updateClientHeartbeat(clientId);
    });
  }

  /**
   * 处理客户端消息（使用消息队列）
   * @param {WebSocket} ws - WebSocket 连接实例
   * @param {string} clientId - 客户端ID
   * @param {Buffer|string|Object} data - 消息数据
   */
  async handleMessage(ws, clientId, data) {
    try {
      // 更新统计
      this.stats.messagesReceived++;
      this.stats.bytesReceived += Buffer.byteLength(data);
      
      // 解析消息
      let message;
      if (typeof data === 'string') {
        message = JSON.parse(data);
      } else if (Buffer.isBuffer(data)) {
        message = JSON.parse(data.toString());
      } else {
        message = data;
      }
      
      // 确定消息优先级
      const priority = this.getMessagePriority(message.type);
      
      // 添加到消息队列
      this.messageQueue.enqueue(
        message,
        priority,
        async (msg) => {
          await this.processMessage(ws, clientId, msg);
        }
      );
    } catch (error) {
      logger.error('处理消息失败', {
        clientId,
        error: error.message
      });
      
      this.sendError(ws, {
        code: 'INVALID_MESSAGE',
        message: '无效的消息格式'
      });
    }
  }

  /**
   * 处理单个消息
   * @param {WebSocket} ws - WebSocket 连接实例
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  async processMessage(ws, clientId, message) {
    try {
      // 检查缓存
      const cacheKey = `msg:${message.type}:${JSON.stringify(message)}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        logger.debug('使用缓存响应', { type: message.type });
        this.sendMessage(ws, cached);
        return;
      }
      
      // 调用消息处理器
      const response = await this.messageHandlers.handleMessage(ws, clientId, message);
      
      // 缓存响应（如果适用）
      if (response && this.shouldCacheResponse(message.type)) {
        this.cache.set(cacheKey, response, 60000); // 缓存 1 分钟
      }
    } catch (error) {
      logger.error('消息处理错误', {
        clientId,
        type: message.type,
        error: error.message
      });
      
      this.sendError(ws, {
        code: 'PROCESSING_ERROR',
        message: '消息处理失败'
      });
    }
  }

  /**
   * 发送消息
   * @param {WebSocket} ws - WebSocket 连接实例
   * @param {Object} message - 消息对象
   */
  async sendMessage(ws, message) {
    if (ws.readyState !== 1) { // WebSocket.OPEN
      return;
    }
    
    try {
      let data = JSON.stringify(message);
      const originalSize = Buffer.byteLength(data);
      
      // 如果启用压缩且消息足够大，进行压缩
      if (this.enableCompression && originalSize > this.compressionThreshold) {
        const compressed = await compression.compress(data);
        const saved = originalSize - compressed.length;
        
        this.stats.compressionSaved += saved;
        
        logger.debug('消息已压缩', {
          originalSize,
          compressedSize: compressed.length,
          saved: `${saved} bytes`
        });
        
        data = compressed;
      }
      
      ws.send(data);
      
      // 更新统计
      this.stats.messagesSent++;
      this.stats.bytesSent += Buffer.byteLength(data);
    } catch (error) {
      logger.error('发送消息失败', { error: error.message });
    }
  }

  /**
   * 发送错误消息
   * @param {WebSocket} ws - WebSocket 连接实例
   * @param {Object} error - 错误对象
   */
  sendError(ws, error) {
    this.sendMessage(ws, {
      type: 'error',
      error: error,
      timestamp: Date.now()
    });
  }

  /**
   * 获取消息优先级
   * @param {string} messageType - 消息类型
   * @returns {number} 优先级
   */
  getMessagePriority(messageType) {
    const criticalTypes = ['heartbeat', 'connection_control', 'disconnect'];
    const highTypes = ['control_command', 'remote_control'];
    const lowTypes = ['log', 'stats', 'debug'];
    
    if (criticalTypes.includes(messageType)) {
      return PRIORITY.CRITICAL;
    } else if (highTypes.includes(messageType)) {
      return PRIORITY.HIGH;
    } else if (lowTypes.includes(messageType)) {
      return PRIORITY.LOW;
    }
    
    return PRIORITY.NORMAL;
  }

  /**
   * 判断是否应该缓存响应
   * @param {string} messageType - 消息类型
   * @returns {boolean} 是否缓存
   */
  shouldCacheResponse(messageType) {
    const cacheableTypes = [
      'get_device_info',
      'get_config',
      'get_capabilities'
    ];
    
    return cacheableTypes.includes(messageType);
  }

  /**
   * 处理客户端关闭
   * @param {string} clientId - 客户端ID
   */
  handleClientClose(clientId) {
    this.clientManager.removeClient(clientId);
    logger.info('客户端断开连接', { clientId });
  }

  /**
   * 处理客户端错误
   * @param {string} clientId - 客户端ID
   * @param {Error} error - 错误对象
   */
  handleClientError(clientId, error) {
    logger.error('客户端错误', {
      clientId,
      error: error.message
    });
  }

  /**
   * 处理 WebSocket 服务器错误
   * @param {Error} error - 错误对象
   */
  handleError(error) {
    logger.error('WebSocket 服务器错误', {
      error: error.message
    });
  }

  /**
   * 处理 WebSocket 服务器关闭
   */
  handleClose() {
    logger.info('WebSocket 服务器已关闭');
    
    // 清理资源
    this.messageQueue.destroy();
    this.cache.destroy();
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      messageQueue: this.messageQueue.getStats(),
      cache: this.cache.getStats(),
      compression: compression.getStats()
    };
  }

  /**
   * 获取所有客户端
   * @returns {Map} 客户端映射
   */
  getClients() {
    return this.clientManager.getClients();
  }

  /**
   * 获取 Android 设备
   * @returns {Object|null} Android 设备信息
   */
  getAndroidDevice() {
    return this.clientManager.getAndroidDevice();
  }
}

export default OptimizedWebSocketService;
