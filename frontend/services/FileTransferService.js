// FileTransferService.js
// 模拟文件传输服务，用于前端调试和测试

class FileTransferService {
  constructor() {
    this.uploadQueue = [];
    this.downloadQueue = [];
    this.transferHistory = [];
    this.listeners = new Map();
    this.isPaused = false;
    this.transferInterval = null;
    this.chunkSize = 1024 * 1024; // 1MB chunks
    this.simulatedSpeed = 5 * 1024 * 1024; // 5MB/s
    this.maxConcurrentTransfers = 3;
    
    // 模拟文件库
    this.mockFiles = [
      { id: 'file-1', name: 'document.pdf', size: 2500000, type: 'application/pdf', path: '/documents/report.pdf' },
      { id: 'file-2', name: 'photo.jpg', size: 4500000, type: 'image/jpeg', path: '/photos/vacation.jpg' },
      { id: 'file-3', name: 'video.mp4', size: 50000000, type: 'video/mp4', path: '/videos/presentation.mp4' },
      { id: 'file-4', name: 'audio.mp3', size: 8000000, type: 'audio/mpeg', path: '/audio/music.mp3' },
      { id: 'file-5', name: 'spreadsheet.xlsx', size: 1500000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', path: '/documents/data.xlsx' },
      { id: 'file-6', name: 'archive.zip', size: 20000000, type: 'application/zip', path: '/archives/backup.zip' },
      { id: 'file-7', name: 'code.js', size: 50000, type: 'text/javascript', path: '/code/script.js' },
      { id: 'file-8', name: 'presentation.pptx', size: 15000000, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', path: '/documents/presentation.pptx' }
    ];
    
    // 传输状态常量
    this.TRANSFER_STATUS = {
      QUEUED: 'queued',
      IN_PROGRESS: 'in_progress',
      PAUSED: 'paused',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELED: 'canceled'
    };
    
    // 传输类型常量
    this.TRANSFER_TYPES = {
      UPLOAD: 'upload',
      DOWNLOAD: 'download'
    };
  }

  /**
   * 开始处理传输队列
   */
  startProcessingQueue() {
    if (this.transferInterval) return;
    
    this.transferInterval = setInterval(() => {
      if (this.isPaused) return;
      
      this.processTransfers();
    }, 200); // 每200ms更新一次传输进度
  }

  /**
   * 停止处理传输队列
   */
  stopProcessingQueue() {
    if (this.transferInterval) {
      clearInterval(this.transferInterval);
      this.transferInterval = null;
    }
  }

  /**
   * 处理传输队列
   * @private
   */
  processTransfers() {
    // 处理上传队列
    this.processTransferQueue(this.uploadQueue);
    
    // 处理下载队列
    this.processTransferQueue(this.downloadQueue);
  }

  /**
   * 处理指定的传输队列
   * @private
   * @param {Array} queue - 传输队列
   */
  processTransferQueue(queue) {
    // 计算当前正在进行的传输数量
    const activeTransfers = queue.filter(transfer => 
      transfer.status === this.TRANSFER_STATUS.IN_PROGRESS
    ).length;
    
    // 找出可以开始的队列中的传输
    const queuedTransfers = queue.filter(transfer => 
      transfer.status === this.TRANSFER_STATUS.QUEUED
    );
    
    // 开始新的传输，直到达到最大并发数
    while (activeTransfers < this.maxConcurrentTransfers && queuedTransfers.length > 0) {
      const nextTransfer = queuedTransfers.shift();
      this.startTransfer(nextTransfer);
    }
    
    // 更新进行中的传输进度
    queue.forEach(transfer => {
      if (transfer.status === this.TRANSFER_STATUS.IN_PROGRESS) {
        this.updateTransferProgress(transfer);
      }
    });
  }

  /**
   * 开始传输
   * @private
   * @param {Object} transfer - 传输对象
   */
  startTransfer(transfer) {
    transfer.status = this.TRANSFER_STATUS.IN_PROGRESS;
    transfer.startTime = Date.now();
    transfer.lastUpdated = Date.now();
    
    this.emit('transferStarted', transfer);
    
    console.log(`[FileTransferService] 开始${transfer.type === this.TRANSFER_TYPES.UPLOAD ? '上传' : '下载'}: ${transfer.file.name}`);
  }

  /**
   * 更新传输进度
   * @private
   * @param {Object} transfer - 传输对象
   */
  updateTransferProgress(transfer) {
    // 计算经过的时间（毫秒）
    const elapsedTime = Date.now() - transfer.lastUpdated;
    
    // 计算应该传输的数据量（字节）
    const bytesToTransfer = Math.floor((this.simulatedSpeed / 1000) * (elapsedTime / 1000));
    
    // 更新已传输字节数
    transfer.transferredBytes += bytesToTransfer;
    transfer.lastUpdated = Date.now();
    
    // 确保不超过文件大小
    if (transfer.transferredBytes >= transfer.file.size) {
      transfer.transferredBytes = transfer.file.size;
      this.completeTransfer(transfer);
      return;
    }
    
    // 计算进度百分比
    transfer.progress = Math.floor((transfer.transferredBytes / transfer.file.size) * 100);
    
    // 计算传输速率（字节/秒）
    const totalElapsedTime = (transfer.lastUpdated - transfer.startTime) / 1000;
    transfer.currentSpeed = Math.floor(transfer.transferredBytes / totalElapsedTime);
    
    // 估计剩余时间（秒）
    const remainingBytes = transfer.file.size - transfer.transferredBytes;
    transfer.estimatedTimeRemaining = Math.ceil(remainingBytes / transfer.currentSpeed);
    
    // 随机模拟传输错误（1%的概率）
    if (Math.random() < 0.01) {
      this.failTransfer(transfer, '网络错误');
      return;
    }
    
    // 触发进度更新事件
    this.emit('transferProgress', transfer);
  }

  /**
   * 完成传输
   * @private
   * @param {Object} transfer - 传输对象
   */
  completeTransfer(transfer) {
    transfer.status = this.TRANSFER_STATUS.COMPLETED;
    transfer.endTime = Date.now();
    transfer.duration = transfer.endTime - transfer.startTime;
    transfer.progress = 100;
    transfer.success = true;
    
    // 将传输添加到历史记录
    this.transferHistory.push({ ...transfer });
    
    // 从队列中移除
    if (transfer.type === this.TRANSFER_TYPES.UPLOAD) {
      this.uploadQueue = this.uploadQueue.filter(t => t.id !== transfer.id);
    } else {
      this.downloadQueue = this.downloadQueue.filter(t => t.id !== transfer.id);
    }
    
    this.emit('transferCompleted', transfer);
    
    console.log(`[FileTransferService] ${transfer.type === this.TRANSFER_TYPES.UPLOAD ? '上传' : '下载'}完成: ${transfer.file.name}, 耗时: ${transfer.duration}ms`);
  }

  /**
   * 失败传输
   * @private
   * @param {Object} transfer - 传输对象
   * @param {string} reason - 失败原因
   */
  failTransfer(transfer, reason) {
    transfer.status = this.TRANSFER_STATUS.FAILED;
    transfer.endTime = Date.now();
    transfer.duration = transfer.endTime - transfer.startTime;
    transfer.error = reason;
    transfer.success = false;
    
    // 将传输添加到历史记录
    this.transferHistory.push({ ...transfer });
    
    // 从队列中移除
    if (transfer.type === this.TRANSFER_TYPES.UPLOAD) {
      this.uploadQueue = this.uploadQueue.filter(t => t.id !== transfer.id);
    } else {
      this.downloadQueue = this.downloadQueue.filter(t => t.id !== transfer.id);
    }
    
    this.emit('transferFailed', transfer);
    
    console.error(`[FileTransferService] ${transfer.type === this.TRANSFER_TYPES.UPLOAD ? '上传' : '下载'}失败: ${transfer.file.name}, 原因: ${reason}`);
  }

  /**
   * 上传文件
   * @param {Object} file - 文件对象
   * @param {Object} options - 上传选项
   * @returns {Object} 上传任务对象
   */
  uploadFile(file, options = {}) {
    const uploadTask = {
      id: `upload-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: this.TRANSFER_TYPES.UPLOAD,
      file: file,
      targetDeviceId: options.targetDeviceId || null,
      path: options.path || '/uploads/' + file.name,
      status: this.TRANSFER_STATUS.QUEUED,
      progress: 0,
      transferredBytes: 0,
      startTime: null,
      endTime: null,
      duration: null,
      lastUpdated: Date.now(),
      currentSpeed: 0,
      estimatedTimeRemaining: null,
      error: null,
      success: null,
      retries: 0,
      maxRetries: options.maxRetries || 3,
      metadata: options.metadata || {}
    };
    
    this.uploadQueue.push(uploadTask);
    
    // 如果队列处理未启动，启动它
    if (!this.transferInterval) {
      this.startProcessingQueue();
    }
    
    this.emit('transferQueued', uploadTask);
    
    console.log(`[FileTransferService] 文件已加入上传队列: ${file.name}, 大小: ${this.formatFileSize(file.size)}`);
    
    return uploadTask;
  }

  /**
   * 下载文件
   * @param {string|Object} file - 文件ID或文件对象
   * @param {Object} options - 下载选项
   * @returns {Object} 下载任务对象
   */
  downloadFile(file, options = {}) {
    let fileObj;
    
    // 如果提供的是文件ID，从模拟文件库中查找
    if (typeof file === 'string') {
      fileObj = this.mockFiles.find(f => f.id === file);
      
      if (!fileObj) {
        console.error(`[FileTransferService] 未找到文件: ${file}`);
        return null;
      }
    } else {
      fileObj = file;
    }
    
    const downloadTask = {
      id: `download-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: this.TRANSFER_TYPES.DOWNLOAD,
      file: fileObj,
      sourceDeviceId: options.sourceDeviceId || null,
      savePath: options.savePath || '/downloads/' + fileObj.name,
      status: this.TRANSFER_STATUS.QUEUED,
      progress: 0,
      transferredBytes: 0,
      startTime: null,
      endTime: null,
      duration: null,
      lastUpdated: Date.now(),
      currentSpeed: 0,
      estimatedTimeRemaining: null,
      error: null,
      success: null,
      retries: 0,
      maxRetries: options.maxRetries || 3,
      metadata: options.metadata || {}
    };
    
    this.downloadQueue.push(downloadTask);
    
    // 如果队列处理未启动，启动它
    if (!this.transferInterval) {
      this.startProcessingQueue();
    }
    
    this.emit('transferQueued', downloadTask);
    
    console.log(`[FileTransferService] 文件已加入下载队列: ${fileObj.name}, 大小: ${this.formatFileSize(fileObj.size)}`);
    
    return downloadTask;
  }

  /**
   * 暂停传输
   * @param {string} transferId - 传输ID
   * @returns {boolean} 是否成功暂停
   */
  pauseTransfer(transferId) {
    let transfer = this.findTransfer(transferId);
    
    if (!transfer) {
      console.error(`[FileTransferService] 未找到传输: ${transferId}`);
      return false;
    }
    
    if (transfer.status === this.TRANSFER_STATUS.IN_PROGRESS) {
      transfer.status = this.TRANSFER_STATUS.PAUSED;
      this.emit('transferPaused', transfer);
      console.log(`[FileTransferService] 传输已暂停: ${transferId}`);
      return true;
    }
    
    return false;
  }

  /**
   * 恢复传输
   * @param {string} transferId - 传输ID
   * @returns {boolean} 是否成功恢复
   */
  resumeTransfer(transferId) {
    let transfer = this.findTransfer(transferId);
    
    if (!transfer) {
      console.error(`[FileTransferService] 未找到传输: ${transferId}`);
      return false;
    }
    
    if (transfer.status === this.TRANSFER_STATUS.PAUSED) {
      transfer.status = this.TRANSFER_STATUS.IN_PROGRESS;
      transfer.lastUpdated = Date.now(); // 重置最后更新时间以避免进度跳跃
      this.emit('transferResumed', transfer);
      console.log(`[FileTransferService] 传输已恢复: ${transferId}`);
      return true;
    }
    
    return false;
  }

  /**
   * 取消传输
   * @param {string} transferId - 传输ID
   * @returns {boolean} 是否成功取消
   */
  cancelTransfer(transferId) {
    let transfer = this.findTransfer(transferId);
    
    if (!transfer) {
      console.error(`[FileTransferService] 未找到传输: ${transferId}`);
      return false;
    }
    
    if ([this.TRANSFER_STATUS.QUEUED, this.TRANSFER_STATUS.IN_PROGRESS, this.TRANSFER_STATUS.PAUSED].includes(transfer.status)) {
      transfer.status = this.TRANSFER_STATUS.CANCELED;
      transfer.endTime = Date.now();
      transfer.duration = transfer.endTime - (transfer.startTime || Date.now());
      transfer.success = false;
      
      // 从队列中移除
      if (transfer.type === this.TRANSFER_TYPES.UPLOAD) {
        this.uploadQueue = this.uploadQueue.filter(t => t.id !== transferId);
      } else {
        this.downloadQueue = this.downloadQueue.filter(t => t.id !== transferId);
      }
      
      // 添加到历史记录
      this.transferHistory.push({ ...transfer });
      
      this.emit('transferCanceled', transfer);
      console.log(`[FileTransferService] 传输已取消: ${transferId}`);
      return true;
    }
    
    return false;
  }

  /**
   * 查找传输任务
   * @private
   * @param {string} transferId - 传输ID
   * @returns {Object|null} 传输任务对象或null
   */
  findTransfer(transferId) {
    // 在上传队列中查找
    let transfer = this.uploadQueue.find(t => t.id === transferId);
    
    // 如果没找到，在下载队列中查找
    if (!transfer) {
      transfer = this.downloadQueue.find(t => t.id === transferId);
    }
    
    // 如果没找到，在历史记录中查找
    if (!transfer) {
      transfer = this.transferHistory.find(t => t.id === transferId);
    }
    
    return transfer || null;
  }

  /**
   * 获取所有传输任务（队列和历史记录）
   * @returns {Array} 所有传输任务
   */
  getAllTransfers() {
    return [...this.uploadQueue, ...this.downloadQueue, ...this.transferHistory];
  }

  /**
   * 获取活动的传输任务（在队列中的）
   * @returns {Array} 活动传输任务
   */
  getActiveTransfers() {
    return [...this.uploadQueue, ...this.downloadQueue];
  }

  /**
   * 获取上传队列
   * @returns {Array} 上传队列
   */
  getUploadQueue() {
    return [...this.uploadQueue];
  }

  /**
   * 获取下载队列
   * @returns {Array} 下载队列
   */
  getDownloadQueue() {
    return [...this.downloadQueue];
  }

  /**
   * 获取传输历史记录
   * @returns {Array} 传输历史记录
   */
  getTransferHistory() {
    return [...this.transferHistory];
  }

  /**
   * 清空传输历史记录
   */
  clearTransferHistory() {
    const historyCount = this.transferHistory.length;
    this.transferHistory = [];
    
    this.emit('historyCleared', { count: historyCount });
    console.log(`[FileTransferService] 传输历史记录已清空，共${historyCount}条记录`);
  }

  /**
   * 暂停所有传输
   */
  pauseAllTransfers() {
    this.isPaused = true;
    
    // 暂停所有进行中的传输
    [...this.uploadQueue, ...this.downloadQueue].forEach(transfer => {
      if (transfer.status === this.TRANSFER_STATUS.IN_PROGRESS) {
        transfer.status = this.TRANSFER_STATUS.PAUSED;
        this.emit('transferPaused', transfer);
      }
    });
    
    this.emit('allTransfersPaused', {});
    console.log('[FileTransferService] 所有传输已暂停');
  }

  /**
   * 恢复所有传输
   */
  resumeAllTransfers() {
    this.isPaused = false;
    
    // 恢复所有暂停的传输
    [...this.uploadQueue, ...this.downloadQueue].forEach(transfer => {
      if (transfer.status === this.TRANSFER_STATUS.PAUSED) {
        transfer.status = this.TRANSFER_STATUS.IN_PROGRESS;
        transfer.lastUpdated = Date.now();
        this.emit('transferResumed', transfer);
      }
    });
    
    this.emit('allTransfersResumed', {});
    console.log('[FileTransferService] 所有传输已恢复');
  }

  /**
   * 取消所有传输
   */
  cancelAllTransfers() {
    const activeTransfers = [...this.uploadQueue, ...this.downloadQueue];
    
    activeTransfers.forEach(transfer => {
      this.cancelTransfer(transfer.id);
    });
    
    this.emit('allTransfersCanceled', { count: activeTransfers.length });
    console.log(`[FileTransferService] 所有${activeTransfers.length}个传输已取消`);
  }

  /**
   * 设置模拟传输速度
   * @param {number} bytesPerSecond - 每秒传输字节数
   */
  setSimulatedSpeed(bytesPerSecond) {
    this.simulatedSpeed = bytesPerSecond;
    console.log(`[FileTransferService] 模拟传输速度已设置为: ${this.formatFileSize(bytesPerSecond)}/s`);
  }

  /**
   * 设置最大并发传输数
   * @param {number} max - 最大并发传输数
   */
  setMaxConcurrentTransfers(max) {
    this.maxConcurrentTransfers = max;
    console.log(`[FileTransferService] 最大并发传输数已设置为: ${max}`);
  }

  /**
   * 获取模拟文件列表
   * @returns {Array} 模拟文件列表
   */
  getMockFiles() {
    return [...this.mockFiles];
  }

  /**
   * 添加模拟文件
   * @param {Object} file - 文件对象
   * @returns {Object} 添加的文件对象
   */
  addMockFile(file) {
    const newFile = {
      id: file.id || `file-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      path: file.path || '/files/' + file.name
    };
    
    this.mockFiles.push(newFile);
    return newFile;
  }

  /**
   * 模拟网络错误
   * @param {string} severity - 严重程度 ('minor', 'major', 'critical')
   */
  simulateNetworkError(severity = 'minor') {
    console.warn(`[FileTransferService] 模拟网络错误: ${severity}`);
    
    // 根据严重程度调整模拟传输速度
    let reducedSpeed;
    switch (severity) {
      case 'minor':
        reducedSpeed = this.simulatedSpeed * 0.7; // 70% 速度
        break;
      case 'major':
        reducedSpeed = this.simulatedSpeed * 0.3; // 30% 速度
        break;
      case 'critical':
        reducedSpeed = this.simulatedSpeed * 0.1; // 10% 速度
        
        // 随机中断一个传输
        const activeTransfers = [...this.uploadQueue, ...this.downloadQueue].filter(t => 
          t.status === this.TRANSFER_STATUS.IN_PROGRESS
        );
        
        if (activeTransfers.length > 0) {
          const transferToFail = activeTransfers[Math.floor(Math.random() * activeTransfers.length)];
          this.failTransfer(transferToFail, '网络连接中断');
        }
        break;
    }
    
    // 临时降低速度
    const originalSpeed = this.simulatedSpeed;
    this.simulatedSpeed = reducedSpeed;
    
    // 发出网络错误事件
    this.emit('networkErrorSimulated', {
      severity,
      originalSpeed,
      reducedSpeed,
      timestamp: Date.now()
    });
    
    // 5秒后恢复正常速度
    setTimeout(() => {
      this.simulatedSpeed = originalSpeed;
      this.emit('networkRecovered', {
        previousSeverity: severity,
        restoredSpeed: originalSpeed,
        timestamp: Date.now()
      });
      console.log('[FileTransferService] 网络已恢复正常速度');
    }, 5000);
  }

  /**
   * 格式化文件大小
   * @private
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
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
        console.error(`[FileTransferService] 事件回调执行错误 (${event}):`, error);
      }
    });
  }
}

// 创建单例实例
const fileTransferService = new FileTransferService();

export default fileTransferService;