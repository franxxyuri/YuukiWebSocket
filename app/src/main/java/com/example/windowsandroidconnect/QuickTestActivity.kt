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
import com.example.windowsandroidconnect.network.NetworkCommunication
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.connection.*
import com.example.windowsandroidconnect.service.OptimizedScreenCaptureService
import com.example.windowsandroidconnect.service.ScreenCaptureService
import com.example.windowsandroidconnect.service.RemoteControlService
import com.example.windowsandroidconnect.service.ClipboardSyncService
import com.example.windowsandroidconnect.service.NotificationSyncService
import com.example.windowsandroidconnect.service.DeviceDiscoveryService
import com.example.windowsandroidconnect.test.LocalTestServer
import com.example.windowsandroidconnect.test.LocalWebSocketTestServer
import com.example.windowsandroidconnect.FileTransferActivity
import kotlinx.coroutines.*
import org.json.JSONObject
import java.util.*

/**
 * 快速功能验证测试页面
 * 用于快速验证各项功能是否正常工作
 */
class QuickTestActivity : Activity() {
    
    private lateinit var logText: TextView
    private lateinit var scrollView: ScrollView
    private lateinit var debugLogText: TextView
    private lateinit var debugScrollView: ScrollView
    private lateinit var statusText: TextView
    private lateinit var connectButton: Button
    private lateinit var disconnectButton: Button
    private lateinit var connectionStatusText: TextView
    private lateinit var serverIpInput: EditText
    private lateinit var serverPortInput: EditText
    private lateinit var testAllButton: Button
    private lateinit var testScreenCaptureButton: Button
    private lateinit var testRemoteControlButton: Button
    private lateinit var testFileTransferButton: Button
    private lateinit var testClipboardSyncButton: Button
    private lateinit var testNotificationSyncButton: Button
    private lateinit var testDeviceDiscoveryButton: Button
    private lateinit var startDiscoveryButton: Button
    private lateinit var stopDiscoveryButton: Button
    private lateinit var deviceListText: TextView
    private lateinit var clearLogButton: Button
    private lateinit var backButton: Button
    
    private var logEntries = mutableListOf<String>()
    private var networkCommunication: NetworkCommunication? = null
    private var connectionManager: ConnectionManager? = null
    private var connectionTypeSpinner: android.widget.Spinner? = null
    private var localTestServer: LocalTestServer? = null
    private var localWebSocketTestServer: LocalWebSocketTestServer? = null
    private var startLocalServerButton: Button? = null
    private var stopLocalServerButton: Button? = null
    private var localServerPortInput: EditText? = null
    private var oneClickTestButton: Button? = null
    private var stopOneClickTestButton: Button? = null
    private var isOneClickTestRunning = false  // 跟踪一键自测是否正在运行
    private var isConnected = false
    private val discoveredDevices = mutableMapOf<String, String>()  // deviceId to deviceInfo map
    private val deviceDiscoveryReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                "com.example.windowsandroidconnect.DEVICE_FOUND" -> {
                    val deviceInfo = intent.getStringExtra("deviceInfo")
                    val deviceId = intent.getStringExtra("deviceId")
                    if (deviceInfo != null && deviceId != null) {
                        discoveredDevices[deviceId] = deviceInfo
                        updateDeviceList()
                        logMessage("发现新设备: $deviceInfo")
                    }
                }
                "com.example.windowsandroidconnect.DEVICE_LOST" -> {
                    val deviceId = intent.getStringExtra("deviceId")
                    if (deviceId != null && discoveredDevices.containsKey(deviceId)) {
                        val deviceInfo = discoveredDevices[deviceId]
                        discoveredDevices.remove(deviceId)
                        updateDeviceList()
                        logMessage("设备离线: $deviceInfo")
                    }
                }
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_quick_test)
        initViews()
        setupClickListeners()
        initializeNetwork()
        registerDeviceDiscoveryReceiver()
    }
    
    private fun initViews() {
        // 创建主滚动布局以支持平板和小屏设备
        val mainScrollView = ScrollView(this)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
            setBackgroundColor(Color.parseColor("#FFFFFF")) // 白色背景
        }
        
        // 标题
        val title = TextView(this).apply {
            text = "快速功能验证测试页面"
            textSize = 24f
            setTextColor(Color.parseColor("#2196F3")) // 蓝色标题
            setPadding(0, 0, 0, 24)
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = android.view.Gravity.CENTER
        }
        layout.addView(title)
        
        // 连接管理模块标题
        val connectionTitle = TextView(this).apply {
            text = "连接管理模块:"
            textSize = 18f
            setTextColor(Color.parseColor("#FF9800")) // 橙色标题
            setPadding(0, 0, 0, 8)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(connectionTitle)
        
        // 服务器配置卡片
        val serverConfigCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
            setBackgroundColor(Color.parseColor("#F5F5F5"))
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 16)
            this@apply.layoutParams = layoutParams
        }
        
        val serverInputLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 0, 0, 16)
        }
        val ipLabel = TextView(this).apply {
            text = "服务器IP: "
            textSize = 14f
            setTextColor(Color.BLACK)
        }
        serverInputLayout.addView(ipLabel)
        serverIpInput = EditText(this).apply {
            setText("192.168.124.18") // 默认IP，可以根据需要修改
            setPadding(12, 12, 12, 12)
            hint = "输入服务器IP地址"
            setBackgroundResource(android.R.drawable.edit_text)
        }
        serverInputLayout.addView(serverIpInput)
        val portLabel = TextView(this).apply {
            text = " 端口: "
            textSize = 14f
            setTextColor(Color.BLACK)
        }
        serverInputLayout.addView(portLabel)
        serverPortInput = EditText(this).apply {
            setText("8928") // 默认端口
            setPadding(12, 12, 12, 12)
            hint = "输入服务器端口"
            setBackgroundResource(android.R.drawable.edit_text)
        }
        serverInputLayout.addView(serverPortInput)
        serverConfigCard.addView(serverInputLayout)
        
        // 连接按钮布局
        val connectionButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
        }
        connectButton = Button(this).apply {
            text = "连接服务器"
            setPadding(24, 12, 24, 12)
            setBackgroundColor(Color.parseColor("#4CAF50")) // 绿色
            setTextColor(Color.WHITE)
        }
        connectionButtonLayout.addView(connectButton)
        
        disconnectButton = Button(this).apply {
            text = "断开连接"
            setPadding(24, 12, 24, 12)
            setBackgroundColor(Color.parseColor("#F44336")) // 红色
            setTextColor(Color.WHITE)
            isEnabled = false
        }
        connectionButtonLayout.addView(disconnectButton)
        serverConfigCard.addView(connectionButtonLayout)
        
        // 一键自测按钮（放在连接按钮下方，非常显眼）
        val oneClickTestButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            setPadding(0, 8, 0, 0)
        }
        oneClickTestButton = Button(this).apply {
            text = "一键自测"
            setPadding(32, 16, 32, 16) // 更大的内边距
            setBackgroundColor(Color.parseColor("#9C27B0")) // 紫色，更显眼
            setTextColor(Color.WHITE)
            minWidth = 200 // 设置最小宽度
        }
        oneClickTestButtonLayout.addView(oneClickTestButton)
        
        // 停止一键自测按钮
        val stopOneClickTestButton = Button(this).apply {
            text = "停止测试"
            setPadding(32, 16, 32, 16) // 更大的内边距
            setBackgroundColor(Color.parseColor("#F44336")) // 红色，表示停止
            setTextColor(Color.WHITE)
            minWidth = 200 // 设置最小宽度
            isEnabled = false // 默认禁用，只在测试运行时启用
        }
        oneClickTestButtonLayout.addView(stopOneClickTestButton)
        serverConfigCard.addView(oneClickTestButtonLayout)
        
        // 连接类型选择布局
        val connectionTypeLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            setPadding(0, 8, 0, 0)
        }
        
        val connectionTypeLabel = TextView(this).apply {
            text = "连接类型: "
            textSize = 14f
            setTextColor(Color.BLACK)
        }
        connectionTypeLayout.addView(connectionTypeLabel)
        
        connectionTypeSpinner = android.widget.Spinner(this)
        connectionTypeLayout.addView(connectionTypeSpinner)
        serverConfigCard.addView(connectionTypeLayout)
        
        // 初始化连接类型Spinner
        initializeConnectionTypeSpinner(connectionTypeSpinner!!)
        
        layout.addView(serverConfigCard)
        
        // 系统信息显示
        val systemInfoText = TextView(this).apply {
            text = getSystemInfo()
            textSize = 12f
            setTextColor(Color.DKGRAY)
            setPadding(16, 8, 16, 8)
            setBackgroundColor(Color.parseColor("#F9F9F9"))
        }
        layout.addView(systemInfoText)
        
        // 连接状态显示
        connectionStatusText = TextView(this).apply {
            text = "连接状态: 未连接"
            textSize = 16f
            setTextColor(Color.GRAY)
            setPadding(16, 16, 16, 16)
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = android.view.Gravity.CENTER
        }
        layout.addView(connectionStatusText)
        
        // 状态显示
        statusText = TextView(this).apply {
            text = "状态: 准备就绪进行测试"
            textSize = 16f
            setTextColor(Color.parseColor("#2196F3"))
            setPadding(0, 8, 0, 16)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(statusText)
        
        // 功能模块标题
        val discoveryTitle = TextView(this).apply {
            text = "设备发现功能模块:"
            textSize = 18f
            setTextColor(Color.parseColor("#FF9800")) // 橙色标题
            setPadding(0, 0, 0, 8)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(discoveryTitle)
        
        // 设备发现按钮卡片
        val discoveryCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
            setBackgroundColor(Color.parseColor("#F5F5F5"))
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 16)
            this@apply.layoutParams = layoutParams
        }
        
        // 设备发现按钮布局
        val discoveryButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
        }
        startDiscoveryButton = Button(this).apply {
            text = "启动设备发现"
            setPadding(24, 12, 24, 12)
            setBackgroundColor(Color.parseColor("#2196F3")) // 蓝色
            setTextColor(Color.WHITE)
        }
        discoveryButtonLayout.addView(startDiscoveryButton)
        stopDiscoveryButton = Button(this).apply {
            text = "停止设备发现"
            setPadding(24, 12, 24, 12)
            setBackgroundColor(Color.parseColor("#9E9E9E")) // 灰色
            setTextColor(Color.WHITE)
            isEnabled = false
        }
        discoveryButtonLayout.addView(stopDiscoveryButton)
        discoveryCard.addView(discoveryButtonLayout)
        
        layout.addView(discoveryCard)
        
        // 设备列表显示
        val deviceListTitle = TextView(this).apply {
            text = "发现的设备列表:"
            textSize = 16f
            setTextColor(Color.parseColor("#795548")) // 棕色标题
            setPadding(0, 0, 0, 8)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(deviceListTitle)
        
        // 创建可点击的设备列表容器
        val deviceListScrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (100 * resources.displayMetrics.density).toInt() // 减小高度到100dp
            )
            setPadding(8, 8, 8, 8)
            setBackgroundColor(Color.parseColor("#F9F9F9"))
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                (100 * resources.displayMetrics.density).toInt()
            )
            layoutParams.setMargins(0, 0, 0, 16)
            this@apply.layoutParams = layoutParams
        }
        
        // 使用LinearLayout作为设备列表容器，支持点击事件
        val deviceListLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(8, 8, 8, 8)
        }
        
        // 初始设备列表文本
        deviceListText = TextView(this).apply {
            text = """暂无设备
"""
            textSize = 12f
            setTextColor(Color.DKGRAY)
        }
        deviceListLayout.addView(deviceListText)
        deviceListScrollView.addView(deviceListLayout)
        layout.addView(deviceListScrollView)
        
        // 测试按钮标题
        val testTitle = TextView(this).apply {
            text = "功能测试模块:"
            textSize = 18f
            setTextColor(Color.parseColor("#FF9800")) // 橙色标题
            setPadding(0, 0, 0, 8)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(testTitle)
        
        // 测试按钮卡片
        val testCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
            setBackgroundColor(Color.parseColor("#F5F5F5"))
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 16)
            this@apply.layoutParams = layoutParams
        }
        
        // 测试按钮布局
        val testButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        testAllButton = Button(this).apply {
            text = "运行所有测试"
            setPadding(16, 12, 16, 12)
            setBackgroundColor(Color.parseColor("#9C27B0")) // 紫色
            setTextColor(Color.WHITE)
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 8)
            this@apply.layoutParams = layoutParams
        }
        testButtonLayout.addView(testAllButton)
        
        testScreenCaptureButton = Button(this).apply {
            text = "测试屏幕捕获功能"
            setPadding(16, 12, 16, 12)
            setBackgroundColor(Color.parseColor("#607D8B")) // 蓝灰色
            setTextColor(Color.WHITE)
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 8)
            this@apply.layoutParams = layoutParams
        }
        testButtonLayout.addView(testScreenCaptureButton)
        
        testRemoteControlButton = Button(this).apply {
            text = "测试远程控制功能"
            setPadding(16, 12, 16, 12)
            setBackgroundColor(Color.parseColor("#607D8B")) // 蓝灰色
            setTextColor(Color.WHITE)
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 8)
            this@apply.layoutParams = layoutParams
        }
        testButtonLayout.addView(testRemoteControlButton)
        
        testFileTransferButton = Button(this).apply {
            text = "测试文件传输功能"
            setPadding(16, 12, 16, 12)
            setBackgroundColor(Color.parseColor("#607D8B")) // 蓝灰色
            setTextColor(Color.WHITE)
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 8)
            this@apply.layoutParams = layoutParams
        }
        testButtonLayout.addView(testFileTransferButton)
        
        testClipboardSyncButton = Button(this).apply {
            text = "测试剪贴板同步功能"
            setPadding(16, 12, 16, 12)
            setBackgroundColor(Color.parseColor("#607D8B")) // 蓝灰色
            setTextColor(Color.WHITE)
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 8)
            this@apply.layoutParams = layoutParams
        }
        testButtonLayout.addView(testClipboardSyncButton)
        
        testNotificationSyncButton = Button(this).apply {
            text = "测试通知同步功能"
            setPadding(16, 12, 16, 12)
            setBackgroundColor(Color.parseColor("#607D8B")) // 蓝灰色
            setTextColor(Color.WHITE)
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 8)
            this@apply.layoutParams = layoutParams
        }
        testButtonLayout.addView(testNotificationSyncButton)
        
        testDeviceDiscoveryButton = Button(this).apply {
            text = "测试设备发现功能(旧)"
            setPadding(16, 12, 16, 12)
            setBackgroundColor(Color.parseColor("#607D8B")) // 蓝灰色
            setTextColor(Color.WHITE)
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 8)
            this@apply.layoutParams = layoutParams
        }
        testButtonLayout.addView(testDeviceDiscoveryButton)
        
        testCard.addView(testButtonLayout)
        layout.addView(testCard)
        
        // 日志信息模块标题
        val logTitle = TextView(this).apply {
            text = "测试日志模块:"
            textSize = 18f
            setTextColor(Color.parseColor("#795548")) // 棕色标题
            setPadding(0, 0, 0, 8)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(logTitle)
        
        // 创建固定高度的日志容器
        val logScrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (120 * resources.displayMetrics.density).toInt() // 减小高度到120dp
            )
            setPadding(8, 8, 8, 8)
            setBackgroundColor(Color.parseColor("#F9F9F9")) // 浅灰色背景
            isVerticalScrollBarEnabled = true
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                (120 * resources.displayMetrics.density).toInt()
            )
            layoutParams.setMargins(0, 0, 0, 16)
            this@apply.layoutParams = layoutParams
        }
        logText = TextView(this).apply {
            text = "测试日志将显示在这里\n"
            textSize = 12f
            setTextColor(Color.BLACK)
            isVerticalScrollBarEnabled = true
        }
        logScrollView.addView(logText)
        scrollView = logScrollView // 更新scrollView引用
        layout.addView(logScrollView)
        
        // 调试信息模块标题
        val debugTitle = TextView(this).apply {
            text = "调试信息模块:"
            textSize = 18f
            setTextColor(Color.parseColor("#795548")) // 棕色标题
            setPadding(0, 0, 0, 8)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(debugTitle)
        
        // 添加第二个ScrollView用于调试信息，减小高度
        debugScrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (120 * resources.displayMetrics.density).toInt() // 减小高度到120dp
            )
            setPadding(8, 8, 8, 8)
            setBackgroundColor(Color.parseColor("#F9F9F9")) // 浅灰色背景
            val layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                (120 * resources.displayMetrics.density).toInt()
            )
            layoutParams.setMargins(0, 0, 0, 16)
            this@apply.layoutParams = layoutParams
        }
        debugLogText = TextView(this).apply {
            text = "调试信息将显示在这里\n"
            textSize = 12f
            setTextColor(Color.BLACK)
        }
        debugScrollView.addView(debugLogText)
        layout.addView(debugScrollView)
        
        // 底部按钮
        val bottomLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
        }
        
        // 本地测试服务器配置布局
        val localServerConfigLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            setPadding(0, 8, 0, 8)
        }
        
        val localServerPortLabel = TextView(this).apply {
            text = "本地服务器端口: "
            textSize = 14f
            setTextColor(Color.BLACK)
        }
        localServerConfigLayout.addView(localServerPortLabel)
        
        localServerPortInput = EditText(this).apply {
            setText("8929") // 默认端口
            setPadding(8, 8, 8, 8)
            hint = "输入端口号"
            minWidth = 120
        }
        localServerConfigLayout.addView(localServerPortInput)
        bottomLayout.addView(localServerConfigLayout)
        
        // 本地测试服务器按钮布局
        val localServerButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
        }
        startLocalServerButton = Button(this).apply {
            text = "启动本地测试服务器"
            setPadding(24, 12, 24, 12)
            setBackgroundColor(Color.parseColor("#2196F3")) // 蓝色
            setTextColor(Color.WHITE)
        }
        localServerButtonLayout.addView(startLocalServerButton)
        
        stopLocalServerButton = Button(this).apply {
            text = "停止本地测试服务器"
            setPadding(24, 12, 24, 12)
            setBackgroundColor(Color.parseColor("#9E9E9E")) // 灰色
            setTextColor(Color.WHITE)
            isEnabled = false
        }
        localServerButtonLayout.addView(stopLocalServerButton)
        bottomLayout.addView(localServerButtonLayout)
        
        // 清空日志和返回按钮布局
        val actionButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
        }
        clearLogButton = Button(this).apply {
            text = "清空日志"
            setPadding(24, 12, 24, 12)
            setBackgroundColor(Color.parseColor("#FF9800")) // 橙色
            setTextColor(Color.WHITE)
        }
        actionButtonLayout.addView(clearLogButton)
        backButton = Button(this).apply {
            text = "返回主界面"
            setPadding(24, 12, 24, 12)
            setBackgroundColor(Color.parseColor("#9E9E9E")) // 灰色
            setTextColor(Color.WHITE)
        }
        actionButtonLayout.addView(backButton)
        bottomLayout.addView(actionButtonLayout)
        
        // 设置主布局为滚动布局
        mainScrollView.addView(layout)
        setContentView(mainScrollView)
    }
    
    private fun setupClickListeners() {
        connectButton.setOnClickListener {
            connectToServer()
        }

        disconnectButton.setOnClickListener {
            disconnectFromServer()
        }

        startDiscoveryButton.setOnClickListener {
            startDeviceDiscovery()
        }

        stopDiscoveryButton.setOnClickListener {
            stopDeviceDiscovery()
        }

        testAllButton.setOnClickListener {
            runAllTests()
        }
        
        testScreenCaptureButton.setOnClickListener {
            testScreenCapture()
        }
        
        // 长按使用优化版本
        testScreenCaptureButton.setOnLongClickListener {
            testScreenCaptureOptimized()
            true
        }
        
        testRemoteControlButton.setOnClickListener {
            testRemoteControl()
        }
        
        testFileTransferButton.setOnClickListener {
            testFileTransfer()
        }
        
        testClipboardSyncButton.setOnClickListener {
            testClipboardSync()
        }
        
        testNotificationSyncButton.setOnClickListener {
            testNotificationSync()
        }
        
        testDeviceDiscoveryButton.setOnClickListener {
            testDeviceDiscovery()
        }
        
        clearLogButton.setOnClickListener {
            clearLog()
        }
        
        backButton.setOnClickListener {
            finish()
        }
        
        startLocalServerButton?.setOnClickListener {
            startLocalTestServer()
        }
        
        stopLocalServerButton?.setOnClickListener {
            stopLocalTestServer()
        }
        
        oneClickTestButton?.setOnClickListener {
            startOneClickTest()
        }
        
        stopOneClickTestButton?.setOnClickListener {
            stopOneClickTest()
        }
    }
    
    private fun initializeNetwork() {
        val app = application as? MyApplication
        connectionManager = app?.connectionManager ?: ConnectionManager().apply {
            registerStrategyFactory("websocket") { WebSocketConnectionStrategy() }
            registerStrategyFactory("tcp") { TcpConnectionStrategy() }
            registerStrategyFactory("kcp") { KcpConnectionStrategy() }
            registerStrategyFactory("udp") { UdpConnectionStrategy() }
            registerStrategyFactory("http") { HttpConnectionStrategy() }
            registerStrategyFactory("bluetooth") { BluetoothConnectionStrategy(app ?: this@QuickTestActivity) }
        }
        if (::logText.isInitialized) {
            logMessage("网络通信模块已初始化，支持连接策略: ${connectionManager?.getSupportedConnectionTypes()}")
        }
    }
    
    private fun initializeConnectionTypeSpinner(spinner: android.widget.Spinner) {
        val connectionTypes = connectionManager?.getSupportedConnectionTypes() ?: run {
            // 如果connectionManager没有正确初始化，尝试重新初始化
            // 注意：此时UI组件可能尚未初始化，因此不调用logMessage
            initializeNetwork()
            connectionManager?.getSupportedConnectionTypes() ?: listOf("tcp")
        }
        val adapter = android.widget.ArrayAdapter(this, android.R.layout.simple_spinner_item, connectionTypes)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinner.adapter = adapter
        
        // 设置默认选择
        val defaultPosition = connectionTypes.indexOf("tcp")
        if (defaultPosition >= 0) {
            spinner.setSelection(defaultPosition)
        } else if (connectionTypes.isNotEmpty()) {
            // 如果没有tcp，选择第一个可用的连接类型
            spinner.setSelection(0)
        }
        
        // 设置选择监听器
        spinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>, view: android.view.View?, position: Int, id: Long) {
                val selectedType = connectionTypes[position]
                connectionManager?.selectStrategy(selectedType)
                // 确保UI组件已初始化后再调用logMessage
                if (::logText.isInitialized) {
                    logMessage("已选择连接类型: $selectedType")
                }
            }
            
            override fun onNothingSelected(parent: android.widget.AdapterView<*>) {
                // 不执行任何操作
            }
        }
    }
    
    /**
     * 启动本地测试服务器
     */
    private fun startLocalTestServer() {
        try {
            if (localWebSocketTestServer?.isRunning() == true) {
                showToast("本地WebSocket测试服务器已在运行")
                return
            }
            
            // 从本地端口输入框获取端口号
            val portStr = localServerPortInput?.text.toString().trim()
            val port = if (portStr.isNotEmpty()) {
                try {
                    val portNum = portStr.toInt()
                    if (portNum in 1024..65535) portNum else 8929 // 限制在有效范围内
                } catch (e: NumberFormatException) {
                    8929 // 默认端口
                }
            } else {
                8929 // 默认端口
            }
            
            localWebSocketTestServer = LocalWebSocketTestServer()
            val success = localWebSocketTestServer?.startServer(port)
            
            if (success == true) {
                startLocalServerButton?.isEnabled = false
                stopLocalServerButton?.isEnabled = true
                logMessage("本地WebSocket测试服务器已启动，端口: ${localWebSocketTestServer?.getPort()}")
                
                // 自动填充本地服务器信息到连接输入框
                serverIpInput.setText("127.0.0.1")
                serverPortInput.setText(localWebSocketTestServer?.getPort().toString())
                
                showToast("本地服务器已启动，端口: ${localWebSocketTestServer?.getPort()}")
            } else {
                logMessage("启动本地WebSocket测试服务器失败")
                showToast("启动本地服务器失败")
            }
        } catch (e: Exception) {
            logMessage("启动本地WebSocket测试服务器时出错: ${e.message}")
            showToast("启动服务器出错: ${e.message}")
        }
    }
    
    private fun stopLocalTestServer() {
        try {
            localWebSocketTestServer?.stopServer()
            
            startLocalServerButton?.isEnabled = true
            stopLocalServerButton?.isEnabled = false
            
            // 如果不是在一键自测过程中调用此方法，则记录日志
            if (!isOneClickTestRunning) {
                logMessage("本地WebSocket测试服务器已停止")
                showToast("本地服务器已停止")
            }
        } catch (e: Exception) {
            logMessage("停止本地WebSocket测试服务器时出错: ${e.message}")
            showToast("停止服务器出错: ${e.message}")
        }
    }
    
    /**
     * 一键自测功能
     * 自动启动服务器、连接、测试各项功能
     */
    private fun startOneClickTest() {
        // 检查是否已有测试在运行
        if (isOneClickTestRunning) {
            logMessage("一键自测已在运行中，请先停止当前测试")
            return
        }
        
        isOneClickTestRunning = true
        runOnUiThread {
            oneClickTestButton?.isEnabled = false
            stopOneClickTestButton?.isEnabled = true
        }
        
        CoroutineScope(Dispatchers.Main).launch {
            logMessage("开始一键自测...")
            
            // 检查是否需要取消测试
            if (!isOneClickTestRunning) return@launch
            
            // 1. 启动本地服务器
            logMessage("步骤1: 启动本地测试服务器...")
            val startServerSuccess = startLocalTestServerInternal()
            if (!startServerSuccess) {
                logMessage("一键自测失败: 无法启动本地服务器")
                showToast("一键自测失败")
                isOneClickTestRunning = false
                runOnUiThread {
                    oneClickTestButton?.isEnabled = true
                    stopOneClickTestButton?.isEnabled = false
                }
                return@launch
            }
            
            // 检查是否需要取消测试
            if (!isOneClickTestRunning) return@launch
            
            delay(1000) // 等待服务器启动
            
            // 检查是否需要取消测试
            if (!isOneClickTestRunning) return@launch
            
            // 2. 连接到本地服务器
            logMessage("步骤2: 连接到本地服务器...")
            val connectSuccess = connectToLocalServer()
            if (!connectSuccess) {
                logMessage("一键自测失败: 无法连接到本地服务器")
                stopLocalTestServer() // 连接失败时停止服务器
                showToast("一键自测失败")
                isOneClickTestRunning = false
                runOnUiThread {
                    oneClickTestButton?.isEnabled = true
                    stopOneClickTestButton?.isEnabled = false
                }
                return@launch
            }
            
            // 检查是否需要取消测试
            if (!isOneClickTestRunning) return@launch
            
            delay(1000) // 等待连接建立
            
            // 检查是否需要取消测试
            if (!isOneClickTestRunning) return@launch
            
            // 3. 执行各项功能测试
            logMessage("步骤3: 执行功能测试...")
            runAllTests()
            delay(2000) // 等待测试完成
            
            // 检查是否需要取消测试
            if (!isOneClickTestRunning) return@launch
            
            // 4. 测试完成后断开连接
            logMessage("步骤4: 断开连接...")
            disconnectFromServer()
            delay(500)
            
            // 检查是否需要取消测试
            if (!isOneClickTestRunning) return@launch
            
            // 5. 停止本地服务器
            logMessage("步骤5: 停止本地服务器...")
            stopLocalTestServer()
            
            logMessage("一键自测完成!")
            showToast("一键自测完成!")
            
            // 重置测试状态
            isOneClickTestRunning = false
            runOnUiThread {
                oneClickTestButton?.isEnabled = true
                stopOneClickTestButton?.isEnabled = false
            }
        }
    }
    
    /**
     * 停止一键自测
     * 允许用户手动停止正在进行的测试
     */
    private fun stopOneClickTest() {
        if (!isOneClickTestRunning) {
            logMessage("没有正在进行的一键自测")
            return
        }
        
        logMessage("用户手动停止一键自测...")
        isOneClickTestRunning = false  // 设置标志以停止测试流程
        
        // 断开连接（如果已连接）
        if (isConnected) {
            disconnectFromServer()
        }
        
        // 停止本地服务器（如果正在运行）
        if (localWebSocketTestServer?.isRunning() == true) {
            stopLocalTestServer()
        }
        
        logMessage("一键自测已停止")
        showToast("一键自测已停止")
        
        // 重置按钮状态
        runOnUiThread {
            oneClickTestButton?.isEnabled = true
            stopOneClickTestButton?.isEnabled = false
        }
    }
    
    /**
     * 内部启动本地服务器方法（不显示UI提示）
     */
    private suspend fun startLocalTestServerInternal(): Boolean = withContext(Dispatchers.IO) {
        try {
            if (localWebSocketTestServer?.isRunning() == true) {
                // 服务器已在运行
                return@withContext true
            }
            
            // 从本地端口输入框获取端口号
            val portStr = localServerPortInput?.text.toString().trim()
            val port = if (portStr.isNotEmpty()) {
                try {
                    val portNum = portStr.toInt()
                    if (portNum in 1024..65535) portNum else 8929 // 限制在有效范围内
                } catch (e: NumberFormatException) {
                    8929 // 默认端口
                }
            } else {
                8929 // 默认端口
            }
            
            localWebSocketTestServer = LocalWebSocketTestServer()
            val success = localWebSocketTestServer?.startServer(port)
            
            if (success == true) {
                // 更新UI状态
                withContext(Dispatchers.Main) {
                    startLocalServerButton?.isEnabled = false
                    stopLocalServerButton?.isEnabled = true
                }
                logMessage("本地WebSocket测试服务器已启动，端口: ${localWebSocketTestServer?.getPort()}")
                
                // 自动填充本地服务器信息到连接输入框
                withContext(Dispatchers.Main) {
                    serverIpInput.setText("127.0.0.1")
                    serverPortInput.setText(localWebSocketTestServer?.getPort().toString())
                }
                
                true
            } else {
                logMessage("启动本地WebSocket测试服务器失败")
                false
            }
        } catch (e: Exception) {
            logMessage("启动本地WebSocket测试服务器时出错: ${e.message}")
            false
        }
    }
    
    /**
     * 连接到本地服务器
     */
    private suspend fun connectToLocalServer(): Boolean = withContext(Dispatchers.IO) {
        try {
            val serverIp = "127.0.0.1"
            val serverPortStr = serverPortInput.text.toString().trim()
            
            if (serverPortStr.isEmpty()) {
                logMessage("服务器端口不能为空")
                return@withContext false
            }
            
            val serverPort = try {
                serverPortStr.toInt()
            } catch (e: NumberFormatException) {
                logMessage("端口号格式不正确")
                return@withContext false
            }
            
            if (serverPort < 1 || serverPort > 65535) {
                logMessage("端口号必须在1-65535之间")
                return@withContext false
            }
            
            // 确保已选择连接策略
            if (connectionManager?.getCurrentStrategy() == null) {
                connectionManager?.selectStrategy("tcp")
            }
            
            val success = connectionManager?.connect(serverIp, serverPort) ?: false
            
            if (success) {
                // 更新UI
                withContext(Dispatchers.Main) {
                    connectionStatusText.text = "连接状态: 已通过${connectionManager?.getCurrentConnectionType()}连接到 $serverIp:$serverPort"
                    connectionStatusText.setTextColor(Color.GREEN)
                    connectButton.isEnabled = false
                    disconnectButton.isEnabled = true
                }
                logMessage("成功通过${connectionManager?.getCurrentConnectionType()}连接到服务器 $serverIp:$serverPort")
                true
            } else {
                logMessage("连接服务器失败: $serverIp:$serverPort")
                false
            }
        } catch (e: Exception) {
            logMessage("连接服务器时出错: ${e.message}")
            false
        }
    }
    
    private fun runAllTests() {
        logMessage("开始运行所有功能测试...")
        testScreenCapture()
        testRemoteControl()
        testFileTransfer()
        testClipboardSync()
        testNotificationSync()
        testDeviceDiscovery()
        logMessage("所有功能测试已启动完成")
    }
    
    private fun testScreenCapture() {
        try {
            // 尝试启动屏幕捕获服务
            val intent = Intent(this, ScreenCaptureService::class.java)
            startForegroundService(intent)
            logMessage("屏幕捕获服务启动测试完成")
            showToast("屏幕捕获测试完成")
        } catch (e: Exception) {
            logMessage("屏幕捕获测试失败: ${e.message}")
        }
    }
    
    private fun testScreenCaptureOptimized() {
        try {
            // 尝试启动优化的屏幕捕获服务
            val intent = Intent(this, OptimizedScreenCaptureService::class.java)
            startForegroundService(intent)
            logMessage("优化的屏幕捕获服务启动测试完成")
            showToast("优化屏幕捕获测试完成")
        } catch (e: Exception) {
            logMessage("优化屏幕捕获测试失败: ${e.message}")
        }
    }
    
    private fun testRemoteControl() {
        try {
            // 尝试启动远程控制服务
            val intent = Intent(this, RemoteControlService::class.java).apply {
                action = RemoteControlService.ACTION_ENABLE_CONTROL
                putExtra(RemoteControlService.EXTRA_DEVICE_ID, "test_device")
                putExtra(RemoteControlService.EXTRA_DEVICE_IP, "127.0.0.1")
                putExtra(RemoteControlService.EXTRA_DEVICE_PORT, 8928)
            }
            startService(intent)
            logMessage("远程控制服务启动测试完成")
            showToast("远程控制测试完成")
        } catch (e: Exception) {
            logMessage("远程控制测试失败: ${e.message}")
        }
    }
    
    private fun testFileTransfer() {
        try {
            // 尝试启动文件传输服务
            val intent = Intent(this, FileTransferActivity::class.java)
            startActivity(intent)
            logMessage("文件传输服务启动测试完成")
            showToast("文件传输测试完成")
        } catch (e: Exception) {
            logMessage("文件传输测试失败: ${e.message}")
        }
    }
    
    private fun testClipboardSync() {
        try {
            // 尝试启动剪贴板同步服务
            val intent = Intent(this, ClipboardSyncService::class.java).apply {
                action = ClipboardSyncService.ACTION_START_SYNC
                putExtra(ClipboardSyncService.EXTRA_TARGET_DEVICE_ID, "test_device")
            }
            startService(intent)
            logMessage("剪贴板同步服务启动测试完成")
            showToast("剪贴板同步测试完成")
        } catch (e: Exception) {
            logMessage("剪贴板同步测试失败: ${e.message}")
        }
    }
    
    private fun testNotificationSync() {
        try {
            // 尝试启动通知同步服务
            val intent = Intent(this, NotificationSyncService::class.java)
            startService(intent)
            logMessage("通知同步服务启动测试完成")
            showToast("通知同步测试完成")
        } catch (e: Exception) {
            logMessage("通知同步测试失败: ${e.message}")
        }
    }
    
    private fun startDeviceDiscovery() {
        try {
            // 启动设备发现服务
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_START_DISCOVERY
            startService(intent)
            startDiscoveryButton.isEnabled = false
            stopDiscoveryButton.isEnabled = true
            logMessage("设备发现已启动")
            showToast("设备发现已启动")
        } catch (e: Exception) {
            logMessage("启动设备发现失败: ${e.message}")
        }
    }

    private fun stopDeviceDiscovery() {
        try {
            // 停止设备发现服务
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_STOP_DISCOVERY
            startService(intent)
            startDiscoveryButton.isEnabled = true
            stopDiscoveryButton.isEnabled = false
            logMessage("设备发现已停止")
            showToast("设备发现已停止")
        } catch (e: Exception) {
            logMessage("停止设备发现失败: ${e.message}")
        }
    }

    private fun testDeviceDiscovery() {
        try {
            // 尝试启动设备发现服务
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_START_DISCOVERY
            startService(intent)
            logMessage("设备发现服务启动测试完成")
            showToast("设备发现测试完成")
        } catch (e: Exception) {
            logMessage("设备发现测试失败: ${e.message}")
        }
    }

    private fun connectToServer() {
        val serverIp = serverIpInput.text.toString().trim()
        val serverPortStr = serverPortInput.text.toString().trim()
        
        if (serverIp.isEmpty() || serverPortStr.isEmpty()) {
            showToast("请填写服务器IP和端口")
            return
        }
        
        try {
            val serverPort = serverPortStr.toInt()
            if (serverPort < 1 || serverPort > 65535) {
                showToast("端口号必须在1-65535之间")
                return
            }
            
            // 确保已选择连接策略
            if (connectionManager?.getCurrentStrategy() == null) {
                // 默认使用TCP连接策略
                connectionManager?.selectStrategy("tcp")
            }
            
            // 在协程中执行连接操作
            CoroutineScope(Dispatchers.IO).launch {
                val success = connectionManager?.connect(serverIp, serverPort) ?: false
                
                // 在主线程中更新UI
                withContext(Dispatchers.Main) {
                    if (success) {
                        connectionStatusText.text = "连接状态: 已通过${connectionManager?.getCurrentConnectionType()}连接到 $serverIp:$serverPort"
                        connectionStatusText.setTextColor(Color.GREEN)
                        connectButton.isEnabled = false
                        disconnectButton.isEnabled = true
                        logMessage("成功通过${connectionManager?.getCurrentConnectionType()}连接到服务器 $serverIp:$serverPort")
                        showToast("连接成功")
                    } else {
                        connectionStatusText.text = "连接状态: 连接失败"
                        connectionStatusText.setTextColor(Color.RED)
                        logMessage("连接服务器失败: $serverIp:$serverPort")
                        showToast("连接失败")
                    }
                }
            }
        } catch (e: NumberFormatException) {
            showToast("端口号格式不正确")
        } catch (e: Exception) {
            logMessage("连接服务器时出错: ${e.message}")
            showToast("连接时出错: ${e.message}")
        }
    }

    private fun getSystemInfo(): String {
        val info = StringBuilder()
        info.append("设备型号: ${android.os.Build.MODEL}\n")
        info.append("Android版本: ${android.os.Build.VERSION.RELEASE}\n")
        info.append("API级别: ${android.os.Build.VERSION.SDK_INT}\n")
        info.append("制造商: ${android.os.Build.MANUFACTURER}\n")
        return info.toString()
    }

    private fun disconnectFromServer() {
        try {
            connectionManager?.disconnect()
            connectionStatusText.text = "连接状态: 未连接"
            connectionStatusText.setTextColor(Color.GRAY)
            connectButton.isEnabled = true
            disconnectButton.isEnabled = false
            logMessage("已断开服务器连接")
            showToast("已断开连接")
        } catch (e: Exception) {
            logMessage("断开连接时出错: ${e.message}")
        }
    }

    private fun registerDeviceDiscoveryReceiver() {
        val filter = android.content.IntentFilter().apply {
            addAction("com.example.windowsandroidconnect.DEVICE_FOUND")
            addAction("com.example.windowsandroidconnect.DEVICE_LOST")
        }
        registerReceiver(deviceDiscoveryReceiver, filter)
    }

    private fun updateDeviceList() {
        runOnUiThread {
            // 找到deviceListText的父容器
            val parent = deviceListText.parent as? LinearLayout ?: return@runOnUiThread
            
            // 清空所有子视图
            parent.removeAllViews()
            
            if (discoveredDevices.isEmpty()) {
                // 如果没有设备，显示提示文本
                deviceListText = TextView(this).apply {
                    text = """暂无设备
"""
                    textSize = 12f
                    setTextColor(Color.DKGRAY)
                }
                parent.addView(deviceListText)
            } else {
                // 创建可点击的设备项
                discoveredDevices.forEach { (deviceId, deviceInfo) ->
                    // 解析设备信息，提取IP和端口
                    val deviceIp = deviceInfo.split("\n").find { it.startsWith("IP:") }?.substring(3)?.trim()
                    val devicePort = deviceInfo.split("\n").find { it.startsWith("Port:") }?.substring(5)?.trim() ?: "8928"
                    
                    val deviceItem = LinearLayout(this).apply {
                        orientation = LinearLayout.VERTICAL
                        setPadding(12, 12, 12, 12)
                        setBackgroundColor(Color.parseColor("#FFFFFF"))
                        setOnClickListener {
                            // 点击设备项时自动填充IP和端口并连接
                            if (deviceIp != null) {
                                serverIpInput.setText(deviceIp)
                                serverPortInput.setText(devicePort)
                                connectToServer()
                            }
                        }
                        // 添加点击效果
                        foreground = android.graphics.drawable.RippleDrawable(
                            android.content.res.ColorStateList.valueOf(Color.parseColor("#E0E0E0")),
                            null,
                            android.graphics.drawable.ColorDrawable(Color.parseColor("#FFFFFF"))
                        )
                        // 设置边框
                        setBackgroundResource(android.R.drawable.dialog_frame)
                        // 设置外边距
                        val layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        )
                        layoutParams.setMargins(0, 0, 0, 8)
                        this.layoutParams = layoutParams
                    }
                    
                    val deviceInfoText = TextView(this).apply {
                        text = deviceInfo
                        textSize = 12f
                        setTextColor(Color.DKGRAY)
                    }
                    
                    deviceItem.addView(deviceInfoText)
                    parent.addView(deviceItem)
                }
            }
        }
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(deviceDiscoveryReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "注销广播接收器失败", e)
        }
        super.onDestroy()
        connectionManager?.disconnect()
        localTestServer?.stopServer()
        localWebSocketTestServer?.stopServer()
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
    
    companion object {
        private const val TAG = "QuickTestActivity"
    }
}