package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.wifi.WifiManager
import android.os.IBinder
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.network.NetworkCommunication
import com.example.windowsandroidconnect.config.ClientConfig
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.*
import java.util.concurrent.ConcurrentHashMap

/**
 * 设备发现服务
 * 通过UDP广播和mDNS在局域网中搜索Windows设备
 */
class DeviceDiscoveryService : Service() {

    private lateinit var wifiManager: WifiManager
    private var isDiscovering = false
    private var broadcastSocket: DatagramSocket? = null
    private val discoveredDevices = ConcurrentHashMap<String, DeviceInfoWrapper>()
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var networkCommunication: NetworkCommunication? = null

    // 设备发现配置
    private val broadcastPort: Int by lazy {
        ClientConfig.getInstance(this@DeviceDiscoveryService).discoveryPort
    }
    private val serverPort: Int by lazy {
        ClientConfig.getInstance(this@DeviceDiscoveryService).serverPort
    }
    private val serverIp: String by lazy {
        ClientConfig.getInstance(this@DeviceDiscoveryService).serverIp
    }
    private val deviceTimeout = 30000L // 30秒超时

    override fun onCreate() {
        super.onCreate()
        wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

        // 获取网络通信实例
        networkCommunication = (application as? MyApplication)?.networkCommunication

        Log.d(TAG, "设备发现服务已启动，配置: port=$broadcastPort, serverIp=$serverIp")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "收到服务启动命令: ${intent?.action}")

        when (intent?.action) {
            ACTION_START_DISCOVERY -> startDiscovery()
            ACTION_STOP_DISCOVERY -> stopDiscovery()
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        stopDiscovery()
        serviceScope.cancel()
        Log.d(TAG, "设备发现服务已停止")
    }

    /**
     * 开始设备发现
     */
    private fun startDiscovery() {
        if (isDiscovering) return

        isDiscovering = true
        Log.d(TAG, "开始设备发现...")

        // 清除之前发现的设备
        discoveredDevices.clear()

        // 启动广播和监听
        serviceScope.launch {
            launch { startBroadcast() }
            launch { startListening() }
            launch { cleanupExpiredDevices() }
        }
    }

    /**
     * 停止设备发现
     */
    private fun stopDiscovery() {
        if (!isDiscovering) return

        isDiscovering = false
        broadcastSocket?.close()
        broadcastSocket = null
        Log.d(TAG, "设备发现已停止")
    }

    /**
     * 启动UDP广播
     */
    private suspend fun startBroadcast() {
        try {
            val socket = DatagramSocket()
            broadcastSocket = socket

            while (isDiscovering) {
                // 发送UDP广播
                sendUdpBroadcast(socket)

                // 尝试连接到配置的服务器IP（作为备选发现方式）
                sendDirectDiscovery()

                // 每5秒广播一次
                kotlinx.coroutines.delay(5000)
            }

        } catch (e: Exception) {
            Log.e(TAG, "广播失败", e)
        }
    }

    /**
     * 发送UDP广播
     */
    private suspend fun sendUdpBroadcast(socket: DatagramSocket) {
        try {
            val deviceInfo = getCurrentDeviceInfo()
            val message = "ANDROID_DEVICE:${deviceInfo.id}:${deviceInfo.name}:${deviceInfo.version}"
            val data = message.toByteArray()
            val packet = DatagramPacket(data, data.size, InetAddress.getByName("255.255.255.255"), broadcastPort)

            socket.send(packet)
            Log.d(TAG, "发送UDP设备广播: $message")
        } catch (e: Exception) {
            Log.e(TAG, "发送UDP广播失败", e)
        }
    }

    /**
     * 向配置的服务器IP发送直接发现请求
     */
    private suspend fun sendDirectDiscovery() {
        try {
            val deviceInfo = getCurrentDeviceInfo()
            val message = "ANDROID_DEVICE:${deviceInfo.id}:${deviceInfo.name}:${deviceInfo.version}"
            val data = message.toByteArray()
            val packet = DatagramPacket(data, data.size, InetAddress.getByName(serverIp), broadcastPort)

            val socket = DatagramSocket()
            socket.send(packet)
            socket.close()
            Log.d(TAG, "发送直接设备发现到: $serverIp:$broadcastPort")
        } catch (e: Exception) {
            Log.e(TAG, "发送直接发现请求失败", e)
        }
    }

    /**
     * 通过网络通信模块发送设备信息
     */
    private suspend fun sendDeviceInfoViaNetwork() {
        try {
            if (networkCommunication != null && networkCommunication!!.isConnected()) {
                val deviceInfo = getCurrentDeviceInfo()
                val jsonMessage = JSONObject().apply {
                    put("type", "device_info")
                    put("deviceInfo", JSONObject().apply {
                        put("deviceId", deviceInfo.id)
                        put("deviceName", deviceInfo.name)
                        put("platform", deviceInfo.platform)
                        put("version", deviceInfo.version)
                        put("ip", deviceInfo.ip)
                        put("capabilities", org.json.JSONArray(deviceInfo.capabilities))
                        put("port", serverPort) // 发送我们监听的端口
                    })
                }

                networkCommunication?.sendMessage(jsonMessage)
            }
        } catch (e: Exception) {
            Log.e(TAG, "通过网络发送设备信息失败", e)
        }
    }

    /**
     * 启动UDP监听
     */
    private suspend fun startListening() {
        try {
            val socket = DatagramSocket(broadcastPort)
            val buffer = ByteArray(1024)

            while (isDiscovering) {
                val packet = DatagramPacket(buffer, buffer.size)
                socket.receive(packet)

                val message = String(packet.data, 0, packet.length)
                val senderIp = packet.address.hostAddress
                Log.d(TAG, "收到设备消息: $message 来自: $senderIp")

                // 解析不同类型的设备信息
                when {
                    message.startsWith("WINDOWS_DEVICE") -> {
                        parseWindowsDeviceInfo(message, senderIp)
                    }
                    message.startsWith("ANDROID_DEVICE") -> {
                        parseAndroidDeviceInfo(message, senderIp)
                    }
                    else -> {
                        Log.w(TAG, "未知设备消息类型: $message")
                    }
                }
            }

        } catch (e: Exception) {
            Log.e(TAG, "监听失败", e)
        }
    }

    /**
     * 解析Windows设备信息
     */
    private fun parseWindowsDeviceInfo(message: String, ip: String?) {
        if (ip == null) return

        val parts = message.split(":")
        if (parts.size >= 4) {
            val deviceInfo = DeviceInfoWrapper(
                id = parts.getOrNull(1) ?: generateDeviceId(),
                name = parts.getOrNull(2) ?: "Unknown Windows Device",
                platform = "windows",
                version = parts.getOrNull(3) ?: "1.0.0",
                ip = ip,
                port = serverPort, // 假设Windows设备使用标准端口
                capabilities = listOf(
                    "file_transfer",
                    "screen_mirror",
                    "remote_control",
                    "notification",
                    "clipboard_sync"
                ),
                lastSeen = System.currentTimeMillis()
            )

            // 检查是否已存在相同的设备
            val existingDevice = discoveredDevices[deviceInfo.id]
            if (existingDevice == null || existingDevice.lastSeen < deviceInfo.lastSeen - 5000) {
                discoveredDevices[deviceInfo.id] = deviceInfo
                Log.d(TAG, "发现Windows设备: ${deviceInfo.name} ($ip)")

                // 通过网络通信模块通知设备发现
                notifyDeviceDiscovered(deviceInfo)
            }
        }
    }

    /**
     * 解析Android设备信息
     */
    private fun parseAndroidDeviceInfo(message: String, ip: String?) {
        if (ip == null) return

        val parts = message.split(":")
        if (parts.size >= 4) {
            val deviceInfo = DeviceInfoWrapper(
                id = parts.getOrNull(1) ?: generateDeviceId(),
                name = parts.getOrNull(2) ?: "Unknown Android Device",
                platform = "android",
                version = parts.getOrNull(3) ?: "1.0.0",
                ip = ip,
                port = serverPort,
                capabilities = listOf(
                    "file_transfer",
                    "screen_mirror",
                    "remote_control",
                    "notification",
                    "clipboard_sync"
                ),
                lastSeen = System.currentTimeMillis()
            )

            // 更新或添加设备
            discoveredDevices[deviceInfo.id] = deviceInfo
            Log.d(TAG, "发现Android设备: ${deviceInfo.name} ($ip)")

            // 通知发现设备（用于UI更新）
            notifyDeviceDiscovered(deviceInfo)
        }
    }

    /**
     * 清理过期的设备
     */
    private suspend fun cleanupExpiredDevices() {
        while (isDiscovering) {
            val currentTime = System.currentTimeMillis()
            val expiredDevices = discoveredDevices.filter { 
                currentTime - it.value.lastSeen > deviceTimeout 
            }

            for ((deviceId, _) in expiredDevices) {
                discoveredDevices.remove(deviceId)
                Log.d(TAG, "移除过期设备: $deviceId")
            }

            delay(10000) // 每10秒清理一次
        }
    }

    /**
     * 通知设备发现
     */
    private fun notifyDeviceDiscovered(device: DeviceInfoWrapper) {
        try {
            if (networkCommunication != null && networkCommunication!!.isConnected()) {
                val message = JSONObject().apply {
                    put("type", "device_discovered")
                    put("deviceInfo", JSONObject().apply {
                        put("deviceId", device.id)
                        put("deviceName", device.name)
                        put("platform", device.platform)
                        put("version", device.version)
                        put("ip", device.ip)
                        put("port", device.port)
                        put("capabilities", org.json.JSONArray(device.capabilities))
                    })
                }
                networkCommunication?.sendMessage(message)
            }
        } catch (e: Exception) {
            Log.e(TAG, "通知设备发现失败", e)
        }
    }

    /**
     * 获取当前设备信息
     */
    private fun getCurrentDeviceInfo(): DeviceInfoWrapper {
        return DeviceInfoWrapper(
            id = generateDeviceId(),
            name = getDeviceName(),
            platform = "android",
            version = "1.0.0",
            ip = getLocalIPAddress(),
            port = serverPort,
            capabilities = listOf(
                "file_transfer",
                "screen_mirror",
                "remote_control",
                "notification",
                "clipboard_sync"
            ),
            lastSeen = System.currentTimeMillis()
        )
    }

    /**
     * 获取本地IP地址
     */
    private fun getLocalIPAddress(): String {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                if (networkInterface.isLoopback || networkInterface.isVirtual || !networkInterface.isUp) {
                    continue
                }

                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address.hostAddress.indexOf(':') == -1) {
                        return address.hostAddress
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "获取本地IP地址失败", e)
        }
        return "127.0.0.1"
    }

    /**
     * 获取设备名称
     */
    private fun getDeviceName(): String {
        return android.os.Build.MODEL
    }

    /**
     * 生成设备ID
     */
    private fun generateDeviceId(): String {
        return UUID.randomUUID().toString()
    }

    /**
     * 获取所有已发现的设备
     */
    fun getDiscoveredDevices(): List<DeviceInfoWrapper> {
        return discoveredDevices.values.toList()
    }

    companion object {
        private const val TAG = "DeviceDiscoveryService"
        const val ACTION_START_DISCOVERY = "start_discovery"
        const val ACTION_STOP_DISCOVERY = "stop_discovery"
    }
}

/**
 * 设备信息包装类
 */
data class DeviceInfoWrapper(
    val id: String,
    val name: String,
    val platform: String,
    val version: String,
    val ip: String,
    val port: Int,
    val capabilities: List<String>,
    val lastSeen: Long
)