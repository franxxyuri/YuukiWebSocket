class WebSocketService {

  constructor() {

    this.socket = null;

    this.isConnected = false;

    this.eventHandlers = new Map();

    this.messageCallbacks = new Map(); // 存储请求-响应回调

    this.requestId = 0;

  }



  connect(serverUrl = 'ws://localhost:8781/ws') {

    if (this.socket) {

      this.disconnect();

    }



    // 处理URL格式，将http://转换为ws://

    let wsUrl = serverUrl;

    if (wsUrl.startsWith('http://')) {

      wsUrl = 'ws://' + wsUrl.substring(7);

    } else if (wsUrl.startsWith('https://')) {

      wsUrl = 'wss://' + wsUrl.substring(8);

    }



    this.socket = new WebSocket(wsUrl);



    return new Promise((resolve, reject) => {

      this.socket.onopen = () => {

        console.log('✅ 已连接到服务器');

        this.isConnected = true;

        // 发送设备信息（模拟Web客户端）

        this.socket.send(JSON.stringify({

          type: 'device_info',

          deviceInfo: {

            platform: 'web',

            deviceName: 'React Web Client',

            deviceId: 'web-react-' + Date.now()

          }

        }));

        resolve();

      };



      this.socket.onclose = (event) => {

        console.log('⚠️ 与服务器断开连接:', event.reason || '未知原因');

        this.isConnected = false;

        this.handleEvent('disconnect', event.reason || '未知原因');

      };



      this.socket.onerror = (error) => {

        console.error('❌ 连接服务器失败:', error);

        this.isConnected = false;

        reject(error);

      };



      this.socket.onmessage = (event) => {

        try {

          const message = JSON.parse(event.data);

          this.handleMessage(message);

        } catch (error) {

          console.error('处理消息时出错:', error);

        }

      };

    });

  }



  disconnect() {

    if (this.socket) {

      this.socket.close();

      this.socket = null;

      this.isConnected = false;

      console.log('🔌 已断开连接');

    }

  }



  handleMessage(message) {

    // 检查是否是响应消息（有requestId和callback）

    if (message.requestId && this.messageCallbacks.has(message.requestId)) {

      const callback = this.messageCallbacks.get(message.requestId);

      this.messageCallbacks.delete(message.requestId);

      callback(message);

      return;

    }



    // 根据消息类型触发事件

    switch (message.type) {

      case 'device_found':

        this.handleEvent('device_discovered', message.device);

        break;

      case 'android_connected':

        this.handleEvent('device_status_update', { id: message.deviceInfo.deviceId, status: '已连接' });

        break;

      case 'screen_frame':

        this.handleEvent('screen_stream_data', message);

        break;

      case 'file_transfer':

        // 根据action处理不同的文件传输事件

        if (message.action === 'progress') {

          this.handleEvent('file_transfer_progress', message);

        } else if (message.action === 'complete') {

          this.handleEvent('file_transfer_completed', message);

        } else if (message.action === 'error') {

          this.handleEvent('file_transfer_error', message);

        }

        break;

      case 'clipboard':

        // 剪贴板事件

        break;

      case 'notification':

        // 通知事件

        break;

      case 'control_command_response':

        this.handleEvent('control_response', message);

        break;

      default:

        console.log('未知消息类型:', message);

        break;

    }

  }

  handleEvent(eventName, data) {
    const handlers = this.eventHandlers.get(eventName) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`处理事件 ${eventName} 时出错:`, error);
      }
    });
  }

  // 注册事件处理器
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(handler);
  }

  // 移除事件处理器
  off(eventName, handler) {
    if (this.eventHandlers.has(eventName)) {
      const handlers = this.eventHandlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 生成请求ID

  generateRequestId() {

    return ++this.requestId;

  }



  // 发送带回调的请求

  sendRequest(type, data) {

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {

      return Promise.reject(new Error('未连接到服务器'));

    }



    const requestId = this.generateRequestId();

    const message = {

      type: type,

      requestId: requestId,

      ...data

    };



    return new Promise((resolve, reject) => {

      // 存储回调

      this.messageCallbacks.set(requestId, (response) => {

        if (response.success) {

          resolve(response);

        } else {

          reject(new Error(response.error || '请求失败'));

        }

      });



      // 发送消息

      this.socket.send(JSON.stringify(message));



      // 设置超时

      setTimeout(() => {

        if (this.messageCallbacks.has(requestId)) {

          this.messageCallbacks.delete(requestId);

          reject(new Error('请求超时'));

        }

      }, 10000); // 10秒超时

    });

  }



  // 发送不带回调的请求

  sendCommand(type, data) {

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {

      throw new Error('未连接到服务器');

    }



    const message = {

      type: type,

      ...data

    };



    this.socket.send(JSON.stringify(message));

  }



  // 发送设备发现请求

  startDeviceDiscovery() {

    // 发送开始设备发现命令

    this.sendCommand('start_device_discovery', {});

    // 对于设备列表，我们依赖于事件监听

    return Promise.resolve([]);

  }



  // 停止设备发现

  stopDeviceDiscovery() {

    return this.sendRequest('stop_device_discovery', {});

  }



  // 获取已发现的设备

  getDiscoveredDevices() {

    // 目前服务器没有提供直接获取设备列表的API，我们返回已缓存的设备

    // 可以发送请求获取，但需要服务器支持

    return this.sendRequest('get_discovered_devices', {});

  }



  // 发送文件

  sendFile(filePath, targetDeviceId, options = {}) {

    return this.sendRequest('file_transfer', {

      action: 'send',

      filePath,

      targetDeviceId,

      options

    });

  }



  // 接收文件

  receiveFile(transferInfo, savePath = null) {

    return this.sendRequest('file_transfer', {

      action: 'receive',

      transferInfo,

      savePath

    });

  }



  // 开始屏幕投屏

  startScreenStreaming(deviceInfo) {

    return this.sendRequest('control_command', {

      commandType: 'start_streaming',

      deviceInfo

    });

  }



  // 停止屏幕投屏

  stopScreenStreaming(deviceInfo) {

    return this.sendRequest('control_command', {

      commandType: 'stop_streaming',

      deviceInfo

    });

  }



  // 启用远程控制

  enableRemoteControl(deviceInfo) {

    return this.sendRequest('control_command', {

      commandType: 'enable_control',

      deviceInfo

    });

  }



  // 发送控制事件

  sendControlEvent(eventData) {

    return this.sendRequest('control_command', {

      commandType: 'send_event',

      ...eventData

    });

  }



  // 获取连接状态

  getConnectionStatus() {

    return {

      isConnected: this.isConnected,

      socketId: this.socket ? 'ws-' + Date.now() : null // 原生WebSocket没有id属性，返回模拟值

    };

  }

}



// 创建全局实例

const websocketService = new WebSocketService();



export default websocketService;