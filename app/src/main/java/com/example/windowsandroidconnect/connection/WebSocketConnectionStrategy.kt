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
    private val statusListeners = mutableListOf<(Boolean) -> Unit>()
    private val messageListeners = mutableListOf<(JSONObject) -> Unit>()
    
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
                // 通知所有状态监听器
                statusListeners.forEach { it(true) }
            } else {
                Log.e("WebSocketConnectionStrategy", "WebSocket连接失败")
                // 通知所有状态监听器
                statusListeners.forEach { it(false) }
            }
            
            success
        } catch (e: Exception) {
            Log.e("WebSocketConnectionStrategy", "WebSocket连接异常", e)
            isConnectedState = false
            // 通知所有状态监听器
            statusListeners.forEach { it(false) }
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
        // 通知所有状态监听器
        statusListeners.forEach { it(false) }
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
    
    override fun getConfig(): Map<String, Any> {
        val config = mutableMapOf<String, Any>()
        config["connectionType"] = getConnectionType()
        config["connected"] = isConnected()
        config["serverUrl"] = serverUrl ?: ""
        return config
    }
    
    override fun updateConfig(config: Map<String, Any>) {
        Log.d("WebSocketConnectionStrategy", "更新配置: $config")
        // 处理配置更新逻辑
    }
    
    override fun registerStatusListener(listener: (Boolean) -> Unit) {
        statusListeners.add(listener)
    }
    
    override fun unregisterStatusListener(listener: (Boolean) -> Unit) {
        statusListeners.remove(listener)
    }
    
    override fun registerMessageListener(listener: (JSONObject) -> Unit) {
        messageListeners.add(listener)
    }
    
    override fun unregisterMessageListener(listener: (JSONObject) -> Unit) {
        messageListeners.remove(listener)
    }
    
    override suspend fun reset(): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // 断开现有连接
                disconnect()
                
                // 由于没有存储IP和端口，我们这里返回false
                // 在实际使用中，应该从配置中获取连接信息
                false
            } catch (e: Exception) {
                Log.e("WebSocketConnectionStrategy", "重置连接失败", e)
                false
            }
        }
    }
}