package com.example.windowsandroidconnect

/**
 * 设备信息数据类
 */
data class DeviceInfo(
    val deviceId: String,
    val deviceName: String,
    val platform: String,
    val version: String,
    val ip: String,
    val capabilities: List<String>,
    var lastSeen: Long = System.currentTimeMillis()
)