package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.ClipboardManager
import android.content.Context
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
    private var heartbeatJob: Job? = null
    private var lastHeartbeatResponse = System.currentTimeMillis()
    private val maxRetryAttempts = 10
    private val retryDelay = 5000L // 5秒重试间隔
    private val heartbeatInterval = 30000L // 30秒心跳间隔
    private val heartbeatTimeout = 60000L // 60秒心跳超时
    
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
                        lastHeartbeatResponse = System.currentTimeMillis()
                        Log.d(TAG, "WebSocket连接成功")
                        
                        // 注册消息处理器
                        setupMessageHandlers()
                        
                        // 启动心跳机制
                        startHeartbeat()
                        
                        // 发送连接状态广播
                        sendConnectionStatusBroadcast(true)
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
                
                // 发送连接失败广播
                sendConnectionStatusBroadcast(false)
                
                // 尝试重连
                retryConnection()
            }
        }
    }
    
    /**
     * 开始心跳机制
     */
    private fun startHeartbeat() {
        stopHeartbeat()
        
        heartbeatJob = serviceScope.launch {
            while (isConnected) {
                delay(heartbeatInterval)
                
                if (isConnected) {
                    // 检查上次心跳响应时间，判断是否超时
                    if (System.currentTimeMillis() - lastHeartbeatResponse > heartbeatTimeout) {
                        Log.e(TAG, "心跳超时，断开连接并尝试重连")
                        withContext(Dispatchers.Main) {
                            handleConnectionLost()
                        }
                        break
                    }
                    
                    // 发送心跳
                    sendHeartbeat()
                }
            }
        }
    }
    
    /**
     * 停止心跳
     */
    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }
    
    /**
     * 发送心跳
     */
    private fun sendHeartbeat() {
        try {
            val heartbeatMessage = org.json.JSONObject().apply {
                put("type", "heartbeat")
                put("timestamp", System.currentTimeMillis())
            }
            
            if (networkCommunication?.isConnected() == true) {
                networkCommunication?.sendMessage(heartbeatMessage)
                Log.d(TAG, "心跳已发送")
            } else {
                Log.e(TAG, "连接已断开，停止心跳")
                handleConnectionLost()
            }
        } catch (e: Exception) {
            Log.e(TAG, "发送心跳失败", e)
            handleConnectionLost()
        }
    }
    
    /**
     * 处理连接丢失
     */
    private fun handleConnectionLost() {
        isConnected = false
        isConnecting = false
        stopHeartbeat()
        
        // 发送连接断开广播
        sendConnectionStatusBroadcast(false)
        
        // 尝试重连
        retryConnection()
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
            isConnected = false
            isConnecting = false
            stopHeartbeat()
            networkCommunication?.disconnect()
            Log.d(TAG, "WebSocket连接已断开")
            
            // 发送连接断开广播
            sendConnectionStatusBroadcast(false)
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
            val clipboardData = message.optString("data", "")
            val source = message.optString("source", "unknown")
            
            if (source == "windows") {
                // 如果是来自Windows的剪贴板数据，设置到Android剪贴板
                setClipboardFromWindows(clipboardData)
            }
            
            sendBroadcast(Intent("com.example.windowsandroidconnect.CLIPBOARD_RECEIVED").apply {
                putExtra("message", message.toString())
                putExtra("clipboard_data", clipboardData)
                putExtra("source", source)
            })
        }
        
        // 处理通知同步
        networkCommunication?.registerMessageHandler("notification") { message ->
            val title = message.optString("title", "")
            val action = message.optString("action", "")
            val packageName = message.optString("packageName", "")
            
            val notificationIntent = Intent("com.example.windowsandroidconnect.NOTIFICATION_RECEIVED").apply {
                putExtra("message", message.toString())
                putExtra("title", title)
                putExtra("action", action)
                putExtra("packageName", packageName)
            }
            
            if (action.isNotEmpty()) {
                // 如果是通知操作，可能需要特殊处理
                Log.d(TAG, "处理通知操作: $action for $packageName")
            }
            
            sendBroadcast(notificationIntent)
        }
        
        // 处理心跳响应
        networkCommunication?.registerMessageHandler("heartbeat") { message ->
            lastHeartbeatResponse = System.currentTimeMillis()
            Log.d(TAG, "收到心跳响应")
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
            // 如果发送失败，可能连接已断开，检查连接状态
            handleConnectionLost()
        }
    }
    
    /**
     * 从Windows端设置剪贴板内容
     */
    private fun setClipboardFromWindows(data: String) {
        try {
            val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            if (clipboardManager != null) {
                val clip = android.content.ClipData.newPlainText("Shared from Windows", data)
                clipboardManager.setPrimaryClip(clip)
                Log.d(TAG, "已将Windows剪贴板内容设置到Android")
            } else {
                Log.w(TAG, "无法获取剪贴板服务")
            }
        } catch (e: Exception) {
            Log.e(TAG, "设置剪贴板内容失败", e)
        }
    }
    
    /**
     * 发送连接状态广播
     */
    private fun sendConnectionStatusBroadcast(connected: Boolean) {
        sendBroadcast(Intent("com.example.windowsandroidconnect.CONNECTION_STATUS_CHANGED").apply {
            putExtra("connected", connected)
        })
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "WebSocket连接服务已销毁")
        
        // 断开连接并清理资源
        isConnected = false
        isConnecting = false
        stopHeartbeat()
        disconnectFromServer()
        serviceScope.cancel()
        
        // 注销所有消息处理器
        networkCommunication?.unregisterMessageHandler("device_discovered")
        networkCommunication?.unregisterMessageHandler("screen_frame")
        networkCommunication?.unregisterMessageHandler("file_transfer")
        networkCommunication?.unregisterMessageHandler("control_command")
        networkCommunication?.unregisterMessageHandler("clipboard")
        networkCommunication?.unregisterMessageHandler("notification")
        networkCommunication?.unregisterMessageHandler("heartbeat")
        networkCommunication?.unregisterMessageHandler("connection_status")
    }
}