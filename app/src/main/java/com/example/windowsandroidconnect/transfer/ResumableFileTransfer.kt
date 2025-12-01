package com.example.windowsandroidconnect.transfer

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.*
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap

/**
 * 可恢复文件传输管理器
 * 支持断点续传、传输队列管理、传输历史记录
 */
class ResumableFileTransfer(private val context: Context) {
    
    companion object {
        private const val TAG = "ResumableFileTransfer"
        private const val PREFS_NAME = "file_transfer_state"
        private const val CHUNK_SIZE = 1024 * 1024L // 1MB
        private const val MAX_CONCURRENT_TRANSFERS = 3
    }
    
    /**
     * 传输状态
     */
    enum class TransferStatus {
        PENDING,        // 等待中
        IN_PROGRESS,    // 传输中
        PAUSED,         // 已暂停
        COMPLETED,      // 已完成
        FAILED,         // 失败
        CANCELLED       // 已取消
    }
    
    /**
     * 传输方向
     */
    enum class TransferDirection {
        UPLOAD,     // 上传（发送到Windows）
        DOWNLOAD    // 下载（从Windows接收）
    }
    
    /**
     * 传输状态数据类
     */
    data class TransferState(
        val transferId: String,
        val filePath: String,
        val fileName: String,
        val targetDeviceId: String,
        val direction: TransferDirection,
        val totalSize: Long,
        val transferredSize: Long,
        val lastChunkNumber: Int,
        val checksum: String,
        val status: TransferStatus,
        val startTime: Long,
        val lastUpdateTime: Long,
        val errorMessage: String? = null
    )
    
    /**
     * 传输进度回调
     */
    interface TransferProgressListener {
        fun onProgress(transferId: String, progress: Int, transferredSize: Long, totalSize: Long)
        fun onStatusChanged(transferId: String, status: TransferStatus)
        fun onCompleted(transferId: String, success: Boolean, message: String?)
    }
    
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val activeTransfers = ConcurrentHashMap<String, TransferState>()
    private val transferQueue = mutableListOf<TransferState>()
    private val transferJobs = ConcurrentHashMap<String, Job>()
    private val progressListeners = mutableListOf<TransferProgressListener>()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private var sendMessageCallback: ((JSONObject) -> Unit)? = null
    private var isProcessingQueue = false
    
    /**
     * 设置消息发送回调
     */
    fun setMessageCallback(callback: (JSONObject) -> Unit) {
        sendMessageCallback = callback
    }
    
    /**
     * 添加进度监听器
     */
    fun addProgressListener(listener: TransferProgressListener) {
        progressListeners.add(listener)
    }
    
    /**
     * 移除进度监听器
     */
    fun removeProgressListener(listener: TransferProgressListener) {
        progressListeners.remove(listener)
    }
    
    /**
     * 开始文件传输
     */
    fun startTransfer(
        filePath: String,
        targetDeviceId: String,
        direction: TransferDirection = TransferDirection.UPLOAD
    ): String {
        val file = File(filePath)
        if (!file.exists() && direction == TransferDirection.UPLOAD) {
            throw FileNotFoundException("文件不存在: $filePath")
        }
        
        val transferId = generateTransferId()
        val checksum = if (direction == TransferDirection.UPLOAD) {
            calculateChecksum(file)
        } else ""
        
        val state = TransferState(
            transferId = transferId,
            filePath = filePath,
            fileName = file.name,
            targetDeviceId = targetDeviceId,
            direction = direction,
            totalSize = if (direction == TransferDirection.UPLOAD) file.length() else 0,
            transferredSize = 0,
            lastChunkNumber = -1,
            checksum = checksum,
            status = TransferStatus.PENDING,
            startTime = System.currentTimeMillis(),
            lastUpdateTime = System.currentTimeMillis()
        )
        
        activeTransfers[transferId] = state
        addToQueue(state)
        saveTransferState(state)
        
        Log.d(TAG, "传输已添加到队列: $transferId, 文件: ${file.name}")
        return transferId
    }
    
    /**
     * 恢复传输
     */
    fun resumeTransfer(transferId: String): Boolean {
        val state = loadTransferState(transferId) ?: return false
        
        if (state.status != TransferStatus.PAUSED && state.status != TransferStatus.FAILED) {
            Log.w(TAG, "传输状态不允许恢复: ${state.status}")
            return false
        }
        
        val updatedState = state.copy(
            status = TransferStatus.PENDING,
            lastUpdateTime = System.currentTimeMillis()
        )
        
        activeTransfers[transferId] = updatedState
        addToQueue(updatedState)
        saveTransferState(updatedState)
        
        Log.d(TAG, "传输已恢复: $transferId, 从块 ${state.lastChunkNumber + 1} 继续")
        return true
    }
    
    /**
     * 暂停传输
     */
    fun pauseTransfer(transferId: String): Boolean {
        val state = activeTransfers[transferId] ?: return false
        
        if (state.status != TransferStatus.IN_PROGRESS) {
            return false
        }
        
        // 取消传输任务
        transferJobs[transferId]?.cancel()
        transferJobs.remove(transferId)
        
        val updatedState = state.copy(
            status = TransferStatus.PAUSED,
            lastUpdateTime = System.currentTimeMillis()
        )
        
        activeTransfers[transferId] = updatedState
        saveTransferState(updatedState)
        notifyStatusChanged(transferId, TransferStatus.PAUSED)
        
        Log.d(TAG, "传输已暂停: $transferId")
        return true
    }
    
    /**
     * 取消传输
     */
    fun cancelTransfer(transferId: String): Boolean {
        val state = activeTransfers[transferId] ?: return false
        
        // 取消传输任务
        transferJobs[transferId]?.cancel()
        transferJobs.remove(transferId)
        
        // 从队列中移除
        synchronized(transferQueue) {
            transferQueue.removeAll { it.transferId == transferId }
        }
        
        val updatedState = state.copy(
            status = TransferStatus.CANCELLED,
            lastUpdateTime = System.currentTimeMillis()
        )
        
        activeTransfers[transferId] = updatedState
        saveTransferState(updatedState)
        notifyStatusChanged(transferId, TransferStatus.CANCELLED)
        
        // 发送取消消息
        sendCancelMessage(transferId)
        
        Log.d(TAG, "传输已取消: $transferId")
        return true
    }
    
    /**
     * 添加到传输队列
     */
    private fun addToQueue(state: TransferState) {
        synchronized(transferQueue) {
            transferQueue.add(state)
        }
        processQueue()
    }
    
    /**
     * 处理传输队列
     */
    private fun processQueue() {
        if (isProcessingQueue) return
        
        coroutineScope.launch {
            isProcessingQueue = true
            
            while (true) {
                val activeCount = activeTransfers.count { it.value.status == TransferStatus.IN_PROGRESS }
                if (activeCount >= MAX_CONCURRENT_TRANSFERS) {
                    delay(1000)
                    continue
                }
                
                val nextTransfer = synchronized(transferQueue) {
                    transferQueue.firstOrNull { it.status == TransferStatus.PENDING }
                } ?: break
                
                synchronized(transferQueue) {
                    transferQueue.remove(nextTransfer)
                }
                
                startTransferJob(nextTransfer)
            }
            
            isProcessingQueue = false
        }
    }
    
    /**
     * 启动传输任务
     */
    private fun startTransferJob(state: TransferState) {
        val job = coroutineScope.launch {
            try {
                val updatedState = state.copy(
                    status = TransferStatus.IN_PROGRESS,
                    lastUpdateTime = System.currentTimeMillis()
                )
                activeTransfers[state.transferId] = updatedState
                saveTransferState(updatedState)
                notifyStatusChanged(state.transferId, TransferStatus.IN_PROGRESS)
                
                if (state.direction == TransferDirection.UPLOAD) {
                    performUpload(updatedState)
                } else {
                    performDownload(updatedState)
                }
                
            } catch (e: CancellationException) {
                Log.d(TAG, "传输被取消: ${state.transferId}")
            } catch (e: Exception) {
                Log.e(TAG, "传输失败: ${state.transferId}", e)
                handleTransferError(state.transferId, e.message ?: "未知错误")
            }
        }
        
        transferJobs[state.transferId] = job
    }
    
    /**
     * 执行上传
     */
    private suspend fun performUpload(state: TransferState) {
        val file = File(state.filePath)
        if (!file.exists()) {
            handleTransferError(state.transferId, "文件不存在")
            return
        }
        
        val totalSize = file.length()
        var offset = state.transferredSize
        var chunkNumber = state.lastChunkNumber + 1
        var transferredSize = state.transferredSize
        
        // 发送传输请求
        sendTransferRequest(state, totalSize)
        delay(500) // 等待服务器响应
        
        FileInputStream(file).use { fis ->
            BufferedInputStream(fis).use { bis ->
                // 跳过已传输的部分
                if (offset > 0) {
                    bis.skip(offset)
                }
                
                while (offset < totalSize) {
                    // 检查是否被取消或暂停
                    val currentState = activeTransfers[state.transferId]
                    if (currentState?.status != TransferStatus.IN_PROGRESS) {
                        break
                    }
                    
                    val remaining = totalSize - offset
                    val chunkSize = minOf(CHUNK_SIZE, remaining).toInt()
                    val buffer = ByteArray(chunkSize)
                    val bytesRead = bis.read(buffer, 0, chunkSize)
                    
                    if (bytesRead > 0) {
                        // 发送数据块
                        sendChunk(state.transferId, chunkNumber, buffer, bytesRead, offset, totalSize)
                        
                        offset += bytesRead
                        transferredSize += bytesRead
                        chunkNumber++
                        
                        // 更新状态
                        val progress = ((transferredSize.toDouble() / totalSize) * 100).toInt()
                        updateTransferProgress(state.transferId, transferredSize, chunkNumber - 1)
                        notifyProgress(state.transferId, progress, transferredSize, totalSize)
                        
                        // 短暂延迟避免网络拥堵
                        delay(10)
                    } else {
                        break
                    }
                }
            }
        }
        
        // 检查是否完成
        val finalState = activeTransfers[state.transferId]
        if (finalState?.status == TransferStatus.IN_PROGRESS && transferredSize >= totalSize) {
            completeTransfer(state.transferId, true, "传输完成")
        }
    }
    
    /**
     * 执行下载
     */
    private suspend fun performDownload(state: TransferState) {
        // 发送下载请求
        sendDownloadRequest(state)
        
        // 下载逻辑由接收消息处理器完成
        // 这里只是发起请求
    }
    
    /**
     * 处理接收到的数据块
     */
    fun handleReceivedChunk(
        transferId: String,
        chunkNumber: Int,
        data: ByteArray,
        offset: Long,
        totalSize: Long
    ) {
        val state = activeTransfers[transferId] ?: return
        
        if (state.direction != TransferDirection.DOWNLOAD) {
            Log.w(TAG, "收到意外的数据块: $transferId")
            return
        }
        
        coroutineScope.launch {
            try {
                val file = File(state.filePath)
                RandomAccessFile(file, "rw").use { raf ->
                    raf.seek(offset)
                    raf.write(data)
                }
                
                val transferredSize = offset + data.size
                val progress = ((transferredSize.toDouble() / totalSize) * 100).toInt()
                
                updateTransferProgress(transferId, transferredSize, chunkNumber)
                notifyProgress(transferId, progress, transferredSize, totalSize)
                
                if (transferredSize >= totalSize) {
                    completeTransfer(transferId, true, "下载完成")
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "写入数据块失败: $transferId", e)
                handleTransferError(transferId, e.message ?: "写入失败")
            }
        }
    }
    
    /**
     * 发送传输请求
     */
    private fun sendTransferRequest(state: TransferState, totalSize: Long) {
        val message = JSONObject().apply {
            put("type", "file_transfer")
            put("action", "request")
            put("transferId", state.transferId)
            put("fileName", state.fileName)
            put("fileSize", totalSize)
            put("targetDeviceId", state.targetDeviceId)
            put("checksum", state.checksum)
            put("resumeFrom", state.lastChunkNumber + 1)
            put("timestamp", System.currentTimeMillis())
        }
        sendMessageCallback?.invoke(message)
    }
    
    /**
     * 发送下载请求
     */
    private fun sendDownloadRequest(state: TransferState) {
        val message = JSONObject().apply {
            put("type", "file_transfer")
            put("action", "download_request")
            put("transferId", state.transferId)
            put("filePath", state.filePath)
            put("targetDeviceId", state.targetDeviceId)
            put("resumeFrom", state.lastChunkNumber + 1)
            put("timestamp", System.currentTimeMillis())
        }
        sendMessageCallback?.invoke(message)
    }
    
    /**
     * 发送数据块
     */
    private fun sendChunk(
        transferId: String,
        chunkNumber: Int,
        data: ByteArray,
        size: Int,
        offset: Long,
        totalSize: Long
    ) {
        val message = JSONObject().apply {
            put("type", "file_transfer")
            put("action", "chunk")
            put("transferId", transferId)
            put("chunkNumber", chunkNumber)
            put("chunkSize", size)
            put("offset", offset)
            put("totalSize", totalSize)
            put("data", android.util.Base64.encodeToString(data, 0, size, android.util.Base64.NO_WRAP))
            put("timestamp", System.currentTimeMillis())
        }
        sendMessageCallback?.invoke(message)
    }
    
    /**
     * 发送取消消息
     */
    private fun sendCancelMessage(transferId: String) {
        val message = JSONObject().apply {
            put("type", "file_transfer")
            put("action", "cancel")
            put("transferId", transferId)
            put("timestamp", System.currentTimeMillis())
        }
        sendMessageCallback?.invoke(message)
    }
    
    /**
     * 更新传输进度
     */
    private fun updateTransferProgress(transferId: String, transferredSize: Long, lastChunkNumber: Int) {
        val state = activeTransfers[transferId] ?: return
        val updatedState = state.copy(
            transferredSize = transferredSize,
            lastChunkNumber = lastChunkNumber,
            lastUpdateTime = System.currentTimeMillis()
        )
        activeTransfers[transferId] = updatedState
        saveTransferState(updatedState)
    }
    
    /**
     * 完成传输
     */
    private fun completeTransfer(transferId: String, success: Boolean, message: String?) {
        val state = activeTransfers[transferId] ?: return
        val updatedState = state.copy(
            status = if (success) TransferStatus.COMPLETED else TransferStatus.FAILED,
            lastUpdateTime = System.currentTimeMillis(),
            errorMessage = if (!success) message else null
        )
        activeTransfers[transferId] = updatedState
        saveTransferState(updatedState)
        
        transferJobs.remove(transferId)
        
        notifyStatusChanged(transferId, updatedState.status)
        notifyCompleted(transferId, success, message)
        
        // 发送完成消息
        val completeMessage = JSONObject().apply {
            put("type", "file_transfer")
            put("action", "complete")
            put("transferId", transferId)
            put("success", success)
            put("message", message)
            put("timestamp", System.currentTimeMillis())
        }
        sendMessageCallback?.invoke(completeMessage)
        
        Log.d(TAG, "传输完成: $transferId, 成功: $success")
        
        // 继续处理队列
        processQueue()
    }
    
    /**
     * 处理传输错误
     */
    private fun handleTransferError(transferId: String, errorMessage: String) {
        val state = activeTransfers[transferId] ?: return
        val updatedState = state.copy(
            status = TransferStatus.FAILED,
            lastUpdateTime = System.currentTimeMillis(),
            errorMessage = errorMessage
        )
        activeTransfers[transferId] = updatedState
        saveTransferState(updatedState)
        
        transferJobs.remove(transferId)
        
        notifyStatusChanged(transferId, TransferStatus.FAILED)
        notifyCompleted(transferId, false, errorMessage)
        
        Log.e(TAG, "传输失败: $transferId, 错误: $errorMessage")
        
        // 继续处理队列
        processQueue()
    }
    
    /**
     * 保存传输状态
     */
    private fun saveTransferState(state: TransferState) {
        val json = JSONObject().apply {
            put("transferId", state.transferId)
            put("filePath", state.filePath)
            put("fileName", state.fileName)
            put("targetDeviceId", state.targetDeviceId)
            put("direction", state.direction.name)
            put("totalSize", state.totalSize)
            put("transferredSize", state.transferredSize)
            put("lastChunkNumber", state.lastChunkNumber)
            put("checksum", state.checksum)
            put("status", state.status.name)
            put("startTime", state.startTime)
            put("lastUpdateTime", state.lastUpdateTime)
            state.errorMessage?.let { put("errorMessage", it) }
        }
        prefs.edit().putString("transfer_${state.transferId}", json.toString()).apply()
    }
    
    /**
     * 加载传输状态
     */
    fun loadTransferState(transferId: String): TransferState? {
        val json = prefs.getString("transfer_$transferId", null) ?: return null
        return try {
            val obj = JSONObject(json)
            TransferState(
                transferId = obj.getString("transferId"),
                filePath = obj.getString("filePath"),
                fileName = obj.getString("fileName"),
                targetDeviceId = obj.getString("targetDeviceId"),
                direction = TransferDirection.valueOf(obj.getString("direction")),
                totalSize = obj.getLong("totalSize"),
                transferredSize = obj.getLong("transferredSize"),
                lastChunkNumber = obj.getInt("lastChunkNumber"),
                checksum = obj.getString("checksum"),
                status = TransferStatus.valueOf(obj.getString("status")),
                startTime = obj.getLong("startTime"),
                lastUpdateTime = obj.getLong("lastUpdateTime"),
                errorMessage = obj.optString("errorMessage").takeIf { it.isNotEmpty() }
            )
        } catch (e: Exception) {
            Log.e(TAG, "加载传输状态失败: $transferId", e)
            null
        }
    }
    
    /**
     * 获取所有未完成的传输
     */
    fun getPendingTransfers(): List<TransferState> {
        val pendingIds = prefs.all.keys
            .filter { it.startsWith("transfer_") }
            .map { it.removePrefix("transfer_") }
        
        return pendingIds.mapNotNull { loadTransferState(it) }
            .filter { it.status == TransferStatus.PAUSED || it.status == TransferStatus.FAILED }
    }
    
    /**
     * 获取传输历史
     */
    fun getTransferHistory(limit: Int = 50): List<TransferState> {
        val allIds = prefs.all.keys
            .filter { it.startsWith("transfer_") }
            .map { it.removePrefix("transfer_") }
        
        return allIds.mapNotNull { loadTransferState(it) }
            .sortedByDescending { it.lastUpdateTime }
            .take(limit)
    }
    
    /**
     * 清除已完成的传输记录
     */
    fun clearCompletedTransfers() {
        val completedIds = prefs.all.keys
            .filter { it.startsWith("transfer_") }
            .map { it.removePrefix("transfer_") }
            .filter { 
                val state = loadTransferState(it)
                state?.status == TransferStatus.COMPLETED || state?.status == TransferStatus.CANCELLED
            }
        
        val editor = prefs.edit()
        completedIds.forEach { editor.remove("transfer_$it") }
        editor.apply()
        
        Log.d(TAG, "已清除 ${completedIds.size} 条传输记录")
    }
    
    /**
     * 生成传输ID
     */
    private fun generateTransferId(): String {
        return "transfer_${System.currentTimeMillis()}_${java.util.UUID.randomUUID().toString().take(8)}"
    }
    
    /**
     * 计算文件校验和
     */
    private fun calculateChecksum(file: File): String {
        return try {
            val digest = MessageDigest.getInstance("MD5")
            FileInputStream(file).use { fis ->
                val buffer = ByteArray(8192)
                var bytesRead: Int
                while (fis.read(buffer).also { bytesRead = it } != -1) {
                    digest.update(buffer, 0, bytesRead)
                }
            }
            digest.digest().joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            Log.e(TAG, "计算校验和失败", e)
            ""
        }
    }
    
    /**
     * 通知进度
     */
    private fun notifyProgress(transferId: String, progress: Int, transferredSize: Long, totalSize: Long) {
        progressListeners.forEach { it.onProgress(transferId, progress, transferredSize, totalSize) }
    }
    
    /**
     * 通知状态变化
     */
    private fun notifyStatusChanged(transferId: String, status: TransferStatus) {
        progressListeners.forEach { it.onStatusChanged(transferId, status) }
    }
    
    /**
     * 通知完成
     */
    private fun notifyCompleted(transferId: String, success: Boolean, message: String?) {
        progressListeners.forEach { it.onCompleted(transferId, success, message) }
    }
    
    /**
     * 清理资源
     */
    fun cleanup() {
        transferJobs.values.forEach { it.cancel() }
        transferJobs.clear()
        activeTransfers.clear()
        transferQueue.clear()
        progressListeners.clear()
        coroutineScope.cancel()
        Log.d(TAG, "ResumableFileTransfer资源已清理")
    }
}
