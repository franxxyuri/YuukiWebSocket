package com.example.windowsandroidconnect.network

import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.*
import java.util.concurrent.ConcurrentHashMap

/**
 * 网络通信模块
 * 处理Android与Windows端之间的TCP通信
 */
class NetworkCommunication {
    
    private var socket: Socket? = null
    private var outputStream: DataOutputStream? = null
    private var inputStream: DataInputStream? = null
    private var isConnected = false
    private var isListening = false
    private val messageHandlers = ConcurrentHashMap<String, (JSONObject) -> Unit>()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    companion object {
        private const val TAG = "NetworkCommunication"
        private const val BUFFER_SIZE = 8192
    }
    
    /**
     * 连接到Windows端
     */
    suspend fun connect(ip: String, port: Int): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                socket = Socket()
                socket?.connect(InetSocketAddress(ip, port), 5000) // 5秒超时
                
                outputStream = DataOutputStream(socket?.getOutputStream())
                inputStream = DataInputStream(socket?.getInputStream())
                
                isConnected = true
                Log.d(TAG, "已连接到Windows端: $ip:$port")
                
                // 开始监听消息
                startListening()
                
                // 发送设备信息
                sendDeviceInfo()
                
                true
            } catch (e: Exception) {
                Log.e(TAG, "连接Windows端失败: $ip:$port", e)
                disconnect()
                false
            }
        }
    }
    
    /**
     * 断开连接
     */
    fun disconnect() {
        try {
            isListening = false
            inputStream?.close()
            outputStream?.close()
            socket?.close()
        } catch (e: Exception) {
            Log.e(TAG, "关闭连接时出错", e)
        } finally {
            isConnected = false
            socket = null
            inputStream = null
            outputStream = null
            Log.d(TAG, "已断开连接")
        }
    }
    
    /**
     * 发送设备信息
     */
    private fun sendDeviceInfo() {
        try {
            val deviceInfo = JSONObject().apply {
                put("type", "device_info")
                put("deviceInfo", JSONObject().apply {
                    put("deviceId", UUID.randomUUID().toString())
                    put("deviceName", android.os.Build.MODEL)
                    put("platform", "android")
                    put("version", "1.0.0")
                    put("ip", getLocalIpAddress())
                    put("port", 8827)
                    put("capabilities", listOf(
                        "file_transfer",
                        "screen_mirror",
                        "remote_control",
                        "notification",
                        "clipboard_sync"
                    ))
                })
            }
            
            sendMessage(deviceInfo)
        } catch (e: Exception) {
            Log.e(TAG, "发送设备信息失败", e)
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
                val messageStr = message.toString() + "\n"
                outputStream?.writeUTF(messageStr)
                outputStream?.flush()
                Log.d(TAG, "消息已发送: ${message.optString("type", "unknown")}")
            } catch (e: Exception) {
                Log.e(TAG, "发送消息失败", e)
                disconnect()
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
                    put("type", "screen_frame_header")
                    put("timestamp", System.currentTimeMillis())
                    put("frameSize", frameData.size)
                }
                
                val headerStr = headerMessage.toString() + "\n"
                outputStream?.writeUTF(headerStr)
                outputStream?.flush()
                
                // 发送实际的帧数据
                outputStream?.write(frameData)
                outputStream?.flush()
                
                Log.d(TAG, "屏幕帧已发送: ${frameData.size} bytes")
            } catch (e: Exception) {
                Log.e(TAG, "发送屏幕帧失败", e)
                disconnect()
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
     * 开始监听消息
     */
    private fun startListening() {
        if (isListening) return
        
        isListening = true
        coroutineScope.launch {
            try {
                while (isConnected && isListening) {
                    val messageStr = inputStream?.readUTF()
                    if (messageStr != null) {
                        try {
                            val message = JSONObject(messageStr.trim())
                            val messageType = message.optString("type")
                            
                            if (messageType == "screen_frame_header") {
                                // 如果是屏幕帧头消息，接下来需要接收二进制数据
                                val frameSize = message.optInt("frameSize")
                                if (frameSize > 0) {
                                    val frameData = ByteArray(frameSize)
                                    inputStream?.readFully(frameData)
                                    
                                    // 处理完整的屏幕帧
                                    handleScreenFrame(message, frameData)
                                }
                            } else {
                                // 处理普通JSON消息
                                handleMessage(message)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "解析消息失败: $messageStr", e)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "监听消息时出错", e)
                disconnect()
            }
        }
    }
    
    /**
     * 处理屏幕帧数据
     */
    private fun handleScreenFrame(header: JSONObject, frameData: ByteArray) {
        // 向注册的处理器发送屏幕帧
        val handler = messageHandlers["screen_frame"]
        if (handler != null) {
            val frameMessage = JSONObject(header.toString())
            // 注意：JSON不直接支持二进制数据，实际应用中可能需要Base64编码
            handler(frameMessage)
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
                handler(message)
            } else {
                Log.w(TAG, "未找到消息处理器: $type")
                
                // 处理一些通用消息类型
                when (type) {
                    "heartbeat" -> {
                        // 回复心跳
                        sendHeartbeatResponse()
                    }
                    "authentication_success" -> {
                        Log.d(TAG, "认证成功")
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
     * 销毁通信模块
     */
    fun destroy() {
        coroutineScope.cancel()
        disconnect()
        messageHandlers.clear()
        Log.d(TAG, "网络通信模块已销毁")
    }
}