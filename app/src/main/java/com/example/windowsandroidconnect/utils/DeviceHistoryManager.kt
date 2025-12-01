package com.example.windowsandroidconnect.utils

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.windowsandroidconnect.DeviceInfo
import org.json.JSONArray
import org.json.JSONObject

/**
 * 设备历史记录管理器
 * 管理已连接过的设备记录，支持快速重连
 */
class DeviceHistoryManager(private val context: Context) {
    
    companion object {
        private const val TAG = "DeviceHistoryManager"
        private const val PREFS_NAME = "device_history"
        private const val KEY_DEVICES = "devices"
        private const val KEY_LAST_CONNECTED = "last_connected"
        private const val MAX_HISTORY_SIZE = 20
    }
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    /**
     * 设备历史记录条目
     */
    data class DeviceHistoryEntry(
        val deviceId: String,
        val deviceName: String,
        val platform: String,
        val ip: String,
        val port: Int,
        val lastConnectedTime: Long,
        val connectionCount: Int,
        val isFavorite: Boolean = false,
        val customName: String? = null
    )
    
    /**
     * 保存设备到历史记录
     */
    fun saveDevice(device: DeviceInfo) {
        val devices = getDeviceHistory().toMutableList()
        
        // 查找是否已存在
        val existingIndex = devices.indexOfFirst { it.deviceId == device.deviceId }
        
        val entry = if (existingIndex != -1) {
            // 更新现有记录
            val existing = devices[existingIndex]
            devices.removeAt(existingIndex)
            existing.copy(
                deviceName = device.deviceName,
                ip = device.ip,
                port = device.port,
                lastConnectedTime = System.currentTimeMillis(),
                connectionCount = existing.connectionCount + 1
            )
        } else {
            // 创建新记录
            DeviceHistoryEntry(
                deviceId = device.deviceId,
                deviceName = device.deviceName,
                platform = device.platform,
                ip = device.ip,
                port = device.port,
                lastConnectedTime = System.currentTimeMillis(),
                connectionCount = 1
            )
        }
        
        // 添加到列表开头
        devices.add(0, entry)
        
        // 保持列表大小在限制内（保留收藏的设备）
        val favoriteDevices = devices.filter { it.isFavorite }
        val nonFavoriteDevices = devices.filter { !it.isFavorite }
        val trimmedNonFavorite = nonFavoriteDevices.take(MAX_HISTORY_SIZE - favoriteDevices.size)
        val finalList = (favoriteDevices + trimmedNonFavorite).sortedByDescending { it.lastConnectedTime }
        
        saveDeviceList(finalList)
        
        // 更新最后连接的设备
        prefs.edit().putString(KEY_LAST_CONNECTED, device.deviceId).apply()
        
        Log.d(TAG, "设备已保存到历史记录: ${device.deviceName}")
    }
    
    /**
     * 获取设备历史记录
     */
    fun getDeviceHistory(): List<DeviceHistoryEntry> {
        return try {
            val json = prefs.getString(KEY_DEVICES, "[]") ?: "[]"
            val jsonArray = JSONArray(json)
            val devices = mutableListOf<DeviceHistoryEntry>()
            
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                devices.add(parseDeviceEntry(obj))
            }
            
            devices.sortedByDescending { it.lastConnectedTime }
        } catch (e: Exception) {
            Log.e(TAG, "读取设备历史记录失败", e)
            emptyList()
        }
    }
    
    /**
     * 获取最近连接的设备
     */
    fun getRecentDevices(limit: Int = 5): List<DeviceHistoryEntry> {
        return getDeviceHistory().take(limit)
    }
    
    /**
     * 获取收藏的设备
     */
    fun getFavoriteDevices(): List<DeviceHistoryEntry> {
        return getDeviceHistory().filter { it.isFavorite }
    }
    
    /**
     * 获取最后连接的设备
     */
    fun getLastConnectedDevice(): DeviceHistoryEntry? {
        val lastId = prefs.getString(KEY_LAST_CONNECTED, null) ?: return null
        return getDeviceHistory().find { it.deviceId == lastId }
    }
    
    /**
     * 设置设备为收藏
     */
    fun setFavorite(deviceId: String, isFavorite: Boolean) {
        val devices = getDeviceHistory().toMutableList()
        val index = devices.indexOfFirst { it.deviceId == deviceId }
        
        if (index != -1) {
            devices[index] = devices[index].copy(isFavorite = isFavorite)
            saveDeviceList(devices)
            Log.d(TAG, "设备收藏状态已更新: $deviceId -> $isFavorite")
        }
    }
    
    /**
     * 设置设备自定义名称
     */
    fun setCustomName(deviceId: String, customName: String?) {
        val devices = getDeviceHistory().toMutableList()
        val index = devices.indexOfFirst { it.deviceId == deviceId }
        
        if (index != -1) {
            devices[index] = devices[index].copy(customName = customName)
            saveDeviceList(devices)
            Log.d(TAG, "设备自定义名称已更新: $deviceId -> $customName")
        }
    }
    
    /**
     * 更新设备IP地址
     */
    fun updateDeviceIp(deviceId: String, newIp: String, newPort: Int? = null) {
        val devices = getDeviceHistory().toMutableList()
        val index = devices.indexOfFirst { it.deviceId == deviceId }
        
        if (index != -1) {
            devices[index] = devices[index].copy(
                ip = newIp,
                port = newPort ?: devices[index].port
            )
            saveDeviceList(devices)
            Log.d(TAG, "设备IP已更新: $deviceId -> $newIp")
        }
    }
    
    /**
     * 移除设备记录
     */
    fun removeDevice(deviceId: String) {
        val devices = getDeviceHistory().toMutableList()
        devices.removeAll { it.deviceId == deviceId }
        saveDeviceList(devices)
        
        // 如果移除的是最后连接的设备，清除记录
        if (prefs.getString(KEY_LAST_CONNECTED, null) == deviceId) {
            prefs.edit().remove(KEY_LAST_CONNECTED).apply()
        }
        
        Log.d(TAG, "设备已从历史记录中移除: $deviceId")
    }
    
    /**
     * 清空历史记录
     */
    fun clearHistory(keepFavorites: Boolean = true) {
        if (keepFavorites) {
            val favorites = getFavoriteDevices()
            saveDeviceList(favorites)
            Log.d(TAG, "历史记录已清空（保留收藏）")
        } else {
            prefs.edit()
                .remove(KEY_DEVICES)
                .remove(KEY_LAST_CONNECTED)
                .apply()
            Log.d(TAG, "历史记录已完全清空")
        }
    }
    
    /**
     * 搜索设备
     */
    fun searchDevices(query: String): List<DeviceHistoryEntry> {
        val lowerQuery = query.lowercase()
        return getDeviceHistory().filter { device ->
            device.deviceName.lowercase().contains(lowerQuery) ||
            device.customName?.lowercase()?.contains(lowerQuery) == true ||
            device.ip.contains(lowerQuery) ||
            device.deviceId.lowercase().contains(lowerQuery)
        }
    }
    
    /**
     * 获取设备统计信息
     */
    fun getStatistics(): DeviceStatistics {
        val devices = getDeviceHistory()
        return DeviceStatistics(
            totalDevices = devices.size,
            favoriteDevices = devices.count { it.isFavorite },
            totalConnections = devices.sumOf { it.connectionCount },
            mostConnectedDevice = devices.maxByOrNull { it.connectionCount },
            lastConnectedDevice = getLastConnectedDevice()
        )
    }
    
    /**
     * 设备统计信息
     */
    data class DeviceStatistics(
        val totalDevices: Int,
        val favoriteDevices: Int,
        val totalConnections: Int,
        val mostConnectedDevice: DeviceHistoryEntry?,
        val lastConnectedDevice: DeviceHistoryEntry?
    )
    
    /**
     * 将历史记录条目转换为DeviceInfo
     */
    fun toDeviceInfo(entry: DeviceHistoryEntry): DeviceInfo {
        return DeviceInfo(
            deviceId = entry.deviceId,
            deviceName = entry.customName ?: entry.deviceName,
            platform = entry.platform,
            version = "1.0.0",
            ip = entry.ip,
            port = entry.port,
            capabilities = listOf("file_transfer", "screen_mirror", "remote_control", "notification", "clipboard_sync"),
            lastSeen = entry.lastConnectedTime
        )
    }
    
    /**
     * 保存设备列表
     */
    private fun saveDeviceList(devices: List<DeviceHistoryEntry>) {
        val jsonArray = JSONArray()
        devices.forEach { device ->
            jsonArray.put(deviceToJson(device))
        }
        prefs.edit().putString(KEY_DEVICES, jsonArray.toString()).apply()
    }
    
    /**
     * 将设备条目转换为JSON
     */
    private fun deviceToJson(device: DeviceHistoryEntry): JSONObject {
        return JSONObject().apply {
            put("deviceId", device.deviceId)
            put("deviceName", device.deviceName)
            put("platform", device.platform)
            put("ip", device.ip)
            put("port", device.port)
            put("lastConnectedTime", device.lastConnectedTime)
            put("connectionCount", device.connectionCount)
            put("isFavorite", device.isFavorite)
            device.customName?.let { put("customName", it) }
        }
    }
    
    /**
     * 从JSON解析设备条目
     */
    private fun parseDeviceEntry(json: JSONObject): DeviceHistoryEntry {
        return DeviceHistoryEntry(
            deviceId = json.getString("deviceId"),
            deviceName = json.getString("deviceName"),
            platform = json.optString("platform", "unknown"),
            ip = json.getString("ip"),
            port = json.optInt("port", 8928),
            lastConnectedTime = json.getLong("lastConnectedTime"),
            connectionCount = json.optInt("connectionCount", 1),
            isFavorite = json.optBoolean("isFavorite", false),
            customName = json.optString("customName").takeIf { it.isNotEmpty() }
        )
    }
}
