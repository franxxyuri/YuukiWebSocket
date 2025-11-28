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
     * 检查连接状态
     */
    fun isConnected(): Boolean
    
    /**
     * 获取连接类型
     */
    fun getConnectionType(): String
}