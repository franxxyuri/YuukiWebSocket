package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import android.widget.EditText
import android.widget.ScrollView
import android.widget.LinearLayout
import android.view.View
import android.graphics.Color
import android.content.Context
import android.content.ClipboardManager
import android.provider.Settings
import com.example.windowsandroidconnect.service.*
import com.example.windowsandroidconnect.network.NetworkCommunication
import com.example.windowsandroidconnect.config.ClientConfig
import org.json.JSONObject
import java.util.*

/**
 * 模拟测试页面 - 用于测试所有功能模块
 * 支持模拟自建链路进行功能测试
 */
class MockTestActivity : Activity() {
    
    private lateinit var logText: TextView
    private lateinit var scrollView: ScrollView
    private lateinit var statusText: TextView
    private lateinit var mockServerIpInput: EditText
    private lateinit var mockServerPortInput: EditText
    
    // 测试功能按钮
    private lateinit var connectMockServerButton: Button
    private lateinit var disconnectMockServerButton: Button
    private lateinit var startScreenCaptureButton: Button
    private lateinit var stopScreenCaptureButton: Button
    private lateinit var startRemoteControlButton: Button
    private lateinit var stopRemoteControlButton: Button
    private lateinit var startFileTransferButton: Button
    private lateinit var startClipboardSyncButton: Button
    private lateinit var stopClipboardSyncButton: Button
    private lateinit var checkNotificationPermissionButton: Button
    private lateinit var startNotificationSyncButton: Button
    private lateinit var stopNotificationSyncButton: Button
    private lateinit var sendMockNotificationButton: Button
    private lateinit var clearLogButton: Button
    private lateinit var backButton: Button
    
    private var isConnected = false
    private var logEntries = mutableListOf<String>()
    private var networkCommunication: NetworkCommunication? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_mock_test)
        initViews()
        setupClickListeners()
        initializeNetwork()
    }
    
    private fun initViews() {
        // 创建模拟测试界面布局
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
        }
        
        // 标题
        val title = TextView(this).apply {
            text = "模拟测试页面 - 功能测试中心"
            textSize = 20f
            setTextColor(Color.BLACK)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(title)
        
        // 状态显示
        statusText = TextView(this).apply {
            text = "状态: 未连接模拟服务器"
            textSize = 16f
            setTextColor(Color.GRAY)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(statusText)
        
        // 模拟服务器设置
        val serverLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val serverTitle = TextView(this).apply {
            text = "模拟服务器设置:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        serverLayout.addView(serverTitle)
        
        val config = ClientConfig.getInstance(this)
        mockServerIpInput = EditText(this).apply {
            hint = "模拟服务器IP (例如: ${config.serverIp})"
            setText(config.serverIp)
        }
        serverLayout.addView(mockServerIpInput)
        
        val defaultPort = ClientConfig.getInstance(this).serverPort
        mockServerPortInput = EditText(this).apply {
            hint = "模拟服务器端口 (例如: $defaultPort)"
            setText(defaultPort.toString())
        }
        serverLayout.addView(mockServerPortInput)
        
        val serverButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        
        connectMockServerButton = Button(this).apply {
            text = "连接模拟服务器"
        }
        serverButtonLayout.addView(connectMockServerButton)
        
        disconnectMockServerButton = Button(this).apply {
            text = "断开服务器连接"
            isEnabled = false
        }
        serverButtonLayout.addView(disconnectMockServerButton)
        
        serverLayout.addView(serverButtonLayout)
        layout.addView(serverLayout)
        
        // 功能测试区域
        val functionTestLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val functionTitle = TextView(this).apply {
            text = "功能测试:"
            textSize = 16f
            setTextColor(Color.BLACK)
            setPadding(0, 0, 0, 8)
        }
        functionTestLayout.addView(functionTitle)
        
        // 屏幕捕获功能测试
        val screenCaptureLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        startScreenCaptureButton = Button(this).apply {
            text = "启动屏幕捕获"
        }
        screenCaptureLayout.addView(startScreenCaptureButton)
        stopScreenCaptureButton = Button(this).apply {
            text = "停止屏幕捕获"
            isEnabled = false
        }
        screenCaptureLayout.addView(stopScreenCaptureButton)
        functionTestLayout.addView(screenCaptureLayout)
        
        // 远程控制功能测试
        val remoteControlLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        startRemoteControlButton = Button(this).apply {
            text = "启动远程控制"
        }
        remoteControlLayout.addView(startRemoteControlButton)
        stopRemoteControlButton = Button(this).apply {
            text = "停止远程控制"
            isEnabled = false
        }
        remoteControlLayout.addView(stopRemoteControlButton)
        functionTestLayout.addView(remoteControlLayout)
        
        // 文件传输功能测试
        startFileTransferButton = Button(this).apply {
            text = "启动文件传输测试"
        }
        functionTestLayout.addView(startFileTransferButton)
        
        // 剪贴板同步功能测试
        val clipboardLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        startClipboardSyncButton = Button(this).apply {
            text = "启动剪贴板同步"
        }
        clipboardLayout.addView(startClipboardSyncButton)
        stopClipboardSyncButton = Button(this).apply {
            text = "停止剪贴板同步"
            isEnabled = false
        }
        clipboardLayout.addView(stopClipboardSyncButton)
        functionTestLayout.addView(clipboardLayout)
        
        // 通知同步功能测试
        val notificationLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        checkNotificationPermissionButton = Button(this).apply {
            text = "检查通知权限"
        }
        notificationLayout.addView(checkNotificationPermissionButton)
        startNotificationSyncButton = Button(this).apply {
            text = "启动通知同步"
            isEnabled = false
        }
        notificationLayout.addView(startNotificationSyncButton)
        stopNotificationSyncButton = Button(this).apply {
            text = "停止通知同步"
            isEnabled = false
        }
        notificationLayout.addView(stopNotificationSyncButton)
        functionTestLayout.addView(notificationLayout)
        
        // 发送模拟通知
        sendMockNotificationButton = Button(this).apply {
            text = "发送模拟通知测试"
        }
        functionTestLayout.addView(sendMockNotificationButton)
        
        layout.addView(functionTestLayout)
        
        // 日志显示
        val logTitle = TextView(this).apply {
            text = "测试日志:"
            textSize = 16f
            setTextColor(Color.BLACK)
            setPadding(0, 0, 0, 8)
        }
        layout.addView(logTitle)
        
        scrollView = ScrollView(this)
        logText = TextView(this).apply {
            text = "测试日志将显示在这里\n"
            textSize = 12f
            setTextColor(Color.BLACK)
        }
        scrollView.addView(logText)
        layout.addView(scrollView)
        
        // 底部按钮
        val bottomLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        
        clearLogButton = Button(this).apply {
            text = "清空日志"
        }
        bottomLayout.addView(clearLogButton)
        
        backButton = Button(this).apply {
            text = "返回主界面"
        }
        bottomLayout.addView(backButton)
        
        layout.addView(bottomLayout)
        
        // 设置布局
        setContentView(layout)
    }
    
    private fun setupClickListeners() {
        connectMockServerButton.setOnClickListener {
            connectToMockServer()
        }
        
        disconnectMockServerButton.setOnClickListener {
            disconnectFromMockServer()
        }
        
        startScreenCaptureButton.setOnClickListener {
            startMockScreenCapture()
        }
        
        stopScreenCaptureButton.setOnClickListener {
            stopMockScreenCapture()
        }
        
        startRemoteControlButton.setOnClickListener {
            startMockRemoteControl()
        }
        
        stopRemoteControlButton.setOnClickListener {
            stopMockRemoteControl()
        }
        
        startFileTransferButton.setOnClickListener {
            startMockFileTransfer()
        }
        
        startClipboardSyncButton.setOnClickListener {
            startMockClipboardSync()
        }
        
        stopClipboardSyncButton.setOnClickListener {
            stopMockClipboardSync()
        }
        
        checkNotificationPermissionButton.setOnClickListener {
            checkNotificationPermission()
        }
        
        startNotificationSyncButton.setOnClickListener {
            startMockNotificationSync()
        }
        
        stopNotificationSyncButton.setOnClickListener {
            stopMockNotificationSync()
        }
        
        sendMockNotificationButton.setOnClickListener {
            sendMockNotification()
        }
        
        clearLogButton.setOnClickListener {
            clearLog()
        }
        
        backButton.setOnClickListener {
            finish()
        }
    }
    
    private fun initializeNetwork() {
        networkCommunication = NetworkCommunication()
        logMessage("网络通信模块已初始化，准备进行模拟测试")
    }
    
    private fun connectToMockServer() {
        val ip = mockServerIpInput.text.toString()
        val port = mockServerPortInput.text.toString().toIntOrNull() ?: 8928
        
        if (ip.isEmpty()) {
            showToast("请输入模拟服务器IP地址")
            return
        }
        
        try {
            statusText.text = "正在连接模拟服务器..."
            logMessage("尝试连接到模拟服务器: $ip:$port")
            
            // 启动WebSocket连接服务
            val intent = Intent(this, WebSocketConnectionService::class.java).apply {
                action = WebSocketConnectionService.ACTION_CONNECT
                putExtra(WebSocketConnectionService.EXTRA_IP, ip)
                putExtra(WebSocketConnectionService.EXTRA_PORT, port)
            }
            startService(intent)
            
            isConnected = true
            updateButtonStates()
            statusText.text = "已连接模拟服务器: $ip:$port"
            logMessage("成功启动WebSocket连接服务到模拟服务器: $ip:$port")
            showToast("已连接模拟服务器")
        } catch (e: Exception) {
            logMessage("连接模拟服务器失败: ${e.message}")
            showToast("连接失败: ${e.message}")
        }
    }
    
    private fun disconnectFromMockServer() {
        try {
            val intent = Intent(this, WebSocketConnectionService::class.java).apply {
                action = WebSocketConnectionService.ACTION_DISCONNECT
            }
            startService(intent)
            
            networkCommunication?.disconnect()
            isConnected = false
            updateButtonStates()
            statusText.text = "已断开模拟服务器连接"
            logMessage("已断开模拟服务器连接")
            showToast("已断开连接")
        } catch (e: Exception) {
            logMessage("断开连接失败: ${e.message}")
        }
    }
    
    private fun startMockScreenCapture() {
        if (!isConnected) {
            showToast("请先连接到模拟服务器")
            return
        }
        
        try {
            // 启动屏幕捕获服务
            val intent = Intent(this, com.example.windowsandroidconnect.service.ScreenCaptureService::class.java)
            startForegroundService(intent)
            
            startScreenCaptureButton.isEnabled = false
            stopScreenCaptureButton.isEnabled = true
            logMessage("屏幕捕获服务已启动")
            showToast("屏幕捕获已启动")
        } catch (e: Exception) {
            logMessage("启动屏幕捕获失败: ${e.message}")
            showToast("启动屏幕捕获失败: ${e.message}")
        }
    }
    
    private fun stopMockScreenCapture() {
        try {
            val intent = Intent(this, com.example.windowsandroidconnect.service.ScreenCaptureService::class.java)
            stopService(intent)
            
            startScreenCaptureButton.isEnabled = true
            stopScreenCaptureButton.isEnabled = false
            logMessage("屏幕捕获服务已停止")
            showToast("屏幕捕获已停止")
        } catch (e: Exception) {
            logMessage("停止屏幕捕获失败: ${e.message}")
        }
    }
    
    private fun startMockRemoteControl() {
        if (!isConnected) {
            showToast("请先连接到模拟服务器")
            return
        }
        
        // 检查辅助功能权限
        if (!isAccessibilityServiceEnabled()) {
            requestAccessibilityPermission()
            return
        }
        
        try {
            // 启动远程控制服务
            val intent = Intent(this, RemoteControlService::class.java).apply {
                action = RemoteControlService.ACTION_ENABLE_CONTROL
                putExtra(RemoteControlService.EXTRA_DEVICE_ID, "mock_device")
                putExtra(RemoteControlService.EXTRA_DEVICE_IP, mockServerIpInput.text.toString())
                putExtra(RemoteControlService.EXTRA_DEVICE_PORT, mockServerPortInput.text.toString().toIntOrNull() ?: 8928)
            }
            startService(intent)
            
            startRemoteControlButton.isEnabled = false
            stopRemoteControlButton.isEnabled = true
            logMessage("远程控制服务已启动")
            showToast("远程控制已启动")
        } catch (e: Exception) {
            logMessage("启动远程控制失败: ${e.message}")
            showToast("启动远程控制失败: ${e.message}")
        }
    }
    
    private fun stopMockRemoteControl() {
        try {
            val intent = Intent(this, RemoteControlService::class.java).apply {
                action = RemoteControlService.ACTION_DISABLE_CONTROL
            }
            startService(intent)
            
            startRemoteControlButton.isEnabled = true
            stopRemoteControlButton.isEnabled = false
            logMessage("远程控制服务已停止")
            showToast("远程控制已停止")
        } catch (e: Exception) {
            logMessage("停止远程控制失败: ${e.message}")
        }
    }
    
    private fun startMockFileTransfer() {
        if (!isConnected) {
            showToast("请先连接到模拟服务器")
            return
        }
        
        try {
            // 启动文件传输测试
            val intent = Intent(this, FileTransferActivity::class.java)
            startActivity(intent)
            
            logMessage("文件传输测试已启动")
            showToast("文件传输测试已启动")
        } catch (e: Exception) {
            logMessage("启动文件传输测试失败: ${e.message}")
            showToast("启动文件传输测试失败: ${e.message}")
        }
    }
    
    private fun startMockClipboardSync() {
        if (!isConnected) {
            showToast("请先连接到模拟服务器")
            return
        }
        
        try {
            // 启动剪贴板同步服务
            val intent = Intent(this, ClipboardSyncService::class.java).apply {
                action = ClipboardSyncService.ACTION_START_SYNC
                putExtra(ClipboardSyncService.EXTRA_TARGET_DEVICE_ID, "mock_device")
            }
            startService(intent)
            
            startClipboardSyncButton.isEnabled = false
            stopClipboardSyncButton.isEnabled = true
            logMessage("剪贴板同步服务已启动")
            showToast("剪贴板同步已启动")
        } catch (e: Exception) {
            logMessage("启动剪贴板同步失败: ${e.message}")
            showToast("启动剪贴板同步失败: ${e.message}")
        }
    }
    
    private fun stopMockClipboardSync() {
        try {
            val intent = Intent(this, ClipboardSyncService::class.java).apply {
                action = ClipboardSyncService.ACTION_STOP_SYNC
            }
            startService(intent)
            
            startClipboardSyncButton.isEnabled = true
            stopClipboardSyncButton.isEnabled = false
            logMessage("剪贴板同步服务已停止")
            showToast("剪贴板同步已停止")
        } catch (e: Exception) {
            logMessage("停止剪贴板同步失败: ${e.message}")
        }
    }
    
    private fun checkNotificationPermission() {
        val enabled = isNotificationServiceEnabled()
        if (enabled) {
            logMessage("通知访问权限已启用")
            showToast("通知访问权限已启用")
            startNotificationSyncButton.isEnabled = true
        } else {
            logMessage("通知访问权限未启用，请在系统设置中开启")
            showToast("请开启通知访问权限")
            startNotificationSyncButton.isEnabled = false
        }
    }
    
    private fun startMockNotificationSync() {
        if (!isConnected) {
            showToast("请先连接到模拟服务器")
            return
        }
        
        if (!isNotificationServiceEnabled()) {
            showToast("请先启用通知访问权限")
            return
        }
        
        try {
            // 启动通知同步服务
            val intent = Intent(this, NotificationSyncService::class.java)
            startService(intent)
            
            startNotificationSyncButton.isEnabled = false
            stopNotificationSyncButton.isEnabled = true
            logMessage("通知同步服务已启动")
            showToast("通知同步已启动")
        } catch (e: Exception) {
            logMessage("启动通知同步失败: ${e.message}")
            showToast("启动通知同步失败: ${e.message}")
        }
    }
    
    private fun stopMockNotificationSync() {
        try {
            val intent = Intent(this, NotificationSyncService::class.java)
            stopService(intent)
            
            startNotificationSyncButton.isEnabled = true
            stopNotificationSyncButton.isEnabled = false
            logMessage("通知同步服务已停止")
            showToast("通知同步已停止")
        } catch (e: Exception) {
            logMessage("停止通知同步失败: ${e.message}")
        }
    }
    
    private fun sendMockNotification() {
        if (!isConnected) {
            showToast("请先连接到模拟服务器")
            return
        }
        
        try {
            // 模拟发送通知消息
            val notificationMessage = JSONObject().apply {
                put("type", "notification")
                put("title", "模拟通知测试")
                put("text", "这是一条来自模拟测试的通知")
                put("packageName", "com.example.mock")
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(notificationMessage)
            logMessage("已发送模拟通知: 模拟通知测试")
            showToast("模拟通知已发送")
        } catch (e: Exception) {
            logMessage("发送模拟通知失败: ${e.message}")
            showToast("发送模拟通知失败: ${e.message}")
        }
    }
    
    private fun isAccessibilityServiceEnabled(): Boolean {
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        
        return enabledServices.contains(packageName)
    }
    
    private fun requestAccessibilityPermission() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        showToast("请在辅助功能设置中启用本应用")
    }
    
    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners"
        )
        return flat?.contains(pkgName) ?: false
    }
    
    private fun updateButtonStates() {
        connectMockServerButton.isEnabled = !isConnected
        disconnectMockServerButton.isEnabled = isConnected
    }
    
    private fun logMessage(message: String) {
        val timestamp = android.text.format.DateFormat.format("HH:mm:ss", Date()).toString()
        val logEntry = "[$timestamp] $message"
        
        logEntries.add(logEntry)
        
        // 更新UI
        runOnUiThread {
            logText.append("$logEntry\n")
            
            // 滚动到底部
            scrollView.post {
                scrollView.scrollTo(0, logText.height)
            }
        }
        
        Log.d(TAG, message)
    }
    
    private fun clearLog() {
        logEntries.clear()
        logText.text = "测试日志已清空\n"
        logMessage("日志已清空")
    }
    
    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        networkCommunication?.disconnect()
    }
    
    companion object {
        private const val TAG = "MockTestActivity"
    }
}