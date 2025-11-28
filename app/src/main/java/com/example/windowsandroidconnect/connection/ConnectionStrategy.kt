package com.example.windowsandroidconnect.connection

import org.json.JSONObject

/**
 * 连接策略接口
 * 定义了连接的基本操作，支持多种协议（TCP、KCP、UDP等）
 */
interface ConnectionStrategy {
    /**
     * 连接到服务器
     */
    suspend fun connect(ip: String, port: Int): Boolean
    
    /**
     * 断开连接
     */
    fun disconnect()
    
    /**
     * 发送消息
     */
    fun sendMessage(message: JSONObject)
    
    /**
     * 发送命令
     */
    fun sendCommand(command: String, params: Map<String, Any> = emptyMap()) {
        sendMessage(JSONObject().apply {
            put("type", command)
            params.forEach { (key, value) -> put(key, value) }
        })
    }
    
    /**
     * 检查连接状态
     */
    fun isConnected(): Boolean
    
    /**
     * 获取连接类型
     */
    fun getConnectionType(): String
    
    /**
     * 获取连接配置
     */
    fun getConfig(): Map<String, Any>
    
    /**
     * 更新连接配置
     */
    fun updateConfig(config: Map<String, Any>)
    
    /**
     * 重置连接
     */
    suspend fun reset(): Boolean {
        disconnect()
        val config = getConfig()
        val ip = config["ip"] as? String ?: return false
        val port = config["port"] as? Int ?: return false
        return connect(ip, port)
    }
    
    /**
     * 注册连接状态监听器
     */
    fun registerStatusListener(listener: (Boolean) -> Unit)
    
    /**
     * 移除连接状态监听器
     */
    fun unregisterStatusListener(listener: (Boolean) -> Unit)
    
    /**
     * 注册消息监听器
     */
    fun registerMessageListener(listener: (JSONObject) -> Unit)
    
    /**
     * 移除消息监听器
     */
    fun unregisterMessageListener(listener: (JSONObject) -> Unit)
}