package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import kotlinx.coroutines.*
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.Socket

/**
 * 文件传输服务
 * 实现Android与Windows设备之间的文件传输功能
 */
class FileTransferService : Service() {
    
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isTransferring = false
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "文件传输服务已启动")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "收到服务启动命令: ${intent?.action}")
        
        when (intent?.action) {
            ACTION_START_TRANSFER -> {
                val filePath = intent.getStringExtra(EXTRA_FILE_PATH)
                val targetIp = intent.getStringExtra(EXTRA_TARGET_IP)
                val targetPort = intent.getIntExtra(EXTRA_TARGET_PORT, 8086)
                
                if (filePath != null && targetIp != null) {
                    startFileTransfer(filePath, targetIp, targetPort)
                }
            }
            ACTION_STOP_TRANSFER -> stopFileTransfer()
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
    private fun startFileTransfer(filePath: String, targetIp: String, targetPort: Int) {
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
        Log.d(TAG, "开始文件传输: $filePath -> $targetIp:$targetPort")
        
        serviceScope.launch {
            try {
                transferFile(file, targetIp, targetPort)
            } catch (e: Exception) {
                Log.e(TAG, "文件传输失败", e)
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
    private suspend fun transferFile(file: File, targetIp: String, targetPort: Int) {
        try {
            val socket = Socket(targetIp, targetPort)
            val outputStream = socket.getOutputStream()
            val fileInputStream = FileInputStream(file)
            
            // 发送文件信息头
            val fileName = file.name
            val fileSize = file.length()
            val header = "FILE_TRANSFER:$fileName:$fileSize"
            outputStream.write(header.toByteArray())
            outputStream.flush()
            
            // 分块传输文件内容
            val buffer = ByteArray(8192) // 8KB buffer
            var totalSent = 0L
            var bytesRead: Int
            
            while (fileInputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
                totalSent += bytesRead
                
                // 计算传输进度
                val progress = (totalSent * 100 / fileSize).toInt()
                Log.d(TAG, "传输进度: $progress% (${totalSent}/${fileSize} bytes)")
                
                // 发送进度更新
                sendProgressUpdate(progress, totalSent, fileSize)
                
                kotlinx.coroutines.delay(10) // 小延迟防止阻塞
            }
            
            outputStream.close()
            fileInputStream.close()
            socket.close()
            
            Log.d(TAG, "文件传输完成: ${file.name}")
            sendProgressUpdate(100, fileSize, fileSize)
            
        } catch (e: Exception) {
            Log.e(TAG, "文件传输异常", e)
            throw e
        }
    }
    
    /**
     * 发送传输进度更新
     */
    private fun sendProgressUpdate(progress: Int, sent: Long, total: Long) {
        // TODO: 发送进度更新到UI或其他组件
        Log.d(TAG, "文件传输进度: $progress%")
    }
    
    /**
     * 接收文件
     */
    private suspend fun receiveFile(fileName: String, fileSize: Long, sourceIp: String, sourcePort: Int) {
        try {
            val socket = Socket(sourceIp, sourcePort)
            val inputStream = socket.getInputStream()
            val file = File(getExternalFilesDir(null), fileName)
            val fileOutputStream = FileOutputStream(file)
            
            val buffer = ByteArray(8192)
            var totalReceived = 0L
            var bytesRead: Int
            
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                fileOutputStream.write(buffer, 0, bytesRead)
                totalReceived += bytesRead
                
                val progress = (totalReceived * 100 / fileSize).toInt()
                Log.d(TAG, "接收进度: $progress% (${totalReceived}/${fileSize} bytes)")
                
                kotlinx.coroutines.delay(10)
            }
            
            fileOutputStream.close()
            inputStream.close()
            socket.close()
            
            Log.d(TAG, "文件接收完成: ${file.name}")
            
        } catch (e: Exception) {
            Log.e(TAG, "文件接收失败", e)
            throw e
        }
    }
    
    companion object {
        private const val TAG = "FileTransferService"
        
        const val ACTION_START_TRANSFER = "start_transfer"
        const val ACTION_STOP_TRANSFER = "stop_transfer"
        
        const val EXTRA_FILE_PATH = "file_path"
        const val EXTRA_TARGET_IP = "target_ip"
        const val EXTRA_TARGET_PORT = "target_port"
    }
}