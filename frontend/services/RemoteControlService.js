// RemoteControlService.js
// 模拟远程控制服务，用于前端调试和测试

class RemoteControlService {
  constructor() {
    this.activeSessions = new Map();
    this.controlPermissions = new Map();
    this.listeners = new Map();
    this.keyboardState = {
      pressedKeys: new Set(),
      lastKeyEvent: null
    };
    this.mouseState = {
      position: { x: 0, y: 0 },
      buttonState: {
        left: false,
        right: false,
        middle: false
      },
      lastEvent: null
    };
    this.touchState = {
      touches: [],
      lastTouchEvent: null
    };
    this.simulatedLatency = 100; // 模拟网络延迟（毫秒）
    this.isRecording = false;
    this.recordedEvents = [];
    
    // 会话状态常量
    this.SESSION_STATUS = {
      INITIALIZING: 'initializing',
      ESTABLISHED: 'established',
      PAUSED: 'paused',
      CLOSED: 'closed',
      ERROR: 'error'
    };
    
    // 控制类型常量
    this.CONTROL_TYPES = {
      KEYBOARD: 'keyboard',
      MOUSE: 'mouse',
      TOUCH: 'touch',
      SCREEN: 'screen',
      SYSTEM: 'system'
    };
    
    // 权限状态常量
    this.PERMISSION_STATUS = {
      GRANTED: 'granted',
      PENDING: 'pending',
      DENIED: 'denied',
      EXPIRED: 'expired'
    };
    
    // 事件类型常量
    this.EVENT_TYPES = {
      // 键盘事件
      KEY_DOWN: 'keyDown',
      KEY_UP: 'keyUp',
      KEY_PRESS: 'keyPress',
      
      // 鼠标事件
      MOUSE_MOVE: 'mouseMove',
      MOUSE_DOWN: 'mouseDown',
      MOUSE_UP: 'mouseUp',
      MOUSE_CLICK: 'mouseClick',
      MOUSE_DOUBLE_CLICK: 'mouseDoubleClick',
      MOUSE_SCROLL: 'mouseScroll',
      
      // 触控事件
      TOUCH_START: 'touchStart',
      TOUCH_MOVE: 'touchMove',
      TOUCH_END: 'touchEnd',
      TOUCH_CANCEL: 'touchCancel',
      
      // 会话事件
      SESSION_ESTABLISHED: 'sessionEstablished',
      SESSION_PAUSED: 'sessionPaused',
      SESSION_RESUMED: 'sessionResumed',
      SESSION_CLOSED: 'sessionClosed',
      SESSION_ERROR: 'sessionError',
      
      // 权限事件
      PERMISSION_GRANTED: 'permissionGranted',
      PERMISSION_DENIED: 'permissionDenied',
      PERMISSION_EXPIRED: 'permissionExpired',
      
      // 系统事件
      SCREEN_SIZE_CHANGED: 'screenSizeChanged',
      DEVICE_ORIENTATION_CHANGED: 'deviceOrientationChanged',
      CONNECTION_QUALITY_CHANGED: 'connectionQualityChanged'
    };
  }

  /**
   * 建立远程控制会话
   * @param {string} sourceDeviceId - 控制方设备ID
   * @param {string} targetDeviceId - 被控方设备ID
   * @param {Object} options - 会话选项
   * @returns {string} 会话ID
   */
  establishSession(sourceDeviceId, targetDeviceId, options = {}) {
    const sessionId = `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 创建会话对象
    const session = {
      id: sessionId,
      sourceDeviceId,
      targetDeviceId,
      status: this.SESSION_STATUS.INITIALIZING,
      establishedAt: Date.now(),
      lastActivity: Date.now(),
      options: {
        autoRequestPermission: true,
        enableKeyboardControl: true,
        enableMouseControl: true,
        enableTouchControl: true,
        enableSystemControl: false,
        ...options
      },
      screenInfo: {
        width: 1920,
        height: 1080,
        dpi: 96,
        refreshRate: 60
      },
      connectionStats: {
        latency: this.simulatedLatency,
        packetLoss: 0,
        bandwidth: 10000 // kbps
      },
      error: null
    };
    
    // 添加到活动会话
    this.activeSessions.set(sessionId, session);
    
    // 模拟初始化延迟
    setTimeout(() => {
      // 检查会话是否仍存在（可能在延迟期间被关闭）
      if (!this.activeSessions.has(sessionId)) return;
      
      // 更新会话状态
      session.status = this.SESSION_STATUS.ESTABLISHED;
      session.lastActivity = Date.now();
      
      // 如果启用了自动请求权限
      if (session.options.autoRequestPermission) {
        this.requestControlPermission(sourceDeviceId, targetDeviceId);
      }
      
      this.emit(this.EVENT_TYPES.SESSION_ESTABLISHED, session);
      console.log(`[RemoteControlService] 远程控制会话已建立: ${sessionId}, 从 ${sourceDeviceId} 到 ${targetDeviceId}`);
    }, 300);
    
    return sessionId;
  }

  /**
   * 暂停远程控制会话
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 是否成功暂停
   */
  pauseSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.ESTABLISHED) {
      console.error(`[RemoteControlService] 无法暂停会话 ${sessionId}: 会话不存在或状态不正确`);
      return false;
    }
    
    session.status = this.SESSION_STATUS.PAUSED;
    session.lastActivity = Date.now();
    
    this.emit(this.EVENT_TYPES.SESSION_PAUSED, session);
    console.log(`[RemoteControlService] 远程控制会话已暂停: ${sessionId}`);
    return true;
  }

  /**
   * 恢复远程控制会话
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 是否成功恢复
   */
  resumeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.PAUSED) {
      console.error(`[RemoteControlService] 无法恢复会话 ${sessionId}: 会话不存在或状态不正确`);
      return false;
    }
    
    session.status = this.SESSION_STATUS.ESTABLISHED;
    session.lastActivity = Date.now();
    
    this.emit(this.EVENT_TYPES.SESSION_RESUMED, session);
    console.log(`[RemoteControlService] 远程控制会话已恢复: ${sessionId}`);
    return true;
  }

  /**
   * 关闭远程控制会话
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 是否成功关闭
   */
  closeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      console.error(`[RemoteControlService] 无法关闭会话 ${sessionId}: 会话不存在`);
      return false;
    }
    
    // 更新会话状态
    session.status = this.SESSION_STATUS.CLOSED;
    session.lastActivity = Date.now();
    
    // 移除相关权限
    this.revokeControlPermission(session.sourceDeviceId, session.targetDeviceId);
    
    // 从活动会话中移除
    this.activeSessions.delete(sessionId);
    
    this.emit(this.EVENT_TYPES.SESSION_CLOSED, session);
    console.log(`[RemoteControlService] 远程控制会话已关闭: ${sessionId}`);
    return true;
  }

  /**
   * 获取会话信息
   * @param {string} sessionId - 会话ID
   * @returns {Object|null} 会话对象或null
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * 获取所有活动会话
   * @returns {Array} 活动会话数组
   */
  getAllActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * 获取设备相关的所有会话
   * @param {string} deviceId - 设备ID
   * @returns {Array} 相关会话数组
   */
  getDeviceSessions(deviceId) {
    return Array.from(this.activeSessions.values()).filter(session => 
      session.sourceDeviceId === deviceId || session.targetDeviceId === deviceId
    );
  }

  /**
   * 请求控制权限
   * @param {string} sourceDeviceId - 控制方设备ID
   * @param {string} targetDeviceId - 被控方设备ID
   * @returns {Promise} 解析为权限状态的Promise
   */
  requestControlPermission(sourceDeviceId, targetDeviceId) {
    return new Promise((resolve) => {
      // 创建权限键
      const permissionKey = `${sourceDeviceId}-${targetDeviceId}`;
      
      // 初始化权限为待处理状态
      this.controlPermissions.set(permissionKey, {
        sourceDeviceId,
        targetDeviceId,
        status: this.PERMISSION_STATUS.PENDING,
        requestedAt: Date.now(),
        expiresAt: null
      });
      
      // 模拟异步权限请求
      setTimeout(() => {
        // 80%的概率模拟权限被授予
        const isGranted = Math.random() < 0.8;
        const permission = this.controlPermissions.get(permissionKey);
        
        if (permission) {
          if (isGranted) {
            permission.status = this.PERMISSION_STATUS.GRANTED;
            permission.expiresAt = Date.now() + (60 * 60 * 1000); // 1小时后过期
            
            this.emit(this.EVENT_TYPES.PERMISSION_GRANTED, permission);
            console.log(`[RemoteControlService] 控制权限已授予: 从 ${sourceDeviceId} 到 ${targetDeviceId}`);
          } else {
            permission.status = this.PERMISSION_STATUS.DENIED;
            
            this.emit(this.EVENT_TYPES.PERMISSION_DENIED, permission);
            console.log(`[RemoteControlService] 控制权限被拒绝: 从 ${sourceDeviceId} 到 ${targetDeviceId}`);
          }
        }
        
        resolve(permission);
      }, 1000); // 模拟1秒延迟
    });
  }

  /**
   * 检查控制权限
   * @param {string} sourceDeviceId - 控制方设备ID
   * @param {string} targetDeviceId - 被控方设备ID
   * @returns {Object|null} 权限对象或null
   */
  checkControlPermission(sourceDeviceId, targetDeviceId) {
    const permissionKey = `${sourceDeviceId}-${targetDeviceId}`;
    const permission = this.controlPermissions.get(permissionKey);
    
    // 检查权限是否过期
    if (permission && permission.status === this.PERMISSION_STATUS.GRANTED && permission.expiresAt < Date.now()) {
      permission.status = this.PERMISSION_STATUS.EXPIRED;
      this.emit(this.EVENT_TYPES.PERMISSION_EXPIRED, permission);
      console.log(`[RemoteControlService] 控制权限已过期: 从 ${sourceDeviceId} 到 ${targetDeviceId}`);
    }
    
    return permission || null;
  }

  /**
   * 撤销控制权限
   * @param {string} sourceDeviceId - 控制方设备ID
   * @param {string} targetDeviceId - 被控方设备ID
   * @returns {boolean} 是否成功撤销
   */
  revokeControlPermission(sourceDeviceId, targetDeviceId) {
    const permissionKey = `${sourceDeviceId}-${targetDeviceId}`;
    const result = this.controlPermissions.delete(permissionKey);
    
    if (result) {
      console.log(`[RemoteControlService] 控制权限已撤销: 从 ${sourceDeviceId} 到 ${targetDeviceId}`);
    }
    
    return result;
  }

  /**
   * 发送键盘事件
   * @param {string} sessionId - 会话ID
   * @param {string} eventType - 事件类型
   * @param {Object} eventData - 事件数据
   * @returns {boolean} 是否成功发送
   */
  sendKeyboardEvent(sessionId, eventType, eventData) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.ESTABLISHED) {
      console.error(`[RemoteControlService] 无法发送键盘事件: 会话不存在或状态不正确`);
      return false;
    }
    
    // 检查权限
    const permission = this.checkControlPermission(session.sourceDeviceId, session.targetDeviceId);
    if (!permission || permission.status !== this.PERMISSION_STATUS.GRANTED) {
      console.error(`[RemoteControlService] 无法发送键盘事件: 没有权限`);
      return false;
    }
    
    // 更新键盘状态
    const keyEvent = {
      type: eventType,
      key: eventData.key,
      code: eventData.code || '',
      altKey: !!eventData.altKey,
      ctrlKey: !!eventData.ctrlKey,
      metaKey: !!eventData.metaKey,
      shiftKey: !!eventData.shiftKey,
      timestamp: Date.now()
    };
    
    if (eventType === this.EVENT_TYPES.KEY_DOWN) {
      this.keyboardState.pressedKeys.add(keyEvent.key);
    } else if (eventType === this.EVENT_TYPES.KEY_UP) {
      this.keyboardState.pressedKeys.delete(keyEvent.key);
    }
    
    this.keyboardState.lastKeyEvent = keyEvent;
    
    // 记录事件（如果正在录制）
    this.recordEvent('keyboard', keyEvent);
    
    // 模拟网络延迟发送事件
    setTimeout(() => {
      // 检查会话是否仍处于活动状态
      if (this.activeSessions.has(sessionId) && 
          this.activeSessions.get(sessionId).status === this.SESSION_STATUS.ESTABLISHED) {
        
        // 更新会话最后活动时间
        session.lastActivity = Date.now();
        
        // 发出事件
        this.emit(eventType, { sessionId, event: keyEvent });
        console.log(`[RemoteControlService] 键盘事件已发送: ${eventType} (${keyEvent.key})`);
      }
    }, this.simulatedLatency);
    
    return true;
  }

  /**
   * 发送鼠标事件
   * @param {string} sessionId - 会话ID
   * @param {string} eventType - 事件类型
   * @param {Object} eventData - 事件数据
   * @returns {boolean} 是否成功发送
   */
  sendMouseEvent(sessionId, eventType, eventData) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.ESTABLISHED) {
      console.error(`[RemoteControlService] 无法发送鼠标事件: 会话不存在或状态不正确`);
      return false;
    }
    
    // 检查权限
    const permission = this.checkControlPermission(session.sourceDeviceId, session.targetDeviceId);
    if (!permission || permission.status !== this.PERMISSION_STATUS.GRANTED) {
      console.error(`[RemoteControlService] 无法发送鼠标事件: 没有权限`);
      return false;
    }
    
    // 构建鼠标事件
    let mouseEvent = {
      type: eventType,
      timestamp: Date.now()
    };
    
    // 根据事件类型添加相应数据
    switch (eventType) {
      case this.EVENT_TYPES.MOUSE_MOVE:
        mouseEvent.position = {
          x: eventData.x !== undefined ? eventData.x : this.mouseState.position.x,
          y: eventData.y !== undefined ? eventData.y : this.mouseState.position.y
        };
        // 更新鼠标位置
        this.mouseState.position = { ...mouseEvent.position };
        break;
        
      case this.EVENT_TYPES.MOUSE_DOWN:
      case this.EVENT_TYPES.MOUSE_UP:
      case this.EVENT_TYPES.MOUSE_CLICK:
        mouseEvent.button = eventData.button || 'left';
        mouseEvent.position = {
          x: eventData.x !== undefined ? eventData.x : this.mouseState.position.x,
          y: eventData.y !== undefined ? eventData.y : this.mouseState.position.y
        };
        // 更新按钮状态
        if (eventType === this.EVENT_TYPES.MOUSE_DOWN) {
          this.mouseState.buttonState[mouseEvent.button] = true;
        } else if (eventType === this.EVENT_TYPES.MOUSE_UP) {
          this.mouseState.buttonState[mouseEvent.button] = false;
        }
        // 更新鼠标位置
        this.mouseState.position = { ...mouseEvent.position };
        break;
        
      case this.EVENT_TYPES.MOUSE_SCROLL:
        mouseEvent.deltaX = eventData.deltaX || 0;
        mouseEvent.deltaY = eventData.deltaY || 0;
        mouseEvent.position = { ...this.mouseState.position };
        break;
    }
    
    this.mouseState.lastEvent = mouseEvent;
    
    // 记录事件（如果正在录制）
    this.recordEvent('mouse', mouseEvent);
    
    // 模拟网络延迟发送事件
    setTimeout(() => {
      // 检查会话是否仍处于活动状态
      if (this.activeSessions.has(sessionId) && 
          this.activeSessions.get(sessionId).status === this.SESSION_STATUS.ESTABLISHED) {
        
        // 更新会话最后活动时间
        session.lastActivity = Date.now();
        
        // 发出事件
        this.emit(eventType, { sessionId, event: mouseEvent });
        console.log(`[RemoteControlService] 鼠标事件已发送: ${eventType}`);
      }
    }, this.simulatedLatency);
    
    return true;
  }

  /**
   * 发送触控事件
   * @param {string} sessionId - 会话ID
   * @param {string} eventType - 事件类型
   * @param {Array} touches - 触摸点数组
   * @returns {boolean} 是否成功发送
   */
  sendTouchEvent(sessionId, eventType, touches) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.ESTABLISHED) {
      console.error(`[RemoteControlService] 无法发送触控事件: 会话不存在或状态不正确`);
      return false;
    }
    
    // 检查权限
    const permission = this.checkControlPermission(session.sourceDeviceId, session.targetDeviceId);
    if (!permission || permission.status !== this.PERMISSION_STATUS.GRANTED) {
      console.error(`[RemoteControlService] 无法发送触控事件: 没有权限`);
      return false;
    }
    
    // 构建触控事件
    const touchEvent = {
      type: eventType,
      touches: touches.map((touch, index) => ({
        identifier: touch.identifier !== undefined ? touch.identifier : index,
        x: touch.x,
        y: touch.y,
        radiusX: touch.radiusX || 10,
        radiusY: touch.radiusY || 10,
        force: touch.force || 1
      })),
      timestamp: Date.now()
    };
    
    // 更新触控状态
    if (eventType === this.EVENT_TYPES.TOUCH_START || eventType === this.EVENT_TYPES.TOUCH_MOVE) {
      this.touchState.touches = touchEvent.touches;
    } else if (eventType === this.EVENT_TYPES.TOUCH_END || eventType === this.EVENT_TYPES.TOUCH_CANCEL) {
      this.touchState.touches = [];
    }
    
    this.touchState.lastTouchEvent = touchEvent;
    
    // 记录事件（如果正在录制）
    this.recordEvent('touch', touchEvent);
    
    // 模拟网络延迟发送事件
    setTimeout(() => {
      // 检查会话是否仍处于活动状态
      if (this.activeSessions.has(sessionId) && 
          this.activeSessions.get(sessionId).status === this.SESSION_STATUS.ESTABLISHED) {
        
        // 更新会话最后活动时间
        session.lastActivity = Date.now();
        
        // 发出事件
        this.emit(eventType, { sessionId, event: touchEvent });
        console.log(`[RemoteControlService] 触控事件已发送: ${eventType}, ${touchEvent.touches.length}个触摸点`);
      }
    }, this.simulatedLatency);
    
    return true;
  }

  /**
   * 发送系统控制命令
   * @param {string} sessionId - 会话ID
   * @param {string} command - 命令名称
   * @param {Object} params - 命令参数
   * @returns {Promise} 解析为命令执行结果的Promise
   */
  sendSystemCommand(sessionId, command, params = {}) {
    return new Promise((resolve, reject) => {
      const session = this.activeSessions.get(sessionId);
      
      if (!session || session.status !== this.SESSION_STATUS.ESTABLISHED) {
        const error = new Error('会话不存在或状态不正确');
        console.error(`[RemoteControlService] 无法发送系统命令: ${error.message}`);
        reject(error);
        return;
      }
      
      // 检查权限
      const permission = this.checkControlPermission(session.sourceDeviceId, session.targetDeviceId);
      if (!permission || permission.status !== this.PERMISSION_STATUS.GRANTED) {
        const error = new Error('没有权限');
        console.error(`[RemoteControlService] 无法发送系统命令: ${error.message}`);
        reject(error);
        return;
      }
      
      // 检查是否启用了系统控制
      if (!session.options.enableSystemControl) {
        const error = new Error('系统控制未启用');
        console.error(`[RemoteControlService] 无法发送系统命令: ${error.message}`);
        reject(error);
        return;
      }
      
      // 模拟命令执行延迟
      setTimeout(() => {
        // 检查会话是否仍处于活动状态
        if (!this.activeSessions.has(sessionId)) {
          resolve({ success: false, error: '会话已关闭' });
          return;
        }
        
        // 更新会话最后活动时间
        session.lastActivity = Date.now();
        
        // 模拟命令结果（90%成功率）
        const isSuccess = Math.random() < 0.9;
        const result = {
          command,
          success: isSuccess,
          timestamp: Date.now()
        };
        
        if (isSuccess) {
          result.data = this.getMockCommandResult(command, params);
          console.log(`[RemoteControlService] 系统命令执行成功: ${command}`);
        } else {
          result.error = `命令执行失败: ${command}`;
          console.error(`[RemoteControlService] 系统命令执行失败: ${command}`);
        }
        
        // 发出命令执行事件
        this.emit('systemCommandExecuted', { sessionId, result });
        resolve(result);
      }, this.simulatedLatency + Math.random() * 200);
    });
  }

  /**
   * 获取模拟的命令执行结果
   * @private
   * @param {string} command - 命令名称
   * @param {Object} params - 命令参数
   * @returns {Object} 命令执行结果
   */
  getMockCommandResult(command, params) {
    const results = {
      'getSystemInfo': {
        os: 'Android 12',
        version: '12.0.0',
        device: 'Pixel 6',
        cpu: 'ARM64',
        memory: '8GB',
        storage: {
          total: 128 * 1024 * 1024 * 1024,
          used: 45 * 1024 * 1024 * 1024
        }
      },
      'takeScreenshot': {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        timestamp: Date.now(),
        width: 1080,
        height: 2400
      },
      'openApp': {
        appId: params.appId || 'com.example.app',
        opened: true,
        timestamp: Date.now()
      },
      'closeApp': {
        appId: params.appId || 'com.example.app',
        closed: true,
        timestamp: Date.now()
      },
      'reboot': {
        scheduled: true,
        timestamp: Date.now(),
        estimatedTime: Date.now() + 10000
      },
      'lockScreen': {
        locked: true,
        timestamp: Date.now()
      },
      'unlockScreen': {
        unlocked: true,
        timestamp: Date.now()
      },
      'adjustVolume': {
        type: params.type || 'media',
        level: params.level || 75,
        maxLevel: 100,
        timestamp: Date.now()
      },
      'setBrightness': {
        level: params.level || 80,
        maxLevel: 100,
        timestamp: Date.now()
      }
    };
    
    return results[command] || { command, params, executed: true };
  }

  /**
   * 开始录制事件
   */
  startRecording() {
    this.isRecording = true;
    this.recordedEvents = [];
    console.log('[RemoteControlService] 开始录制控制事件');
  }

  /**
   * 停止录制事件
   * @returns {Array} 录制的事件数组
   */
  stopRecording() {
    this.isRecording = false;
    console.log(`[RemoteControlService] 停止录制，共录制 ${this.recordedEvents.length} 个事件`);
    return this.recordedEvents;
  }

  /**
   * 记录事件（内部使用）
   * @private
   * @param {string} eventCategory - 事件类别
   * @param {Object} eventData - 事件数据
   */
  recordEvent(eventCategory, eventData) {
    if (!this.isRecording) return;
    
    this.recordedEvents.push({
      category: eventCategory,
      data: eventData,
      recordedAt: Date.now()
    });
  }

  /**
   * 回放录制的事件
   * @param {string} sessionId - 会话ID
   * @param {Array} events - 事件数组（可选，默认为最近录制的事件）
   * @param {number} speed - 回放速度（默认1.0）
   */
  replayEvents(sessionId, events = this.recordedEvents, speed = 1.0) {
    if (!events || events.length === 0) {
      console.warn('[RemoteControlService] 没有可回放的事件');
      return;
    }
    
    console.log(`[RemoteControlService] 开始回放 ${events.length} 个事件，速度: ${speed}x`);
    
    let lastTimestamp = events[0].recordedAt;
    
    events.forEach((recordedEvent, index) => {
      // 计算事件之间的延迟
      const delay = index === 0 ? 0 : 
        ((recordedEvent.recordedAt - lastTimestamp) / speed);
      
      lastTimestamp = recordedEvent.recordedAt;
      
      // 延迟回放事件
      setTimeout(() => {
        // 检查会话是否仍处于活动状态
        if (!this.activeSessions.has(sessionId) || 
            this.activeSessions.get(sessionId).status !== this.SESSION_STATUS.ESTABLISHED) {
          return;
        }
        
        // 根据事件类型回放
        const { category, data } = recordedEvent;
        
        switch (category) {
          case 'keyboard':
            this.sendKeyboardEvent(sessionId, data.type, data);
            break;
          case 'mouse':
            this.sendMouseEvent(sessionId, data.type, data);
            break;
          case 'touch':
            this.sendTouchEvent(sessionId, data.type, data.touches);
            break;
        }
        
        // 通知回放进度
        if ((index + 1) % 10 === 0 || index === events.length - 1) {
          this.emit('eventReplayProgress', {
            sessionId,
            progress: ((index + 1) / events.length) * 100,
            current: index + 1,
            total: events.length
          });
        }
      }, delay);
    });
  }

  /**
   * 设置模拟网络延迟
   * @param {number} ms - 延迟时间（毫秒）
   */
  setSimulatedLatency(ms) {
    this.simulatedLatency = Math.max(0, ms);
    console.log(`[RemoteControlService] 模拟网络延迟已设置为: ${ms}ms`);
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {this} 服务实例，用于链式调用
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数（可选）
   * @returns {this} 服务实例，用于链式调用
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return this;
    
    if (callback) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
    
    return this;
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {Object} data - 事件数据
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[RemoteControlService] 事件回调执行错误 (${event}):`, error);
      }
    });
  }

  /**
   * 获取键盘状态
   * @returns {Object} 键盘状态对象
   */
  getKeyboardState() {
    return {
      pressedKeys: Array.from(this.keyboardState.pressedKeys),
      lastKeyEvent: this.keyboardState.lastKeyEvent
    };
  }

  /**
   * 获取鼠标状态
   * @returns {Object} 鼠标状态对象
   */
  getMouseState() {
    return {
      position: { ...this.mouseState.position },
      buttonState: { ...this.mouseState.buttonState },
      lastEvent: this.mouseState.lastEvent
    };
  }

  /**
   * 获取触控状态
   * @returns {Object} 触控状态对象
   */
  getTouchState() {
    return {
      touches: [...this.touchState.touches],
      lastTouchEvent: this.touchState.lastTouchEvent
    };
  }

  /**
   * 模拟连接质量变化
   * @param {string} sessionId - 会话ID
   * @param {string} quality - 连接质量 ('excellent', 'good', 'fair', 'poor')
   */
  simulateConnectionQualityChange(sessionId, quality) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      console.error(`[RemoteControlService] 无法模拟连接质量变化: 会话不存在`);
      return;
    }
    
    // 根据质量更新连接统计信息
    const qualityMap = {
      excellent: { latency: 50, packetLoss: 0, bandwidth: 20000 },
      good: { latency: 100, packetLoss: 0.01, bandwidth: 15000 },
      fair: { latency: 200, packetLoss: 0.05, bandwidth: 8000 },
      poor: { latency: 500, packetLoss: 0.15, bandwidth: 3000 }
    };
    
    const stats = qualityMap[quality] || qualityMap.good;
    
    session.connectionStats = {
      latency: stats.latency,
      packetLoss: stats.packetLoss,
      bandwidth: stats.bandwidth,
      quality,
      updatedAt: Date.now()
    };
    
    // 更新模拟延迟
    this.simulatedLatency = stats.latency;
    
    // 发出连接质量变化事件
    this.emit(this.EVENT_TYPES.CONNECTION_QUALITY_CHANGED, {
      sessionId,
      connectionStats: session.connectionStats
    });
    
    console.log(`[RemoteControlService] 连接质量已更改为: ${quality}, 延迟: ${stats.latency}ms`);
  }

  /**
   * 模拟屏幕尺寸变化
   * @param {string} sessionId - 会话ID
   * @param {number} width - 新宽度
   * @param {number} height - 新高度
   */
  simulateScreenSizeChange(sessionId, width, height) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      console.error(`[RemoteControlService] 无法模拟屏幕尺寸变化: 会话不存在`);
      return;
    }
    
    // 更新屏幕信息
    session.screenInfo = {
      ...session.screenInfo,
      width,
      height,
      updatedAt: Date.now()
    };
    
    // 发出屏幕尺寸变化事件
    this.emit(this.EVENT_TYPES.SCREEN_SIZE_CHANGED, {
      sessionId,
      screenInfo: session.screenInfo
    });
    
    console.log(`[RemoteControlService] 屏幕尺寸已更改为: ${width}x${height}`);
  }

  /**
   * 模拟设备方向变化
   * @param {string} sessionId - 会话ID
   * @param {string} orientation - 新方向 ('portrait', 'landscape', 'portrait-reverse', 'landscape-reverse')
   */
  simulateDeviceOrientationChange(sessionId, orientation) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      console.error(`[RemoteControlService] 无法模拟设备方向变化: 会话不存在`);
      return;
    }
    
    // 根据方向交换宽高（如果需要）
    let width = session.screenInfo.width;
    let height = session.screenInfo.height;
    
    if (orientation.includes('landscape') && width < height) {
      [width, height] = [height, width];
    } else if (orientation.includes('portrait') && width > height) {
      [width, height] = [height, width];
    }
    
    // 更新屏幕信息和方向
    session.screenInfo = {
      ...session.screenInfo,
      width,
      height,
      orientation,
      updatedAt: Date.now()
    };
    
    // 发出设备方向变化事件
    this.emit(this.EVENT_TYPES.DEVICE_ORIENTATION_CHANGED, {
      sessionId,
      orientation,
      screenInfo: session.screenInfo
    });
    
    console.log(`[RemoteControlService] 设备方向已更改为: ${orientation}, 屏幕尺寸: ${width}x${height}`);
  }

  /**
   * 重置服务状态
   */
  reset() {
    // 关闭所有会话
    Array.from(this.activeSessions.keys()).forEach(sessionId => {
      this.closeSession(sessionId);
    });
    
    // 清除权限
    this.controlPermissions.clear();
    
    // 重置状态
    this.keyboardState.pressedKeys.clear();
    this.keyboardState.lastKeyEvent = null;
    this.mouseState.position = { x: 0, y: 0 };
    this.mouseState.buttonState = { left: false, right: false, middle: false };
    this.mouseState.lastEvent = null;
    this.touchState.touches = [];
    this.touchState.lastTouchEvent = null;
    this.isRecording = false;
    this.recordedEvents = [];
    
    console.log('[RemoteControlService] 服务状态已重置');
  }
}

// 创建单例实例
const remoteControlService = new RemoteControlService();

export default remoteControlService;