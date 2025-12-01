package com.example.windowsandroidconnect.connection

import android.util.Log
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * TCP连接策略实现
 * 基于WebSocket的TCP连接
 */
class TcpConnectionStrategy : ConnectionStrategy {
    
    private var networkCommunication: NetworkCommunication? = null
    private val statusListeners = mutableListOf<(Boolean) -> Unit>()
    private val messageListeners = mutableListOf<(JSONObject) -> Unit>()
    
    override suspend fun connect(ip: String, port: Int): Boolean {
        return try {
            networkCommunication = NetworkCommunication()
            val result = networkCommunication?.connect(ip, port) ?: false
            result
        } catch (e: Exception) {
            Log.e("TcpConnectionStrategy", "TCP连接失败", e)
            false
        }
    }
    
    override fun disconnect() {
        networkCommunication?.disconnect()
        networkCommunication = null
    }
    
    override fun sendMessage(message: JSONObject) {
        if (isConnected()) {
            networkCommunication?.sendMessage(message)
        } else {
            Log.w("TcpConnectionStrategy", "未连接，无法发送消息")
        }
    }
    
    override fun isConnected(): Boolean {
        return networkCommunication?.isConnected() == true
    }
    
    override fun getConnectionType(): String {
        return "tcp"
    }
    
    override fun getConfig(): Map<String, Any> {
        val config = mutableMapOf<String, Any>()
        config["connectionType"] = getConnectionType()
        config["connected"] = isConnected()
        return config
    }
    
    override fun updateConfig(config: Map<String, Any>) {
        Log.d("TcpConnectionStrategy", "更新配置: $config")
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
                Log.e("TcpConnectionStrategy", "重置连接失败", e)
                false
            }
        }
    }
}