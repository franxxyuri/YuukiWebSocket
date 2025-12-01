/**
 * 文件传输管理器
 * 处理完整的文件传输流程
 */

class FileTransferManager {
  constructor() {
    this.activeTransfers = new Map(); // 存储活跃的传输任务
    this.CHUNK_SIZE = 1024 * 1024; // 1MB
  }

  /**
   * 处理文件传输请求
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 文件传输数据
   * @returns {Object} 响应数据
   */
  handleFileTransferRequest(clientId, data) {
    const { action, transferId, fileName, fileSize, chunkNumber, chunkSize, totalChunks, offset, data: fileData } = data;

    switch (action) {
      case 'request':
        return this.handleTransferRequest(clientId, transferId, fileName, fileSize);
      case 'chunk':
        return this.handleTransferChunk(clientId, transferId, chunkNumber, chunkSize, totalChunks, offset, fileData);
      case 'complete':
        return this.handleTransferComplete(clientId, transferId);
      case 'cancel':
        return this.handleTransferCancel(clientId, transferId);
      case 'progress':
        return this.handleTransferProgress(clientId, transferId, data.progress, data.totalSize, data.transferredSize);
      default:
        return { success: false, errorCode: 'UNKNOWN_ACTION', errorMessage: '未知的文件传输动作' };
    }
  }

  /**
   * 处理传输请求
   * @param {string} clientId - 客户端ID
   * @param {string} transferId - 传输ID
   * @param {string} fileName - 文件名
   * @param {number} fileSize - 文件大小
   * @returns {Object} 响应数据
   */
  handleTransferRequest(clientId, transferId, fileName, fileSize) {
    console.log(`收到文件传输请求: ${transferId}, 文件名: ${fileName}, 大小: ${fileSize}`);

    // 检查是否已经存在该传输任务
    if (this.activeTransfers.has(transferId)) {
      return { success: false, errorCode: 'TRANSFER_ALREADY_EXISTS', errorMessage: '传输任务已存在' };
    }

    // 创建传输任务
    const transferInfo = {
      transferId,
      clientId,
      fileName,
      fileSize,
      status: 'pending',
      progress: 0,
      totalChunks: Math.ceil(fileSize / this.CHUNK_SIZE),
      receivedChunks: 0,
      chunks: new Map(), // 存储已接收的分块
      startTime: Date.now()
    };

    this.activeTransfers.set(transferId, transferInfo);

    // 返回确认消息
    return {
      success: true,
      transferId,
      message: '文件传输请求已接受',
      timestamp: Date.now()
    };
  }

  /**
   * 处理传输分块
   * @param {string} clientId - 客户端ID
   * @param {string} transferId - 传输ID
   * @param {number} chunkNumber - 分块编号
   * @param {number} chunkSize - 分块大小
   * @param {number} totalChunks - 总分块数
   * @param {number} offset - 偏移量
   * @param {string} fileData - 文件数据（Base64编码）
   * @returns {Object} 响应数据
   */
  handleTransferChunk(clientId, transferId, chunkNumber, chunkSize, totalChunks, offset, fileData) {
    const transferInfo = this.activeTransfers.get(transferId);

    if (!transferInfo) {
      return { success: false, errorCode: 'TRANSFER_NOT_FOUND', errorMessage: '传输任务不存在' };
    }

    // 更新传输状态
    transferInfo.status = 'in_progress';
    transferInfo.totalChunks = totalChunks;

    // 存储分块数据
    transferInfo.chunks.set(chunkNumber, {
      chunkNumber,
      chunkSize,
      offset,
      data: Buffer.from(fileData, 'base64')
    });

    // 更新已接收分块数
    transferInfo.receivedChunks = transferInfo.chunks.size;

    // 计算进度
    transferInfo.progress = Math.round((transferInfo.receivedChunks / transferInfo.totalChunks) * 100);

    console.log(`收到分块 ${chunkNumber}/${totalChunks}, 进度: ${transferInfo.progress}%, 传输ID: ${transferId}`);

    // 返回确认消息
    return {
      success: true,
      transferId,
      chunkNumber,
      progress: transferInfo.progress,
      message: '分块已接收',
      timestamp: Date.now()
    };
  }

  /**
   * 处理传输完成
   * @param {string} clientId - 客户端ID
   * @param {string} transferId - 传输ID
   * @returns {Object} 响应数据
   */
  handleTransferComplete(clientId, transferId) {
    const transferInfo = this.activeTransfers.get(transferId);

    if (!transferInfo) {
      return { success: false, errorCode: 'TRANSFER_NOT_FOUND', errorMessage: '传输任务不存在' };
    }

    // 检查是否所有分块都已接收
    if (transferInfo.receivedChunks !== transferInfo.totalChunks) {
      return { 
        success: false, 
        errorCode: 'INCOMPLETE_TRANSFER', 
        errorMessage: '传输不完整，缺少分块',
        receivedChunks: transferInfo.receivedChunks,
        totalChunks: transferInfo.totalChunks
      };
    }

    // 更新传输状态
    transferInfo.status = 'completed';
    transferInfo.endTime = Date.now();
    transferInfo.duration = transferInfo.endTime - transferInfo.startTime;

    console.log(`文件传输完成: ${transferId}, 耗时: ${transferInfo.duration}ms`);

    // 这里可以添加文件重组逻辑
    // this.reassembleFile(transferInfo);

    // 返回确认消息
    return {
      success: true,
      transferId,
      fileName: transferInfo.fileName,
      fileSize: transferInfo.fileSize,
      duration: transferInfo.duration,
      message: '文件传输已完成',
      timestamp: Date.now()
    };
  }

  /**
   * 处理传输取消
   * @param {string} clientId - 客户端ID
   * @param {string} transferId - 传输ID
   * @returns {Object} 响应数据
   */
  handleTransferCancel(clientId, transferId) {
    const transferInfo = this.activeTransfers.get(transferId);

    if (!transferInfo) {
      return { success: false, errorCode: 'TRANSFER_NOT_FOUND', errorMessage: '传输任务不存在' };
    }

    // 更新传输状态
    transferInfo.status = 'cancelled';
    transferInfo.endTime = Date.now();
    transferInfo.duration = transferInfo.endTime - transferInfo.startTime;

    console.log(`文件传输已取消: ${transferId}`);

    // 清理资源
    this.activeTransfers.delete(transferId);

    // 返回确认消息
    return {
      success: true,
      transferId,
      message: '文件传输已取消',
      timestamp: Date.now()
    };
  }

  /**
   * 处理传输进度
   * @param {string} clientId - 客户端ID
   * @param {string} transferId - 传输ID
   * @param {number} progress - 进度百分比
   * @param {number} totalSize - 总大小
   * @param {number} transferredSize - 已传输大小
   * @returns {Object} 响应数据
   */
  handleTransferProgress(clientId, transferId, progress, totalSize, transferredSize) {
    const transferInfo = this.activeTransfers.get(transferId);

    if (!transferInfo) {
      return { success: false, errorCode: 'TRANSFER_NOT_FOUND', errorMessage: '传输任务不存在' };
    }

    // 更新传输进度
    transferInfo.progress = progress;
    transferInfo.totalSize = totalSize;
    transferInfo.transferredSize = transferredSize;

    console.log(`传输进度更新: ${transferId}, 进度: ${progress}%`);

    // 返回确认消息
    return {
      success: true,
      transferId,
      progress,
      message: '进度已更新',
      timestamp: Date.now()
    };
  }

  /**
   * 重组文件
   * @param {Object} transferInfo - 传输信息
   */
  reassembleFile(transferInfo) {
    // 这里可以添加文件重组逻辑
    // 1. 创建文件
    // 2. 按顺序写入所有分块
    // 3. 关闭文件
    // 4. 验证文件完整性
    console.log(`准备重组文件: ${transferInfo.fileName}`);
  }

  /**
   * 获取传输状态
   * @param {string} transferId - 传输ID
   * @returns {Object|null} 传输状态信息
   */
  getTransferStatus(transferId) {
    return this.activeTransfers.get(transferId) || null;
  }

  /**
   * 获取所有活跃传输
   * @returns {Array} 活跃传输列表
   */
  getActiveTransfers() {
    return Array.from(this.activeTransfers.values());
  }
}

// 创建单例实例
const fileTransferManager = new FileTransferManager();

export default fileTransferManager;
