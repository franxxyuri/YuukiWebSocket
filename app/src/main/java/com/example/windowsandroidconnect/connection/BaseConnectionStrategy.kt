package com.example.windowsandroidconnect.connection

import org.json.JSONObject
import java.util.concurrent.CopyOnWriteArrayList

/**
 * 连接策略抽象基类
 * 提供ConnectionStrategy接口的默认实现，减少具体策略的重复代码
 */
abstract class BaseConnectionStrategy : ConnectionStrategy {
    
    // 连接配置
    private val config: MutableMap<String, Any> = mutableMapOf()
    
    // 连接状态监听器列表
    protected val statusListeners = CopyOnWriteArrayList<(Boolean) -> Unit>()
    
    // 消息监听器列表
    protected val messageListeners = CopyOnWriteArrayList<(JSONObject) -> Unit>()
    
    // 连接状态
    protected var connected = false
    
    override fun getConfig(): Map<String, Any> {
        return config.toMap() // 返回不可变副本
    }
    
    override fun updateConfig(config: Map<String, Any>) {
        this.config.putAll(config)
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
    
    /**
     * 通知连接状态变化
     */
    protected fun notifyStatusChange(isConnected: Boolean) {
        connected = isConnected
        statusListeners.forEach { it.invoke(isConnected) }
    }
    
    /**
     * 通知消息接收
     */
    protected fun notifyMessageReceived(message: JSONObject) {
        messageListeners.forEach { it.invoke(message) }
    }
}
