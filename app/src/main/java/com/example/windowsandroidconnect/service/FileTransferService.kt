package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.*

/**
 * 文件传输服务
 * 实现Android与Windows设备之间的文件传输功能
 */
class FileTransferService : Service() {
    
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isTransferring = false
    private var networkCommunication: NetworkCommunication? = null
    private val transferId = UUID.randomUUID().toString()
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "文件传输服务已启动")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "收到服务启动命令: ${intent?.action}")
        
        when (intent?.action) {
            ACTION_START_TRANSFER -> {
                val filePath = intent.getStringExtra(EXTRA_FILE_PATH)
                val targetDeviceId = intent.getStringExtra(EXTRA_TARGET_DEVICE_ID)
                
                if (filePath != null) {
                    startFileTransfer(filePath, targetDeviceId)
                }
            }
            ACTION_STOP_TRANSFER -> stopFileTransfer()
            ACTION_RECEIVE_FILE -> {
                val transferInfo = intent.getSerializableExtra(EXTRA_TRANSFER_INFO)
                receiveFile(transferInfo as? Map<*, *>)
            }
        }
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopFileTransfer()
        serviceScope.cancel()
        Log.d(TAG, "文件传输服务已停止")
    }
    
    /**
     * 开始文件传输
     */
    private fun startFileTransfer(filePath: String, targetDeviceId: String?) {
        if (isTransferring) {
            Log.w(TAG, "文件传输已在进行中")
            return
        }
        
        val file = File(filePath)
        if (!file.exists()) {
            Log.e(TAG, "文件不存在: $filePath")
            return
        }
        
        isTransferring = true
        Log.d(TAG, "开始文件传输: $filePath")
        
        serviceScope.launch {
            try {
                transferFile(file, targetDeviceId)
            } catch (e: Exception) {
                Log.e(TAG, "文件传输失败", e)
                sendTransferError(e.message ?: "传输失败")
            } finally {
                isTransferring = false
            }
        }
    }
    
    /**
     * 停止文件传输
     */
    private fun stopFileTransfer() {
        if (!isTransferring) return
        
        isTransferring = false
        Log.d(TAG, "文件传输已停止")
    }
    
    /**
     * 执行文件传输
     */
    private suspend fun transferFile(file: File, targetDeviceId: String?) {
        try {
            // 获取网络通信实例
            val networkComm = (application as? MyApplication)?.networkCommunication
            if (networkComm == null || !networkComm.isConnected()) {
                Log.e(TAG, "网络未连接，无法传输文件")
                sendTransferError("网络未连接")
                return
            }
            
            val fileInputStream = FileInputStream(file)
            val fileSize = file.length()
            
            // 发送文件传输开始消息
            val startMessage = JSONObject().apply {
                put("type", "file_transfer")
                put("action", "start")
                put("transferId", transferId)
                put("fileName", file.name)
                put("fileSize", fileSize)
                put("targetDeviceId", targetDeviceId)
            }
            networkComm.sendMessage(startMessage)
            
            // 分块传输文件内容
            val buffer = ByteArray(8192) // 8KB buffer
            var totalSent = 0L
            var bytesRead: Int
            
            while (fileInputStream.read(buffer).also { bytesRead = it } != -1 && isTransferring) {
                // 发送文件块
                val chunkMessage = JSONObject().apply {
                    put("type", "file_transfer")
                    put("action", "chunk")
                    put("transferId", transferId)
                    put("data", buffer.copyOf(bytesRead)) // 实际实现中需要处理二进制数据
                    put("offset", totalSent)
                }
                networkComm.sendMessage(chunkMessage)
                
                totalSent += bytesRead
                
                // 计算传输进度
                val progress = (totalSent * 100 / fileSize).toInt()
                Log.d(TAG, "传输进度: $progress% (${totalSent}/${fileSize} bytes)")
                
                // 发送进度更新
                sendProgressUpdate(progress, totalSent, fileSize)
                
                kotlinx.coroutines.delay(10) // 小延迟防止阻塞
            }
            
            fileInputStream.close()
            
            // 发送传输完成消息
            if (isTransferring) {
                val completeMessage = JSONObject().apply {
                    put("type", "file_transfer")
                    put("action", "complete")
                    put("transferId", transferId)
                    put("fileName", file.name)
                }
                networkComm.sendMessage(completeMessage)
                
                Log.d(TAG, "文件传输完成: ${file.name}")
                sendProgressUpdate(100, fileSize, fileSize)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "文件传输异常", e)
            sendTransferError(e.message ?: "传输异常")
            throw e
        }
    }
    
    /**

     * 接收文件

     */

    private fun receiveFile(transferInfo: Map<*, *>?) {

        if (transferInfo == null) {

            Log.e(TAG, "无效的传输信息")

            return

        }

        

        serviceScope.launch {

            try {

                val fileName = transferInfo["fileName"] as? String ?: "received_file"

                val fileSize = (transferInfo["fileSize"] as? Number)?.toLong() ?: 0L

                

                val file = File(getExternalFilesDir(null), fileName)

                val fileOutputStream = FileOutputStream(file)

                

                // 这里需要监听网络消息来接收文件块

                // 简化处理，实际实现中需要更复杂的逻辑

                

                fileOutputStream.close()

                Log.d(TAG, "文件接收完成: ${file.name}")

                

            } catch (e: Exception) {

                Log.e(TAG, "文件接收失败", e)

                sendTransferError(e.message ?: "接收失败")

            }

        }

    }
    
    /**
     * 发送传输进度更新
     */
    private fun sendProgressUpdate(progress: Int, sent: Long, total: Long) {
        try {
            // 获取网络通信实例
            val networkComm = (application as? MyApplication)?.networkCommunication
            if (networkComm != null && networkComm.isConnected()) {
                networkComm.sendFileTransferProgress(transferId, progress, total, sent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "发送进度更新失败", e)
        }
    }
    
    /**
     * 发送传输错误
     */
    private fun sendTransferError(error: String) {
        try {
            // 获取网络通信实例
            val networkComm = (application as? MyApplication)?.networkCommunication
            if (networkComm != null && networkComm.isConnected()) {
                val message = JSONObject().apply {
                    put("type", "file_transfer")
                    put("action", "error")
                    put("transferId", transferId)
                    put("error", error)
                }
                networkComm.sendMessage(message)
            }
        } catch (e: Exception) {
            Log.e(TAG, "发送错误信息失败", e)
        }
    }
    
    companion object {
        private const val TAG = "FileTransferService"
        
        const val ACTION_START_TRANSFER = "start_transfer"
        const val ACTION_STOP_TRANSFER = "stop_transfer"
        const val ACTION_RECEIVE_FILE = "receive_file"
        
        const val EXTRA_FILE_PATH = "file_path"
        const val EXTRA_TARGET_DEVICE_ID = "target_device_id"
        const val EXTRA_TRANSFER_INFO = "transfer_info"
    }
}