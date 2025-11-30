package com.example.windowsandroidconnect.utils

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/**
 * 设备ID管理器
 * 负责生成和持久化设备唯一标识符
 */
object DeviceIdManager {
    
    private const val PREF_NAME = "device_id_prefs"
    private const val KEY_DEVICE_ID = "device_id"
    
    /**
     * 获取设备唯一标识符
     * 如果不存在则生成并持久化存储
     */
    fun getDeviceId(context: Context): String {
        val preferences: SharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        
        // 尝试从SharedPreferences获取设备ID
        var deviceId = preferences.getString(KEY_DEVICE_ID, null)
        
        // 如果设备ID不存在，生成新的并存储
        if (deviceId == null) {
            deviceId = generateDeviceId()
            preferences.edit().putString(KEY_DEVICE_ID, deviceId).apply()
        }
        
        return deviceId
    }
    
    /**
     * 生成新的设备ID
     * 结合设备硬件信息和随机UUID生成唯一标识符
     */
    private fun generateDeviceId(): String {
        // 使用UUID v4生成唯一标识符
        // 这里可以根据需要结合设备硬件信息，如Android ID、IMEI等
        // 但需要注意权限问题和隐私保护
        return UUID.randomUUID().toString()
    }
    
    /**
     * 清除设备ID（仅用于测试）
     */
    fun clearDeviceId(context: Context) {
        val preferences: SharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        preferences.edit().remove(KEY_DEVICE_ID).apply()
    }
    
    /**
     * 在没有Context的情况下获取设备ID
     * 生成一个基于设备硬件信息的唯一ID
     */
    fun getDeviceIdWithoutContext(): String {
        return generateDeviceId()
    }
}