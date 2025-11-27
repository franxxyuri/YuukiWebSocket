package com.example.windowsandroidconnect

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.LinearLayoutManager
import android.content.Context
import android.net.wifi.WifiManager
import android.provider.Settings
import java.net.InetAddress
import kotlinx.coroutines.*
import android.util.Log
import com.example.windowsandroidconnect.service.RemoteControlService
import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import com.example.windowsandroidconnect.service.DeviceDiscoveryService
import com.example.windowsandroidconnect.network.NetworkCommunication
import org.json.JSONObject
import com.example.windowsandroidconnect.service.WebSocketConnectionService

/**
 * Windows-Android Connect Android客户端
 * 
 * 这个Activity展示了未来的Android客户端主要功能：
 * - 设备发现和连接
 * - 文件传输
 * - 屏幕共享
 * - 远程控制
 * - 通知同步
 * - 剪贴板同步
 */
class MainActivity : Activity() {
    
    private lateinit var deviceInfoText: TextView
    private lateinit var connectButton: Button
    private lateinit var fileTransferButton: Button
    private lateinit var screenShareButton: Button
    private lateinit var deviceListRecycler: RecyclerView
    private lateinit var statusText: TextView
    
    private val discoveredDevices = mutableListOf<DeviceInfo>()
    private var isConnected = false
    private var currentDevice: DeviceInfo? = null
    private var networkCommunication: NetworkCommunication? = null
    private val connectionStatusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                "com.example.windowsandroidconnect.CONNECTION_STATUS_CHANGED" -> {
                    val connected = intent.getBooleanExtra("connected", false)
                    isConnected = connected
                    runOnUiThread {
                        updateUI()
                        if (connected) {
                            statusText.text = "已连接到Windows设备"
                            showToast("连接成功")
                        } else {
                            statusText.text = "连接已断开"
                        }
                    }
                }
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // 初始化网络通信
        networkCommunication = (application as? MyApplication)?.networkCommunication
        setupNetworkMessageHandlers()
        registerConnectionStatusReceiver()
        
        initViews()
        setupClickListeners()
        initializeDeviceDiscovery()
    }
    
    private fun initViews() {
        deviceInfoText = findViewById(R.id.device_info_text)
        connectButton = findViewById(R.id.connect_button)
        fileTransferButton = findViewById(R.id.file_transfer_button)
        screenShareButton = findViewById(R.id.screen_share_button)
        deviceListRecycler = findViewById(R.id.device_list_recycler)
        statusText = findViewById(R.id.status_text)
        
        // 设置RecyclerView
        deviceListRecycler.layoutManager = LinearLayoutManager(this)
        
        updateUI()
    }
    
    private fun setupClickListeners() {
        connectButton.setOnClickListener {
            if (isConnected) {
                disconnectFromDevice()
            } else {
                connectToWindowsDevice()
            }
        }
        
        fileTransferButton.setOnClickListener {
            if (isConnected) {
                startFileTransfer()
            } else {
                showToast("请先连接到Windows设备")
            }
        }
        
        screenShareButton.setOnClickListener {
            if (isConnected) {
                startScreenSharing()
            } else {
                showToast("请先连接到Windows设备")
            }
        }
        
        // 添加测试页面导航按钮
        val testPageButton = findViewById<Button>(R.id.test_page_button)
        testPageButton.setOnClickListener {
            val intent = Intent(this, DeviceDiscoveryTestActivity::class.java)
            startActivity(intent)
        }
        
        val configButton = findViewById<Button>(R.id.config_button)
        configButton.setOnClickListener {
            val intent = Intent(this, ClientConfigActivity::class.java)
            startActivity(intent)
        }
        
        val debugTestButton = findViewById<Button>(R.id.debug_test_button)
        debugTestButton.setOnClickListener {
            val intent = Intent(this, DebugTestActivity::class.java)
            startActivity(intent)
        }
    }
    
    /**
     * 设置网络消息处理器
     */
    private fun setupNetworkMessageHandlers() {
        networkCommunication?.registerMessageHandler("device_discovered") { message ->
            runOnUiThread {
                try {
                    val deviceInfoJson = message.getJSONObject("deviceInfo")
                    val device = DeviceInfo(
                        deviceId = deviceInfoJson.optString("deviceId"),
                        deviceName = deviceInfoJson.optString("deviceName"),
                        platform = deviceInfoJson.optString("platform"),
                        version = deviceInfoJson.optString("version"),
                        ip = deviceInfoJson.optString("ip"),
                        capabilities = if (deviceInfoJson.has("capabilities")) {
                            val capabilitiesArray = deviceInfoJson.getJSONArray("capabilities")
                            val capabilitiesList = mutableListOf<String>()
                            for (i in 0 until capabilitiesArray.length()) {
                                capabilitiesList.add(capabilitiesArray.getString(i))
                            }
                            capabilitiesList
                        } else {
                            listOf("file_transfer", "screen_mirror", "remote_control", "notification", "clipboard_sync")
                        }
                    )
                    
                    // 检查设备是否已存在
                    val existingIndex = discoveredDevices.indexOfFirst { it.deviceId == device.deviceId }
                    if (existingIndex != -1) {
                        // 更新现有设备
                        discoveredDevices[existingIndex] = device
                    } else {
                        // 添加新设备
                        discoveredDevices.add(device)
                    }
                    
                    Log.d(TAG, "发现设备: ${device.deviceName} (${device.ip})")
                    statusText.text = "发现设备: ${device.deviceName}"
                    showToast("发现新设备: ${device.deviceName}")
                } catch (e: Exception) {
                    Log.e(TAG, "解析设备信息失败", e)
                }
            }
        }
    }
    
    /**
     * 初始化设备发现服务
     * 负责在局域网中搜索Windows设备
     */
    private fun initializeDeviceDiscovery() {
        val deviceInfo = DeviceInfo(
            deviceId = generateDeviceId(),
            deviceName = android.os.Build.MODEL,
            platform = "android",
            version = "1.0.0",
            ip = getLocalIPAddress(),
            capabilities = listOf(
                "file_transfer",
                "screen_mirror", 
                "remote_control",
                "notification",
                "clipboard_sync"
            )
        )
        
        deviceInfoText.text = """
            设备信息:
            名称: ${deviceInfo.deviceName}
            IP地址: ${deviceInfo.ip}
            平台: ${deviceInfo.platform}
            版本: ${deviceInfo.version}
        """.trimIndent()
        
        // 开始设备发现
        startDeviceDiscovery()
    }
    
    /**
     * 开始设备发现
     * 启动设备发现服务
     */
    private fun startDeviceDiscovery() {
        statusText.text = "正在搜索Windows设备..."
        try {
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_START_DISCOVERY
            startService(intent)
            Log.d(TAG, "设备发现服务已启动")
            showToast("设备发现服务已启动，正在搜索设备...")
        } catch (e: Exception) {
            Log.e(TAG, "启动设备发现服务失败", e)
            statusText.text = "设备发现服务启动失败"
            showToast("设备发现服务启动失败")
        }
    }
    
    /**
     * 连接到Windows设备
     */
    private fun connectToWindowsDevice() {
        if (discoveredDevices.isEmpty()) {
            showToast("未发现Windows设备")
            return
        }
        
        val windowsDevice = discoveredDevices.firstOrNull { it.platform == "windows" }
        if (windowsDevice == null) {
            showToast("未发现Windows设备")
            return
        }
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                withContext(Dispatchers.Main) {
                    statusText.text = "正在连接..."
                }
                
                // 连接到Windows设备
                val success = connectToDevice(windowsDevice)
                
                withContext(Dispatchers.Main) {
                    if (success) {
                        isConnected = true
                        currentDevice = windowsDevice
                        statusText.text = "已连接到 ${windowsDevice.deviceName}"
                        showToast("连接成功")
                        updateUI()
                    } else {
                        statusText.text = "连接失败"
                        showToast("连接失败")
                    }
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "连接设备失败", e)
                withContext(Dispatchers.Main) {
                    statusText.text = "连接失败"
                    showToast("连接失败: ${e.message}")
                }
            }
        }
    }
    
    /**
     * 断开与设备的连接
     */
    private fun disconnectFromDevice() {
        // TODO: 实现断开连接逻辑
        isConnected = false
        currentDevice = null
        statusText.text = "已断开连接"
        updateUI()
        showToast("已断开连接")
    }
    
    /**
     * 启动文件传输
     */
    private fun startFileTransfer() {
        if (!isConnected || currentDevice == null) {
            showToast("未连接到Windows设备")
            return
        }
        
        // 启动文件传输Activity或Service
        val intent = Intent(this, FileTransferActivity::class.java)
        intent.putExtra("device_info", currentDevice)
        startActivity(intent)
    }
    
    /**
     * 启动屏幕共享
     */
    private fun startScreenSharing() {
        if (!isConnected || currentDevice == null) {
            showToast("未连接到Windows设备")
            return
        }
        
        // 检查屏幕共享权限
        checkScreenCapturePermission()
    }
    
    /**
     * 启动远程控制
     */
    private fun startRemoteControl() {
        if (!isConnected || currentDevice == null) {
            showToast("未连接到Windows设备")
            return
        }
        
        // 检查辅助功能权限
        if (!isAccessibilityServiceEnabled()) {
            showToast("请先启用辅助功能权限")
            requestAccessibilityPermission()
            return
        }
        
        // 启动远程控制服务
        val intent = Intent(this, RemoteControlService::class.java).apply {
            action = RemoteControlService.ACTION_ENABLE_CONTROL
            putExtra(RemoteControlService.EXTRA_DEVICE_ID, currentDevice!!.deviceId)
            putExtra(RemoteControlService.EXTRA_DEVICE_IP, currentDevice!!.ip)
            putExtra(RemoteControlService.EXTRA_DEVICE_PORT, 8085)
        }
        
        startService(intent)
        showToast("远程控制已启用")
        
        Log.d(TAG, "远程控制已启用")
    }
    
    /**
     * 停止远程控制
     */
    private fun stopRemoteControl() {
        val intent = Intent(this, RemoteControlService::class.java).apply {
            action = RemoteControlService.ACTION_DISABLE_CONTROL
        }
        
        startService(intent)
        showToast("远程控制已禁用")
        
        Log.d(TAG, "远程控制已禁用")
    }
    
    /**
     * 检查辅助功能服务是否启用
     */
    private fun isAccessibilityServiceEnabled(): Boolean {
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        
        return enabledServices.contains("com.example.windowsandroidconnect/.service.RemoteControlService")
    }
    
    /**
     * 请求辅助功能权限
     */
    private fun requestAccessibilityPermission() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        showToast("请在辅助功能设置中启用'Windows-Android Connect'")
    }
    
    /**
     * 检查屏幕捕获权限
     */
    private fun checkScreenCapturePermission() {
        // TODO: 检查和请求屏幕捕获权限
        // 使用MediaProjection API
        
        // 启动屏幕捕获服务
        val intent = Intent(this, ScreenCaptureService::class.java)
        startForegroundService(intent)
        
        showToast("正在启动屏幕共享...")
    }
    
    /**
     * 获取本地IP
     */
    private fun getLocalIPAddress(): String {
        val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val dhcpInfo = wifiManager.dhcpInfo
        return android.text.format.Formatter.formatIpAddress(dhcpInfo.serverAddress)
    }
    
    /**
     * 生成设备ID
     */
    private fun generateDeviceId(): String {
        return java.util.UUID.randomUUID().toString()
    }
    
    /**
     * 连接到设备
     * 返回连接是否成功
     */
    private suspend fun connectToDevice(device: DeviceInfo): Boolean {
        return try {
            // 启动WebSocket连接服务
            val intent = Intent(this, WebSocketConnectionService::class.java).apply {
                action = WebSocketConnectionService.ACTION_CONNECT
                putExtra(WebSocketConnectionService.EXTRA_IP, device.ip)
                putExtra(WebSocketConnectionService.EXTRA_PORT, 8928)
            }
            startService(intent)
            // 连接状态会通过广播通知更新
            true
        } catch (e: Exception) {
            Log.e(TAG, "启动连接服务失败", e)
            false
        }
    }
    
    private fun updateUI() {
        if (isConnected) {
            connectButton.text = "断开连接"
            connectButton.setBackgroundColor(getColor(android.R.color.holo_red_dark))
            fileTransferButton.visibility = View.VISIBLE
            screenShareButton.visibility = View.VISIBLE
        } else {
            connectButton.text = "连接"
            connectButton.setBackgroundColor(getColor(android.R.color.holo_blue_dark))
            fileTransferButton.visibility = View.GONE
            screenShareButton.visibility = View.GONE
        }
    }
    
    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    private fun registerConnectionStatusReceiver() {
        val filter = IntentFilter("com.example.windowsandroidconnect.CONNECTION_STATUS_CHANGED")
        registerReceiver(connectionStatusReceiver, filter)
    }

    override fun onDestroy() {
        super.onDestroy()
        // 注销消息处理器
        networkCommunication?.unregisterMessageHandler("device_discovered")
        unregisterReceiver(connectionStatusReceiver)
    }
    
    companion object {
        private const val TAG = "MainActivity"
    }
}

/**
 * 设备信息数据类
 */
@Parcelize
data class DeviceInfo(
    val deviceId: String,
    val deviceName: String,
    val platform: String,
    val version: String,
    val ip: String,
    val capabilities: List<String>,
    var lastSeen: Long = System.currentTimeMillis()
) : Parcelable