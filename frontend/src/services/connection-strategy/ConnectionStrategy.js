/**
 * 连接策略接口
 * 定义所有连接策略必须实现的方法
 */
class ConnectionStrategy {
  /**
   * 连接到服务器
   * @param {string} serverUrl - 服务器URL
   * @returns {Promise<void>} 连接成功时解析
   */
  connect(serverUrl) {
    throw new Error('connect method must be implemented');
  }

  /**
   * 断开连接
   */
  disconnect() {
    throw new Error('disconnect method must be implemented');
  }

  /**
   * 发送消息
   * @param {string} message - 要发送的消息
   */
  send(message) {
    throw new Error('send method must be implemented');
  }

  /**
   * 发送带回调的请求
   * @param {string} type - 请求类型
   * @param {object} data - 请求数据
   * @returns {Promise<object>} 包含响应的Promise
   */
  sendRequest(type, data) {
    throw new Error('sendRequest method must be implemented');
  }

  /**
   * 发送不带回调的命令
   * @param {string} type - 命令类型
   * @param {object} data - 命令数据
   */
  sendCommand(type, data) {
    throw new Error('sendCommand method must be implemented');
  }

  /**
   * 注册事件处理器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 事件处理器函数
   */
  on(eventName, handler) {
    throw new Error('on method must be implemented');
  }

  /**
   * 移除事件处理器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 要移除的事件处理器
   */
  off(eventName, handler) {
    throw new Error('off method must be implemented');
  }

  /**
   * 获取连接状态
   * @returns {object} 连接状态对象
   */
  getConnectionStatus() {
    throw new Error('getConnectionStatus method must be implemented');
  }

  /**
   * 检查是否已连接
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    throw new Error('isConnected method must be implemented');
  }
}

export default ConnectionStrategy;