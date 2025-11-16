package com.example.windowsandroidconnect.service



import android.app.Service

import android.content.Context

import android.content.Intent

import android.net.wifi.WifiManager

import android.os.IBinder

import android.util.Log

import com.example.windowsandroidconnect.MyApplication

import com.example.windowsandroidconnect.network.NetworkCommunication

import kotlinx.coroutines.*

import org.json.JSONObject

import java.net.DatagramPacket

import java.net.DatagramSocket

import java.net.InetAddress

import java.util.*

import java.util.concurrent.ConcurrentHashMap



/**

 * 设备发现服务

 * 通过UDP广播在局域网中搜索Windows设备

 */

class DeviceDiscoveryService : Service() {

    

    private lateinit var wifiManager: WifiManager

    private var isDiscovering = false

    private var broadcastSocket: DatagramSocket? = null

    private val discoveredDevices = ConcurrentHashMap<String, Map<String, Any>>()

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private var networkCommunication: NetworkCommunication? = null

    

    private val broadcastPort = 8090 // 设备发现UDP广播端口

    private val deviceTimeout = 30000L // 30秒超时

    

    override fun onCreate() {

        super.onCreate()

        wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

        

        // 获取网络通信实例

        networkCommunication = (application as? MyApplication)?.networkCommunication

        

        Log.d(TAG, "设备发现服务已启动")

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

        

        // 启动广播和监听

        serviceScope.launch {

            launch { startBroadcast() }

            launch { startListening() }

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

                val deviceInfo = getCurrentDeviceInfo()

                val message = "ANDROID_DEVICE:${deviceInfo["deviceName"]}:${deviceInfo["ip"]}:${deviceInfo["version"]}"

                val data = message.toByteArray()

                val packet = DatagramPacket(data, data.size, InetAddress.getByName("255.255.255.255"), broadcastPort)

                

                socket.send(packet)

                Log.d(TAG, "发送设备广播: $message")

                

                // 同时通过网络通信模块发送设备信息

                sendDeviceInfoViaNetwork()

                

                kotlinx.coroutines.delay(3000) // 每3秒广播一次

            }

            

        } catch (e: Exception) {

            Log.e(TAG, "广播失败", e)

        }

    }

    

    /**

     * 通过网络通信模块发送设备信息

     */

    private suspend fun sendDeviceInfoViaNetwork() {

        try {

            if (networkCommunication != null && networkCommunication!!.isConnected()) {

                val deviceInfo = JSONObject().apply {

                    put("type", "device_info")

                    put("deviceInfo", JSONObject().apply {

                        put("deviceId", generateDeviceId())

                        put("deviceName", getDeviceName())

                        put("platform", "android")

                        put("version", "1.0.0")

                        put("ip", getLocalIPAddress())

                        put("capabilities", listOf(

                            "file_transfer",

                            "screen_mirror",

                            "remote_control",

                            "notification",

                            "clipboard_sync"

                        ))

                    })

                }

                

                networkCommunication?.sendMessage(deviceInfo)

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

                Log.d(TAG, "收到设备消息: $message")

                

                if (message.startsWith("WINDOWS_DEVICE")) {

                    parseWindowsDeviceInfo(message, packet.address.hostAddress)

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

        val parts = message.split(":")

        if (parts.size >= 4 && ip != null) {

            val device = mapOf(

                "deviceId" to (parts.getOrNull(1) ?: ""),

                "deviceName" to (parts.getOrNull(2) ?: ""),

                "platform" to "windows",

                "version" to (parts.getOrNull(3) ?: ""),

                "ip" to ip,

                "capabilities" to emptyList<String>()

            )

            

            discoveredDevices[device["deviceId"] as String] = device

            Log.d(TAG, "发现Windows设备: ${device["deviceName"]} ($ip)")

            

            // 通过网络通信模块通知设备发现

            notifyDeviceDiscovered(device)

        }

    }

    

    /**

     * 通知设备发现

     */

    private fun notifyDeviceDiscovered(device: Map<String, Any>) {

        try {

            if (networkCommunication != null && networkCommunication!!.isConnected()) {

                val message = JSONObject().apply {

                    put("type", "device_discovered")

                    put("deviceInfo", JSONObject(device))

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

    private fun getCurrentDeviceInfo(): Map<String, Any> {

        return mapOf(

            "deviceId" to generateDeviceId(),

            "deviceName" to getDeviceName(),

            "platform" to "android",

            "version" to "1.0.0",

            "ip" to getLocalIPAddress(),

            "capabilities" to listOf("file_transfer", "screen_mirror", "remote_control", "notification", "clipboard_sync")

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

    

    companion object {

        private const val TAG = "DeviceDiscoveryService"

        const val ACTION_START_DISCOVERY = "start_discovery"

        const val ACTION_STOP_DISCOVERY = "stop_discovery"

    }

}