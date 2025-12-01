package com.example.windowsandroidconnect.config

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

/**
 * Android客户端配置管理类
 * 用于管理服务器连接端口等配置信息
 */
class ClientConfig private constructor(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(CONFIG_NAME, Context.MODE_PRIVATE)
    
    // 服务器WebSocket端口
    var serverPort: Int
        get() = prefs.getInt(KEY_SERVER_PORT, DEFAULT_SERVER_PORT)
        set(value) = prefs.edit().putInt(KEY_SERVER_PORT, value).apply()
    
    // 设备发现UDP端口
    var discoveryPort: Int
        get() = prefs.getInt(KEY_DISCOVERY_PORT, DEFAULT_DISCOVERY_PORT)
        set(value) = prefs.edit().putInt(KEY_DISCOVERY_PORT, value).apply()
    
    // 服务器IP地址
    var serverIp: String
        get() = prefs.getString(KEY_SERVER_IP, DEFAULT_SERVER_IP) ?: DEFAULT_SERVER_IP
        set(value) = prefs.edit().putString(KEY_SERVER_IP, value).apply()
    
    // 调试模式
    var isDebugMode: Boolean
        get() = prefs.getBoolean(KEY_DEBUG_MODE, DEFAULT_DEBUG_MODE)
        set(value) = prefs.edit().putBoolean(KEY_DEBUG_MODE, value).apply()
    
    // 连接策略
    var connectionStrategy: String
        get() = prefs.getString(KEY_CONNECTION_STRATEGY, DEFAULT_CONNECTION_STRATEGY) ?: DEFAULT_CONNECTION_STRATEGY
        set(value) = prefs.edit().putString(KEY_CONNECTION_STRATEGY, value).apply()
    
    companion object {
        private const val TAG = "ClientConfig"
        private const val CONFIG_NAME = "windows_android_connect_config"
        
        // 配置键名
        private const val KEY_SERVER_PORT = "server_port"
        private const val KEY_DISCOVERY_PORT = "discovery_port"
        private const val KEY_SERVER_IP = "server_ip"
        private const val KEY_DEBUG_MODE = "debug_mode"
        private const val KEY_CONNECTION_STRATEGY = "connection_strategy"
        
        // 默认值
        const val DEFAULT_SERVER_PORT = 8928
        const val DEFAULT_DISCOVERY_PORT = 8190  // 与后端服务器UDP端口匹配
        const val DEFAULT_SERVER_IP = "192.168.124.18" // 默认服务器IP，与您之前提到的IP匹配
        const val DEFAULT_DEBUG_MODE = false
        const val DEFAULT_CONNECTION_STRATEGY = "websocket" // 默认使用WebSocket策略
        
        // 支持的连接策略
        val SUPPORTED_STRATEGIES = listOf("websocket", "tcp", "kcp", "udp")
        
        @Volatile
        private var INSTANCE: ClientConfig? = null
        
        fun getInstance(context: Context): ClientConfig {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ClientConfig(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    /**
     * 重置所有配置为默认值
     */
    fun resetToDefaults() {
        serverPort = DEFAULT_SERVER_PORT
        discoveryPort = DEFAULT_DISCOVERY_PORT
        serverIp = DEFAULT_SERVER_IP
        isDebugMode = DEFAULT_DEBUG_MODE
        connectionStrategy = DEFAULT_CONNECTION_STRATEGY
        Log.d(TAG, "配置已重置为默认值")
    }
    
    /**
     * 获取完整的WebSocket服务器地址
     */
    fun getWebSocketServerUrl(): String {
        return "ws://$serverIp:$serverPort"
    }
    
    /**
     * 获取设备发现广播地址
     */
    fun getDiscoveryBroadcastAddress(): String {
        return "255.255.255.255"
    }
}