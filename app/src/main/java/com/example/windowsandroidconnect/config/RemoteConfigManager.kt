package com.example.windowsandroidconnect.config

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * 远程配置管理器
 * 负责从服务器获取配置并应用到本地
 */
class RemoteConfigManager(private val context: Context) {
    
    companion object {
        private const val TAG = "RemoteConfigManager"
        private const val DEFAULT_REFRESH_INTERVAL = 300000L // 5分钟
        private const val MIN_REFRESH_INTERVAL = 60000L // 最小1分钟
    }
    
    private val appConfig = AppConfig.getInstance(context)
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var refreshJob: Job? = null
    private var lastFetchTime = 0L
    private var cachedConfig: RemoteConfig? = null
    
    /**
     * 远程配置数据类
     */
    data class RemoteConfig(
        val version: Int,
        val serverSettings: ServerSettings?,
        val connectionSettings: ConnectionSettings?,
        val screenSettings: ScreenSettings?,
        val featureFlags: Map<String, Boolean>,
        val updateInfo: UpdateInfo?,
        val fetchTime: Long = System.currentTimeMillis()
    )
    
    data class ServerSettings(
        val serverPort: Int?,
        val discoveryPort: Int?,
        val webSocketPort: Int?
    )
    
    data class ConnectionSettings(
        val strategy: String?,
        val heartbeatInterval: Long?,
        val reconnectDelay: Long?,
        val maxReconnectAttempts: Int?,
        val connectionTimeout: Long?
    )
    
    data class ScreenSettings(
        val quality: Int?,
        val fps: Int?,
        val maxResolution: Int?
    )
    
    data class UpdateInfo(
        val latestVersion: String?,
        val updateUrl: String?,
        val isForceUpdate: Boolean,
        val releaseNotes: String?
    )
    
    /**
     * 获取远程配置
     */
    suspend fun fetchRemoteConfig(serverUrl: String? = null): Result<RemoteConfig> {
        return withContext(Dispatchers.IO) {
            try {
                val url = serverUrl ?: buildConfigUrl()
                Log.d(TAG, "正在获取远程配置: $url")
                
                val connection = URL(url).openConnection() as HttpURLConnection
                connection.apply {
                    connectTimeout = 5000
                    readTimeout = 5000
                    requestMethod = "GET"
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("X-Client-Version", "1.0.0")
                    setRequestProperty("X-Platform", "android")
                }
                
                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().readText()
                    val config = parseRemoteConfig(response)
                    cachedConfig = config
                    lastFetchTime = System.currentTimeMillis()
                    Log.d(TAG, "远程配置获取成功，版本: ${config.version}")
                    Result.success(config)
                } else {
                    val error = "获取远程配置失败: HTTP $responseCode"
                    Log.e(TAG, error)
                    Result.failure(Exception(error))
                }
            } catch (e: Exception) {
                Log.e(TAG, "获取远程配置异常", e)
                Result.failure(e)
            }
        }
    }
    
    /**
     * 构建配置URL
     */
    private fun buildConfigUrl(): String {
        return "http://${appConfig.serverIp}:${appConfig.serverPort}/api/config"
    }
    
    /**
     * 解析远程配置
     */
    private fun parseRemoteConfig(json: String): RemoteConfig {
        val jsonObject = JSONObject(json)
        
        val serverSettings = if (jsonObject.has("serverSettings")) {
            val settings = jsonObject.getJSONObject("serverSettings")
            ServerSettings(
                serverPort = settings.optInt("serverPort", -1).takeIf { it > 0 },
                discoveryPort = settings.optInt("discoveryPort", -1).takeIf { it > 0 },
                webSocketPort = settings.optInt("webSocketPort", -1).takeIf { it > 0 }
            )
        } else null
        
        val connectionSettings = if (jsonObject.has("connectionSettings")) {
            val settings = jsonObject.getJSONObject("connectionSettings")
            ConnectionSettings(
                strategy = settings.optString("strategy").takeIf { it.isNotEmpty() },
                heartbeatInterval = settings.optLong("heartbeatInterval", -1).takeIf { it > 0 },
                reconnectDelay = settings.optLong("reconnectDelay", -1).takeIf { it > 0 },
                maxReconnectAttempts = settings.optInt("maxReconnectAttempts", -1).takeIf { it > 0 },
                connectionTimeout = settings.optLong("connectionTimeout", -1).takeIf { it > 0 }
            )
        } else null
        
        val screenSettings = if (jsonObject.has("screenSettings")) {
            val settings = jsonObject.getJSONObject("screenSettings")
            ScreenSettings(
                quality = settings.optInt("quality", -1).takeIf { it > 0 },
                fps = settings.optInt("fps", -1).takeIf { it > 0 },
                maxResolution = settings.optInt("maxResolution", -1).takeIf { it > 0 }
            )
        } else null
        
        val featureFlags = mutableMapOf<String, Boolean>()
        if (jsonObject.has("featureFlags")) {
            val flags = jsonObject.getJSONObject("featureFlags")
            flags.keys().forEach { key ->
                featureFlags[key] = flags.getBoolean(key)
            }
        }
        
        val updateInfo = if (jsonObject.has("updateInfo")) {
            val info = jsonObject.getJSONObject("updateInfo")
            UpdateInfo(
                latestVersion = info.optString("latestVersion").takeIf { it.isNotEmpty() },
                updateUrl = info.optString("updateUrl").takeIf { it.isNotEmpty() },
                isForceUpdate = info.optBoolean("isForceUpdate", false),
                releaseNotes = info.optString("releaseNotes").takeIf { it.isNotEmpty() }
            )
        } else null
        
        return RemoteConfig(
            version = jsonObject.optInt("version", 1),
            serverSettings = serverSettings,
            connectionSettings = connectionSettings,
            screenSettings = screenSettings,
            featureFlags = featureFlags,
            updateInfo = updateInfo
        )
    }
    
    /**
     * 应用远程配置到本地
     */
    fun applyConfig(config: RemoteConfig) {
        Log.d(TAG, "正在应用远程配置...")
        
        // 应用服务器设置
        config.serverSettings?.let { settings ->
            settings.serverPort?.let { appConfig.serverPort = it }
            settings.discoveryPort?.let { appConfig.discoveryPort = it }
            settings.webSocketPort?.let { appConfig.webSocketPort = it }
        }
        
        // 应用连接设置
        config.connectionSettings?.let { settings ->
            settings.strategy?.let { appConfig.connectionStrategy = it }
            settings.heartbeatInterval?.let { appConfig.heartbeatInterval = it }
            settings.reconnectDelay?.let { appConfig.reconnectDelay = it }
            settings.maxReconnectAttempts?.let { appConfig.maxReconnectAttempts = it }
            settings.connectionTimeout?.let { appConfig.connectionTimeout = it }
        }
        
        // 应用屏幕设置
        config.screenSettings?.let { settings ->
            settings.quality?.let { appConfig.screenQuality = it }
            settings.fps?.let { appConfig.screenFps = it }
        }
        
        // 应用功能标志
        config.featureFlags.forEach { (key, value) ->
            appConfig.setFeatureEnabled(key, value)
        }
        
        Log.d(TAG, "远程配置已应用")
    }
    
    /**
     * 获取并应用远程配置
     */
    suspend fun fetchAndApplyConfig(serverUrl: String? = null): Boolean {
        val result = fetchRemoteConfig(serverUrl)
        return if (result.isSuccess) {
            applyConfig(result.getOrThrow())
            true
        } else {
            false
        }
    }
    
    /**
     * 开始定时刷新配置
     */
    fun startPeriodicRefresh(intervalMs: Long = DEFAULT_REFRESH_INTERVAL) {
        val actualInterval = maxOf(intervalMs, MIN_REFRESH_INTERVAL)
        Log.d(TAG, "开始定时刷新配置，间隔: ${actualInterval}ms")
        
        stopPeriodicRefresh()
        
        refreshJob = coroutineScope.launch {
            while (isActive) {
                delay(actualInterval)
                try {
                    fetchAndApplyConfig()
                } catch (e: Exception) {
                    Log.e(TAG, "定时刷新配置失败", e)
                }
            }
        }
    }
    
    /**
     * 停止定时刷新配置
     */
    fun stopPeriodicRefresh() {
        refreshJob?.cancel()
        refreshJob = null
        Log.d(TAG, "已停止定时刷新配置")
    }
    
    /**
     * 获取缓存的配置
     */
    fun getCachedConfig(): RemoteConfig? = cachedConfig
    
    /**
     * 获取上次获取配置的时间
     */
    fun getLastFetchTime(): Long = lastFetchTime
    
    /**
     * 检查是否需要更新应用
     */
    fun checkForUpdate(): UpdateInfo? {
        return cachedConfig?.updateInfo
    }
    
    /**
     * 清理资源
     */
    fun cleanup() {
        stopPeriodicRefresh()
        coroutineScope.cancel()
        cachedConfig = null
        Log.d(TAG, "RemoteConfigManager资源已清理")
    }
}
