package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Intent
import android.content.Context
import android.net.wifi.WifiManager
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.windowsandroidconnect.network.NetworkCommunication
import com.example.windowsandroidconnect.service.ClipboardService
import com.example.windowsandroidconnect.service.DeviceDiscoveryService
import com.example.windowsandroidconnect.service.NotificationService
import com.example.windowsandroidconnect.service.RemoteControlService
import com.example.windowsandroidconnect.service.ScreenCaptureService
import kotlinx.coroutines.*
import org.json.JSONObject
import java.util.*

// 导入R类以访问资源
import com.example.windowsandroidconnect.R

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
    private lateinit var networkCommunication: NetworkCommunication
    private lateinit var deviceAdapter: DeviceAdapter
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initNetworkCommunication()
        initViews()
        setupClickListeners()
        initializeDeviceDiscovery()
        startBackgroundServices()
    }
    
    private fun initViews() {
        deviceInfoText = findViewById(R.id.device_info_text)
        connectButton = findViewById(R.id.connect_button)
        fileTransferButton = findViewById(R.id.file_transfer_button)
        screenShareButton = findViewById(R.id.screen_share_button)
        deviceListRecycler = findViewById(R.id.device_list_recycler)
        statusText = findViewById(R.id.status_text)
        
        // 初始化设备适配器
        deviceAdapter = DeviceAdapter(discoveredDevices) { device ->
            // 点击设备项时的处理
            showToast("选择设备: ${device.deviceName}")
            // 可以在这里实现连接逻辑
        }
        
        // 设置RecyclerView
        deviceListRecycler.layoutManager = LinearLayoutManager(this)
        deviceListRecycler.adapter = deviceAdapter
        
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
    }

    /**
     * 初始化网络通信模块
     */
    private fun initNetworkCommunication() {
        networkCommunication = NetworkCommunication()
        networkCommunication.registerMessageHandler("control_command") { message ->
            handleControlCommand(message)
        }
        networkCommunication.registerMessageHandler("file_transfer") { message ->
            handleFileTransferRequest(message)
        }
        networkCommunication.registerMessageHandler("screen_stream_request") { message ->
            handleScreenStreamRequest(message)
        }
    }

    /**
     * 启动后台服务
     */
    private fun startBackgroundServices() {
        // 启动剪贴板同步服务
        val clipboardIntent = Intent(this, ClipboardService::class.java)
        startService(clipboardIntent)

        // 启动通知同步服务
        val notificationIntent = Intent(this, NotificationService::class.java)
        startService(notificationIntent)
    }

    /**
     * 处理控制命令
     */
    private fun handleControlCommand(message: JSONObject) {
        try {
            val command = message.getString("command")
            Log.d(TAG, "收到控制命令: $command")
            // 这里会转发给RemoteControlService处理
        } catch (e: Exception) {
            Log.e(TAG, "处理控制命令失败", e)
        }
    }

    /**
     * 处理文件传输请求
     */
    private fun handleFileTransferRequest(message: JSONObject) {
        try {
            val action = message.getString("action")
            Log.d(TAG, "收到文件传输请求: $action")
            // 这里会转发给FileTransferService处理
        } catch (e: Exception) {
            Log.e(TAG, "处理文件传输请求失败", e)
        }
    }

    /**
     * 处理屏幕流请求
     */
    private fun handleScreenStreamRequest(message: JSONObject) {
        try {
            val action = message.getString("action")
            Log.d(TAG, "收到屏幕流请求: $action")
            if (action == "start") {
                startScreenSharing()
            } else if (action == "stop") {
                stopScreenSharing()
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理屏幕流请求失败", e)
        }
    }

    /**
     * 停止屏幕共享
     */
    private fun stopScreenSharing() {
        val intent = Intent(this, ScreenCaptureService::class.java)
        stopService(intent)
        showToast("屏幕共享已停止")
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
     * 发送UDP广播和mDNS查询
     */
    private fun startDeviceDiscovery() {
        statusText.text = "正在搜索Windows设备..."
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // 发送UDP广播
                broadcastDeviceInfo()
                
                // 等待设备响应
                delay(5000)
                
                withContext(Dispatchers.Main) {
                    statusText.text = "设备发现完成"
                    // 更新设备列表UI
                    deviceAdapter.updateDevices(discoveredDevices)
                    updateUI()
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "设备发现失败", e)
                withContext(Dispatchers.Main) {
                    statusText.text = "设备发现失败"
                }
            }
        }
    }
    
    /**
     * 发送设备信息广播
     */
    private suspend fun broadcastDeviceInfo() {
        // TODO: 实现UDP广播逻辑
        // 这里需要发送设备信息到局域网的广播地址
        Log.d(TAG, "发送设备信息广播")
    }
    
    /**
     * 连接到Windows设备
     */
    private fun connectToWindowsDevice() {
        // 这里需要用户输入Windows设备的IP地址，或者从发现的设备列表中选择
        // 简化处理，使用固定IP进行演示
        val windowsDeviceIp = "192.168.1.100" // 需要替换为实际的Windows设备IP
        
        serviceScope.launch {
            try {
                withContext(Dispatchers.Main) {
                    statusText.text = "正在连接..."
                }
                
                // 连接到Windows设备 (端口8827是网络通信端口)
                val success = networkCommunication.connect(windowsDeviceIp, 8827)
                
                withContext(Dispatchers.Main) {
                    if (success) {
                        isConnected = true
                        statusText.text = "已连接到Windows设备: $windowsDeviceIp"
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
                    statusText.text = "连接失败: ${e.message}"
                    showToast("连接失败: ${e.message}")
                }
            }
        }
    }
    
    /**
     * 断开与设备的连接
     */
    private fun disconnectFromDevice() {
        networkCommunication.disconnect()
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
        // val intent = Intent(this, FileTransferActivity::class.java)
        // intent.putExtra("device_info", currentDevice)
        // startActivity(intent)
        
        showToast("文件传输功能开发中...")
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
     * 获取本地IP地址
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
        // TODO: 实现真实的网络连接逻辑
        // 这里需要通过TCP/WebSocket连接到Windows设备
        
        delay(2000) // 模拟连接延迟
        
        // 模拟连接成功
        return device.platform == "windows"
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
    
    companion object {
        private const val TAG = "MainActivity"
    }
}

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