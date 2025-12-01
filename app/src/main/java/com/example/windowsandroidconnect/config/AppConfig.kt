package com.example.windowsandroidconnect.config

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.CopyOnWriteArrayList

/**
 * 应用配置管理器
 * 提供完整的配置管理功能，包括本地存储、远程获取、热更新等
 */
class AppConfig private constructor(private val context: Context) {
    
    companion object {
        private const val TAG = "AppConfig"
        private const val PREFS_NAME = "app_config"
        private const val CONFIG_VERSION_KEY = "config_version"
        
        // 默认配置值
        const val DEFAULT_SERVER_IP = "192.168.1.100"
        const val DEFAULT_SERVER_PORT = 8928
        const val DEFAULT_DISCOVERY_PORT = 8190
        const val DEFAULT_WEBSOCKET_PORT = 8781
        const val DEFAULT_CONNECTION_STRATEGY = "websocket"
        const val DEFAULT_HEARTBEAT_INTERVAL = 30000L
        const val DEFAULT_RECONNECT_DELAY = 5000L
        const val DEFAULT_MAX_RECONNECT_ATTEMPTS = 10
        const val DEFAULT_CONNECTION_TIMEOUT = 10000L
        const val DEFAULT_DEBUG_MODE = false
        const val DEFAULT_AUTO_CONNECT = true
        const val DEFAULT_AUTO_DISCOVERY = true
        const val DEFAULT_SCREEN_QUALITY = 80
        const val DEFAULT_SCREEN_FPS = 15
        const val DEFAULT_FILE_CHUNK_SIZE = 1024 * 1024 // 1MB
        
        // 支持的连接策略
        val SUPPORTED_STRATEGIES = listOf("websocket", "tcp", "http", "kcp", "udp", "bluetooth")
        
        @Volatile
        private var instance: AppConfig? = null
        
        fun getInstance(context: Context): AppConfig {
            return instance ?: synchronized(this) {
                instance ?: AppConfig(context.applicationContext).also { instance = it }
            }
        }
    }
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val configListeners = CopyOnWriteArrayList<ConfigChangeListener>()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    // 配置版本，用于配置迁移
    var configVersion: Int
        get() = prefs.getInt(CONFIG_VERSION_KEY, 1)
        private set(value) = prefs.edit().putInt(CONFIG_VERSION_KEY, value).apply()
    
    // ==================== 服务器配置 ====================
    
    var serverIp: String
        get() = prefs.getString("server_ip", DEFAULT_SERVER_IP) ?: DEFAULT_SERVER_IP
        set(value) {
            val oldValue = serverIp
            prefs.edit().putString("server_ip", value).apply()
            notifyConfigChanged("server_ip", oldValue, value)
        }
    
    var serverPort: Int
        get() = prefs.getInt("server_port", DEFAULT_SERVER_PORT)
        set(value) {
            val oldValue = serverPort
            prefs.edit().putInt("server_port", value).apply()
            notifyConfigChanged("server_port", oldValue, value)
        }
    
    var discoveryPort: Int
        get() = prefs.getInt("discovery_port", DEFAULT_DISCOVERY_PORT)
        set(value) {
            val oldValue = discoveryPort
            prefs.edit().putInt("discovery_port", value).apply()
            notifyConfigChanged("discovery_port", oldValue, value)
        }
    
    var webSocketPort: Int
        get() = prefs.getInt("websocket_port", DEFAULT_WEBSOCKET_PORT)
        set(value) {
            val oldValue = webSocketPort
            prefs.edit().putInt("websocket_port", value).apply()
            notifyConfigChanged("websocket_port", oldValue, value)
        }
    
    // ==================== 连接配置 ====================
    
    var connectionStrategy: String
        get() = prefs.getString("connection_strategy", DEFAULT_CONNECTION_STRATEGY) ?: DEFAULT_CONNECTION_STRATEGY
        set(value) {
            if (value.lowercase() in SUPPORTED_STRATEGIES) {
                val oldValue = connectionStrategy
                prefs.edit().putString("connection_strategy", value.lowercase()).apply()
                notifyConfigChanged("connection_strategy", oldValue, value)
            } else {
                Log.w(TAG, "不支持的连接策略: $value")
            }
        }
    
    var heartbeatInterval: Long
        get() = prefs.getLong("heartbeat_interval", DEFAULT_HEARTBEAT_INTERVAL)
        set(value) {
            val oldValue = heartbeatInterval
            prefs.edit().putLong("heartbeat_interval", value).apply()
            notifyConfigChanged("heartbeat_interval", oldValue, value)
        }
    
    var reconnectDelay: Long
        get() = prefs.getLong("reconnect_delay", DEFAULT_RECONNECT_DELAY)
        set(value) {
            val oldValue = reconnectDelay
            prefs.edit().putLong("reconnect_delay", value).apply()
            notifyConfigChanged("reconnect_delay", oldValue, value)
        }
    
    var maxReconnectAttempts: Int
        get() = prefs.getInt("max_reconnect_attempts", DEFAULT_MAX_RECONNECT_ATTEMPTS)
        set(value) {
            val oldValue = maxReconnectAttempts
            prefs.edit().putInt("max_reconnect_attempts", value).apply()
            notifyConfigChanged("max_reconnect_attempts", oldValue, value)
        }
    
    var connectionTimeout: Long
        get() = prefs.getLong("connection_timeout", DEFAULT_CONNECTION_TIMEOUT)
        set(value) {
            val oldValue = connectionTimeout
            prefs.edit().putLong("connection_timeout", value).apply()
            notifyConfigChanged("connection_timeout", oldValue, value)
        }
    
    // ==================== 功能开关 ====================
    
    var isDebugMode: Boolean
        get() = prefs.getBoolean("debug_mode", DEFAULT_DEBUG_MODE)
        set(value) {
            val oldValue = isDebugMode
            prefs.edit().putBoolean("debug_mode", value).apply()
            notifyConfigChanged("debug_mode", oldValue, value)
        }
    
    var isAutoConnect: Boolean
        get() = prefs.getBoolean("auto_connect", DEFAULT_AUTO_CONNECT)
        set(value) {
            val oldValue = isAutoConnect
            prefs.edit().putBoolean("auto_connect", value).apply()
            notifyConfigChanged("auto_connect", oldValue, value)
        }
    
    var isAutoDiscovery: Boolean
        get() = prefs.getBoolean("auto_discovery", DEFAULT_AUTO_DISCOVERY)
        set(value) {
            val oldValue = isAutoDiscovery
            prefs.edit().putBoolean("auto_discovery", value).apply()
            notifyConfigChanged("auto_discovery", oldValue, value)
        }
    
    // ==================== 屏幕投屏配置 ====================
    
    var screenQuality: Int
        get() = prefs.getInt("screen_quality", DEFAULT_SCREEN_QUALITY)
        set(value) {
            val clampedValue = value.coerceIn(10, 100)
            val oldValue = screenQuality
            prefs.edit().putInt("screen_quality", clampedValue).apply()
            notifyConfigChanged("screen_quality", oldValue, clampedValue)
        }
    
    var screenFps: Int
        get() = prefs.getInt("screen_fps", DEFAULT_SCREEN_FPS)
        set(value) {
            val clampedValue = value.coerceIn(1, 60)
            val oldValue = screenFps
            prefs.edit().putInt("screen_fps", clampedValue).apply()
            notifyConfigChanged("screen_fps", oldValue, clampedValue)
        }
    
    // ==================== 文件传输配置 ====================
    
    var fileChunkSize: Int
        get() = prefs.getInt("file_chunk_size", DEFAULT_FILE_CHUNK_SIZE)
        set(value) {
            val oldValue = fileChunkSize
            prefs.edit().putInt("file_chunk_size", value).apply()
            notifyConfigChanged("file_chunk_size", oldValue, value)
        }
    
    // ==================== 功能标志 ====================
    
    private val featureFlags = mutableMapOf<String, Boolean>()
    
    fun isFeatureEnabled(featureName: String, defaultValue: Boolean = false): Boolean {
        return featureFlags[featureName] ?: prefs.getBoolean("feature_$featureName", defaultValue)
    }
    
    fun setFeatureEnabled(featureName: String, enabled: Boolean) {
        featureFlags[featureName] = enabled
        prefs.edit().putBoolean("feature_$featureName", enabled).apply()
        notifyConfigChanged("feature_$featureName", !enabled, enabled)
    }
    
    // ==================== 远程配置 ====================
    
    /**
     * 从远程服务器获取配置
     */
    suspend fun fetchRemoteConfig(configUrl: String? = null): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val url = configUrl ?: "http://$serverIp:$serverPort/api/config"
                Log.d(TAG, "正在获取远程配置: $url")
                
                val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.requestMethod = "GET"
                
                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    val config = JSONObject(response)
                    applyRemoteConfig(config)
                    Log.d(TAG, "远程配置获取成功")
                    true
                } else {
                    Log.e(TAG, "获取远程配置失败: ${connection.responseCode}")
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "获取远程配置异常", e)
                false
            }
        }
    }
    
    /**
     * 应用远程配置
     */
    private fun applyRemoteConfig(config: JSONObject) {
        try {
            // 服务器配置
            if (config.has("serverPort")) {
                serverPort = config.getInt("serverPort")
            }
            if (config.has("discoveryPort")) {
                discoveryPort = config.getInt("discoveryPort")
            }
            if (config.has("webSocketPort")) {
                webSocketPort = config.getInt("webSocketPort")
            }
            
            // 连接配置
            if (config.has("connectionStrategy")) {
                connectionStrategy = config.getString("connectionStrategy")
            }
            if (config.has("heartbeatInterval")) {
                heartbeatInterval = config.getLong("heartbeatInterval")
            }
            if (config.has("reconnectDelay")) {
                reconnectDelay = config.getLong("reconnectDelay")
            }
            if (config.has("maxReconnectAttempts")) {
                maxReconnectAttempts = config.getInt("maxReconnectAttempts")
            }
            
            // 屏幕配置
            if (config.has("screenQuality")) {
                screenQuality = config.getInt("screenQuality")
            }
            if (config.has("screenFps")) {
                screenFps = config.getInt("screenFps")
            }
            
            // 功能标志
            if (config.has("featureFlags")) {
                val flags = config.getJSONObject("featureFlags")
                flags.keys().forEach { key ->
                    setFeatureEnabled(key, flags.getBoolean(key))
                }
            }
            
            Log.d(TAG, "远程配置已应用")
        } catch (e: Exception) {
            Log.e(TAG, "应用远程配置失败", e)
        }
    }
    
    // ==================== 配置导入导出 ====================
    
    /**
     * 导出配置为JSON
     */
    fun exportToJson(): String {
        val config = JSONObject().apply {
            // 服务器配置
            put("serverIp", serverIp)
            put("serverPort", serverPort)
            put("discoveryPort", discoveryPort)
            put("webSocketPort", webSocketPort)
            
            // 连接配置
            put("connectionStrategy", connectionStrategy)
            put("heartbeatInterval", heartbeatInterval)
            put("reconnectDelay", reconnectDelay)
            put("maxReconnectAttempts", maxReconnectAttempts)
            put("connectionTimeout", connectionTimeout)
            
            // 功能开关
            put("debugMode", isDebugMode)
            put("autoConnect", isAutoConnect)
            put("autoDiscovery", isAutoDiscovery)
            
            // 屏幕配置
            put("screenQuality", screenQuality)
            put("screenFps", screenFps)
            
            // 文件传输配置
            put("fileChunkSize", fileChunkSize)
            
            // 功能标志
            put("featureFlags", JSONObject(featureFlags.toMap()))
            
            // 元数据
            put("configVersion", configVersion)
            put("exportTime", System.currentTimeMillis())
        }
        
        return config.toString(2)
    }
    
    /**
     * 从JSON导入配置
     */
    fun importFromJson(json: String): Boolean {
        return try {
            val config = JSONObject(json)
            
            // 服务器配置
            if (config.has("serverIp")) serverIp = config.getString("serverIp")
            if (config.has("serverPort")) serverPort = config.getInt("serverPort")
            if (config.has("discoveryPort")) discoveryPort = config.getInt("discoveryPort")
            if (config.has("webSocketPort")) webSocketPort = config.getInt("webSocketPort")
            
            // 连接配置
            if (config.has("connectionStrategy")) connectionStrategy = config.getString("connectionStrategy")
            if (config.has("heartbeatInterval")) heartbeatInterval = config.getLong("heartbeatInterval")
            if (config.has("reconnectDelay")) reconnectDelay = config.getLong("reconnectDelay")
            if (config.has("maxReconnectAttempts")) maxReconnectAttempts = config.getInt("maxReconnectAttempts")
            if (config.has("connectionTimeout")) connectionTimeout = config.getLong("connectionTimeout")
            
            // 功能开关
            if (config.has("debugMode")) isDebugMode = config.getBoolean("debugMode")
            if (config.has("autoConnect")) isAutoConnect = config.getBoolean("autoConnect")
            if (config.has("autoDiscovery")) isAutoDiscovery = config.getBoolean("autoDiscovery")
            
            // 屏幕配置
            if (config.has("screenQuality")) screenQuality = config.getInt("screenQuality")
            if (config.has("screenFps")) screenFps = config.getInt("screenFps")
            
            // 文件传输配置
            if (config.has("fileChunkSize")) fileChunkSize = config.getInt("fileChunkSize")
            
            // 功能标志
            if (config.has("featureFlags")) {
                val flags = config.getJSONObject("featureFlags")
                flags.keys().forEach { key ->
                    setFeatureEnabled(key, flags.getBoolean(key))
                }
            }
            
            Log.d(TAG, "配置导入成功")
            true
        } catch (e: Exception) {
            Log.e(TAG, "配置导入失败", e)
            false
        }
    }
    
    /**
     * 导出配置到文件
     */
    fun exportToFile(file: File): Boolean {
        return try {
            file.writeText(exportToJson())
            Log.d(TAG, "配置已导出到: ${file.absolutePath}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "导出配置到文件失败", e)
            false
        }
    }
    
    /**
     * 从文件导入配置
     */
    fun importFromFile(file: File): Boolean {
        return try {
            if (!file.exists()) {
                Log.e(TAG, "配置文件不存在: ${file.absolutePath}")
                return false
            }
            val json = file.readText()
            importFromJson(json)
        } catch (e: Exception) {
            Log.e(TAG, "从文件导入配置失败", e)
            false
        }
    }
    
    // ==================== 配置重置 ====================
    
    /**
     * 重置为默认配置
     */
    fun resetToDefaults() {
        serverIp = DEFAULT_SERVER_IP
        serverPort = DEFAULT_SERVER_PORT
        discoveryPort = DEFAULT_DISCOVERY_PORT
        webSocketPort = DEFAULT_WEBSOCKET_PORT
        connectionStrategy = DEFAULT_CONNECTION_STRATEGY
        heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL
        reconnectDelay = DEFAULT_RECONNECT_DELAY
        maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS
        connectionTimeout = DEFAULT_CONNECTION_TIMEOUT
        isDebugMode = DEFAULT_DEBUG_MODE
        isAutoConnect = DEFAULT_AUTO_CONNECT
        isAutoDiscovery = DEFAULT_AUTO_DISCOVERY
        screenQuality = DEFAULT_SCREEN_QUALITY
        screenFps = DEFAULT_SCREEN_FPS
        fileChunkSize = DEFAULT_FILE_CHUNK_SIZE
        featureFlags.clear()
        
        Log.d(TAG, "配置已重置为默认值")
        notifyConfigChanged("all", null, null)
    }
    
    // ==================== 配置变更监听 ====================
    
    /**
     * 配置变更监听器接口
     */
    interface ConfigChangeListener {
        fun onConfigChanged(key: String, oldValue: Any?, newValue: Any?)
    }
    
    /**
     * 添加配置变更监听器
     */
    fun addConfigChangeListener(listener: ConfigChangeListener) {
        configListeners.add(listener)
    }
    
    /**
     * 移除配置变更监听器
     */
    fun removeConfigChangeListener(listener: ConfigChangeListener) {
        configListeners.remove(listener)
    }
    
    /**
     * 通知配置变更
     */
    private fun notifyConfigChanged(key: String, oldValue: Any?, newValue: Any?) {
        configListeners.forEach { listener ->
            try {
                listener.onConfigChanged(key, oldValue, newValue)
            } catch (e: Exception) {
                Log.e(TAG, "通知配置变更失败", e)
            }
        }
    }
    
    // ==================== 配置验证 ====================
    
    /**
     * 验证当前配置是否有效
     */
    fun validateConfig(): ConfigValidationResult {
        val errors = mutableListOf<String>()
        val warnings = mutableListOf<String>()
        
        // 验证服务器IP
        if (serverIp.isBlank()) {
            errors.add("服务器IP不能为空")
        } else if (!isValidIpAddress(serverIp)) {
            warnings.add("服务器IP格式可能不正确: $serverIp")
        }
        
        // 验证端口
        if (serverPort !in 1..65535) {
            errors.add("服务器端口必须在1-65535之间")
        }
        if (discoveryPort !in 1..65535) {
            errors.add("设备发现端口必须在1-65535之间")
        }
        if (webSocketPort !in 1..65535) {
            errors.add("WebSocket端口必须在1-65535之间")
        }
        
        // 验证连接策略
        if (connectionStrategy.lowercase() !in SUPPORTED_STRATEGIES) {
            errors.add("不支持的连接策略: $connectionStrategy")
        }
        
        // 验证时间配置
        if (heartbeatInterval < 1000) {
            warnings.add("心跳间隔过短，可能影响性能")
        }
        if (connectionTimeout < 1000) {
            warnings.add("连接超时时间过短，可能导致连接失败")
        }
        
        // 验证屏幕配置
        if (screenQuality !in 10..100) {
            warnings.add("屏幕质量应在10-100之间")
        }
        if (screenFps !in 1..60) {
            warnings.add("屏幕帧率应在1-60之间")
        }
        
        return ConfigValidationResult(
            isValid = errors.isEmpty(),
            errors = errors,
            warnings = warnings
        )
    }
    
    /**
     * 验证IP地址格式
     */
    private fun isValidIpAddress(ip: String): Boolean {
        return try {
            val parts = ip.split(".")
            if (parts.size != 4) return false
            parts.all { part ->
                val num = part.toIntOrNull() ?: return false
                num in 0..255
            }
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * 配置验证结果
     */
    data class ConfigValidationResult(
        val isValid: Boolean,
        val errors: List<String>,
        val warnings: List<String>
    )
    
    // ==================== 清理 ====================
    
    /**
     * 清理资源
     */
    fun cleanup() {
        coroutineScope.cancel()
        configListeners.clear()
        Log.d(TAG, "AppConfig资源已清理")
    }
}
