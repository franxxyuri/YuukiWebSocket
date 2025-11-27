package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import android.widget.EditText
import android.widget.CheckBox
import android.widget.ScrollView
import android.widget.LinearLayout
import android.view.View
import android.view.ViewGroup
import android.graphics.Color
import com.example.windowsandroidconnect.service.DeviceDiscoveryService
import com.example.windowsandroidconnect.network.NetworkCommunication
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.service.WebSocketConnectionService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.*

/**
 * Android客户端调试测试页面
 * 用于调试和测试Android客户端的各项功能
 */
class DebugTestActivity : Activity() {
    
    private lateinit var statusText: TextView
    private lateinit var logText: TextView
    private lateinit var scrollView: ScrollView
    private lateinit var connectButton: Button
    private lateinit var disconnectButton: Button
    private lateinit var startDiscoveryButton: Button
    private lateinit var stopDiscoveryButton: Button
    private lateinit var sendDeviceInfoButton: Button
    private lateinit var sendScreenFrameButton: Button
    private lateinit var sendFileTransferButton: Button
    private lateinit var sendControlCommandButton: Button
    private lateinit var sendClipboardButton: Button
    private lateinit var sendNotificationButton: Button
    private lateinit var clearLogButton: Button
    private lateinit var backButton: Button
    
    private lateinit var serverIpInput: EditText
    private lateinit var serverPortInput: EditText
    private lateinit var deviceNameInput: EditText
    private lateinit var deviceIdInput: EditText
    private lateinit var screenFrameDataInput: EditText
    private lateinit var clipboardDataInput: EditText
    private lateinit var notificationTitleInput: EditText
    private lateinit var notificationTextInput: EditText
    
    private lateinit var autoConnectCheckbox: CheckBox
    private lateinit var autoSendCheckbox: CheckBox
    
    private var networkCommunication: NetworkCommunication? = null
    private var isConnected = false
    private var logEntries = mutableListOf<String>()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_debug_test)
        
        initViews()
        setupClickListeners()
        initializeNetwork()
    }
    
    private fun initViews() {
        // 创建调试界面布局
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
        }
        
        // 标题
        val title = TextView(this).apply {
            text = "Android客户端调试测试页面"
            textSize = 20f
            setTextColor(Color.BLACK)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(title)
        
        // 状态显示
        statusText = TextView(this).apply {
            text = "未连接"
            textSize = 16f
            setTextColor(Color.GRAY)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(statusText)
        
        // 服务器连接设置
        val connectionLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val connectionTitle = TextView(this).apply {
            text = "服务器连接设置:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        connectionLayout.addView(connectionTitle)
        
        val config = ClientConfig.getInstance(this)
        serverIpInput = EditText(this).apply {
            hint = "服务器IP地址 (例如: ${config.serverIp})"
            setText(config.serverIp)  // 使用配置中的IP地址
        }
        connectionLayout.addView(serverIpInput)
        
        val defaultPort = ClientConfig.getInstance(this).serverPort
        serverPortInput = EditText(this).apply {
            hint = "服务器端口 (例如: $defaultPort)"
            setText(defaultPort.toString())
        }
        connectionLayout.addView(serverPortInput)
        
        val connectLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        
        connectButton = Button(this).apply {
            text = "连接服务器"
        }
        connectLayout.addView(connectButton)
        
        disconnectButton = Button(this).apply {
            text = "断开连接"
            isEnabled = false
        }
        connectLayout.addView(disconnectButton)
        
        connectionLayout.addView(connectLayout)
        layout.addView(connectionLayout)
        
        // 设备信息设置
        val deviceLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val deviceTitle = TextView(this).apply {
            text = "设备信息设置:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        deviceLayout.addView(deviceTitle)
        
        deviceNameInput = EditText(this).apply {
            hint = "设备名称"
            setText(android.os.Build.MODEL)
        }
        deviceLayout.addView(deviceNameInput)
        
        deviceIdInput = EditText(this).apply {
            hint = "设备ID"
            setText(UUID.randomUUID().toString())
        }
        deviceLayout.addView(deviceIdInput)
        
        sendDeviceInfoButton = Button(this).apply {
            text = "发送设备信息"
            isEnabled = false
        }
        deviceLayout.addView(sendDeviceInfoButton)
        
        layout.addView(deviceLayout)
        
        // 设备发现功能
        val discoveryLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val discoveryTitle = TextView(this).apply {
            text = "设备发现功能:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        discoveryLayout.addView(discoveryTitle)
        
        val discoveryButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        
        startDiscoveryButton = Button(this).apply {
            text = "开始设备发现"
        }
        discoveryButtonLayout.addView(startDiscoveryButton)
        
        stopDiscoveryButton = Button(this).apply {
            text = "停止设备发现"
        }
        discoveryButtonLayout.addView(stopDiscoveryButton)
        
        discoveryLayout.addView(discoveryButtonLayout)
        layout.addView(discoveryLayout)
        
        // 屏幕帧发送
        val screenLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val screenTitle = TextView(this).apply {
            text = "屏幕帧发送:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        screenLayout.addView(screenTitle)
        
        screenFrameDataInput = EditText(this).apply {
            hint = "屏幕帧数据 (Base64)"
            setText("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
        }
        screenLayout.addView(screenFrameDataInput)
        
        sendScreenFrameButton = Button(this).apply {
            text = "发送屏幕帧"
            isEnabled = false
        }
        screenLayout.addView(sendScreenFrameButton)
        
        layout.addView(screenLayout)
        
        // 文件传输
        val fileLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val fileTitle = TextView(this).apply {
            text = "文件传输:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        fileLayout.addView(fileTitle)
        
        sendFileTransferButton = Button(this).apply {
            text = "发送文件传输消息"
            isEnabled = false
        }
        fileLayout.addView(sendFileTransferButton)
        
        layout.addView(fileLayout)
        
        // 控制命令
        val controlLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val controlTitle = TextView(this).apply {
            text = "控制命令:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        controlLayout.addView(controlTitle)
        
        sendControlCommandButton = Button(this).apply {
            text = "发送控制命令"
            isEnabled = false
        }
        controlLayout.addView(sendControlCommandButton)
        
        layout.addView(controlLayout)
        
        // 剪贴板同步
        val clipboardLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val clipboardTitle = TextView(this).apply {
            text = "剪贴板同步:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        clipboardLayout.addView(clipboardTitle)
        
        clipboardDataInput = EditText(this).apply {
            hint = "剪贴板内容"
            setText("Android测试剪贴板内容")
        }
        clipboardLayout.addView(clipboardDataInput)
        
        sendClipboardButton = Button(this).apply {
            text = "发送剪贴板内容"
            isEnabled = false
        }
        clipboardLayout.addView(sendClipboardButton)
        
        layout.addView(clipboardLayout)
        
        // 通知同步
        val notificationLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val notificationTitle = TextView(this).apply {
            text = "通知同步:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        notificationLayout.addView(notificationTitle)
        
        notificationTitleInput = EditText(this).apply {
            hint = "通知标题"
            setText("测试通知")
        }
        notificationLayout.addView(notificationTitleInput)
        
        notificationTextInput = EditText(this).apply {
            hint = "通知内容"
            setText("这是一条测试通知")
        }
        notificationLayout.addView(notificationTextInput)
        
        sendNotificationButton = Button(this).apply {
            text = "发送通知"
            isEnabled = false
        }
        notificationLayout.addView(sendNotificationButton)
        
        layout.addView(notificationLayout)
        
        // 自动化选项
        val autoLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        autoConnectCheckbox = CheckBox(this).apply {
            text = "自动连接到服务器"
        }
        autoLayout.addView(autoConnectCheckbox)
        
        autoSendCheckbox = CheckBox(this).apply {
            text = "自动发送测试消息"
        }
        autoLayout.addView(autoSendCheckbox)
        
        layout.addView(autoLayout)
        
        // 日志显示
        val logTitle = TextView(this).apply {
            text = "调试日志:"
            textSize = 16f
            setTextColor(Color.BLACK)
            setPadding(0, 0, 0, 8)
        }
        layout.addView(logTitle)
        
        scrollView = ScrollView(this)
        logText = TextView(this).apply {
            text = "调试日志将显示在这里\n"
            textSize = 12f
            setTextColor(Color.BLACK)
        }
        scrollView.addView(logText)
        layout.addView(scrollView)
        
        // 按钮布局
        val buttonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        
        clearLogButton = Button(this).apply {
            text = "清空日志"
        }
        buttonLayout.addView(clearLogButton)
        
        backButton = Button(this).apply {
            text = "返回"
        }
        buttonLayout.addView(backButton)
        
        layout.addView(buttonLayout)
        
        // 设置布局
        setContentView(layout)
    }
    
    private fun setupClickListeners() {
        connectButton.setOnClickListener {
            connectToServer()
        }
        
        disconnectButton.setOnClickListener {
            disconnectFromServer()
        }
        
        sendDeviceInfoButton.setOnClickListener {
            sendDeviceInfo()
        }
        
        startDiscoveryButton.setOnClickListener {
            startDeviceDiscovery()
        }
        
        stopDiscoveryButton.setOnClickListener {
            stopDeviceDiscovery()
        }
        
        sendScreenFrameButton.setOnClickListener {
            sendScreenFrame()
        }
        
        sendFileTransferButton.setOnClickListener {
            sendFileTransfer()
        }
        
        sendControlCommandButton.setOnClickListener {
            sendControlCommand()
        }
        
        sendClipboardButton.setOnClickListener {
            sendClipboard()
        }
        
        sendNotificationButton.setOnClickListener {
            sendNotification()
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
        logMessage("网络通信模块已初始化")
    }
    
    private fun connectToServer() {
        val ip = serverIpInput.text.toString()
        val port = serverPortInput.text.toString().toIntOrNull() ?: ClientConfig.getInstance(this).serverPort
        
        if (ip.isEmpty()) {
            showToast("请输入服务器IP地址")
            return
        }
        
        try {
            statusText.text = "正在连接到 $ip:$port..."
            logMessage("正在连接到服务器: $ip:$port")
            
            // 启动WebSocket连接服务
            val intent = Intent(this, WebSocketConnectionService::class.java).apply {
                action = WebSocketConnectionService.ACTION_CONNECT
                putExtra(WebSocketConnectionService.EXTRA_IP, ip)
                putExtra(WebSocketConnectionService.EXTRA_PORT, port)
            }
            startService(intent)
            
            isConnected = true
            updateButtonStates()
            statusText.text = "已连接到 $ip:$port"
            showToast("连接服务已启动")
            logMessage("WebSocket连接服务已启动")
            
            // 自动发送设备信息
            if (autoSendCheckbox.isChecked) {
                sendDeviceInfo()
            }
        } catch (e: Exception) {
            statusText.text = "启动连接服务失败: ${e.message}"
            showToast("启动连接服务失败: ${e.message}")
            logMessage("启动连接服务异常: ${e.message}")
        }
    }
    
    private fun disconnectFromServer() {
        try {
            networkCommunication?.disconnect()
            isConnected = false
            updateButtonStates()
            statusText.text = "已断开连接"
            showToast("已断开连接")
            logMessage("已断开与服务器的连接")
        } catch (e: Exception) {
            logMessage("断开连接异常: ${e.message}")
        }
    }
    
    private fun sendDeviceInfo() {
        if (!isConnected) {
            showToast("未连接到服务器")
            return
        }
        
        try {
            val deviceInfo = JSONObject().apply {
                put("type", "device_info")
                put("deviceInfo", JSONObject().apply {
                    put("platform", "android")
                    put("deviceName", deviceNameInput.text.toString())
                    put("deviceId", deviceIdInput.text.toString())
                    put("model", android.os.Build.MODEL)
                    put("version", "1.0.0")
                })
            }
            
            networkCommunication?.sendMessage(deviceInfo)
            logMessage("已发送设备信息: ${deviceInfo.toString()}")
            showToast("设备信息已发送")
        } catch (e: Exception) {
            logMessage("发送设备信息异常: ${e.message}")
            showToast("发送设备信息失败: ${e.message}")
        }
    }
    
    private fun startDeviceDiscovery() {
        try {
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_START_DISCOVERY
            startService(intent)
            
            logMessage("设备发现服务已启动")
            showToast("设备发现服务已启动")
        } catch (e: Exception) {
            logMessage("启动设备发现服务异常: ${e.message}")
            showToast("启动设备发现服务失败")
        }
    }
    
    private fun stopDeviceDiscovery() {
        try {
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_STOP_DISCOVERY
            startService(intent)
            
            logMessage("设备发现服务已停止")
            showToast("设备发现服务已停止")
        } catch (e: Exception) {
            logMessage("停止设备发现服务异常: ${e.message}")
            showToast("停止设备发现服务失败")
        }
    }
    
    private fun sendScreenFrame() {
        if (!isConnected) {
            showToast("未连接到服务器")
            return
        }
        
        try {
            val screenFrame = JSONObject().apply {
                put("type", "screen_frame")
                put("frameData", screenFrameDataInput.text.toString())
                put("timestamp", System.currentTimeMillis())
                put("width", 1080)
                put("height", 1920)
            }
            
            networkCommunication?.sendMessage(screenFrame)
            logMessage("已发送屏幕帧")
            showToast("屏幕帧已发送")
        } catch (e: Exception) {
            logMessage("发送屏幕帧异常: ${e.message}")
            showToast("发送屏幕帧失败: ${e.message}")
        }
    }
    
    private fun sendFileTransfer() {
        if (!isConnected) {
            showToast("未连接到服务器")
            return
        }
        
        try {
            val fileTransfer = JSONObject().apply {
                put("type", "file_transfer")
                put("action", "send")
                put("filePath", "/storage/emulated/0/test.txt")
                put("fileName", "test.txt")
                put("fileSize", 1024)
            }
            
            networkCommunication?.sendMessage(fileTransfer)
            logMessage("已发送文件传输消息")
            showToast("文件传输消息已发送")
        } catch (e: Exception) {
            logMessage("发送文件传输消息异常: ${e.message}")
            showToast("发送文件传输消息失败: ${e.message}")
        }
    }
    
    private fun sendControlCommand() {
        if (!isConnected) {
            showToast("未连接到服务器")
            return
        }
        
        try {
            val controlCommand = JSONObject().apply {
                put("type", "control_command")
                put("commandType", "click")
                put("x", 100)
                put("y", 200)
            }
            
            networkCommunication?.sendMessage(controlCommand)
            logMessage("已发送控制命令")
            showToast("控制命令已发送")
        } catch (e: Exception) {
            logMessage("发送控制命令异常: ${e.message}")
            showToast("发送控制命令失败: ${e.message}")
        }
    }
    
    private fun sendClipboard() {
        if (!isConnected) {
            showToast("未连接到服务器")
            return
        }
        
        try {
            val clipboard = JSONObject().apply {
                put("type", "clipboard")
                put("action", "sync")
                put("data", clipboardDataInput.text.toString())
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(clipboard)
            logMessage("已发送剪贴板内容")
            showToast("剪贴板内容已发送")
        } catch (e: Exception) {
            logMessage("发送剪贴板内容异常: ${e.message}")
            showToast("发送剪贴板内容失败: ${e.message}")
        }
    }
    
    private fun sendNotification() {
        if (!isConnected) {
            showToast("未连接到服务器")
            return
        }
        
        try {
            val notification = JSONObject().apply {
                put("type", "notification")
                put("action", "new")
                put("title", notificationTitleInput.text.toString())
                put("text", notificationTextInput.text.toString())
                put("packageName", "com.example.test")
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(notification)
            logMessage("已发送通知")
            showToast("通知已发送")
        } catch (e: Exception) {
            logMessage("发送通知异常: ${e.message}")
            showToast("发送通知失败: ${e.message}")
        }
    }
    
    private fun updateButtonStates() {
        val connected = isConnected
        sendDeviceInfoButton.isEnabled = connected
        sendScreenFrameButton.isEnabled = connected
        sendFileTransferButton.isEnabled = connected
        sendControlCommandButton.isEnabled = connected
        sendClipboardButton.isEnabled = connected
        sendNotificationButton.isEnabled = connected
        disconnectButton.isEnabled = connected
        connectButton.isEnabled = !connected
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
        logText.text = "调试日志已清空\n"
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
        private const val TAG = "DebugTestActivity"
    }
}