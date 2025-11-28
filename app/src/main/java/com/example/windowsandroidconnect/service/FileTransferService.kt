package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import android.widget.Toast
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import java.io.*
import java.util.*
import kotlin.math.min

/**
 * 文件传输服务
 * 
 * 处理Android设备与Windows设备之间的文件传输
 */
class FileTransferService : Service() {

    companion object {
        private const val TAG = "FileTransferService"
        const val ACTION_START_TRANSFER = "com.example.windowsandroidconnect.START_FILE_TRANSFER"
        const val ACTION_CANCEL_TRANSFER = "com.example.windowsandroidconnect.CANCEL_FILE_TRANSFER"
        const val EXTRA_FILE_PATH = "file_path"
        const val EXTRA_TARGET_DEVICE_ID = "target_device_id"
        const val EXTRA_TRANSFER_ID = "transfer_id"
        
        // 文件传输状态
        const val STATUS_PENDING = "pending"
        const val STATUS_IN_PROGRESS = "in_progress"
        const val STATUS_COMPLETED = "completed"
        const val STATUS_CANCELLED = "cancelled"
        const val STATUS_ERROR = "error"
        
        // 分块大小 (1MB)
        const val CHUNK_SIZE = 1024 * 1024L
    }

    private var networkCommunication: NetworkCommunication? = null
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val activeTransfers = mutableMapOf<String, TransferInfo>()
    private val transferJobs = mutableMapOf<String, Job>()

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_TRANSFER -> {
                val filePath = intent.getStringExtra(EXTRA_FILE_PATH)
                val targetDeviceId = intent.getStringExtra(EXTRA_TARGET_DEVICE_ID)
                val transferId = intent.getStringExtra(EXTRA_TRANSFER_ID) ?: generateTransferId()
                
                if (filePath != null && targetDeviceId != null) {
                    startFileTransfer(transferId, filePath, targetDeviceId)
                } else {
                    Log.e(TAG, "文件路径或目标设备ID缺失")
                }
            }
            ACTION_CANCEL_TRANSFER -> {
                val transferId = intent.getStringExtra(EXTRA_TRANSFER_ID)
                if (transferId != null) {
                    cancelFileTransfer(transferId)
                }
            }
        }

        return START_STICKY // 服务被杀死后尝试重启
    }

    /**
     * 开始文件传输
     */
    private fun startFileTransfer(transferId: String, filePath: String, targetDeviceId: String) {
        Log.d(TAG, "开始文件传输: $transferId, 文件: $filePath, 目标: $targetDeviceId")
        
        val transferInfo = TransferInfo(
            id = transferId,
            filePath = filePath,
            targetDeviceId = targetDeviceId,
            status = STATUS_PENDING,
            progress = 0,
            totalSize = 0,
            transferredSize = 0
        )
        
        activeTransfers[transferId] = transferInfo
        
        // 启动传输协程
        val job = coroutineScope.launch {
            performFileTransfer(transferInfo)
        }
        
        transferJobs[transferId] = job
        
        // 初始化网络通信
        if (networkCommunication == null) {
            networkCommunication = (application as? MyApplication)?.networkCommunication
        }
        
        // 注册文件传输响应处理器
        networkCommunication?.registerMessageHandler("file_transfer_response") { message ->
            handleFileTransferResponse(message)
        }
    }

    /**
     * 执行文件传输
     */
    private suspend fun performFileTransfer(transferInfo: TransferInfo) {
        var updatedTransferInfo = transferInfo.copy(status = STATUS_IN_PROGRESS)
        activeTransfers[transferInfo.id] = updatedTransferInfo
        
        try {
            val file = File(transferInfo.filePath)
            if (!file.exists()) {
                throw FileNotFoundException("文件不存在: ${transferInfo.filePath}")
            }
            
            val totalSize = file.length()
            updatedTransferInfo = updatedTransferInfo.copy(totalSize = totalSize)
            activeTransfers[transferInfo.id] = updatedTransferInfo
            
            Log.d(TAG, "准备传输文件: ${file.name}, 大小: $totalSize bytes")
            
            // 发送文件传输请求
            val requestMessage = org.json.JSONObject().apply {
                put("type", "file_transfer")
                put("action", "request")
                put("transferId", transferInfo.id)
                put("fileName", file.name)
                put("fileSize", totalSize)
                put("targetDeviceId", transferInfo.targetDeviceId)
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(requestMessage)
            
            // 等待确认
            delay(1000) // 给服务器时间处理请求
            
            // 分块传输文件
            var offset = 0L
            var chunkNumber = 0
            var transferredSize = 0L
            
            // 使用BufferedInputStream提高读取效率
            FileInputStream(file).use { fileInputStream ->
                BufferedInputStream(fileInputStream).use { bufferedInputStream ->
                    while (offset < totalSize) {
                        // 检查传输是否被取消
                        if (updatedTransferInfo.status == STATUS_CANCELLED) {
                            Log.d(TAG, "传输被取消: ${transferInfo.id}")
                            break
                        }
                        
                        // 计算当前块大小
                        val remaining = totalSize - offset
                        val chunkSize = min(CHUNK_SIZE, remaining)
                        
                        // 读取文件块
                        val buffer = ByteArray(chunkSize.toInt())
                        val bytesRead = bufferedInputStream.read(buffer, 0, buffer.size)
                        
                        if (bytesRead > 0) {
                            // 创建文件块消息
                            val chunkMessage = org.json.JSONObject().apply {
                                put("type", "file_transfer")
                                put("action", "chunk")
                                put("transferId", transferInfo.id)
                                put("chunkNumber", chunkNumber)
                                put("chunkSize", bytesRead)
                                put("totalChunks", Math.ceil(totalSize.toDouble() / CHUNK_SIZE).toInt())
                                put("offset", offset)
                                put("data", android.util.Base64.encodeToString(buffer, 0, bytesRead, android.util.Base64.NO_WRAP))
                                put("timestamp", System.currentTimeMillis())
                            }
                            
                            // 发送文件块
                            if (networkCommunication?.isConnected() == true) {
                                networkCommunication?.sendMessage(chunkMessage)
                                
                                // 更新传输进度
                                transferredSize += bytesRead
                                val progress = ((transferredSize.toDouble() / totalSize) * 100).toInt()
                                
                                updatedTransferInfo = updatedTransferInfo.copy(
                                    progress = progress,
                                    transferredSize = transferredSize
                                )
                                activeTransfers[transferInfo.id] = updatedTransferInfo
                                
                                // 发送进度更新
                                sendProgressUpdate(transferInfo.id, progress, totalSize, transferredSize)
                                
                                Log.d(TAG, "发送文件块 ${chunkNumber + 1}/${Math.ceil(totalSize.toDouble() / CHUNK_SIZE).toInt()}, " +
                                        "进度: $progress%")
                            } else {
                                Log.e(TAG, "网络未连接，传输中断")
                                updatedTransferInfo = updatedTransferInfo.copy(status = STATUS_ERROR)
                                activeTransfers[transferInfo.id] = updatedTransferInfo
                                break
                            }
                            
                            offset += bytesRead
                            chunkNumber++
                            
                            // 短暂延迟以避免网络拥堵
                            delay(10)
                        } else {
                            // 读取失败，跳出循环
                            break
                        }
                    }
                }
            }
            
            // 检查传输是否完成
            if (updatedTransferInfo.status != STATUS_CANCELLED && transferredSize == totalSize) {
                // 发送传输完成消息
                val completeMessage = org.json.JSONObject().apply {
                    put("type", "file_transfer")
                    put("action", "complete")
                    put("transferId", transferInfo.id)
                    put("timestamp", System.currentTimeMillis())
                }
                
                networkCommunication?.sendMessage(completeMessage)
                
                updatedTransferInfo = updatedTransferInfo.copy(status = STATUS_COMPLETED)
                activeTransfers[transferInfo.id] = updatedTransferInfo
                
                Log.d(TAG, "文件传输完成: ${transferInfo.id}")
                
                // 发送完成通知
                sendTransferComplete(transferInfo.id, true, "传输完成")
            } else if (updatedTransferInfo.status != STATUS_CANCELLED) {
                updatedTransferInfo = updatedTransferInfo.copy(status = STATUS_ERROR)
                activeTransfers[transferInfo.id] = updatedTransferInfo
                
                Log.e(TAG, "文件传输失败: ${transferInfo.id}")
                
                // 发送错误通知
                sendTransferComplete(transferInfo.id, false, "传输失败")
            }
        } catch (e: Exception) {
            Log.e(TAG, "文件传输错误: ${transferInfo.id}", e)
            
            updatedTransferInfo = updatedTransferInfo.copy(status = STATUS_ERROR)
            activeTransfers[transferInfo.id] = updatedTransferInfo
            
            // 发送错误通知
            sendTransferComplete(transferInfo.id, false, e.message ?: "未知错误")
        } finally {
            // 清理资源
            transferJobs.remove(transferInfo.id)
            activeTransfers.remove(transferInfo.id)
        }
    }

    /**
     * 处理文件传输响应
     */
    private fun handleFileTransferResponse(message: org.json.JSONObject) {
        val transferId = message.optString("transferId")
        val responseType = message.optString("responseType")
        
        Log.d(TAG, "收到文件传输响应: $responseType, ID: $transferId")
        
        when (responseType) {
            "ack" -> {
                // 确认接收，可以继续传输
                Log.d(TAG, "收到传输确认: $transferId")
            }
            "error" -> {
                val error = message.optString("error")
                Log.e(TAG, "传输错误响应: $transferId, 错误: $error")
                
                val transferInfo = activeTransfers[transferId]
                if (transferInfo != null) {
                    val updatedInfo = transferInfo.copy(status = STATUS_ERROR)
                    activeTransfers[transferId] = updatedInfo
                }
            }
        }
    }

    /**
     * 发送进度更新
     */
    private fun sendProgressUpdate(transferId: String, progress: Int, totalSize: Long, transferredSize: Long) {
        val progressMessage = org.json.JSONObject().apply {
            put("type", "file_transfer")
            put("action", "progress")
            put("transferId", transferId)
            put("progress", progress)
            put("totalSize", totalSize)
            put("transferredSize", transferredSize)
            put("timestamp", System.currentTimeMillis())
        }
        
        networkCommunication?.sendMessage(progressMessage)
    }

    /**
     * 发送传输完成消息
     */
    private fun sendTransferComplete(transferId: String, success: Boolean, message: String) {
        val completeMessage = org.json.JSONObject().apply {
            put("type", "file_transfer")
            put("action", "result")
            put("transferId", transferId)
            put("success", success)
            put("message", message)
            put("timestamp", System.currentTimeMillis())
        }
        
        networkCommunication?.sendMessage(completeMessage)
    }

    /**
     * 取消文件传输
     */
    private fun cancelFileTransfer(transferId: String) {
        Log.d(TAG, "取消文件传输: $transferId")
        
        val transferInfo = activeTransfers[transferId]
        if (transferInfo != null) {
            val updatedInfo = transferInfo.copy(status = STATUS_CANCELLED)
            activeTransfers[transferId] = updatedInfo
            
            // 取消传输协程
            transferJobs[transferId]?.cancel()
            transferJobs.remove(transferId)
            
            // 发送取消消息
            val cancelMessage = org.json.JSONObject().apply {
                put("type", "file_transfer")
                put("action", "cancel")
                put("transferId", transferId)
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(cancelMessage)
            
            Log.d(TAG, "文件传输已取消: $transferId")
        }
    }

    /**
     * 生成传输ID
     */
    private fun generateTransferId(): String {
        return "transfer_${System.currentTimeMillis()}_${UUID.randomUUID().toString().substring(0, 8)}"
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "文件传输服务已销毁")
        
        // 取消所有正在进行的传输
        for (job in transferJobs.values) {
            job.cancel()
        }
        
        transferJobs.clear()
        activeTransfers.clear()
        
        // 注销消息处理器
        networkCommunication?.unregisterMessageHandler("file_transfer_response")
        
        // 取消协程作用域
        coroutineScope.cancel()
    }
    
    /**
     * 获取传输状态
     */
    fun getTransferStatus(transferId: String): TransferInfo? {
        return activeTransfers[transferId]
    }
    
    /**
     * 获取所有活动传输
     */
    fun getActiveTransfers(): Map<String, TransferInfo> {
        return activeTransfers.toMap()
    }
}

/**
 * 传输信息数据类
 */
data class TransferInfo(
    val id: String,
    val filePath: String,
    val targetDeviceId: String,
    var status: String,
    var progress: Int,
    var totalSize: Long,
    var transferredSize: Long,
    val startTime: Long = System.currentTimeMillis()
)