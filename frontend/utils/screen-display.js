/**
 * 屏幕投屏显示模块
 * 负责接收Android端的屏幕帧数据并进行解码显示
 */

class ScreenDisplayManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isReceiving = false;
    this.currentDevice = null;
    this.frameBuffer = [];
    this.maxBufferSize = 5;
    this.fps = 30;
    this.quality = 0.8;
    
    // 屏幕参数
    this.screenWidth = 1920;
    this.screenHeight = 1080;
    this.deviceScale = 1;
    
    // 网络连接
    this.connection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // 性能监控
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.actualFps = 0;
    
    // 渲染优化
    this.useOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    this.offscreenCanvas = this.useOffscreenCanvas ? new OffscreenCanvas(1, 1) : null;
    this.renderInterval = null;
    
    this.init();
  }
  
  init() {
    this.setupCanvas();
    this.bindEvents();
    console.log('📺 屏幕显示管理器已初始化');
  }
  
  /**
   * 设置画布
   */
  setupCanvas() {
    // 设置画布尺寸
    this.canvas.width = this.screenWidth;
    this.canvas.height = this.screenHeight;
    
    // 设置画布样式
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.maxHeight = '100%';
    this.canvas.style.backgroundColor = '#000';
    this.canvas.style.objectFit = 'contain';
    
    // 高DPI屏幕优化
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.screenWidth * dpr;
    this.canvas.height = this.screenHeight * dpr;
    this.ctx.scale(dpr, dpr);
    
    // 初始显示占位符
    this.showPlaceholder();
  }
  
  /**
   * 绑定事件
   */
  bindEvents() {
    // 鼠标点击事件（用于远程控制）
    this.canvas.addEventListener('click', (e) => {
      this.handleScreenClick(e);
    });
    
    // 鼠标移动事件（用于远程控制）
    this.canvas.addEventListener('mousemove', (e) => {
      this.handleScreenMouseMove(e);
    });
    
    // 键盘事件（用于远程控制）
    this.canvas.addEventListener('keydown', (e) => {
      this.handleScreenKeyDown(e);
    });
    
    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }
  
  /**
   * 开始接收屏幕
   */
  async startReceiving(deviceInfo) {
    try {
      this.currentDevice = deviceInfo;
      this.isReceiving = true;
      this.frameBuffer = [];
      
      // 建立网络连接
      await this.connectToDevice(deviceInfo);
      
      // 开始渲染循环
      this.startRenderLoop();
      
      // 发送开始接收指令
      this.sendCommand('START_SCREEN_CAPTURE');
      
      console.log(`📺 开始接收 ${deviceInfo.name} 的屏幕`);
      
    } catch (error) {
      console.error('❌ 开始接收屏幕失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止接收屏幕
   */
  stopReceiving() {
    try {
      this.isReceiving = false;
      
      // 停止渲染循环
      if (this.renderInterval) {
        clearInterval(this.renderInterval);
        this.renderInterval = null;
      }
      
      // 关闭网络连接
      this.disconnectFromDevice();
      
      // 清空画布
      this.clearCanvas();
      this.showPlaceholder();
      
      console.log('📺 屏幕接收已停止');
      
    } catch (error) {
      console.error('❌ 停止接收屏幕失败:', error);
    }
  }
  
  /**
   * 连接到设备
   */
  async connectToDevice(deviceInfo) {
    return new Promise((resolve, reject) => {
      try {
        // 使用WebSocket连接
        const wsUrl = `ws://${deviceInfo.ip}:8083`;
        this.connection = new WebSocket(wsUrl);
        
        this.connection.onopen = () => {
          console.log(`📱 WebSocket连接已建立: ${deviceInfo.ip}:8083`);
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.connection.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.connection.onclose = (event) => {
          console.log('📱 WebSocket连接已关闭:', event.code, event.reason);
          this.handleConnectionClose();
        };
        
        this.connection.onerror = (error) => {
          console.error('❌ WebSocket连接错误:', error);
          this.handleConnectionError();
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 处理消息
   */
  handleMessage(data) {
    try {
      if (typeof data === 'string') {
        // 文本消息（命令）
        this.handleTextMessage(data);
      } else if (data instanceof Blob || data instanceof ArrayBuffer) {
        // 二进制数据（屏幕帧）
        this.handleFrameData(data);
      }
    } catch (error) {
      console.error('❌ 处理消息失败:', error);
    }
  }
  
  /**
   * 处理文本消息
   */
  handleTextMessage(message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'screen_frame_info':
          this.handleScreenFrameInfo(data);
          break;
        case 'device_info':
          this.handleDeviceInfo(data);
          break;
        case 'error':
          console.error('❌ 设备错误:', data.message);
          break;
        default:
          console.warn('⚠️ 未知消息类型:', data.type);
      }
    } catch (error) {
      console.error('❌ 解析文本消息失败:', error);
    }
  }
  
  /**
   * 处理屏幕帧信息
   */
  handleScreenFrameInfo(info) {
    this.screenWidth = info.width;
    this.screenHeight = info.height;
    this.fps = info.fps;
    this.quality = info.quality;
    
    // 重新设置画布
    this.setupCanvas();
    
    console.log(`📺 屏幕参数: ${info.width}x${info.height}@${info.fps}fps`);
  }
  
  /**
   * 处理设备信息
   */
  handleDeviceInfo(info) {
    console.log(`📱 设备信息: ${info.deviceName} (${info.platform})`);
  }
  
  /**
   * 处理帧数据
   */
  handleFrameData(data) {
    // 将数据转换为字节数组
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 添加到缓冲区
      this.addFrameToBuffer(uint8Array);
      
      // 更新性能统计
      this.updatePerformanceStats();
    };
    reader.readAsArrayBuffer(data);
  }
  
  /**
   * 添加帧到缓冲区
   */
  addFrameToBuffer(frameData) {
    // 添加时间戳
    const frame = {
      data: frameData,
      timestamp: Date.now()
    };
    
    this.frameBuffer.push(frame);
    
    // 保持缓冲区大小
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift();
    }
  }
  
  /**
   * 开始渲染循环
   */
  startRenderLoop() {
    if (this.renderInterval) {
      clearInterval(this.renderInterval);
    }
    
    const targetFrameTime = 1000 / this.fps;
    
    this.renderInterval = setInterval(() => {
      this.renderFrame();
    }, targetFrameTime);
  }
  
  /**
   * 渲染帧
   */
  async renderFrame() {
    if (!this.isReceiving || this.frameBuffer.length === 0) {
      return;
    }
    
    try {
      // 获取最新帧
      const frame = this.frameBuffer.shift();
      if (!frame) return;
      
      // 解码并显示帧
      await this.displayFrame(frame);
      
    } catch (error) {
      console.error('❌ 渲染帧失败:', error);
    }
  }
  
  /**
   * 显示帧
   */
  async displayFrame(frame) {
    try {
      // 创建ImageBitmap
      const blob = new Blob([frame.data], { type: 'image/jpeg' });
      const imageBitmap = await createImageBitmap(blob);
      
      // 清空画布
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
      
      // 计算缩放比例
      const scaleX = this.screenWidth / imageBitmap.width;
      const scaleY = this.screenHeight / imageBitmap.height;
      const scale = Math.min(scaleX, scaleY);
      
      // 计算居中位置
      const drawWidth = imageBitmap.width * scale;
      const drawHeight = imageBitmap.height * scale;
      const offsetX = (this.screenWidth - drawWidth) / 2;
      const offsetY = (this.screenHeight - drawHeight) / 2;
      
      // 绘制图像
      this.ctx.drawImage(imageBitmap, offsetX, offsetY, drawWidth, drawHeight);
      
      // 显示性能信息
      this.displayPerformanceInfo();
      
    } catch (error) {
      console.error('❌ 显示帧失败:', error);
      
      // 显示错误占位符
      this.displayErrorFrame();
    }
  }
  
  /**
   * 显示性能信息
   */
  displayPerformanceInfo() {
    this.ctx.font = '14px Arial';
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillText(`FPS: ${this.actualFps}`, 10, 20);
    this.ctx.fillText(`分辨率: ${this.screenWidth}x${this.screenHeight}`, 10, 40);
    this.ctx.fillText(`缓冲区: ${this.frameBuffer.length}/${this.maxBufferSize}`, 10, 60);
    this.ctx.fillText(`设备: ${this.currentDevice?.name || 'Unknown'}`, 10, 80);
  }
  
  /**
   * 更新性能统计
   */
  updatePerformanceStats() {
    const now = Date.now();
    this.frameCount++;
    
    if (now - this.lastFrameTime >= 1000) {
      this.actualFps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }
  
  /**
   * 显示占位符
   */
  showPlaceholder() {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    // 显示占位符文本
    this.ctx.fillStyle = '#666';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      '等待Android设备连接...',
      this.screenWidth / 2,
      this.screenHeight / 2
    );
    this.ctx.textAlign = 'left';
  }
  
  /**
   * 显示错误帧
   */
  displayErrorFrame() {
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      '屏幕接收错误',
      this.screenWidth / 2,
      this.screenHeight / 2
    );
    this.ctx.textAlign = 'left';
  }
  
  /**
   * 清空画布
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);
  }
  
  /**
   * 发送命令
   */
  sendCommand(command, data = {}) {
    if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      const message = {
        type: 'command',
        command: command,
        data: data,
        timestamp: Date.now()
      };
      this.connection.send(JSON.stringify(message));
    }
  }
  
  /**
   * 处理屏幕点击
   */
  handleScreenClick(event) {
    if (!this.currentDevice) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.screenWidth / rect.width;
    const scaleY = this.screenHeight / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    this.sendCommand('TOUCH_EVENT', {
      action: 'click',
      x: Math.round(x),
      y: Math.round(y)
    });
  }
  
  /**
   * 处理鼠标移动
   */
  handleScreenMouseMove(event) {
    if (!this.currentDevice) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.screenWidth / rect.width;
    const scaleY = this.screenHeight / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    this.sendCommand('TOUCH_EVENT', {
      action: 'move',
      x: Math.round(x),
      y: Math.round(y)
    });
  }
  
  /**
   * 处理键盘输入
   */
  handleScreenKeyDown(event) {
    if (!this.currentDevice) return;
    
    this.sendCommand('KEY_EVENT', {
      key: event.key,
      code: event.code,
      action: 'keydown'
    });
  }
  
  /**
   * 处理窗口大小变化
   */
  handleResize() {
    // 重新计算画布尺寸
    const container = this.canvas.parentElement;
    if (container) {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      const scaleX = containerWidth / this.screenWidth;
      const scaleY = containerHeight / this.screenHeight;
      const scale = Math.min(scaleX, scaleY);
      
      this.canvas.style.transform = `scale(${scale})`;
      this.canvas.style.transformOrigin = 'top left';
    }
  }
  
  /**
   * 处理连接关闭
   */
  handleConnectionClose() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 尝试重连... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.currentDevice && this.isReceiving) {
          this.connectToDevice(this.currentDevice);
        }
      }, 2000 * this.reconnectAttempts);
    } else {
      console.error('❌ 重连次数过多，停止重连');
      this.stopReceiving();
    }
  }
  
  /**
   * 处理连接错误
   */
  handleConnectionError() {
    console.error('❌ WebSocket连接错误');
  }
  
  /**
   * 断开连接
   */
  disconnectFromDevice() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }
  
  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      isReceiving: this.isReceiving,
      currentDevice: this.currentDevice,
      frameBufferSize: this.frameBuffer.length,
      actualFps: this.actualFps,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      connectionState: this.connection?.readyState
    };
  }
  
  /**
   * 设置质量参数
   */
  setQuality(quality) {
    this.quality = Math.max(0.1, Math.min(1.0, quality));
    
    if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      this.sendCommand('UPDATE_QUALITY', { quality: this.quality });
    }
  }
  
  /**
   * 设置帧率
   */
  setFps(fps) {
    this.fps = Math.max(5, Math.min(60, fps));
    
    // 重启渲染循环
    if (this.isReceiving) {
      this.startRenderLoop();
    }
  }
  
  /**
   * 销毁实例
   */
  destroy() {
    this.stopReceiving();
    this.canvas = null;
    this.ctx = null;
    this.connection = null;
    this.frameBuffer = [];
    console.log('📺 屏幕显示管理器已销毁');
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenDisplayManager;
} else if (typeof window !== 'undefined') {
  window.ScreenDisplayManager = ScreenDisplayManager;
}

// ES模块导出，兼容现代构建工具
export default ScreenDisplayManager;