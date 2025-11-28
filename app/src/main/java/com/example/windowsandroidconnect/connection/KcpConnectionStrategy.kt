package com.example.windowsandroidconnect.connection

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * KCP连接策略实现（示例模板）
 * 注意：实际使用需要集成KCP库
 */
class KcpConnectionStrategy : ConnectionStrategy {
    
    private var currentIp: String? = null
    private var currentPort: Int? = null
    private var isConnectedState = false
    private val statusListeners = mutableListOf<(Boolean) -> Unit>()
    private val messageListeners = mutableListOf<(JSONObject) -> Unit>()
    
    override suspend fun connect(ip: String, port: Int): Boolean {
        // 这里是KCP连接的示例实现
        // 实际实现需要引入KCP库
        return try {
            Log.d("KcpConnectionStrategy", "尝试使用KCP连接到 $ip:$port")
            
            // 模拟KCP连接过程
            // 实际实现中，这里会初始化KCP连接
            Thread.sleep(100) // 模拟连接时间
            
            // 假设连接成功
            currentIp = ip
            currentPort = port
            isConnectedState = true
            Log.d("KcpConnectionStrategy", "KCP连接成功")
            // 通知所有状态监听器
            statusListeners.forEach { it(true) }
            true
        } catch (e: Exception) {
            Log.e("KcpConnectionStrategy", "KCP连接失败", e)
            isConnectedState = false
            // 通知所有状态监听器
            statusListeners.forEach { it(false) }
            false
        }
    }
    
    override fun disconnect() {
        Log.d("KcpConnectionStrategy", "断开KCP连接")
        currentIp = null
        currentPort = null
        isConnectedState = false
        // 通知所有状态监听器
        statusListeners.forEach { it(false) }
    }
    
    override fun sendMessage(message: JSONObject) {
        if (isConnected()) {
            Log.d("KcpConnectionStrategy", "发送KCP消息: ${message.toString()}")
            // 实际实现中，这里会通过KCP发送消息
        } else {
            Log.w("KcpConnectionStrategy", "未连接KCP，无法发送消息")
        }
    }
    
    override fun isConnected(): Boolean {
        return isConnectedState && currentIp != null && currentPort != null
    }
    
    override fun getConnectionType(): String {
        return "KCP"
    }
    
    override fun getConfig(): Map<String, Any> {
        val config = mutableMapOf<String, Any>()
        config["connectionType"] = getConnectionType()
        config["connected"] = isConnected()
        config["ip"] = currentIp ?: ""
        config["port"] = currentPort ?: -1
        return config
    }
    
    override fun updateConfig(config: Map<String, Any>) {
        Log.d("KcpConnectionStrategy", "更新配置: $config")
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
                
                // 重新连接到之前的服务器（如果有）
                if (currentIp != null && currentPort != null) {
                    connect(currentIp!!, currentPort!!)
                } else {
                    false
                }
            } catch (e: Exception) {
                Log.e("KcpConnectionStrategy", "重置连接失败", e)
                false
            }
        }
    }
}