/**
 * 客户端管理器
 * 管理所有WebSocket客户端连接
 */

class ClientManager {
  constructor() {
    // 存储连接的客户端
    this.clients = new Map();
    
    // 存储连接的Android设备
    this.androidDevice = null;
    
    // 消息队列，用于可靠消息传递
    this.messageQueue = new Map();
    
    // 重试配置
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000, // 1秒
      timeout: 5000     // 5秒超时
    };
  }

  /**
   * 添加新客户端
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {http.IncomingMessage} request - HTTP请求对象
   * @returns {string} 客户端ID
   */
  addClient(ws, request) {
    // 生成客户端ID
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 存储客户端信息
    const client = {
      ws: ws,
      type: 'unknown', // 'android' or 'web'
      ip: request.socket.remoteAddress,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    };
    
    // 添加到客户端映射
    this.clients.set(clientId, client);
    
    return clientId;
  }

  /**
   * 移除客户端
   * @param {string} clientId - 客户端ID
   */
  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      // 检查是否是Android设备
      if (this.androidDevice && this.androidDevice.id === clientId) {
        this.androidDevice = null;
        console.log('Android设备已断开连接');
      }
      
      // 移除客户端
      this.clients.delete(clientId);
      
      // 清理该客户端的消息队列，避免内存泄漏
      if (this.messageQueue.has(clientId)) {
        this.messageQueue.delete(clientId);
        console.log(`已清理客户端 ${clientId} 的消息队列`);
      }
      
      console.log(`客户端已移除: ${clientId}, 剩余客户端数: ${this.clients.size}`);
    }
  }

  /**
   * 获取客户端
   * @param {string} clientId - 客户端ID
   * @returns {Object|null} 客户端信息
   */
  getClient(clientId) {
    return this.clients.get(clientId);
  }

  /**
   * 获取所有客户端
   * @returns {Map} 客户端映射
   */
  getClients() {
    return this.clients;
  }

  /**
   * 更新客户端信息
   * @param {string} clientId - 客户端ID
   * @param {Object} updates - 更新的客户端信息
   */
  updateClient(clientId, updates) {
    const client = this.clients.get(clientId);
    if (client) {
      // 更新客户端信息
      Object.assign(client, updates);
      
      // 如果是Android设备，更新Android设备信息
      if (updates.platform === 'android') {
        this.androidDevice = {
          id: clientId,
          info: updates,
          ws: client.ws
        };
        console.log('Android设备已连接:', updates.deviceName);
      }
    }
  }

  /**
   * 获取Android设备
   * @returns {Object|null} Android设备信息
   */
  getAndroidDevice() {
    return this.androidDevice;
  }

  /**
   * 向特定客户端发送消息
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   * @param {boolean} reliable - 是否需要可靠传递
   * @returns {boolean} 发送是否成功
   */
  sendToClient(clientId, message, reliable = false) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== client.ws.OPEN) {
      if (reliable) {
        // 如果需要可靠传递，将消息加入队列
        this.enqueueMessage(clientId, message);
        return true;
      }
      return false;
    }
    
    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`向客户端发送消息失败: ${clientId}`, error);
      if (reliable) {
        // 如果发送失败且需要可靠传递，将消息加入队列
        this.enqueueMessage(clientId, message);
        return true;
      }
      return false;
    }
  }
  
  /**
   * 将消息加入队列
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  enqueueMessage(clientId, message) {
    if (!this.messageQueue.has(clientId)) {
      this.messageQueue.set(clientId, []);
    }
    
    const queue = this.messageQueue.get(clientId);
    queue.push({
      message: message,
      retries: 0,
      timestamp: Date.now()
    });
    
    console.log(`消息已加入队列，客户端: ${clientId}，队列长度: ${queue.length}`);
    
    // 尝试发送队列中的消息
    this.processMessageQueue(clientId);
  }
  
  /**
   * 处理消息队列
   * @param {string} clientId - 客户端ID
   */
  processMessageQueue(clientId) {
    const queue = this.messageQueue.get(clientId);
    if (!queue || queue.length === 0) {
      return;
    }
    
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== client.ws.OPEN) {
      return;
    }
    
    const messageItem = queue[0];
    
    try {
      client.ws.send(JSON.stringify(messageItem.message));
      console.log(`队列消息发送成功，客户端: ${clientId}，重试次数: ${messageItem.retries}`);
      
      // 从队列中移除已发送成功的消息
      queue.shift();
      
      // 如果队列还有消息，继续处理
      if (queue.length > 0) {
        this.processMessageQueue(clientId);
      } else {
        // 队列为空，移除队列
        this.messageQueue.delete(clientId);
      }
    } catch (error) {
      messageItem.retries++;
      console.error(`队列消息发送失败，客户端: ${clientId}，重试次数: ${messageItem.retries}`, error);
      
      if (messageItem.retries < this.retryConfig.maxRetries) {
        // 重试发送
        setTimeout(() => {
          this.processMessageQueue(clientId);
        }, this.retryConfig.retryDelay);
      } else {
        // 超过最大重试次数，从队列中移除
        console.error(`消息发送失败超过最大重试次数，客户端: ${clientId}，消息类型: ${messageItem.message.type}`);
        queue.shift();
        
        // 如果队列还有消息，继续处理
        if (queue.length > 0) {
          this.processMessageQueue(clientId);
        } else {
          // 队列为空，移除队列
          this.messageQueue.delete(clientId);
        }
      }
    }
  }

  /**
   * 向所有Web客户端广播消息
   * @param {Object} message - 消息对象
   * @param {string} excludeClientId - 要排除的客户端ID
   * @param {boolean} reliable - 是否需要可靠传递
   */
  broadcastToWebClients(message, excludeClientId = null, reliable = false) {
    let sentCount = 0;
    
    for (const [clientId, client] of this.clients) {
      if (client.type === 'web' && clientId !== excludeClientId) {
        if (this.sendToClient(clientId, message, reliable)) {
          sentCount++;
        }
      }
    }
    
    console.log(`已向 ${sentCount} 个Web客户端广播消息，可靠传递: ${reliable}`);
    return sentCount;
  }

  /**
   * 向所有客户端广播消息
   * @param {Object} message - 消息对象
   * @param {string} excludeClientId - 要排除的客户端ID
   * @param {boolean} reliable - 是否需要可靠传递
   */
  broadcastToAllClients(message, excludeClientId = null, reliable = false) {
    let sentCount = 0;
    
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId) {
        if (this.sendToClient(clientId, message, reliable)) {
          sentCount++;
        }
      }
    }
    
    console.log(`已向 ${sentCount} 个客户端广播消息，可靠传递: ${reliable}`);
    return sentCount;
  }

  /**
   * 向Android设备发送消息
   * @param {Object} message - 消息对象
   * @param {boolean} reliable - 是否需要可靠传递
   * @returns {boolean} 是否发送成功
   */
  sendToAndroidDevice(message, reliable = false) {
    if (!this.androidDevice || this.androidDevice.ws.readyState !== this.androidDevice.ws.OPEN) {
      if (reliable) {
        // 如果需要可靠传递且设备未连接，将消息加入队列
        if (this.androidDevice) {
          this.enqueueMessage(this.androidDevice.id, message);
        }
        return true;
      }
      return false;
    }
    
    try {
      this.androidDevice.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('向Android设备发送消息失败', error);
      if (reliable) {
        // 如果发送失败且需要可靠传递，将消息加入队列
        this.enqueueMessage(this.androidDevice.id, message);
        return true;
      }
      return false;
    }
  }

  /**
   * 更新客户端最后活动时间
   * @param {string} clientId - 客户端ID
   */
  updateLastActivity(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  /**
   * 获取客户端数量
   * @returns {number} 客户端数量
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * 清理不活跃的客户端
   * @param {number} timeout - 超时时间（毫秒）
   */
  cleanupInactiveClients(timeout = 300000) { // 默认5分钟
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [clientId, client] of this.clients) {
      if (now - client.lastActivity > timeout) {
        // 关闭连接
        client.ws.close(1001, 'Inactive client cleanup');
        
        // 移除客户端
        this.removeClient(clientId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`已清理 ${cleanedCount} 个不活跃客户端`);
    }
    
    return cleanedCount;
  }
}

// 创建单例实例
const clientManager = new ClientManager();

export default clientManager;
