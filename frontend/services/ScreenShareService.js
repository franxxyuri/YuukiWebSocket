// ScreenShareService.js
// 模拟屏幕共享服务，用于前端调试和测试

class ScreenShareService {
  constructor() {
    this.activeSessions = new Map();
    this.listeners = new Map();
    this.isRunning = false;
    this.frameInterval = null;
    
    // 默认编码参数
    this.defaultEncodingOptions = {
      width: 1920,
      height: 1080,
      frameRate: 30,
      bitrate: 5000, // Kbps
      codec: 'vp9',
      quality: 0.8
    };
    
    // 模拟网络条件
    this.networkConditions = {
      latency: 50,
      jitter: 10,
      packetLoss: 0.01,
      bandwidth: 20000 // Kbps
    };
    
    // 会话状态常量
    this.SESSION_STATUS = {
      INITIALIZING: 'initializing',
      STREAMING: 'streaming',
      PAUSED: 'paused',
      STOPPED: 'stopped',
      ERROR: 'error'
    };
    
    // 事件类型常量
    this.EVENT_TYPES = {
      // 会话事件
      SESSION_STARTED: 'sessionStarted',
      SESSION_PAUSED: 'sessionPaused',
      SESSION_RESUMED: 'sessionResumed',
      SESSION_STOPPED: 'sessionStopped',
      SESSION_ERROR: 'sessionError',
      
      // 视频帧事件
      FRAME_RECEIVED: 'frameReceived',
      FRAME_DROPPED: 'frameDropped',
      
      // 质量事件
      QUALITY_CHANGED: 'qualityChanged',
      BANDWIDTH_CHANGED: 'bandwidthChanged',
      
      // 状态事件
      SCREEN_SIZE_CHANGED: 'screenSizeChanged',
      DISPLAY_MODE_CHANGED: 'displayModeChanged',
      
      // 录制事件
      RECORDING_STARTED: 'recordingStarted',
      RECORDING_STOPPED: 'recordingStopped',
      RECORDING_ERROR: 'recordingError'
    };
    
    // 可用的屏幕模拟场景
    this.availableScenes = [
      {
        id: 'desktop',
        name: '桌面',
        width: 1920,
        height: 1080,
        description: '标准桌面环境'
      },
      {
        id: 'browser',
        name: '浏览器',
        width: 1366,
        height: 768,
        description: '浏览器窗口'
      },
      {
        id: 'mobile',
        name: '手机',
        width: 390,
        height: 844,
        description: '移动设备屏幕'
      },
      {
        id: 'presentation',
        name: '演示文稿',
        width: 1280,
        height: 720,
        description: '幻灯片演示'
      },
      {
        id: 'code',
        name: '代码编辑器',
        width: 1600,
        height: 900,
        description: 'IDE代码编辑界面'
      }
    ];
    
    // 模拟的变化模式
    this.changePatterns = [
      {
        id: 'static',
        name: '静态画面',
        description: '无变化的静态画面'
      },
      {
        id: 'minimal',
        name: '最小变化',
        description: '偶尔的光标移动或小变化'
      },
      {
        id: 'moderate',
        name: '适度变化',
        description: '有一定频率的内容变化'
      },
      {
        id: 'high',
        name: '高变化',
        description: '频繁的大量内容变化'
      },
      {
        id: 'video',
        name: '视频播放',
        description: '类似视频播放的连续变化'
      }
    ];
  }

  /**
   * 开始屏幕共享会话
   * @param {string} sourceDeviceId - 源设备ID
   * @param {string} targetDeviceId - 目标设备ID
   * @param {Object} options - 共享选项
   * @returns {string} 会话ID
   */
  startSession(sourceDeviceId, targetDeviceId, options = {}) {
    const sessionId = `screenshare-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 合并默认选项和用户选项
    const encodingOptions = { ...this.defaultEncodingOptions, ...options.encodingOptions };
    const scene = options.scene || this.availableScenes[0];
    const changePattern = options.changePattern || this.changePatterns[1];
    
    // 创建会话对象
    const session = {
      id: sessionId,
      sourceDeviceId,
      targetDeviceId,
      status: this.SESSION_STATUS.INITIALIZING,
      startedAt: Date.now(),
      encodingOptions,
      scene,
      changePattern,
      stats: {
        framesSent: 0,
        framesReceived: 0,
        framesDropped: 0,
        bytesSent: 0,
        bytesReceived: 0,
        currentBitrate: 0,
        currentFps: 0,
        lastFrameTime: null
      },
      isRecording: false,
      recordedFrames: [],
      error: null
    };
    
    // 添加到活动会话
    this.activeSessions.set(sessionId, session);
    
    // 模拟初始化延迟
    setTimeout(() => {
      // 检查会话是否仍存在
      if (!this.activeSessions.has(sessionId)) return;
      
      // 更新会话状态
      session.status = this.SESSION_STATUS.STREAMING;
      
      // 开始生成和发送帧
      this.startFrameGeneration(session);
      
      this.emit(this.EVENT_TYPES.SESSION_STARTED, session);
      console.log(`[ScreenShareService] 屏幕共享会话已开始: ${sessionId}, 分辨率: ${scene.width}x${scene.height}, 帧率: ${encodingOptions.frameRate}fps`);
    }, 1000);
    
    return sessionId;
  }

  /**
   * 暂停屏幕共享会话
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 是否成功暂停
   */
  pauseSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.STREAMING) {
      console.error(`[ScreenShareService] 无法暂停会话 ${sessionId}: 会话不存在或状态不正确`);
      return false;
    }
    
    // 更新会话状态
    session.status = this.SESSION_STATUS.PAUSED;
    
    // 暂停帧生成
    this.pauseFrameGeneration(session);
    
    this.emit(this.EVENT_TYPES.SESSION_PAUSED, session);
    console.log(`[ScreenShareService] 屏幕共享会话已暂停: ${sessionId}`);
    return true;
  }

  /**
   * 恢复屏幕共享会话
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 是否成功恢复
   */
  resumeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.PAUSED) {
      console.error(`[ScreenShareService] 无法恢复会话 ${sessionId}: 会话不存在或状态不正确`);
      return false;
    }
    
    // 更新会话状态
    session.status = this.SESSION_STATUS.STREAMING;
    
    // 恢复帧生成
    this.resumeFrameGeneration(session);
    
    this.emit(this.EVENT_TYPES.SESSION_RESUMED, session);
    console.log(`[ScreenShareService] 屏幕共享会话已恢复: ${sessionId}`);
    return true;
  }

  /**
   * 停止屏幕共享会话
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 是否成功停止
   */
  stopSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || [this.SESSION_STATUS.STOPPED, this.SESSION_STATUS.ERROR].includes(session.status)) {
      console.error(`[ScreenShareService] 无法停止会话 ${sessionId}: 会话不存在或状态不正确`);
      return false;
    }
    
    // 更新会话状态
    session.status = this.SESSION_STATUS.STOPPED;
    session.stoppedAt = Date.now();
    
    // 停止帧生成
    this.stopFrameGeneration(session);
    
    // 如果正在录制，停止录制
    if (session.isRecording) {
      this.stopRecording(session);
    }
    
    // 从活动会话中移除
    this.activeSessions.delete(sessionId);
    
    this.emit(this.EVENT_TYPES.SESSION_STOPPED, session);
    console.log(`[ScreenShareService] 屏幕共享会话已停止: ${sessionId}`);
    return true;
  }

  /**
   * 开始帧生成（内部使用）
   * @private
   * @param {Object} session - 会话对象
   */
  startFrameGeneration(session) {
    // 计算帧间隔时间
    const frameIntervalMs = 1000 / session.encodingOptions.frameRate;
    
    // 设置帧生成定时器
    session.frameInterval = setInterval(() => {
      // 检查会话状态
      if (session.status !== this.SESSION_STATUS.STREAMING) {
        return;
      }
      
      // 生成并发送帧
      this.generateAndSendFrame(session);
    }, frameIntervalMs);
  }

  /**
   * 暂停帧生成（内部使用）
   * @private
   * @param {Object} session - 会话对象
   */
  pauseFrameGeneration(session) {
    if (session.frameInterval) {
      clearInterval(session.frameInterval);
      session.frameInterval = null;
    }
  }

  /**
   * 恢复帧生成（内部使用）
   * @private
   * @param {Object} session - 会话对象
   */
  resumeFrameGeneration(session) {
    if (!session.frameInterval) {
      this.startFrameGeneration(session);
    }
  }

  /**
   * 停止帧生成（内部使用）
   * @private
   * @param {Object} session - 会话对象
   */
  stopFrameGeneration(session) {
    if (session.frameInterval) {
      clearInterval(session.frameInterval);
      session.frameInterval = null;
    }
  }

  /**
   * 生成并发送帧（内部使用）
   * @private
   * @param {Object} session - 会话对象
   */
  generateAndSendFrame(session) {
    // 生成模拟帧
    const frame = this.generateMockFrame(session);
    
    // 模拟网络传输延迟和丢包
    const shouldDrop = Math.random() < this.networkConditions.packetLoss;
    
    if (shouldDrop) {
      // 帧被丢弃
      session.stats.framesDropped++;
      this.emit(this.EVENT_TYPES.FRAME_DROPPED, {
        sessionId: session.id,
        frameId: frame.id,
        timestamp: Date.now()
      });
      console.log(`[ScreenShareService] 帧已丢弃: ${frame.id}`);
      return;
    }
    
    // 计算实际延迟（包含抖动）
    const actualLatency = this.networkConditions.latency + 
      (Math.random() - 0.5) * this.networkConditions.jitter * 2;
    
    // 模拟网络延迟
    setTimeout(() => {
      // 检查会话是否仍在进行中
      if (!this.activeSessions.has(session.id) || 
          this.activeSessions.get(session.id).status !== this.SESSION_STATUS.STREAMING) {
        return;
      }
      
      // 更新统计信息
      session.stats.framesReceived++;
      session.stats.bytesReceived += frame.size;
      session.stats.lastFrameTime = Date.now();
      
      // 计算当前帧率和比特率（简单移动平均）
      this.updateSessionStats(session);
      
      // 发出帧接收事件
      this.emit(this.EVENT_TYPES.FRAME_RECEIVED, {
        sessionId: session.id,
        frame: frame
      });
      
      // 如果正在录制，记录帧
      if (session.isRecording) {
        session.recordedFrames.push({
          frame: { ...frame },
          recordedAt: Date.now()
        });
      }
    }, actualLatency);
    
    // 更新发送统计
    session.stats.framesSent++;
    session.stats.bytesSent += frame.size;
  }

  /**
   * 生成模拟帧（内部使用）
   * @private
   * @param {Object} session - 会话对象
   * @returns {Object} 模拟帧对象
   */
  generateMockFrame(session) {
    const { width, height } = session.scene;
    const { bitrate, quality } = session.encodingOptions;
    
    // 根据场景和变化模式模拟帧内容的复杂性
    let frameComplexity = 1.0;
    switch (session.changePattern.id) {
      case 'static':
        frameComplexity = 0.1;
        break;
      case 'minimal':
        frameComplexity = 0.3;
        break;
      case 'moderate':
        frameComplexity = 0.7;
        break;
      case 'high':
        frameComplexity = 1.2;
        break;
      case 'video':
        frameComplexity = 1.5;
        break;
    }
    
    // 估算帧大小（基于分辨率、比特率和复杂性）
    const frameSize = Math.round((bitrate * 1024 / session.encodingOptions.frameRate) * frameComplexity * quality);
    
    // 创建帧对象
    const frame = {
      id: `frame-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      width,
      height,
      timestamp: Date.now(),
      sequenceNumber: session.stats.framesSent,
      size: frameSize,
      keyframe: session.stats.framesSent % 30 === 0, // 每30帧一个关键帧
      quality,
      // 模拟帧数据（实际应用中这里会是视频帧数据）
      dataUrl: this.generateMockFrameDataUrl(width, height, session)
    };
    
    return frame;
  }

  /**
   * 生成模拟帧数据URL（内部使用）
   * @private
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {Object} session - 会话对象
   * @returns {string} 数据URL
   */
  generateMockFrameDataUrl(width, height, session) {
    // 注意：在实际应用中，这里应该返回真实的图像数据URL
    // 由于我们在模拟环境中，返回一个占位符URL
    
    // 根据场景和变化模式模拟不同的内容
    let color = '#f0f0f0';
    
    if (session.changePattern.id !== 'static') {
      // 对于非静态模式，根据帧序号生成变化的颜色
      const hue = (session.stats.framesSent * 5) % 360;
      color = `hsl(${hue}, 70%, 80%)`;
    }
    
    // 返回一个简单的SVG数据URL作为模拟
    const svg = `data:image/svg+xml,${encodeURIComponent(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
        <text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" fill="#333">
          ${session.scene.name} - Frame ${session.stats.framesSent}
        </text>
        <text x="50%" y="60%" font-family="Arial" font-size="16" text-anchor="middle" fill="#666">
          ${width}x${height} @ ${session.encodingOptions.frameRate}fps
        </text>
      </svg>
    `)}`;
    
    return svg;
  }

  /**
   * 更新会话统计信息（内部使用）
   * @private
   * @param {Object} session - 会话对象
   */
  updateSessionStats(session) {
    // 简单计算（实际应用中可能需要更复杂的算法）
    const now = Date.now();
    const elapsed = now - session.startedAt;
    
    if (elapsed > 0) {
      // 计算当前比特率（Kbps）
      session.stats.currentBitrate = Math.round((session.stats.bytesReceived * 8 / 1024) / (elapsed / 1000));
      
      // 计算当前帧率
      session.stats.currentFps = Math.round((session.stats.framesReceived * 1000) / elapsed);
    }
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
   * 开始录制
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 是否成功开始录制
   */
  startRecording(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.STREAMING) {
      console.error(`[ScreenShareService] 无法开始录制: 会话不存在或状态不正确`);
      return false;
    }
    
    if (session.isRecording) {
      console.warn(`[ScreenShareService] 会话 ${sessionId} 已经在录制中`);
      return true;
    }
    
    session.isRecording = true;
    session.recordedFrames = [];
    session.recordingStartedAt = Date.now();
    
    this.emit(this.EVENT_TYPES.RECORDING_STARTED, {
      sessionId: session.id,
      startedAt: session.recordingStartedAt
    });
    
    console.log(`[ScreenShareService] 开始录制会话 ${sessionId}`);
    return true;
  }

  /**
   * 停止录制
   * @param {string|Object} sessionOrId - 会话ID或会话对象
   * @returns {Object|null} 录制数据或null
   */
  stopRecording(sessionOrId) {
    const session = typeof sessionOrId === 'string' ? 
      this.activeSessions.get(sessionOrId) : sessionOrId;
    
    if (!session || !session.isRecording) {
      console.error(`[ScreenShareService] 无法停止录制: 会话不存在或未在录制中`);
      return null;
    }
    
    // 停止录制
    session.isRecording = false;
    session.recordingStoppedAt = Date.now();
    
    // 准备录制数据
    const recordingData = {
      sessionId: session.id,
      startedAt: session.recordingStartedAt,
      stoppedAt: session.recordingStoppedAt,
      duration: session.recordingStoppedAt - session.recordingStartedAt,
      frameCount: session.recordedFrames.length,
      frames: session.recordedFrames
    };
    
    this.emit(this.EVENT_TYPES.RECORDING_STOPPED, {
      sessionId: session.id,
      recording: recordingData
    });
    
    console.log(`[ScreenShareService] 停止录制会话 ${session.id}, 录制了 ${session.recordedFrames.length} 帧, 时长: ${recordingData.duration}ms`);
    
    // 重置录制帧数组，但保留录制数据
    session.recordedFrames = [];
    
    return recordingData;
  }

  /**
   * 回放录制的内容
   * @param {Object} recordingData - 录制数据
   * @param {Function} frameCallback - 每帧回调函数
   * @param {number} speed - 回放速度（默认1.0）
   */
  replayRecording(recordingData, frameCallback, speed = 1.0) {
    if (!recordingData || !recordingData.frames || recordingData.frames.length === 0) {
      console.warn('[ScreenShareService] 没有可回放的录制内容');
      return;
    }
    
    console.log(`[ScreenShareService] 开始回放录制内容, 共 ${recordingData.frames.length} 帧, 速度: ${speed}x`);
    
    let lastTimestamp = null;
    
    recordingData.frames.forEach((recordedFrame, index) => {
      // 计算播放延迟
      let delay = 0;
      if (index > 0 && lastTimestamp !== null) {
        // 使用实际录制的时间间隔，但应用速度因子
        const originalDelay = recordedFrame.recordedAt - lastTimestamp;
        delay = originalDelay / speed;
      }
      
      lastTimestamp = recordedFrame.recordedAt;
      
      // 安排帧播放
      setTimeout(() => {
        if (frameCallback) {
          frameCallback(recordedFrame.frame);
        }
        
        // 如果是最后一帧，发出完成事件
        if (index === recordingData.frames.length - 1) {
          console.log('[ScreenShareService] 录制回放完成');
        }
      }, delay);
    });
  }

  /**
   * 调整编码参数
   * @param {string} sessionId - 会话ID
   * @param {Object} encodingOptions - 新的编码选项
   * @returns {boolean} 是否成功调整
   */
  adjustEncodingOptions(sessionId, encodingOptions) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.STREAMING) {
      console.error(`[ScreenShareService] 无法调整编码参数: 会话不存在或状态不正确`);
      return false;
    }
    
    // 更新编码选项
    session.encodingOptions = {
      ...session.encodingOptions,
      ...encodingOptions
    };
    
    // 如果帧率改变，重新设置帧生成间隔
    if (encodingOptions.frameRate !== undefined) {
      this.pauseFrameGeneration(session);
      this.resumeFrameGeneration(session);
    }
    
    this.emit(this.EVENT_TYPES.QUALITY_CHANGED, {
      sessionId: session.id,
      encodingOptions: session.encodingOptions
    });
    
    console.log(`[ScreenShareService] 已调整会话 ${sessionId} 的编码参数:`, encodingOptions);
    return true;
  }

  /**
   * 模拟网络条件变化
   * @param {Object} conditions - 新的网络条件
   */
  simulateNetworkConditions(conditions) {
    // 更新网络条件
    this.networkConditions = {
      ...this.networkConditions,
      ...conditions
    };
    
    console.log(`[ScreenShareService] 已模拟网络条件:`, this.networkConditions);
    
    // 通知所有活动会话的网络条件变化
    this.activeSessions.forEach(session => {
      this.emit(this.EVENT_TYPES.BANDWIDTH_CHANGED, {
        sessionId: session.id,
        networkConditions: this.networkConditions
      });
    });
  }

  /**
   * 模拟屏幕尺寸变化
   * @param {string} sessionId - 会话ID
   * @param {number} width - 新宽度
   * @param {number} height - 新高度
   * @returns {boolean} 是否成功模拟
   */
  simulateScreenSizeChange(sessionId, width, height) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.STREAMING) {
      console.error(`[ScreenShareService] 无法模拟屏幕尺寸变化: 会话不存在或状态不正确`);
      return false;
    }
    
    // 更新场景分辨率
    session.scene = {
      ...session.scene,
      width,
      height
    };
    
    // 同时更新编码分辨率
    session.encodingOptions = {
      ...session.encodingOptions,
      width,
      height
    };
    
    this.emit(this.EVENT_TYPES.SCREEN_SIZE_CHANGED, {
      sessionId: session.id,
      width,
      height
    });
    
    console.log(`[ScreenShareService] 已模拟会话 ${sessionId} 的屏幕尺寸变化: ${width}x${height}`);
    return true;
  }

  /**
   * 模拟显示模式变化
   * @param {string} sessionId - 会话ID
   * @param {string} displayMode - 显示模式 ('windowed', 'fullscreen', 'minimized')
   * @returns {boolean} 是否成功模拟
   */
  simulateDisplayModeChange(sessionId, displayMode) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.status !== this.SESSION_STATUS.STREAMING) {
      console.error(`[ScreenShareService] 无法模拟显示模式变化: 会话不存在或状态不正确`);
      return false;
    }
    
    // 更新显示模式
    session.displayMode = displayMode;
    
    // 根据显示模式调整模拟行为
    if (displayMode === 'minimized') {
      // 最小化时暂停帧生成
      this.pauseSession(sessionId);
    } else if (displayMode === 'fullscreen' && session.status === this.SESSION_STATUS.PAUSED) {
      // 全屏时恢复帧生成
      this.resumeSession(sessionId);
    }
    
    this.emit(this.EVENT_TYPES.DISPLAY_MODE_CHANGED, {
      sessionId: session.id,
      displayMode
    });
    
    console.log(`[ScreenShareService] 已模拟会话 ${sessionId} 的显示模式变化: ${displayMode}`);
    return true;
  }

  /**
   * 获取可用的屏幕场景
   * @returns {Array} 可用场景数组
   */
  getAvailableScenes() {
    return [...this.availableScenes];
  }

  /**
   * 获取可用的变化模式
   * @returns {Array} 可用变化模式数组
   */
  getAvailableChangePatterns() {
    return [...this.changePatterns];
  }

  /**
   * 设置默认编码参数
   * @param {Object} options - 编码选项
   */
  setDefaultEncodingOptions(options) {
    this.defaultEncodingOptions = {
      ...this.defaultEncodingOptions,
      ...options
    };
    console.log(`[ScreenShareService] 已设置默认编码参数:`, this.defaultEncodingOptions);
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
        console.error(`[ScreenShareService] 事件回调执行错误 (${event}):`, error);
      }
    });
  }

  /**
   * 重置服务状态
   */
  reset() {
    // 停止所有会话
    Array.from(this.activeSessions.keys()).forEach(sessionId => {
      this.stopSession(sessionId);
    });
    
    // 重置状态
    this.isRunning = false;
    this.frameInterval = null;
    
    console.log('[ScreenShareService] 服务状态已重置');
  }
}

// 创建单例实例
const screenShareService = new ScreenShareService();

export default screenShareService;