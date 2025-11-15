/**
 * 远程控制管理器
 * 负责处理Windows端的鼠标键盘事件并发送到Android设备
 */

class RemoteController {
  constructor() {
    this.isEnabled = false;
    this.isControlling = false;
    this.currentDevice = null;
    this.connection = null;
    
    // 控制参数
    this.mouseSensitivity = 1.0;
    this.touchDelay = 50; // ms
    this.keyboardDelay = 10; // ms
    
    // 状态跟踪
    this.isMouseDown = false;
    this.isMouseDragging = false;
    this.lastMousePosition = { x: 0, y: 0 };
    this.currentMouseButton = null;
    
    // 屏幕参数
    this.screenWidth = 1920;
    this.screenHeight = 1080;
    this.deviceScreenWidth = 1080;
    this.deviceScreenHeight = 2340;
    
    // 手势跟踪
    this.touchPoints = new Map();
    this.gestureStartTime = 0;
    this.lastGestureTime = 0;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    console.log('🎮 远程控制器已初始化');
  }
  
  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 鼠标事件
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('click', (e) => this.handleClick(e));
    document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    
    // 滚轮事件
    document.addEventListener('wheel', (e) => this.handleWheel(e));
    
    // 键盘事件
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    document.addEventListener('keypress', (e) => this.handleKeyPress(e));
    
    // 触摸事件（为移动设备支持）
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    document.addEventListener('touchcancel', (e) => this.handleTouchCancel(e));
    
    // 防止默认行为
    document.addEventListener('dragstart', (e) => e.preventDefault());
    document.addEventListener('selectstart', (e) => e.preventDefault());
  }
  
  /**
   * 启用远程控制
   */
  enable(deviceInfo) {
    this.currentDevice = deviceInfo;
    this.isEnabled = true;
    this.isControlling = true;
    
    // 获取设备屏幕参数
    this.updateDeviceScreenSize(deviceInfo);
    
    console.log(`🎮 远程控制已启用 - 设备: ${deviceInfo.name}`);
    this.showControlIndicator(true);
  }
  
  /**
   * 禁用远程控制
   */
  disable() {
    this.isEnabled = false;
    this.isControlling = false;
    this.currentDevice = null;
    this.touchPoints.clear();
    
    console.log('🎮 远程控制已禁用');
    this.showControlIndicator(false);
  }
  
  /**
   * 更新设备屏幕尺寸
   */
  updateDeviceScreenSize(deviceInfo) {
    if (deviceInfo.screenSize) {
      this.deviceScreenWidth = deviceInfo.screenSize.width;
      this.deviceScreenHeight = deviceInfo.screenSize.height;
    }
  }
  
  /**
   * 设置屏幕尺寸
   */
  setScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }
  
  /**
   * 鼠标按下处理
   */
  handleMouseDown(event) {
    if (!this.isControlling) return;
    
    // 防止在控制区域外的事件
    if (!this.isInControlArea(event.target)) return;
    
    event.preventDefault();
    
    const position = this.getRelativePosition(event);
    const button = this.getMouseButton(event);
    
    this.isMouseDown = true;
    this.currentMouseButton = button;
    this.lastMousePosition = position;
    
    this.sendMouseEvent('down', position, button, 0);
  }
  
  /**
   * 鼠标抬起处理
   */
  handleMouseUp(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    const position = this.getRelativePosition(event);
    const button = this.currentMouseButton || this.getMouseButton(event);
    
    this.isMouseDown = false;
    this.isMouseDragging = false;
    
    this.sendMouseEvent('up', position, button, 0);
    this.currentMouseButton = null;
  }
  
  /**
   * 鼠标移动处理
   */
  handleMouseMove(event) {
    if (!this.isControlling) return;
    
    // 防止在控制区域外的事件
    if (!this.isInControlArea(event.target)) return;
    
    const position = this.getRelativePosition(event);
    
    if (this.isMouseDown) {
      // 检测是否为拖拽操作
      const deltaX = Math.abs(position.x - this.lastMousePosition.x);
      const deltaY = Math.abs(position.y - this.lastMousePosition.y);
      
      if (deltaX > 2 || deltaY > 2) {
        this.isMouseDragging = true;
      }
      
      // 发送移动事件（节流以提高性能）
      this.throttle(() => {
        this.sendMouseEvent('move', position, this.currentMouseButton, 0);
      }, 16); // 约60fps
    }
    
    this.lastMousePosition = position;
  }
  
  /**
   * 鼠标点击处理
   */
  handleClick(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    // 单击事件已在mouseup中处理，这里可以添加特殊处理
    if (!this.isMouseDragging) {
      const position = this.getRelativePosition(event);
      this.sendMouseEvent('click', position, this.getMouseButton(event), 0);
    }
  }
  
  /**
   * 右键菜单处理
   */
  handleContextMenu(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    const position = this.getRelativePosition(event);
    this.sendMouseEvent('contextmenu', position, 'right', 0);
  }
  
  /**
   * 滚轮处理
   */
  handleWheel(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    const position = this.getRelativePosition(event);
    const deltaY = event.deltaY;
    
    this.sendScrollEvent(position, deltaY);
  }
  
  /**
   * 键盘按下处理
   */
  handleKeyDown(event) {
    if (!this.isControlling) return;
    
    // 阻止某些系统快捷键
    if (this.isSystemKey(event)) return;
    
    event.preventDefault();
    
    const keyInfo = this.getKeyInfo(event);
    this.sendKeyboardEvent('down', keyInfo);
  }
  
  /**
   * 键盘抬起处理
   */
  handleKeyUp(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    const keyInfo = this.getKeyInfo(event);
    this.sendKeyboardEvent('up', keyInfo);
  }
  
  /**
   * 键盘按下处理（字符键）
   */
  handleKeyPress(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    const keyInfo = this.getKeyInfo(event);
    this.sendKeyboardEvent('press', keyInfo);
  }
  
  /**
   * 触摸开始处理
   */
  handleTouchStart(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    this.gestureStartTime = Date.now();
    
    Array.from(event.changedTouches).forEach((touch, index) => {
      const position = this.getRelativePosition(touch);
      const touchId = this.generateTouchId(touch, index);
      
      this.touchPoints.set(touchId, {
        startPosition: position,
        currentPosition: position,
        startTime: Date.now()
      });
      
      this.sendTouchEvent('down', touchId, position, 1.0);
    });
  }
  
  /**
   * 触摸移动处理
   */
  handleTouchMove(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    Array.from(event.changedTouches).forEach((touch) => {
      const position = this.getRelativePosition(touch);
      const touchId = this.getTouchId(touch);
      
      if (this.touchPoints.has(touchId)) {
        const touchPoint = this.touchPoints.get(touchId);
        touchPoint.currentPosition = position;
        
        // 发送移动事件
        this.throttle(() => {
          this.sendTouchEvent('move', touchId, position, 1.0);
        }, 16);
      }
    });
  }
  
  /**
   * 触摸结束处理
   */
  handleTouchEnd(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    const gestureTime = Date.now() - this.gestureStartTime;
    
    Array.from(event.changedTouches).forEach((touch) => {
      const position = this.getRelativePosition(touch);
      const touchId = this.getTouchId(touch);
      
      if (this.touchPoints.has(touchId)) {
        const touchPoint = this.touchPoints.get(touchId);
        
        // 检测手势类型
        this.detectGesture(touchPoint, position, gestureTime);
        
        this.touchPoints.delete(touchId);
        this.sendTouchEvent('up', touchId, position, 0);
      }
    });
  }
  
  /**
   * 触摸取消处理
   */
  handleTouchCancel(event) {
    if (!this.isControlling) return;
    
    event.preventDefault();
    
    Array.from(event.changedTouches).forEach((touch) => {
      const position = this.getRelativePosition(touch);
      const touchId = this.getTouchId(touch);
      
      this.touchPoints.delete(touchId);
      this.sendTouchEvent('cancel', touchId, position, 0);
    });
  }
  
  /**
   * 发送鼠标事件
   */
  sendMouseEvent(action, position, button, pressure = 0) {
    if (!this.connection) return;
    
    const devicePosition = this.convertToDeviceCoordinates(position);
    
    const eventData = {
      type: 'mouse_event',
      action: action,
      button: button,
      position: devicePosition,
      pressure: pressure,
      timestamp: Date.now()
    };
    
    this.sendControlEvent(eventData);
  }
  
  /**
   * 发送滚轮事件
   */
  sendScrollEvent(position, deltaY) {
    const devicePosition = this.convertToDeviceCoordinates(position);
    
    const eventData = {
      type: 'scroll_event',
      position: devicePosition,
      deltaY: deltaY,
      timestamp: Date.now()
    };
    
    this.sendControlEvent(eventData);
  }
  
  /**
   * 发送键盘事件
   */
  sendKeyboardEvent(action, keyInfo) {
    const eventData = {
      type: 'keyboard_event',
      action: action,
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      modifiers: keyInfo.modifiers,
      timestamp: Date.now()
    };
    
    this.sendControlEvent(eventData);
  }
  
  /**
   * 发送触摸事件
   */
  sendTouchEvent(action, touchId, position, pressure = 0) {
    const devicePosition = this.convertToDeviceCoordinates(position);
    
    const eventData = {
      type: 'touch_event',
      action: action,
      touchId: touchId,
      position: devicePosition,
      pressure: pressure,
      timestamp: Date.now()
    };
    
    this.sendControlEvent(eventData);
  }
  
  /**
   * 发送控制事件
   */
  sendControlEvent(eventData) {
    if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify({
        type: 'control_event',
        deviceId: this.currentDevice?.deviceId,
        data: eventData
      }));
    }
    
    // 同时通过IPC发送到主进程
    if (window.electronAPI) {
      window.electronAPI.sendControlEvent(eventData);
    }
  }
  
  /**
   * 检测手势
   */
  detectGesture(touchPoint, endPosition, duration) {
    const startPos = touchPoint.startPosition;
    const endPos = endPosition;
    
    // 计算移动距离
    const deltaX = endPos.x - startPos.x;
    const deltaY = endPos.y - startPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 检测滑动手势
    if (distance > 50 && duration < 500) {
      const direction = this.getSwipeDirection(deltaX, deltaY);
      const speed = distance / duration; // 像素/毫秒
      
      const gestureData = {
        type: 'gesture',
        gesture: 'swipe',
        direction: direction,
        distance: distance,
        speed: speed,
        timestamp: Date.now()
      };
      
      this.sendControlEvent(gestureData);
    }
    
    // 检测双击
    if (distance < 10 && duration < 200) {
      const timeSinceLastGesture = Date.now() - this.lastGestureTime;
      
      if (timeSinceLastGesture < 300) {
        const gestureData = {
          type: 'gesture',
          gesture: 'double_tap',
          position: this.convertToDeviceCoordinates(endPos),
          timestamp: Date.now()
        };
        
        this.sendControlEvent(gestureData);
        this.lastGestureTime = 0; // 重置，防止三重检测
      } else {
        this.lastGestureTime = Date.now();
      }
    }
  }
  
  /**
   * 获取相对位置
   */
  getRelativePosition(event) {
    const rect = this.getControlAreaRect();
    const x = (event.clientX - rect.left) / rect.width * this.screenWidth;
    const y = (event.clientY - rect.top) / rect.height * this.screenHeight;
    
    return { x: Math.max(0, Math.min(this.screenWidth, x)), 
             y: Math.max(0, Math.min(this.screenHeight, y)) };
  }
  
  /**
   * 转换为设备坐标
   */
  convertToDeviceCoordinates(position) {
    const deviceX = (position.x / this.screenWidth) * this.deviceScreenWidth;
    const deviceY = (position.y / this.screenHeight) * this.deviceScreenHeight;
    
    return { 
      x: Math.round(deviceX), 
      y: Math.round(deviceY) 
    };
  }
  
  /**
   * 获取鼠标按钮
   */
  getMouseButton(event) {
    switch (event.button) {
      case 0: return 'left';
      case 1: return 'middle';
      case 2: return 'right';
      default: return 'unknown';
    }
  }
  
  /**
   * 获取按键信息
   */
  getKeyInfo(event) {
    return {
      key: event.key,
      code: event.code,
      keyCode: event.keyCode,
      modifiers: {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      }
    };
  }
  
  /**
   * 检查是否为系统按键
   */
  isSystemKey(event) {
    // 阻止F1-F12、Alt+Tab等系统快捷键
    if (event.key.startsWith('F') && event.key.length <= 3) return true;
    if (event.altKey && event.key !== 'Alt') return true;
    if (event.ctrlKey && ['r', 'f', 'u', 'i'].includes(event.key.toLowerCase())) return true;
    
    return false;
  }
  
  /**
   * 生成触摸ID
   */
  generateTouchId(touch, index) {
    return `touch_${touch.identifier}_${index}_${Date.now()}`;
  }
  
  /**
   * 获取触摸ID
   */
  getTouchId(touch) {
    // 寻找匹配的触摸点
    for (const [id, point] of this.touchPoints.entries()) {
      const timeDiff = Math.abs(Date.now() - point.startTime);
      if (timeDiff < 100) {
        return id;
      }
    }
    return `touch_${touch.identifier}_${Date.now()}`;
  }
  
  /**
   * 获取滑动方向
   */
  getSwipeDirection(deltaX, deltaY) {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }
  
  /**
   * 检查是否在控制区域内
   */
  isInControlArea(element) {
    // TODO: 实现控制区域检测逻辑
    return true; // 暂时允许所有元素
  }
  
  /**
   * 获取控制区域矩形
   */
  getControlAreaRect() {
    // 寻找屏幕显示区域
    const screenCanvas = document.getElementById('screenCanvas');
    if (screenCanvas) {
      return screenCanvas.getBoundingClientRect();
    }
    
    // 默认返回整个窗口
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
  
  /**
   * 显示控制指示器
   */
  showControlIndicator(show) {
    let indicator = document.getElementById('controlIndicator');
    
    if (show) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'controlIndicator';
        indicator.innerHTML = '🎮 控制模式已启用';
        indicator.style.cssText = `
          position: fixed;
          top: 20px;
          left: 20px;
          background: rgba(52, 152, 219, 0.9);
          color: white;
          padding: 10px 15px;
          border-radius: 20px;
          font-size: 14px;
          z-index: 10000;
          backdrop-filter: blur(10px);
        `;
        document.body.appendChild(indicator);
      }
      indicator.style.display = 'block';
    } else {
      if (indicator) {
        indicator.style.display = 'none';
      }
    }
  }
  
  /**
   * 节流函数
   */
  throttle(func, delay) {
    if (this.throttleTimeout) return;
    
    this.throttleTimeout = setTimeout(() => {
      func();
      this.throttleTimeout = null;
    }, delay);
  }
  
  /**
   * 设置连接
   */
  setConnection(connection) {
    this.connection = connection;
  }
  
  /**
   * 获取状态
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      isControlling: this.isControlling,
      currentDevice: this.currentDevice,
      screenSize: { width: this.screenWidth, height: this.screenHeight },
      deviceScreenSize: { width: this.deviceScreenWidth, height: this.deviceScreenHeight },
      activeTouches: this.touchPoints.size
    };
  }
  
  /**
   * 设置设备信息
   */
  setDeviceInfo(deviceInfo) {
    this.currentDevice = deviceInfo;
    
    if (deviceInfo.screenSize) {
      this.deviceScreenWidth = deviceInfo.screenSize.width;
      this.deviceScreenHeight = deviceInfo.screenSize.height;
    }
  }
  
  /**
   * 设置屏幕尺寸
   */
  updateScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }
  
  /**
   * 销毁实例
   */
  destroy() {
    this.disable();
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    console.log('🎮 远程控制器已销毁');
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RemoteController;
} else if (typeof window !== 'undefined') {
  window.RemoteController = RemoteController;
}