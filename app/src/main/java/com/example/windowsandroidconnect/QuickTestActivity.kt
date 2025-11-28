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
import com.example.windowsandroidconnect.service.*
import com.example.windowsandroidconnect.network.NetworkCommunication
import com.example.windowsandroidconnect.config.ClientConfig
import org.json.JSONObject
import java.util.*

/**
 * 快速功能验证测试页面
 * 用于快速验证各项功能是否正常工作
 */
class QuickTestActivity : Activity() {
    
    private lateinit var logText: TextView
    private lateinit var scrollView: ScrollView
    private lateinit var statusText: TextView
    private lateinit var testAllButton: Button
    private lateinit var testScreenCaptureButton: Button
    private lateinit var testRemoteControlButton: Button
    private lateinit var testFileTransferButton: Button
    private lateinit var testClipboardSyncButton: Button
    private lateinit var testNotificationSyncButton: Button
    private lateinit var testDeviceDiscoveryButton: Button
    private lateinit var clearLogButton: Button
    private lateinit var backButton: Button
    
    private var logEntries = mutableListOf<String>()
    private var networkCommunication: NetworkCommunication? = null
    private var isConnected = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_quick_test)
        initViews()
        setupClickListeners()
        initializeNetwork()
    }
    
    private fun initViews() {
        // 创建快速测试界面布局
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
        }
        
        // 标题
        val title = TextView(this).apply {
            text = "快速功能验证测试页面"
            textSize = 20f
            setTextColor(Color.BLACK)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(title)
        
        // 状态显示
        statusText = TextView(this).apply {
            text = "状态: 准备就绪进行测试"
            textSize = 16f
            setTextColor(Color.GRAY)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(statusText)
        
        // 测试按钮布局
        val testButtonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        
        testAllButton = Button(this).apply {
            text = "运行所有测试"
        }
        testButtonLayout.addView(testAllButton)
        
        testScreenCaptureButton = Button(this).apply {
            text = "测试屏幕捕获功能"
        }
        testButtonLayout.addView(testScreenCaptureButton)
        
        testRemoteControlButton = Button(this).apply {
            text = "测试远程控制功能"
        }
        testButtonLayout.addView(testRemoteControlButton)
        
        testFileTransferButton = Button(this).apply {
            text = "测试文件传输功能"
        }
        testButtonLayout.addView(testFileTransferButton)
        
        testClipboardSyncButton = Button(this).apply {
            text = "测试剪贴板同步功能"
        }
        testButtonLayout.addView(testClipboardSyncButton)
        
        testNotificationSyncButton = Button(this).apply {
            text = "测试通知同步功能"
        }
        testButtonLayout.addView(testNotificationSyncButton)
        
        testDeviceDiscoveryButton = Button(this).apply {
            text = "测试设备发现功能"
        }
        testButtonLayout.addView(testDeviceDiscoveryButton)
        
        layout.addView(testButtonLayout)
        
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
            text = "快速测试日志将显示在这里\n"
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
        testAllButton.setOnClickListener {
            runAllTests()
        }
        
        testScreenCaptureButton.setOnClickListener {
            testScreenCapture()
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
    }
    
    private fun initializeNetwork() {
        networkCommunication = NetworkCommunication()
        logMessage("网络通信模块已初始化，准备进行快速功能验证")
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
        private const val TAG = "QuickTestActivity"
    }
}