/**
 * 消息处理器
 * 处理不同类型的WebSocket消息
 */

import clientManager from './clientManager.js';

class MessageHandlers {
  /**
   * 处理消息
   * @param {WebSocket} ws - WebSocket连接实例
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  async handleMessage(ws, clientId, message) {
    // 更新客户端最后活动时间
    clientManager.updateLastActivity(clientId);
    
    // 检查消息类型
    const { type, requestId, ...data } = message;
    
    // 处理响应的辅助函数
    const sendResponse = (responseData) => {
      if (requestId !== undefined) {
        const response = {
          ...responseData,
          requestId: requestId
        };
        ws.send(JSON.stringify(response));
      }
    };
    
    try {
      // 根据消息类型调用相应的处理函数
      switch (type) {
        case 'device_info':
          this.handleDeviceInfo(clientId, data.deviceInfo);
          sendResponse({ success: true });
          break;
        case 'device_discovered':
          this.handleDeviceDiscovered(clientId, data.deviceInfo);
          sendResponse({ success: true });
          break;
        case 'screen_frame':
          this.handleScreenFrame(clientId, data);
          break;
        case 'file_transfer':
          this.handleFileTransfer(clientId, data);
          sendResponse({ success: true });
          break;
        case 'control_command':
          this.handleControlCommand(clientId, data);
          sendResponse({ success: true });
          break;
        case 'clipboard':
          this.handleClipboard(clientId, data);
          break;
        case 'notification':
          this.handleNotification(clientId, data);
          break;
        case 'heartbeat':
          this.handleHeartbeat(clientId, data);
          break;
        case 'start_device_discovery':
          this.handleStartDeviceDiscovery(clientId, data);
          break;
        case 'stop_device_discovery':
          this.handleStopDeviceDiscovery(clientId, data);
          break;
        case 'get_discovered_devices':
          this.handleGetDiscoveredDevices(clientId, data);
          break;
        case 'get_connected_devices':
          this.handleGetConnectedDevices(clientId, data);
          break;
        case 'connect_device':
          this.handleConnectDevice(clientId, data);
          sendResponse({ success: true });
          break;
        case 'disconnect_device':
          this.handleDisconnectDevice(clientId, data);
          sendResponse({ success: true });
          break;
        default:
          console.log(`未知消息类型: ${type}`);
          sendResponse({ success: false, error: '未知消息类型' });
      }
    } catch (error) {
      console.error(`处理消息时出错: ${type}`, error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * 处理设备信息
   * @param {string} clientId - 客户端ID
   * @param {Object} deviceInfo - 设备信息
   */
  handleDeviceInfo(clientId, deviceInfo) {
    console.log('收到设备信息:', deviceInfo);
    
    // 更新客户端信息
    clientManager.updateClient(clientId, deviceInfo);
    
    // 向所有Web客户端广播设备信息
    clientManager.broadcastToWebClients({
      type: 'device_connected',
      deviceInfo: deviceInfo,
      clientId: clientId
    });
    
    // 如果是Android设备，向所有Web客户端广播设备连接信息
    if (deviceInfo.platform === 'android') {
      clientManager.broadcastToWebClients({
        type: 'android_connected',
        deviceInfo: deviceInfo
      });
    }
  }
  
  /**
   * 处理设备发现消息
   * @param {string} clientId - 客户端ID
   * @param {Object} deviceInfo - 设备信息
   */
  handleDeviceDiscovered(clientId, deviceInfo) {
    console.log('收到设备发现消息:', deviceInfo);
    
    // 向所有Web客户端广播设备发现信息
    clientManager.broadcastToWebClients({
      type: 'device_discovered',
      device: deviceInfo
    });
  }

  /**
   * 处理屏幕帧
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 屏幕帧数据
   */
  handleScreenFrame(clientId, data) {
    console.log('收到屏幕帧:', data.timestamp);
    
    // 广播屏幕帧给所有Web客户端，排除发送方
    clientManager.broadcastToWebClients({
      type: 'screen_frame',
      frameData: data.frameData,
      timestamp: data.timestamp
    }, clientId);
  }

  /**
   * 处理文件传输
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 文件传输数据
   */
  handleFileTransfer(clientId, data) {
    console.log('收到文件传输消息:', data.action);
    
    // 转发给其他客户端（如Web前端）
    clientManager.broadcastToWebClients({
      type: 'file_transfer',
      ...data,
      sourceClientId: clientId
    }, clientId);
  }

  /**
   * 处理控制命令
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 控制命令数据
   */
  handleControlCommand(clientId, data) {
    console.log('收到控制命令:', data.commandType);
    
    // 如果是Web客户端发送的控制命令，转发给Android设备
    const client = clientManager.getClient(clientId);
    if (client && client.type === 'web') {
      // 向Android设备发送控制命令
      const success = clientManager.sendToAndroidDevice(data);
      if (!success) {
        // 如果没有连接的Android设备，发送错误消息给Web客户端
        clientManager.sendToClient(clientId, {
          type: 'error',
          message: '没有连接的Android设备'
        });
        console.log('没有连接的Android设备，无法转发控制命令');
      } else {
        console.log('控制命令已转发给Android设备');
      }
    }
  }

  /**
   * 处理剪贴板同步
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 剪贴板数据
   */
  handleClipboard(clientId, data) {
    console.log('收到剪贴板消息:', data.data.substring(0, 50) + '...');
    
    // 转发给所有其他客户端（实现双向同步）
    clientManager.broadcastToAllClients({
      type: 'clipboard',
      ...data,
      sourceClientId: clientId
    }, clientId);
  }

  /**
   * 处理通知
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 通知数据
   */
  handleNotification(clientId, data) {
    console.log('收到通知消息:', data.title);
    
    // 转发给所有Web客户端
    clientManager.broadcastToWebClients({
      type: 'notification',
      ...data,
      sourceClientId: clientId
    }, clientId);
  }

  /**
   * 处理心跳
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 心跳数据
   */
  handleHeartbeat(clientId, data) {
    console.log('收到心跳:', clientId);
    
    // 回复心跳
    clientManager.sendToClient(clientId, {
      type: 'heartbeat',
      timestamp: Date.now()
    });
  }

  /**
   * 处理开始设备发现请求
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 请求数据
   */
  handleStartDeviceDiscovery(clientId, data) {
    console.log('开始设备发现请求');
    
    // 发送确认消息
    clientManager.sendToClient(clientId, {
      type: 'start_device_discovery_response',
      success: true
    });
  }

  /**
   * 处理停止设备发现请求
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 请求数据
   */
  handleStopDeviceDiscovery(clientId, data) {
    console.log('停止设备发现请求');
    
    // 发送确认消息
    clientManager.sendToClient(clientId, {
      type: 'stop_device_discovery_response',
      success: true
    });
  }

  /**
   * 处理获取已发现设备请求
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 请求数据
   */
  handleGetDiscoveredDevices(clientId, data) {
    console.log('获取已发现设备请求');
    
    // 返回当前连接的设备列表
    const devices = [];
    const androidDevice = clientManager.getAndroidDevice();
    if (androidDevice) {
      devices.push(androidDevice.info);
    }
    
    clientManager.sendToClient(clientId, {
      type: 'get_discovered_devices_response',
      success: true,
      devices: devices
    });
  }

  /**
   * 处理获取已连接设备请求
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 请求数据
   */
  handleGetConnectedDevices(clientId, data) {
    console.log('获取已连接设备请求');
    
    // 返回已连接的设备列表
    const connectedDevices = [];
    const androidDevice = clientManager.getAndroidDevice();
    if (androidDevice) {
      connectedDevices.push(androidDevice.info);
    }
    
    clientManager.sendToClient(clientId, {
      type: 'get_connected_devices_response',
      success: true,
      devices: connectedDevices
    });
  }

  /**
   * 处理连接设备请求
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 请求数据
   */
  handleConnectDevice(clientId, data) {
    console.log('连接设备请求:', data.deviceId);
    
    // 简化处理：假设连接成功
    clientManager.sendToClient(clientId, {
      type: 'connect_device_response',
      success: true,
      deviceId: data.deviceId
    });
  }

  /**
   * 处理断开设备请求
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 请求数据
   */
  handleDisconnectDevice(clientId, data) {
    console.log('断开设备请求:', data.deviceId);
    
    // 简化处理：假设断开成功
    clientManager.sendToClient(clientId, {
      type: 'disconnect_device_response',
      success: true,
      deviceId: data.deviceId
    });
  }
}

// 创建单例实例
const messageHandlers = new MessageHandlers();

export default messageHandlers;
