const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class FileTransfer {
  constructor() {
    this.transfers = new Map();
    this.chunkSize = 64 * 1024; // 64KB chunks
    this.maxConcurrentTransfers = 5;
    this.activeTransfers = 0;
    this.transferHistory = [];
    
    // 启动定时清理任务
    this.startCleanupTask();
  }

  // 开始文件传输
  async sendFile(filePath, targetDeviceId, options = {}) {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error('文件不存在');
      }

      // 获取文件信息
      const fileStats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const fileHash = this.calculateFileHash(filePath);
      
      // 生成传输ID
      const transferId = this.generateTransferId();

      // 创建传输记录
      const transfer = {
        id: transferId,
        type: 'send',
        fileName: fileName,
        filePath: filePath,
        fileSize: fileStats.size,
        fileHash: fileHash,
        targetDeviceId: targetDeviceId,
        status: 'preparing',
        progress: 0,
        startTime: Date.now(),
        currentChunk: 0,
        totalChunks: Math.ceil(fileStats.size / this.chunkSize),
        options: {
          compression: options.compression || 'none',
          encryption: options.encryption || 'aes256',
          priority: options.priority || 'normal'
        }
      };

      this.transfers.set(transferId, transfer);
      this.activeTransfers++;

      // 发送传输开始通知
      this.notifyTransferStart(transfer);

      // 开始传输
      await this.performFileTransfer(transfer);

      return {
        success: true,
        transferId: transferId,
        fileName: fileName,
        fileSize: fileStats.size,
        fileHash: fileHash
      };

    } catch (error) {
      console.error('文件传输失败:', error);
      throw error;
    }
  }

  // 接收文件
  async receiveFile(transferInfo, savePath = null) {
    try {
      const transferId = this.generateTransferId();
      
      // 如果没有指定保存路径，弹出文件选择对话框
      if (!savePath) {
        const result = await dialog.showSaveDialog({
          defaultPath: transferInfo.fileName,
          filters: [
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        
        if (result.canceled) {
          throw new Error('用户取消了文件保存');
        }
        
        savePath = result.filePath;
      }

      // 创建接收传输记录
      const transfer = {
        id: transferId,
        type: 'receive',
        fileName: transferInfo.fileName,
        filePath: savePath,
        fileSize: transferInfo.fileSize,
        fileHash: transferInfo.fileHash,
        sourceDeviceId: transferInfo.sourceDeviceId,
        status: 'preparing',
        progress: 0,
        startTime: Date.now(),
        currentChunk: 0,
        totalChunks: Math.ceil(transferInfo.fileSize / this.chunkSize),
        receiveStream: fs.createWriteStream(savePath)
      };

      this.transfers.set(transferId, transfer);
      this.activeTransfers++;

      // 发送传输开始通知
      this.notifyTransferStart(transfer);

      // 开始接收
      await this.performFileReceive(transfer);

      return {
        success: true,
        transferId: transferId,
        filePath: savePath,
        fileSize: transferInfo.fileSize,
        fileHash: transferInfo.fileHash
      };

    } catch (error) {
      console.error('文件接收失败:', error);
      throw error;
    }
  }

  // 执行文件传输
  async performFileTransfer(transfer) {
    return new Promise(async (resolve, reject) => {
      try {
        transfer.status = 'transferring';
        
        // 创建文件读取流
        const readStream = fs.createReadStream(transfer.filePath, {
          chunkSize: this.chunkSize
        });

        let sentChunks = 0;
        let lastProgressUpdate = Date.now();

        readStream.on('data', async (chunk) => {
          try {
            // 检查是否达到最大并发限制
            if (this.activeTransfers >= this.maxConcurrentTransfers) {
              await this.waitForSlot();
            }

            // 发送数据块
            const success = await this.sendChunk(transfer.id, chunk, sentChunks);
            
            if (success) {
              sentChunks++;
              transfer.currentChunk = sentChunks;
              transfer.progress = (sentChunks / transfer.totalChunks) * 100;

              // 每秒更新一次进度
              const now = Date.now();
              if (now - lastProgressUpdate > 1000) {
                this.notifyTransferProgress(transfer);
                lastProgressUpdate = now;
              }
            }
          } catch (chunkError) {
            console.error('发送数据块失败:', chunkError);
            transfer.status = 'error';
            transfer.error = chunkError.message;
            reject(chunkError);
          }
        });

        readStream.on('end', () => {
          transfer.status = 'completed';
          transfer.progress = 100;
          this.notifyTransferProgress(transfer);
          this.finalizeTransfer(transfer);
          resolve();
        });

        readStream.on('error', (error) => {
          console.error('文件读取错误:', error);
          transfer.status = 'error';
          transfer.error = error.message;
          this.finalizeTransfer(transfer);
          reject(error);
        });

      } catch (error) {
        console.error('传输过程错误:', error);
        transfer.status = 'error';
        transfer.error = error.message;
        this.finalizeTransfer(transfer);
        reject(error);
      }
    });
  }

  // 执行文件接收
  async performFileReceive(transfer) {
    return new Promise((resolve, reject) => {
      transfer.status = 'transferring';
      
      let receivedChunks = 0;
      let lastProgressUpdate = Date.now();

      // 模拟接收数据块（实际需要实现网络接收）
      const receiveChunk = async (chunk, chunkIndex) => {
        try {
          transfer.receiveStream.write(chunk);
          receivedChunks++;
          transfer.currentChunk = receivedChunks;
          transfer.progress = (receivedChunks / transfer.totalChunks) * 100;

          // 发送接收确认
          await this.sendChunkAck(transfer.id, chunkIndex);

          // 每秒更新一次进度
          const now = Date.now();
          if (now - lastProgressUpdate > 1000) {
            this.notifyTransferProgress(transfer);
            lastProgressUpdate = now;
          }
        } catch (error) {
          console.error('接收数据块失败:', error);
          transfer.status = 'error';
          transfer.error = error.message;
          reject(error);
        }
      };

      // 模拟接收完成
      transfer.receiveStream.on('close', () => {
        transfer.status = 'completed';
        transfer.progress = 100;
        this.notifyTransferProgress(transfer);
        this.finalizeTransfer(transfer);
        resolve();
      });

      transfer.receiveStream.on('error', (error) => {
        console.error('文件写入错误:', error);
        transfer.status = 'error';
        transfer.error = error.message;
        this.finalizeTransfer(transfer);
        reject(error);
      });
    });
  }

  // 发送数据块（需要实现真实的网络发送）
  async sendChunk(transferId, chunk, chunkIndex) {
    try {
      // TODO: 实现真实的网络发送逻辑
      // 这里需要通过WebSocket或TCP连接到目标设备
      
      // 模拟发送延迟
      await this.delay(Math.random() * 100 + 10);
      
      // 模拟发送成功率（95%）
      if (Math.random() < 0.05) {
        throw new Error('网络传输错误');
      }

      console.log(`发送数据块 ${chunkIndex + 1}/${this.transfers.get(transferId).totalChunks}`);
      return true;
    } catch (error) {
      console.error('发送数据块失败:', error);
      return false;
    }
  }

  // 发送接收确认
  async sendChunkAck(transferId, chunkIndex) {
    try {
      // TODO: 实现真实的确认发送逻辑
      console.log(`发送确认: 传输 ${transferId}, 块 ${chunkIndex}`);
    } catch (error) {
      console.error('发送确认失败:', error);
    }
  }

  // 发送传输开始通知
  notifyTransferStart(transfer) {
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('file-transfer-start', {
        transferId: transfer.id,
        fileName: transfer.fileName,
        fileSize: transfer.fileSize,
        type: transfer.type
      });
    }
  }

  // 发送传输进度通知
  notifyTransferProgress(transfer) {
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('file-transfer-progress', {
        transferId: transfer.id,
        fileName: transfer.fileName,
        progress: Math.round(transfer.progress),
        currentChunk: transfer.currentChunk,
        totalChunks: transfer.totalChunks,
        status: transfer.status
      });
    }
  }

  // 完成传输
  finalizeTransfer(transfer) {
    this.activeTransfers--;
    
    // 添加到历史记录
    this.transferHistory.push({
      id: transfer.id,
      fileName: transfer.fileName,
      fileSize: transfer.fileSize,
      type: transfer.type,
      status: transfer.status,
      startTime: transfer.startTime,
      endTime: Date.now(),
      duration: Date.now() - transfer.startTime
    });

    // 保持历史记录在合理范围内
    if (this.transferHistory.length > 100) {
      this.transferHistory = this.transferHistory.slice(-100);
    }

    // 发送完成通知
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('file-transfer-complete', {
        transferId: transfer.id,
        fileName: transfer.fileName,
        status: transfer.status,
        error: transfer.error
      });
    }
  }

  // 暂停传输
  pauseTransfer(transferId) {
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.status === 'transferring') {
      transfer.status = 'paused';
      console.log(`传输 ${transferId} 已暂停`);
      return true;
    }
    return false;
  }

  // 恢复传输
  resumeTransfer(transferId) {
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.status === 'paused') {
      transfer.status = 'transferring';
      console.log(`传输 ${transferId} 已恢复`);
      return true;
    }
    return false;
  }

  // 取消传输
  cancelTransfer(transferId) {
    const transfer = this.transfers.get(transferId);
    if (transfer) {
      transfer.status = 'cancelled';
      
      // 清理资源
      if (transfer.receiveStream) {
        transfer.receiveStream.close();
      }
      
      this.finalizeTransfer(transfer);
      console.log(`传输 ${transferId} 已取消`);
      return true;
    }
    return false;
  }

  // 获取传输状态
  getTransfer(transferId) {
    return this.transfers.get(transferId);
  }

  // 获取所有传输
  getAllTransfers() {
    return Array.from(this.transfers.values());
  }

  // 获取活跃传输
  getActiveTransfers() {
    return Array.from(this.transfers.values()).filter(
      transfer => transfer.status === 'transferring' || transfer.status === 'paused'
    );
  }

  // 获取传输历史
  getTransferHistory() {
    return this.transferHistory.slice().reverse();
  }

  // 生成传输ID
  generateTransferId() {
    return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 计算文件哈希
  calculateFileHash(filePath) {
    try {
      const hash = crypto.createHash('sha256');
      const fileBuffer = fs.readFileSync(filePath);
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      console.error('计算文件哈希失败:', error);
      return null;
    }
  }

  // 等待可用传输槽位
  waitForSlot() {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeTransfers < this.maxConcurrentTransfers) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 启动清理任务
  startCleanupTask() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedTransfers();
    }, 60000); // 每分钟清理一次
  }

  // 清理已完成的传输
  cleanupCompletedTransfers() {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30分钟后清理

    for (const [transferId, transfer] of this.transfers.entries()) {
      if ((transfer.status === 'completed' || transfer.status === 'cancelled' || transfer.status === 'error') &&
          (now - transfer.startTime > timeout)) {
        this.transfers.delete(transferId);
        console.log(`清理传输记录: ${transferId}`);
      }
    }
  }

  // 停止清理任务
  stopCleanupTask() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // 获取传输统计信息
  getTransferStats() {
    const transfers = Array.from(this.transfers.values());
    const history = this.transferHistory;

    const stats = {
      active: {
        total: this.activeTransfers,
        sending: transfers.filter(t => t.type === 'send' && t.status === 'transferring').length,
        receiving: transfers.filter(t => t.type === 'receive' && t.status === 'transferring').length,
        paused: transfers.filter(t => t.status === 'paused').length
      },
      completed: history.filter(t => t.status === 'completed').length,
      failed: history.filter(t => t.status === 'error').length,
      totalSize: history.reduce((sum, t) => sum + t.fileSize, 0),
      averageSpeed: this.calculateAverageSpeed(),
      formats: this.getSupportedFormats()
    };

    return stats;
  }

  // 计算平均传输速度
  calculateAverageSpeed() {
    const completed = this.transferHistory.filter(t => t.status === 'completed');
    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((sum, t) => sum + t.duration, 0);
    const totalSize = completed.reduce((sum, t) => sum + t.fileSize, 0);

    return totalTime > 0 ? (totalSize / totalTime) * 1000 : 0; // bytes per second
  }

  // 获取支持的文件格式
  getSupportedFormats() {
    return {
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
      documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
      video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
      archives: ['zip', 'rar', '7z', 'tar', 'gz'],
      executables: ['exe', 'msi', 'apk', 'deb', 'pkg'],
      code: ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'go', 'rs']
    };
  }
}

module.exports = FileTransfer;