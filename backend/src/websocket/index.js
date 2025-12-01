/**
 * WebSocket服务主入口
 * 处理所有WebSocket连接和消息
 */

import { WebSocketServer } from 'ws';
import config from '../config/config.js';

class WebSocketService {
  /**
   * 构造函数，支持依赖注入
   * @param {Object} dependencies - 依赖项
   * @param {Object} dependencies.clientManager - 客户端管理器
   * @param {Object} dependencies.messageHandlers - 消息处理器
   * @param {Function} dependencies.WebSocketServerImpl - WebSocket服务器实现（用于测试）
   */
  constructor(dependencies = {}) {
    this.wss = null;
    this.server = null;
    this.cleanupInterval = null;
    
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
  }

  /**
   * 初始化WebSocket服务
   * @param {http.Server} server - HTTP服务器实例
   */
  init(server) {
    this.server = server;
    this.wss = new this.WebSocketServerImpl({ server });
    
    // 配置WebSocket服务器
    this.configureWebSocketServer();
    
    // 注册事件监听器
    this.registerEventListeners();
    
    // 启动定期清理不活跃客户端的定时器
    this.startCleanupInterval();
    
    console.log('WebSocket服务已初始化');
  }

  /**
   * 配置WebSocket服务器
   */
  configureWebSocketServer() {
    // 设置最大连接数
    this.wss.maxConnections = config.websocket.maxConnections;
    
    // 设置ping/pong配置
    this.wss.pingInterval = config.websocket.pingInterval;
    this.wss.pingTimeout = config.websocket.pingTimeout;
  }

  /**
   * 注册事件监听器
   */
  registerEventListeners() {
    // 处理新连接
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // 处理错误
    this.wss.on('error', this.handleError.bind(this));
    
    // 处理关闭
    this.wss.on('close', this.handleClose.bind(this));
  }

  /**
   * 处理新连接
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {http.IncomingMessage} request - HTTP请求对象
   */
  handleConnection(ws, request) {
    const clientId = this.clientManager.addClient(ws, request);
    console.log(`新客户端连接: ${clientId} - ${request.socket.remoteAddress}`);
    
    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'connection_established',
      clientId: clientId,
      timestamp: Date.now()
    }));
    
    // 注册客户端事件监听器
    this.registerClientEventListeners(ws, clientId);
  }

  /**
   * 注册客户端事件监听器
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {string} clientId - 客户端ID
   */
  registerClientEventListeners(ws, clientId) {
    // 处理消息
    ws.on('message', (data) => {
      this.handleMessage(ws, clientId, data);
    });
    
    // 处理关闭
    ws.on('close', () => {
      this.handleClientClose(clientId);
    });
    
    // 处理错误
    ws.on('error', (error) => {
      this.handleClientError(clientId, error);
    });
  }

  /**
   * 处理客户端消息
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {string} clientId - 客户端ID
   * @param {Buffer|string|Object} data - 消息数据
   */
  async handleMessage(ws, clientId, data) {
    try {
      let message;
      
      // 处理不同类型的数据
      if (typeof data === 'string') {
        // 字符串类型，直接解析
        message = JSON.parse(data);
      } else if (Buffer.isBuffer(data)) {
        // Buffer类型，先转换为字符串再解析
        message = JSON.parse(data.toString());
      } else if (typeof data === 'object' && data !== null) {
        // 已经是对象类型
        if (data.data && typeof data.data === 'string') {
          // 检查是否是事件监听器格式（{ data: string }）
          message = JSON.parse(data.data);
        } else if (data.data && typeof data.data === 'object') {
          // 检查是否是嵌套对象格式（{ data: object }）
          message = data.data;
        } else {
          // 直接使用对象
          message = data;
        }
      } else {
        throw new Error(`Invalid data type: ${typeof data}`);
      }
      
      console.log(`[${new Date().toISOString()}] 收到消息: ${message.type} - 客户端ID: ${clientId}, 数据: ${JSON.stringify(message)}`);
      
      // 调用对应的消息处理器
      await this.messageHandlers.handleMessage(ws, clientId, message);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 处理消息时出错 - 客户端ID: ${clientId}, 错误: ${error.message}, 堆栈: ${error.stack}`);
      
      // 发送错误响应
      try {
        ws.send(JSON.stringify({
          type: 'error',
          errorCode: 'INVALID_MESSAGE_FORMAT',
          errorMessage: '无效的消息格式',
          timestamp: Date.now()
        }));
      } catch (sendError) {
        console.error(`[${new Date().toISOString()}] 发送错误响应失败 - 客户端ID: ${clientId}, 错误: ${sendError.message}`);
      }
    }
  }

  /**
   * 处理客户端关闭
   * @param {string} clientId - 客户端ID
   */
  handleClientClose(clientId) {
    this.clientManager.removeClient(clientId);
    console.log(`客户端断开连接: ${clientId}`);
  }

  /**
   * 处理客户端错误
   * @param {string} clientId - 客户端ID
   * @param {Error} error - 错误对象
   */
  handleClientError(clientId, error) {
    console.error(`[${new Date().toISOString()}] 客户端错误:`, {
      clientId: clientId,
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * 处理WebSocket服务器错误
   * @param {Error} error - 错误对象
   */
  handleError(error) {
    console.error(`[${new Date().toISOString()}] WebSocket服务器错误:`, {
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * 启动定期清理不活跃客户端的定时器
   */
  startCleanupInterval() {
    // 每5分钟清理一次不活跃客户端
    this.cleanupInterval = setInterval(() => {
      const cleanedCount = this.clientManager.cleanupInactiveClients();
      if (cleanedCount > 0) {
        console.log(`已清理 ${cleanedCount} 个不活跃客户端`);
      }
    }, 5 * 60 * 1000); // 5分钟
  }

  /**
   * 停止定期清理不活跃客户端的定时器
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('不活跃客户端清理定时器已停止');
    }
  }

  /**
   * 处理WebSocket服务器关闭
   */
  handleClose() {
    console.log('WebSocket服务器已关闭');
    // 停止清理定时器
    this.stopCleanupInterval();
  }

  /**
   * 获取所有客户端
   * @returns {Map} 客户端映射
   */
  getClients() {
    return this.clientManager.getClients();
  }

  /**
   * 获取Android设备
   * @returns {Object|null} Android设备信息
   */
  getAndroidDevice() {
    return this.clientManager.getAndroidDevice();
  }
}

export default WebSocketService;

