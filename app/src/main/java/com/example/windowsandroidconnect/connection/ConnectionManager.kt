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
    private val strategyFactories = mutableMapOf<String, () -> ConnectionStrategy>()
    
    /**
     * 注册连接策略工厂
     * 使用工厂模式延迟创建策略实例，提高性能和灵活性
     */
    fun registerStrategyFactory(type: String, factory: () -> ConnectionStrategy) {
        strategyFactories[type.lowercase()] = factory
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
        val lowerType = type.lowercase()
        var strategy = connectionStrategies[lowerType]
        
        // 如果策略不存在，尝试使用工厂创建
        if (strategy == null) {
            val factory = strategyFactories[lowerType]
            if (factory != null) {
                strategy = factory()
                connectionStrategies[lowerType] = strategy
            }
        }
        
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
     * 发送命令
     */
    fun sendCommand(command: String, params: Map<String, Any> = emptyMap()) {
        val message = JSONObject().apply {
            put("type", command)
            params.forEach { (key, value) -> put(key, value) }
        }
        sendMessage(message)
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
        return (strategyFactories.keys + connectionStrategies.keys).distinct().sorted()
    }
    
    /**
     * 获取当前使用的策略
     */
    fun getCurrentStrategy(): ConnectionStrategy? {
        return currentStrategy
    }
    
    /**
     * 清理资源
     */
    fun cleanup() {
        disconnect()
        connectionStrategies.clear()
        strategyFactories.clear()
        Log.d("ConnectionManager", "连接管理器资源已清理")
    }
}