package com.example.windowsandroidconnect.connection

import android.util.Log
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * WebSocket连接策略实现
 * 使用WebSocket协议进行数据传输
 */
class WebSocketConnectionStrategy : ConnectionStrategy {
    
    private var networkCommunication: NetworkCommunication? = null
    private var serverUrl: String? = null
    private var isConnectedState = false
    private val messageCallbacks = ConcurrentHashMap<String, (JSONObject) -> Unit>()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override suspend fun connect(ip: String, port: Int): Boolean {
        return try {
            Log.d("WebSocketConnectionStrategy", "尝试使用WebSocket连接到 $ip:$port")
            
            // 创建NetworkCommunication实例（基于OkHttp WebSocket实现）
            networkCommunication = NetworkCommunication()
            
            // 尝试建立WebSocket连接
            val success = networkCommunication?.connect(ip, port) ?: false
            
            if (success) {
                isConnectedState = true
                Log.d("WebSocketConnectionStrategy", "WebSocket连接成功")
            } else {
                Log.e("WebSocketConnectionStrategy", "WebSocket连接失败")
            }
            
            success
        } catch (e: Exception) {
            Log.e("WebSocketConnectionStrategy", "WebSocket连接异常", e)
            isConnectedState = false
            false
        }
    }
    
    override fun disconnect() {
        Log.d("WebSocketConnectionStrategy", "断开WebSocket连接")
        
        networkCommunication?.disconnect()
        networkCommunication = null
        serverUrl = null
        isConnectedState = false
        messageCallbacks.clear()
    }
    
    override fun sendMessage(message: JSONObject) {
        if (isConnected()) {
            try {
                networkCommunication?.sendMessage(message)
                Log.d("WebSocketConnectionStrategy", "发送WebSocket消息: ${message.toString().take(50)}...")
            } catch (e: Exception) {
                Log.e("WebSocketConnectionStrategy", "发送WebSocket消息异常", e)
            }
        } else {
            Log.w("WebSocketConnectionStrategy", "WebSocket未连接，无法发送消息")
        }
    }
    
    override fun isConnected(): Boolean {
        return isConnectedState && networkCommunication != null && serverUrl != null
    }
    
    override fun getConnectionType(): String {
        return "websocket"
    }
    
    /**
     * 注册消息回调
     */
    fun registerMessageCallback(type: String, callback: (JSONObject) -> Unit) {
        messageCallbacks[type] = callback
    }
}