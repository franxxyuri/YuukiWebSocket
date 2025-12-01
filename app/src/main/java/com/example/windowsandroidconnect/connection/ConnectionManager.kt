package com.example.windowsandroidconnect.connection

import android.util.Log
import org.json.JSONObject
import kotlinx.coroutines.delay

/**
 * 连接管理器
 * 使用策略模式管理不同的连接方式（TCP、KCP、UDP等）
 */
class ConnectionManager {
    
    private var currentStrategy: ConnectionStrategy? = null
    private val connectionStrategies = mutableMapOf<String, ConnectionStrategy>()
    private val strategyFactories = mutableMapOf<String, () -> ConnectionStrategy>()
    
    // 智能连接配置
    private val connectionRetryDelay = 1000L // 重试延迟时间
    private val maxConnectionAttempts = 3 // 每种策略最大重试次数
    private val fallbackStrategies = listOf("tcp", "websocket", "http", "kcp", "udp") // 连接失败时的备选策略顺序
    
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
        Log.e("ConnectionManager", "尝试选择连接策略: $type (转换为小写: $lowerType)")
        Log.e("ConnectionManager", "当前支持的连接类型: ${strategyFactories.keys}")
        Log.e("ConnectionManager", "当前已创建的连接策略: ${connectionStrategies.keys}")
        
        var strategy = connectionStrategies[lowerType]
        
        // 如果策略不存在，尝试使用工厂创建
        if (strategy == null) {
            val factory = strategyFactories[lowerType]
            Log.e("ConnectionManager", "查找策略工厂: $lowerType, 结果: ${factory != null}")
            if (factory != null) {
                strategy = factory()
                connectionStrategies[lowerType] = strategy
                Log.e("ConnectionManager", "使用工厂创建了新的策略实例: ${strategy.getConnectionType()}")
            }
        }
        
        return if (strategy != null) {
            // 如果当前有连接，先断开
            if (isConnected()) {
                Log.e("ConnectionManager", "切换策略前先断开当前连接")
                currentStrategy?.disconnect()
            }
            currentStrategy = strategy
            Log.e("ConnectionManager", "已选择连接策略: ${strategy.getConnectionType()}")
            true
        } else {
            Log.e("ConnectionManager", "不支持的连接类型: $type, 支持的类型: ${strategyFactories.keys}")
            false
        }
    }
    
    /**
     * 智能连接到服务器
     * 当指定的连接策略失败时，自动尝试备选策略
     */
    suspend fun smartConnect(ip: String, port: Int, preferredStrategyType: String? = null): Boolean {
        // 如果指定了首选策略，先尝试该策略
        if (preferredStrategyType != null) {
            if (selectStrategy(preferredStrategyType)) {
                val success = connectWithRetry(ip, port)
                if (success) {
                    return true
                }
            }
        }
        
        // 如果首选策略失败或未指定，尝试备选策略
        for (strategyType in fallbackStrategies) {
            if (strategyType == preferredStrategyType) continue // 跳过已尝试的策略
            
            if (selectStrategy(strategyType)) {
                val success = connectWithRetry(ip, port)
                if (success) {
                    return true
                }
            }
        }
        
        return false
    }
    
    /**
     * 带重试机制的连接
     */
    private suspend fun connectWithRetry(ip: String, port: Int): Boolean {
        var attempts = 0
        while (attempts < maxConnectionAttempts) {
            attempts++
            Log.d("ConnectionManager", "尝试连接 (${currentStrategy?.getConnectionType()})，第 $attempts/$maxConnectionAttempts 次")
            
            val success = connect(ip, port)
            if (success) {
                return true
            }
            
            // 如果不是最后一次尝试，等待后重试
            if (attempts < maxConnectionAttempts) {
                delay(connectionRetryDelay)
            }
        }
        
        Log.e("ConnectionManager", "连接失败 (${currentStrategy?.getConnectionType()})，已尝试 $maxConnectionAttempts 次")
        return false
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