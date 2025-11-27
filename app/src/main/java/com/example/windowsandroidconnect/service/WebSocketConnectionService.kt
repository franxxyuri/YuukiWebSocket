package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*

/**
 * WebSocket连接服务
 * 用于在后台维护与Windows服务器的WebSocket连接
 */
class WebSocketConnectionService : Service() {
    
    private var networkCommunication: NetworkCommunication? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isConnecting = false
    private var isConnected = false
    private var connectionRetryCount = 0
    private val maxRetryAttempts = 5
    private val retryDelay = 5000L // 5秒重试间隔
    
    companion object {
        private const val TAG = "WebSocketConnectionService"
        const val ACTION_CONNECT = "connect"
        const val ACTION_DISCONNECT = "disconnect"
        const val ACTION_SEND_MESSAGE = "send_message"
        const val EXTRA_MESSAGE = "message"
        const val EXTRA_IP = "ip"
        const val EXTRA_PORT = "port"
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "WebSocket连接服务已创建")
        
        // 获取网络通信实例
        networkCommunication = (application as? MyApplication)?.networkCommunication
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "收到服务启动命令: ${intent?.action}")
        
        when (intent?.action) {
            ACTION_CONNECT -> {
                val ip = intent.getStringExtra(EXTRA_IP)
                val port = intent.getIntExtra(EXTRA_PORT, -1)
                
                if (ip != null && port != -1) {
                    connectToServer(ip, port)
                } else {
                    // 使用配置中的默认值
                    val config = ClientConfig.getInstance(this)
                    connectToServer(config.serverIp, config.serverPort)
                }
            }
            ACTION_DISCONNECT -> {
                disconnectFromServer()
            }
            ACTION_SEND_MESSAGE -> {
                val message = intent.getStringExtra(EXTRA_MESSAGE)
                message?.let { sendMessage(it) }
            }
        }
        
        return START_STICKY // 服务被杀死后会重启
    }
    
    /**
     * 连接到服务器
     */
    private fun connectToServer(ip: String, port: Int) {
        if (isConnecting || isConnected) {
            Log.d(TAG, "已经连接或正在连接，跳过重复连接")
            return
        }
        
        isConnecting = true
        
        serviceScope.launch {
            try {
                Log.d(TAG, "正在连接到服务器: $ip:$port")
                
                val success = networkCommunication?.connect(ip, port) ?: false
                
                withContext(Dispatchers.Main) {
                    if (success) {
                        isConnecting = false
                        isConnected = true
                        connectionRetryCount = 0
                        Log.d(TAG, "WebSocket连接成功")
                        
                        // 注册消息处理器
                        setupMessageHandlers()
                    } else {
                        isConnecting = false
                        Log.e(TAG, "WebSocket连接失败")
                        
                        // 尝试重连
                        retryConnection()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "连接过程中发生异常", e)
                isConnecting = false
                
                // 尝试重连
                retryConnection()
            }
        }
    }
    
    /**
     * 重连机制
     */
    private fun retryConnection() {
        if (connectionRetryCount < maxRetryAttempts) {
            connectionRetryCount++
            Log.d(TAG, "准备重连，第 $connectionRetryCount 次尝试")
            
            serviceScope.launch {
                delay(retryDelay)
                val config = ClientConfig.getInstance(this@WebSocketConnectionService)
                connectToServer(config.serverIp, config.serverPort)
            }
        } else {
            Log.e(TAG, "达到最大重试次数，停止重连")
            connectionRetryCount = 0
        }
    }
    
    /**
     * 断开连接
     */
    private fun disconnectFromServer() {
        try {
            networkCommunication?.disconnect()
            isConnected = false
            isConnecting = false
            Log.d(TAG, "WebSocket连接已断开")
        } catch (e: Exception) {
            Log.e(TAG, "断开连接时发生异常", e)
        }
    }
    
    /**
     * 设置消息处理器
     */
    private fun setupMessageHandlers() {
        // 处理设备发现消息
        networkCommunication?.registerMessageHandler("device_discovered") { message ->
            // 可以发送广播给其他组件
            sendBroadcast(Intent("com.example.windowsandroidconnect.DEVICE_DISCOVERED").apply {
                putExtra("message", message.toString())
            })
        }
        
        // 处理屏幕帧消息
        networkCommunication?.registerMessageHandler("screen_frame") { message ->
            // 可以启动屏幕捕获服务处理屏幕帧
            sendBroadcast(Intent("com.example.windowsandroidconnect.SCREEN_FRAME_RECEIVED").apply {
                putExtra("message", message.toString())
            })
        }
        
        // 处理文件传输消息
        networkCommunication?.registerMessageHandler("file_transfer") { message ->
            sendBroadcast(Intent("com.example.windowsandroidconnect.FILE_TRANSFER_RECEIVED").apply {
                putExtra("message", message.toString())
            })
        }
        
        // 处理控制命令
        networkCommunication?.registerMessageHandler("control_command") { message ->
            sendBroadcast(Intent("com.example.windowsandroidconnect.CONTROL_COMMAND_RECEIVED").apply {
                putExtra("message", message.toString())
            })
        }
        
        // 处理剪贴板同步
        networkCommunication?.registerMessageHandler("clipboard") { message ->
            sendBroadcast(Intent("com.example.windowsandroidconnect.CLIPBOARD_RECEIVED").apply {
                putExtra("message", message.toString())
            })
        }
        
        // 处理通知同步
        networkCommunication?.registerMessageHandler("notification") { message ->
            sendBroadcast(Intent("com.example.windowsandroidconnect.NOTIFICATION_RECEIVED").apply {
                putExtra("message", message.toString())
            })
        }
        
        // 处理连接状态变化
        networkCommunication?.registerMessageHandler("connection_status") { message ->
            val connected = message.optBoolean("connected", false)
            isConnected = connected
            sendBroadcast(Intent("com.example.windowsandroidconnect.CONNECTION_STATUS_CHANGED").apply {
                putExtra("connected", connected)
            })
        }
    }
    
    /**
     * 发送消息
     */
    private fun sendMessage(message: String) {
        if (!isConnected) {
            Log.w(TAG, "未连接到服务器，无法发送消息")
            return
        }
        
        try {
            val jsonMessage = org.json.JSONObject(message)
            networkCommunication?.sendMessage(jsonMessage)
            Log.d(TAG, "消息已发送")
        } catch (e: Exception) {
            Log.e(TAG, "发送消息失败", e)
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "WebSocket连接服务已销毁")
        
        // 断开连接并清理资源
        disconnectFromServer()
        serviceScope.cancel()
        networkCommunication?.unregisterMessageHandler("device_discovered")
        networkCommunication?.unregisterMessageHandler("screen_frame")
        networkCommunication?.unregisterMessageHandler("file_transfer")
        networkCommunication?.unregisterMessageHandler("control_command")
        networkCommunication?.unregisterMessageHandler("clipboard")
        networkCommunication?.unregisterMessageHandler("notification")
        networkCommunication?.unregisterMessageHandler("connection_status")
    }
}