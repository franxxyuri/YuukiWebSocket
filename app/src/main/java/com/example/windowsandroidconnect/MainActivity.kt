package com.example.windowsandroidconnect

import android.app.Activity
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.LinearLayoutManager
import android.content.Intent
import android.net.wifi.WifiManager
import android.content.Context
import android.provider.Settings
import java.net.InetAddress
import kotlinx.coroutines.*
import android.util.Log
import com.example.windowsandroidconnect.service.ScreenCaptureService
import com.example.windowsandroidconnect.service.RemoteControlService

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
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
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