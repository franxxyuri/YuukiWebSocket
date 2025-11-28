package com.example.windowsandroidconnect.network

import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.config.ClientConfig
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okio.ByteString
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * 网络通信模块
 * 处理Android与Windows端之间的WebSocket通信
 */
class NetworkCommunication {
    
    private var webSocket: WebSocket? = null
    private var isConnected = false
    private val messageHandlers = ConcurrentHashMap<String, (JSONObject) -> Unit>()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    companion object {
        private const val TAG = "NetworkCommunication"
        
        // 消息类型常量
        const val MESSAGE_TYPE_DEVICE_INFO = "device_info"
        const val MESSAGE_TYPE_DEVICE_DISCOVERED = "device_discovered"
        const val MESSAGE_TYPE_SCREEN_FRAME = "screen_frame"
        const val MESSAGE_TYPE_FILE_TRANSFER = "file_transfer"
        const val MESSAGE_TYPE_CONTROL_COMMAND = "control_command"
        const val MESSAGE_TYPE_CLIPBOARD = "clipboard"
        const val MESSAGE_TYPE_NOTIFICATION = "notification"
        const val MESSAGE_TYPE_HEARTBEAT = "heartbeat"
        const val MESSAGE_TYPE_CONNECTION_STATUS = "connection_status"
        const val MESSAGE_TYPE_AUTHENTICATION_SUCCESS = "authentication_success"
        const val MESSAGE_TYPE_ERROR = "error"
    }
    
    /**

     * 连接到Windows端

     */

    suspend fun connect(ip: String, port: Int): Boolean {

        return withContext(Dispatchers.IO) {

            try {

                val serverUrl = "ws://$ip:$port"

                Log.d(TAG, "正在连接到: $serverUrl")

                

                val request = Request.Builder()

                    .url(serverUrl)

                    .build()

                

                // 创建一个CompletableDeferred来等待连接结果

                val connectionResult = kotlinx.coroutines.CompletableDeferred<Boolean>()

                

                val listener = object : WebSocketListener() {

                    override fun onOpen(webSocket: WebSocket, response: Response) {

                        Log.d(TAG, "WebSocket连接已建立，响应码: ${response?.code}")

                        this@NetworkCommunication.webSocket = webSocket

                        isConnected = true

                        

                        // 发送设备信息

                        Log.d(TAG, "准备发送设备信息")

                        sendDeviceInfo()

                        

                        // 连接成功

                        connectionResult.complete(true)

                    }

                    

                    override fun onMessage(webSocket: WebSocket, text: String) {

                        try {

                            Log.d(TAG, "收到文本消息，长度: ${text.length}")

                            val message = JSONObject(text.trim())

                            val messageType = message.optString("type")

                            Log.d(TAG, "收到消息: $messageType")

                            

                            if (messageType == "screen_frame_header") {

                                // 如果是屏幕帧头消息，实际的帧数据会作为二进制消息发送

                                // 这里处理普通JSON消息

                                handleMessage(message)

                            } else {

                                // 处理普通JSON消息

                                handleMessage(message)

                            }

                        } catch (e: Exception) {

                            Log.e(TAG, "解析消息失败: $text", e)

                        }

                    }

                    

                    override fun onMessage(webSocket: WebSocket, bytes: ByteString) {

                        // 处理二进制数据（如屏幕帧）

                        Log.d(TAG, "收到二进制数据: ${bytes.size} bytes")

                        // 这里可以处理二进制帧数据

                    }

                    

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {

                        Log.e(TAG, "WebSocket连接失败", t)

                        Log.e(TAG, "连接失败详情 - 响应: $response")

                        // 提供详细的错误信息
                        val errorMessage = when (t) {
                            is java.net.UnknownHostException -> "无法解析主机名，请检查IP地址是否正确"
                            is java.net.ConnectException -> "连接被拒绝，服务器可能未运行或端口未开放"
                            is java.net.SocketTimeoutException -> "连接超时，请检查网络连接和防火墙设置"
                            is java.net.UnknownServiceException -> {
                                if (t.message?.contains("CLEARTEXT") == true) {
                                    "明文通信被网络安全策略阻止，请检查网络安全配置"
                                } else {
                                    "未知服务错误: ${t.message}"
                                }
                            }
                            is javax.net.ssl.SSLException -> "SSL连接错误: ${t.message}"
                            else -> "连接失败: ${t.message ?: "未知错误"}"
                        }

                        Log.e(TAG, "详细错误信息: $errorMessage")

                        isConnected = false

                        this@NetworkCommunication.webSocket = null

                        

                        // 连接失败

                        connectionResult.complete(false)

                    }

                    

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {

                        Log.d(TAG, "WebSocket连接已关闭: $code - $reason")

                        isConnected = false

                        this@NetworkCommunication.webSocket = null

                    }

                    

                    override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {

                        Log.d(TAG, "WebSocket连接正在关闭: $code - $reason")

                    }

                }

                

                Log.d(TAG, "创建WebSocket连接")

                val result = client.newWebSocket(request, listener)

                Log.d(TAG, "WebSocket创建完成")

                // 等待连接建立（最多10秒）

                Log.d(TAG, "等待连接完成...")

                

                // 等待连接结果，最多10秒超时

                try {

                    withTimeout(10000) {

                        return@withTimeout connectionResult.await()

                    }

                } catch (e: TimeoutCancellationException) {

                    Log.e(TAG, "连接超时")

                    false

                }

            } catch (e: Exception) {

                Log.e(TAG, "连接Windows端失败", e)

                isConnected = false

                false

            }

        }

    }
    
    /**
     * 断开连接
     */
    fun disconnect() {
        try {
            webSocket?.close(1000, "客户端主动断开")
            webSocket = null
            isConnected = false
            Log.d(TAG, "已断开连接")
        } catch (e: Exception) {
            Log.e(TAG, "关闭连接时出错", e)
        }
    }
    
    /**

     * 发送设备信息

     */

    private fun sendDeviceInfo() {

        try {

            Log.d(TAG, "准备构建设备信息")

            val capabilitiesArray = org.json.JSONArray().apply {

                put("file_transfer")

                put("screen_mirror")

                put("remote_control")

                put("notification")

                put("clipboard_sync")

            }

            val deviceInfo = JSONObject().apply {

                put("type", "device_info")

                put("deviceInfo", JSONObject().apply {

                    put("deviceId", java.util.UUID.randomUUID().toString())

                    put("deviceName", android.os.Build.MODEL)

                    put("platform", "android")

                    put("version", "1.0.0")

                    put("ip", getLocalIpAddress())

                    put("capabilities", capabilitiesArray)

                })

            }

            

            Log.d(TAG, "设备信息构建完成: $deviceInfo")

            sendMessage(deviceInfo)

        } catch (e: Exception) {

            Log.e(TAG, "发送设备信息失败", e)

            // 发送简化的设备信息作为备选方案

            try {

                val fallbackDeviceInfo = JSONObject().apply {

                    put("type", "device_info")

                    put("deviceInfo", JSONObject().apply {

                        put("deviceId", java.util.UUID.randomUUID().toString())

                        put("deviceName", android.os.Build.MODEL)

                        put("platform", "android")

                        put("version", "1.0.0")

                        put("ip", getLocalIpAddress())

                        // 简化capabilities为字符串

                        put("capabilities", "file_transfer,screen_mirror,remote_control,notification,clipboard_sync")

                    })

                }

                

                Log.d(TAG, "发送备选设备信息: $fallbackDeviceInfo")

                sendMessage(fallbackDeviceInfo)

            } catch (fallbackError: Exception) {

                Log.e(TAG, "发送备选设备信息也失败", fallbackError)

            }

        }

    }
    
    /**
     * 获取本地IP地址
     */
    private fun getLocalIpAddress(): String {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                if (networkInterface.isLoopback || networkInterface.isVirtual || !networkInterface.isUp) {
                    continue
                }
                
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address.hostAddress.indexOf(':') == -1) {
                        return address.hostAddress
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "获取本地IP地址失败", e)
        }
        return "127.0.0.1"
    }
    
    /**

     * 发送消息

     */

    fun sendMessage(message: JSONObject) {

        if (!isConnected) {

            Log.w(TAG, "未连接到服务器，无法发送消息")

            return

        }

        

        coroutineScope.launch {

            try {

                val messageStr = message.toString()

                Log.d(TAG, "准备发送消息，长度: ${messageStr.length}, 类型: ${message.optString("type", "unknown")}")

                val result = webSocket?.send(messageStr)

                Log.d(TAG, "消息发送结果: $result, 消息类型: ${message.optString("type", "unknown")}")

            } catch (e: Exception) {

                Log.e(TAG, "发送消息失败", e)

                isConnected = false

            }

        }

    }
    
    /**
     * 发送屏幕帧数据
     */
    fun sendScreenFrame(frameData: ByteArray) {
        if (!isConnected) {
            Log.w(TAG, "未连接到服务器，无法发送屏幕帧")
            return
        }
        
        coroutineScope.launch {
            try {
                // 发送帧头信息
                val headerMessage = JSONObject().apply {
                    put("type", "screen_frame")
                    put("timestamp", System.currentTimeMillis())
                    put("frameSize", frameData.size)
                }
                
                // 发送屏幕帧头（JSON格式）
                webSocket?.send(headerMessage.toString())
                
                // 发送实际的帧数据（二进制格式）
                val byteString = okio.ByteString.of(*frameData)
                webSocket?.send(byteString)
                
                Log.d(TAG, "屏幕帧已发送: ${frameData.size} bytes")
            } catch (e: Exception) {
                Log.e(TAG, "发送屏幕帧失败", e)
                isConnected = false
            }
        }
    }
    
    /**
     * 发送文件传输进度
     */
    fun sendFileTransferProgress(transferId: String, progress: Int, total: Long, sent: Long) {
        try {
            val message = JSONObject().apply {
                put("type", "file_transfer")
                put("transferId", transferId)
                put("progress", progress)
                put("total", total)
                put("sent", sent)
            }
            
            sendMessage(message)
        } catch (e: Exception) {
            Log.e(TAG, "发送文件传输进度失败", e)
        }
    }
    
    /**
     * 处理接收到的消息
     */
    private fun handleMessage(message: JSONObject) {
        val type = message.optString("type")
        if (type.isNotEmpty()) {
            val handler = messageHandlers[type]
            if (handler != null) {
                // 如果有注册的处理器，优先使用它
                handler(message)
            } else {
                // 如果没有注册的处理器，根据类型进行默认处理
                when (type) {
                    MESSAGE_TYPE_HEARTBEAT -> {
                        // 回复心跳
                        sendHeartbeatResponse()
                    }
                    MESSAGE_TYPE_AUTHENTICATION_SUCCESS -> {
                        Log.d(TAG, "认证成功")
                    }
                    MESSAGE_TYPE_DEVICE_INFO -> {
                        // 处理设备信息
                        handleDeviceInfo(message)
                    }
                    MESSAGE_TYPE_DEVICE_DISCOVERED -> {
                        // 处理设备发现消息
                        handleDeviceDiscovered(message)
                    }
                    MESSAGE_TYPE_SCREEN_FRAME -> {
                        // 处理屏幕帧
                        handleScreenFrame(message)
                    }
                    MESSAGE_TYPE_FILE_TRANSFER -> {
                        // 处理文件传输
                        handleFileTransfer(message)
                    }
                    MESSAGE_TYPE_CONTROL_COMMAND -> {
                        // 处理控制命令
                        handleControlCommand(message)
                    }
                    MESSAGE_TYPE_CLIPBOARD -> {
                        // 处理剪贴板同步
                        handleClipboard(message)
                    }
                    MESSAGE_TYPE_NOTIFICATION -> {
                        // 处理通知
                        handleNotification(message)
                    }
                    MESSAGE_TYPE_CONNECTION_STATUS -> {
                        // 处理连接状态
                        handleConnectionStatus(message)
                    }
                    else -> {
                        Log.w(TAG, "未找到消息处理器，且无默认处理: $type")
                    }
                }
            }
        }
    }
    
    /**
     * 发送心跳响应
     */
    private fun sendHeartbeatResponse() {
        try {
            val message = JSONObject().apply {
                put("type", "heartbeat")
                put("timestamp", System.currentTimeMillis())
            }
            sendMessage(message)
        } catch (e: Exception) {
            Log.e(TAG, "发送心跳响应失败", e)
        }
    }
    
    /**
     * 处理设备信息
     */
    private fun handleDeviceInfo(message: JSONObject) {
        try {
            val deviceInfo = message.optJSONObject("deviceInfo")
            if (deviceInfo != null) {
                Log.d(TAG, "收到设备信息: ${deviceInfo.optString("deviceName")} (${deviceInfo.optString("platform")})")
                // 可以在这里处理接收到的设备信息
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理设备信息失败", e)
        }
    }
    
    /**
     * 处理设备发现消息
     */
    private fun handleDeviceDiscovered(message: JSONObject) {
        try {
            val deviceInfo = message.optJSONObject("deviceInfo")
            if (deviceInfo != null) {
                Log.d(TAG, "发现新设备: ${deviceInfo.optString("deviceName")}")
                // 通知注册的处理器
                messageHandlers["device_discovered"]?.invoke(message)
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理设备发现消息失败", e)
        }
    }
    
    /**
     * 处理屏幕帧
     */
    private fun handleScreenFrame(message: JSONObject) {
        try {
            Log.d(TAG, "收到屏幕帧，时间戳: ${message.optLong("timestamp")}")
            // 通知注册的处理器
            messageHandlers["screen_frame"]?.invoke(message)
        } catch (e: Exception) {
            Log.e(TAG, "处理屏幕帧失败", e)
        }
    }
    
    /**
     * 处理文件传输
     */
    private fun handleFileTransfer(message: JSONObject) {
        try {
            val action = message.optString("action")
            Log.d(TAG, "收到文件传输消息，操作: $action")
            // 通知注册的处理器
            messageHandlers["file_transfer"]?.invoke(message)
        } catch (e: Exception) {
            Log.e(TAG, "处理文件传输失败", e)
        }
    }
    
    /**
     * 处理控制命令
     */
    private fun handleControlCommand(message: JSONObject) {
        try {
            val commandType = message.optString("commandType")
            Log.d(TAG, "收到控制命令: $commandType")
            // 通知注册的处理器
            messageHandlers["control_command"]?.invoke(message)
        } catch (e: Exception) {
            Log.e(TAG, "处理控制命令失败", e)
        }
    }
    
    /**
     * 处理剪贴板同步
     */
    private fun handleClipboard(message: JSONObject) {
        try {
            val data = message.optString("data")
            val source = message.optString("source", "unknown")
            Log.d(TAG, "收到剪贴板数据 (来自: $source): ${data.take(50)}...")
            
            if (source == "windows") {
                // 如果是来自Windows端的剪贴板数据，设置到Android剪贴板
                setClipboardFromWindows(data)
            }
            
            // 通知注册的处理器
            messageHandlers["clipboard"]?.invoke(message)
        } catch (e: Exception) {
            Log.e(TAG, "处理剪贴板同步失败", e)
        }
    }
    
    /**
     * 处理通知
     */
    private fun handleNotification(message: JSONObject) {
        try {
            val title = message.optString("title")
            val action = message.optString("action", "")
            Log.d(TAG, "收到通知相关消息: $title, 动作: $action")
            
            if (action.isNotEmpty()) {
                // 如果有特定动作，这可能是来自Windows端的通知操作
                handleNotificationAction(message)
            } else {
                // 否则是来自Windows端的通知数据，需要在Android端显示
                handleNotificationFromWindows(message)
            }
            
            // 通知注册的处理器
            messageHandlers["notification"]?.invoke(message)
        } catch (e: Exception) {
            Log.e(TAG, "处理通知失败", e)
        }
    }
    
    /**
     * 处理连接状态
     */
    private fun handleConnectionStatus(message: JSONObject) {
        try {
            val connected = message.optBoolean("connected", false)
            Log.d(TAG, "连接状态更新: $connected")
            // 通知注册的处理器
            messageHandlers["connection_status"]?.invoke(message)
        } catch (e: Exception) {
            Log.e(TAG, "处理连接状态失败", e)
        }
    }
    
    /**
     * 处理来自Windows端的通知操作
     */
    private fun handleNotificationAction(message: JSONObject) {
        try {
            val action = message.optString("action")
            val packageName = message.optString("packageName", "")
            val notificationId = message.optInt("id", -1)
            
            Log.d(TAG, "处理来自Windows的通知操作: $action, 包名: $packageName, ID: $notificationId")
            
            // 发送广播，让NotificationSyncService处理
            val intent = Intent("com.example.windowsandroidconnect.NOTIFICATION_ACTION").apply {
                putExtra("action", action)
                putExtra("packageName", packageName)
                putExtra("id", notificationId)
            }
            // 由于NetworkCommunication没有Context，需要通过其他方式传递
            Log.d(TAG, "通知操作需要在有Context的组件中处理: $action for $packageName")
        } catch (e: Exception) {
            Log.e(TAG, "处理通知操作失败", e)
        }
    }
    
    /**
     * 处理来自Windows端的通知数据
     */
    private fun handleNotificationFromWindows(message: JSONObject) {
        try {
            val title = message.optString("title", "通知")
            val text = message.optString("text", "")
            val packageName = message.optString("packageName", "Windows")
            
            Log.d(TAG, "收到Windows通知: $title - $text")
            
            // 发送广播，让有Context的组件显示通知
            val intent = Intent("com.example.windowsandroidconnect.SHOW_WINDOWS_NOTIFICATION").apply {
                putExtra("title", title)
                putExtra("text", text)
                putExtra("packageName", packageName)
            }
            // 由于NetworkCommunication没有Context，需要通过其他方式传递
            Log.d(TAG, "Windows通知需要在有Context的组件中显示: $title")
        } catch (e: Exception) {
            Log.e(TAG, "处理来自Windows的通知失败", e)
        }
    }
    
    /**
     * 从Windows端设置剪贴板内容
     * 此功能由WebSocketConnectionService处理
     */
    private fun setClipboardFromWindows(data: String) {
        // 此函数不再需要，已经在WebSocketConnectionService中处理
        // 保持此函数以确保代码完整性
        Log.d(TAG, "收到Windows剪贴板数据，已在WebSocketConnectionService中处理: ${data.take(30)}...")
    }
    
    /**
     * 注册消息处理器
     */
    fun registerMessageHandler(type: String, handler: (JSONObject) -> Unit) {
        messageHandlers[type] = handler
    }
    
    /**
     * 移除消息处理器
     */
    fun unregisterMessageHandler(type: String) {
        messageHandlers.remove(type)
    }
    
    /**
     * 检查连接状态
     */
    fun isConnected(): Boolean = isConnected
    
    /**
     * 发送错误消息
     */
    fun sendErrorMessage(errorCode: String, errorMessage: String) {
        try {
            val message = JSONObject().apply {
                put("type", MESSAGE_TYPE_ERROR)
                put("errorCode", errorCode)
                put("errorMessage", errorMessage)
                put("timestamp", System.currentTimeMillis())
            }
            sendMessage(message)
        } catch (e: Exception) {
            Log.e(TAG, "发送错误消息失败", e)
        }
    }
    
    /**
     * 销毁通信模块
     */
    fun destroy() {
        disconnect()
        client.dispatcher.executorService.shutdown()
        client.connectionPool.evictAll()
        messageHandlers.clear()
        Log.d(TAG, "网络通信模块已销毁")
    }
}