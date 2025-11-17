package com.example.windowsandroidconnect.service



import android.app.Service

import android.content.BroadcastReceiver

import android.content.Context

import android.content.Intent

import android.content.IntentFilter

import android.os.Environment

import android.os.IBinder

import android.util.Log

import com.example.windowsandroidconnect.MyApplication

import com.example.windowsandroidconnect.network.NetworkCommunication

import kotlinx.coroutines.*

import org.json.JSONObject

import java.io.*

import java.util.*

import java.util.concurrent.ConcurrentHashMap



/**

 * 文件传输服务

 * 实现Android与Windows设备之间的文件传输功能

 */

class FileTransferService : Service() {

    

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private var isTransferring = false

    private var networkCommunication: NetworkCommunication? = null

    private val activeTransfers = ConcurrentHashMap<String, FileTransferInfo>()

    private val fileReceivers = ConcurrentHashMap<String, FileReceiver>()

    

    // 注册消息接收器

    private val messageReceiver = object : BroadcastReceiver() {

        override fun onReceive(context: Context, intent: Intent) {

            val messageType = intent.getStringExtra("message_type")

            val messageData = intent.getStringExtra("message_data")

            

            if (messageType != null && messageData != null) {

                serviceScope.launch {

                    handleMessage(messageType, messageData)

                }

            }

        }

    }

    

    override fun onCreate() {

        super.onCreate()

        // 注册消息接收器

        registerReceiver(messageReceiver, IntentFilter("com.example.windowsandroidconnect.FILE_TRANSFER_MESSAGE"))

        Log.d(TAG, "文件传输服务已启动")

    }

    

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {

        Log.d(TAG, "收到服务启动命令: ${intent?.action}")

        

        // 获取网络通信实例

        networkCommunication = (application as? MyApplication)?.networkCommunication

        

        when (intent?.action) {

            ACTION_START_TRANSFER -> {

                val filePath = intent.getStringExtra(EXTRA_FILE_PATH)

                val targetDeviceId = intent.getStringExtra(EXTRA_TARGET_DEVICE_ID)

                val transferId = intent.getStringExtra(EXTRA_TRANSFER_ID) ?: UUID.randomUUID().toString()

                

                if (filePath != null) {

                    startFileTransfer(transferId, filePath, targetDeviceId)

                }

            }

            ACTION_STOP_TRANSFER -> {

                val transferId = intent.getStringExtra(EXTRA_TRANSFER_ID)

                if (transferId != null) {

                    stopFileTransfer(transferId)

                }

            }

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

        // 停止所有传输

        activeTransfers.keys.forEach { transferId ->

            stopFileTransfer(transferId)

        }

        unregisterReceiver(messageReceiver)

        serviceScope.cancel()

        Log.d(TAG, "文件传输服务已停止")

    }

    

    /**

     * 处理接收到的消息

     */

    private suspend fun handleMessage(messageType: String, messageData: String) {

        try {

            val message = org.json.JSONObject(messageData)

            val action = message.optString("action")

            val transferId = message.optString("transferId")

            

            when (action) {

                "start" -> {

                    val fileName = message.optString("fileName")

                    val fileSize = message.optLong("fileSize")

                    val senderDeviceId = message.optString("senderDeviceId")

                    startFileReceiving(transferId, fileName, fileSize, senderDeviceId)

                }

                "chunk" -> {

                    val data = message.optString("data") // 注意：实际实现中需要处理二进制数据

                    val offset = message.optLong("offset")

                    receiveFileChunk(transferId, data, offset)

                }

                "complete" -> {

                    completeFileReceiving(transferId)

                }

                "error" -> {

                    val error = message.optString("error")

                    handleTransferError(transferId, error)

                }

            }

        } catch (e: Exception) {

            Log.e(TAG, "处理消息失败", e)

        }

    }

    

    /**

     * 开始文件传输

     */

    private fun startFileTransfer(transferId: String, filePath: String, targetDeviceId: String?) {

        if (activeTransfers.containsKey(transferId)) {

            Log.w(TAG, "文件传输已在进行中: $transferId")

            return

        }

        

        val file = File(filePath)

        if (!file.exists()) {

            Log.e(TAG, "文件不存在: $filePath")

            return

        }

        

        val transferInfo = FileTransferInfo(transferId, filePath, file.name, file.length(), targetDeviceId)

        activeTransfers[transferId] = transferInfo

        

        Log.d(TAG, "开始文件传输: $filePath, TransferId: $transferId")

        

        serviceScope.launch {

            try {

                transferFile(transferInfo)

            } catch (e: Exception) {

                Log.e(TAG, "文件传输失败", e)

                sendTransferError(transferInfo, e.message ?: "传输失败")

            } finally {

                activeTransfers.remove(transferId)

            }

        }

    }

    

    /**

     * 停止文件传输

     */

    private fun stopFileTransfer(transferId: String) {

        val transferInfo = activeTransfers[transferId]

        if (transferInfo == null) {

            Log.w(TAG, "未找到传输任务: $transferId")

            return

        }

        

        transferInfo.isCancelled = true

        activeTransfers.remove(transferId)

        Log.d(TAG, "文件传输已停止: $transferId")

    }

    

    /**

     * 执行文件传输

     */

    private suspend fun transferFile(transferInfo: FileTransferInfo) {

        try {

            if (networkCommunication == null || !networkCommunication!!.isConnected()) {

                Log.e(TAG, "网络未连接，无法传输文件")

                sendTransferError(transferInfo, "网络未连接")

                return

            }

            

            val file = File(transferInfo.filePath)

            val fileInputStream = FileInputStream(file)

            val fileSize = file.length()

            

            // 发送文件传输开始消息

            val startMessage = JSONObject().apply {

                put("type", "file_transfer")

                put("action", "start")

                put("transferId", transferInfo.transferId)

                put("fileName", transferInfo.fileName)

                put("fileSize", fileSize)

                put("senderDeviceId", getDeviceId()) // 获取当前设备ID

            }

            networkCommunication?.sendMessage(startMessage)

            

            // 分块传输文件内容

            val buffer = ByteArray(CHUNK_SIZE)

            var totalSent = 0L

            var bytesRead: Int

            

            while (fileInputStream.read(buffer).also { bytesRead = it } != -1 && !transferInfo.isCancelled) {

                // 发送文件块

                val chunkData = buffer.copyOf(bytesRead)

                val chunkMessage = JSONObject().apply {

                    put("type", "file_transfer")

                    put("action", "chunk")

                    put("transferId", transferInfo.transferId)

                    put("data", chunkData) // 实际实现中需要处理二进制数据

                    put("offset", totalSent)

                }

                networkCommunication?.sendMessage(chunkMessage)

                

                totalSent += bytesRead

                

                // 计算传输进度

                val progress = (totalSent * 100 / fileSize).toInt()

                Log.d(TAG, "传输进度: $progress% (${totalSent}/${fileSize} bytes), TransferId: ${transferInfo.transferId}")

                

                // 发送进度更新

                sendProgressUpdate(transferInfo, progress, totalSent, fileSize)

                

                delay(5) // 小延迟防止阻塞

            }

            

            fileInputStream.close()

            

            // 发送传输完成消息

            if (!transferInfo.isCancelled) {

                val completeMessage = JSONObject().apply {

                    put("type", "file_transfer")

                    put("action", "complete")

                    put("transferId", transferInfo.transferId)

                    put("fileName", transferInfo.fileName)

                }

                networkCommunication?.sendMessage(completeMessage)

                

                Log.d(TAG, "文件传输完成: ${transferInfo.fileName}, TransferId: ${transferInfo.transferId}")

                sendProgressUpdate(transferInfo, 100, fileSize, fileSize)

            }

            

        } catch (e: Exception) {

            Log.e(TAG, "文件传输异常", e)

            sendTransferError(transferInfo, e.message ?: "传输异常")

            throw e

        }

    }

    

    /**

     * 开始接收文件

     */

    private fun startFileReceiving(transferId: String, fileName: String, fileSize: Long, senderDeviceId: String) {

        try {

            // 创建接收目录

            val downloadDir = File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "WindowsAndroidConnect")

            if (!downloadDir.exists()) {

                downloadDir.mkdirs()

            }

            

            val file = File(downloadDir, fileName)

            val fileOutputStream = FileOutputStream(file)

            

            val fileReceiver = FileReceiver(transferId, fileName, fileSize, senderDeviceId, file, fileOutputStream)

            fileReceivers[transferId] = fileReceiver

            

            Log.d(TAG, "开始接收文件: $fileName, TransferId: $transferId")

        } catch (e: Exception) {

            Log.e(TAG, "创建文件接收器失败", e)

        }

    }

    

    /**

     * 接收文件块

     */

    private fun receiveFileChunk(transferId: String, data: String, offset: Long) {

        val fileReceiver = fileReceivers[transferId]

        if (fileReceiver == null) {

            Log.w(TAG, "未找到文件接收器: $transferId")

            return

        }

        

        try {

            // 注意：实际实现中需要处理二进制数据

            val chunkData = data.toByteArray()

            fileReceiver.fileOutputStream.write(chunkData)

            fileReceiver.receivedSize += chunkData.size

            

            // 计算接收进度

            val progress = (fileReceiver.receivedSize * 100 / fileReceiver.fileSize).toInt()

            Log.d(TAG, "接收进度: $progress% (${fileReceiver.receivedSize}/${fileReceiver.fileSize} bytes), TransferId: $transferId")

            

        } catch (e: Exception) {

            Log.e(TAG, "接收文件块失败", e)

            // 通知发送方接收失败

            sendTransferError(FileTransferInfo(transferId, "", fileReceiver.fileName, fileReceiver.fileSize, fileReceiver.senderDeviceId), "接收失败: ${e.message}")

        }

    }

    

    /**

     * 完成文件接收

     */

    private fun completeFileReceiving(transferId: String) {

        val fileReceiver = fileReceivers.remove(transferId)

        if (fileReceiver == null) {

            Log.w(TAG, "未找到文件接收器: $transferId")

            return

        }

        

        try {

            fileReceiver.fileOutputStream.close()

            Log.d(TAG, "文件接收完成: ${fileReceiver.fileName}, 保存到: ${fileReceiver.file.absolutePath}")

        } catch (e: Exception) {

            Log.e(TAG, "完成文件接收失败", e)

        }

    }

    

    /**

     * 处理传输错误

     */

    private fun handleTransferError(transferId: String, error: String) {

        Log.e(TAG, "传输错误: $error, TransferId: $transferId")

        fileReceivers.remove(transferId)

        // 可以在这里添加错误处理逻辑，如通知UI等

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

            // 在try块外声明变量，以便在catch块中使用

            val fileName = transferInfo["fileName"] as? String ?: "received_file"

            val fileSize = (transferInfo["fileSize"] as? Number)?.toLong() ?: 0L

            val senderDeviceId = transferInfo["senderDeviceId"] as? String ?: "unknown"

            val transferId = transferInfo["transferId"] as? String ?: UUID.randomUUID().toString()

            

            try {

                // 创建接收目录

                val downloadDir = File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "WindowsAndroidConnect")

                if (!downloadDir.exists()) {

                    downloadDir.mkdirs()

                }

                

                val file = File(downloadDir, fileName)

                val fileOutputStream = FileOutputStream(file)

                

                // 这里需要监听网络消息来接收文件块

                // 简化处理，实际实现中需要更复杂的逻辑

                

                fileOutputStream.close()

                Log.d(TAG, "文件接收完成: ${file.name}")

                

            } catch (e: Exception) {

                Log.e(TAG, "文件接收失败", e)

                // 发送传输错误

                val dummyTransferInfo = FileTransferInfo(transferId, "", fileName, fileSize, senderDeviceId)

                sendTransferError(dummyTransferInfo, e.message ?: "接收失败")

            }

        }

    }

    

    /**

     * 发送传输进度更新

     */

    private fun sendProgressUpdate(transferInfo: FileTransferInfo, progress: Int, sent: Long, total: Long) {

        try {

            if (networkCommunication != null && networkCommunication!!.isConnected()) {

                networkCommunication?.sendFileTransferProgress(transferInfo.transferId, progress, total, sent)

            }

        } catch (e: Exception) {

            Log.e(TAG, "发送进度更新失败", e)

        }

    }

    

    /**

     * 发送传输错误

     */

    private fun sendTransferError(transferInfo: FileTransferInfo, error: String) {

        try {

            if (networkCommunication != null && networkCommunication!!.isConnected()) {

                val message = JSONObject().apply {

                    put("type", "file_transfer")

                    put("action", "error")

                    put("transferId", transferInfo.transferId)

                    put("error", error)

                }

                networkCommunication?.sendMessage(message)

            }

        } catch (e: Exception) {

            Log.e(TAG, "发送错误信息失败", e)

        }

    }

    

    /**

     * 获取设备ID

     */

    private fun getDeviceId(): String {

        return android.provider.Settings.Secure.getString(contentResolver, android.provider.Settings.Secure.ANDROID_ID)

    }

    

    /**

     * 文件传输信息数据类

     */

    private data class FileTransferInfo(

        val transferId: String,

        val filePath: String,

        val fileName: String,

        val fileSize: Long,

        val targetDeviceId: String?,

        var isCancelled: Boolean = false

    )

    

    /**

     * 文件接收器数据类

     */

    private data class FileReceiver(

        val transferId: String,

        val fileName: String,

        val fileSize: Long,

        val senderDeviceId: String,

        val file: File,

        val fileOutputStream: FileOutputStream,

        var receivedSize: Long = 0L

    )

    

    companion object {

        private const val TAG = "FileTransferService"

        private const val CHUNK_SIZE = 8192 // 8KB chunks

        

        const val ACTION_START_TRANSFER = "start_transfer"

        const val ACTION_STOP_TRANSFER = "stop_transfer"

        const val ACTION_RECEIVE_FILE = "receive_file"

        

        const val EXTRA_FILE_PATH = "file_path"

        const val EXTRA_TARGET_DEVICE_ID = "target_device_id"

        const val EXTRA_TRANSFER_INFO = "transfer_info"

        const val EXTRA_TRANSFER_ID = "transfer_id"

    }

}