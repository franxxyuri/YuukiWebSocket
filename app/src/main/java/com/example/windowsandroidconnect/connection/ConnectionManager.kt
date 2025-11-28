package com.example.windowsandroidconnect.connection

import android.util.Log
import org.json.JSONObject

/**
 * 连接管理器
 * 使用策略模式管理不同的连接方式（TCP、KCP、UDP等）
 */
class ConnectionManager {
    
    private var currentStrategy: ConnectionStrategy? = null
    private val connectionStrategies = mutableMapOf<String, ConnectionStrategy>()
    
    init {
        // 注册默认策略
        registerStrategy("tcp", TcpConnectionStrategy())
        registerStrategy("kcp", KcpConnectionStrategy())
        // 将来可以注册UDP等其他策略
    }
    
    /**
     * 注册连接策略
     */
    fun registerStrategy(type: String, strategy: ConnectionStrategy) {
        connectionStrategies[type.lowercase()] = strategy
    }
    
    /**
     * 选择连接策略
     */
    fun selectStrategy(type: String): Boolean {
        val strategy = connectionStrategies[type.lowercase()]
        return if (strategy != null) {
            // 如果当前有连接，先断开
            if (isConnected()) {
                Log.d("ConnectionManager", "切换策略前先断开当前连接")
                currentStrategy?.disconnect()
            }
            currentStrategy = strategy
            Log.d("ConnectionManager", "已选择连接策略: ${strategy.getConnectionType()}")
            true
        } else {
            Log.e("ConnectionManager", "不支持的连接类型: $type")
            false
        }
    }
    
    /**
     * 连接到服务器
     */
    suspend fun connect(ip: String, port: Int): Boolean {
        return currentStrategy?.connect(ip, port) ?: run {
            Log.e("ConnectionManager", "未选择连接策略")
            false
        }
    }
    
    /**
     * 断开连接
     */
    fun disconnect() {
        currentStrategy?.disconnect()
    }
    
    /**
     * 发送消息
     */
    fun sendMessage(message: JSONObject) {
        currentStrategy?.sendMessage(message)
    }
    
    /**
     * 检查连接状态
     */
    fun isConnected(): Boolean {
        return currentStrategy?.isConnected() == true
    }
    
    /**
     * 获取当前连接类型
     */
    fun getCurrentConnectionType(): String {
        return currentStrategy?.getConnectionType() ?: "未连接"
    }
    
    /**
     * 获取所有支持的连接类型
     */
    fun getSupportedConnectionTypes(): List<String> {
        return connectionStrategies.keys.toList()
    }
    
    /**
     * 获取当前使用的策略
     */
    fun getCurrentStrategy(): ConnectionStrategy? {
        return currentStrategy
    }
}