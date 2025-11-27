package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.widget.*
import android.view.View
import android.graphics.Color
import android.util.Log
import android.widget.ScrollView
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import com.example.windowsandroidconnect.test.ConnectionTestTool
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 简化的连接测试Activity
 * 提供快速测试服务器连接的功能
 */
class SimpleConnectionTestActivity : Activity() {
    
    private lateinit var connectionTestTool: ConnectionTestTool
    private lateinit var statusText: TextView
    private lateinit var logText: TextView
    private lateinit var scrollView: ScrollView
    private lateinit var testButton: Button
    private lateinit var clearButton: Button
    private lateinit var backButton: Button
    private lateinit var serverSpinner: Spinner
    private lateinit var customIpInput: EditText
    private lateinit var customPortInput: EditText
    private lateinit var useCustomCheckbox: CheckBox
    
    private var isTestRunning = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        connectionTestTool = ConnectionTestTool(this)
        setupUI()
    }
    
    private fun setupUI() {
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
        }
        
        // 标题
        val title = TextView(this).apply {
            text = "连接测试工具"
            textSize = 20f
            setTextColor(Color.BLACK)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(title)
        
        // 状态显示
        statusText = TextView(this).apply {
            text = "准备就绪"
            textSize = 16f
            setTextColor(Color.BLUE)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(statusText)
        
        // 服务器选择
        val serverConfigLayout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(0, 0, 0, 16)
        }
        
        val serverLabel = TextView(this).apply {
            text = "选择服务器配置:"
            textSize = 16f
            setTextColor(Color.BLACK)
        }
        serverConfigLayout.addView(serverLabel)
        
        serverSpinner = Spinner(this).apply {
            val serverConfigs = connectionTestTool.getDefaultServerConfigs()
            val adapter = ArrayAdapter(
                this@SimpleConnectionTestActivity,
                android.R.layout.simple_spinner_item,
                serverConfigs.map { "${it.name} (${it.ip}:${it.port})" }
            )
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            this.adapter = adapter
        }
        serverConfigLayout.addView(serverSpinner)
        
        // 自定义服务器配置
        useCustomCheckbox = CheckBox(this).apply {
            text = "使用自定义服务器配置"
            setOnCheckedChangeListener { _, isChecked ->
                customIpInput.isEnabled = isChecked
                customPortInput.isEnabled = isChecked
                serverSpinner.isEnabled = !isChecked
            }
        }
        serverConfigLayout.addView(useCustomCheckbox)
        
        customIpInput = EditText(this).apply {
            hint = "自定义IP地址"
            setText("192.168.1.100")
            isEnabled = false
        }
        serverConfigLayout.addView(customIpInput)
        
        customPortInput = EditText(this).apply {
            hint = "自定义端口"
            setText("8828")
            isEnabled = false
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
        }
        serverConfigLayout.addView(customPortInput)
        
        layout.addView(serverConfigLayout)
        
        // 测试按钮
        testButton = Button(this).apply {
            text = "开始连接测试"
            setOnClickListener {
                if (isTestRunning) {
                    stopTest()
                } else {
                    startTest()
                }
            }
        }
        layout.addView(testButton)
        
        // 日志显示
        val logLabel = TextView(this).apply {
            text = "测试日志:"
            textSize = 16f
            setTextColor(Color.BLACK)
            setPadding(0, 16, 0, 8)
        }
        layout.addView(logLabel)
        
        scrollView = ScrollView(this)
        logText = TextView(this).apply {
            text = "等待测试开始...\n"
            textSize = 12f
            setTextColor(Color.BLACK)
        }
        scrollView.addView(logText)
        layout.addView(scrollView)
        
        // 按钮布局
        val buttonLayout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
        }
        
        clearButton = Button(this).apply {
            text = "清空日志"
            setOnClickListener {
                clearLog()
            }
        }
        buttonLayout.addView(clearButton)
        
        backButton = Button(this).apply {
            text = "返回"
            setOnClickListener {
                finish()
            }
        }
        buttonLayout.addView(backButton)
        
        layout.addView(buttonLayout)
        
        setContentView(layout)
    }
    
    private fun startTest() {
        if (isTestRunning) return
        
        isTestRunning = true
        testButton.text = "停止测试"
        statusText.text = "测试进行中..."
        statusText.setTextColor(Color.BLUE)
        clearLog()
        
        val serverConfig = if (useCustomCheckbox.isChecked) {
            val ip = customIpInput.text.toString()
            val port = customPortInput.text.toString().toIntOrNull() ?: 8828
            
            // 验证IP地址格式
            if (!isValidIPAddress(ip)) {
                logMessage("错误: 无效的IP地址格式: $ip")
                isTestRunning = false
                testButton.text = "开始连接测试"
                statusText.text = "IP地址格式错误"
                statusText.setTextColor(Color.RED)
                return
            }
            
            ConnectionTestTool.ServerConfig(
                name = "自定义服务器",
                ip = ip,
                port = port,
                description = "用户自定义的服务器配置"
            )
        } else {
            val serverConfigs = connectionTestTool.getDefaultServerConfigs()
            serverConfigs[serverSpinner.selectedItemPosition]
        }
        
        logMessage("开始测试服务器: ${serverConfig.name} (${serverConfig.ip}:${serverConfig.port})")
        
        // 预检查网络状态
        GlobalScope.launch {
            try {
                logMessage("正在检查网络状态...")
                val networkAvailable = checkNetworkAvailability()
                
                withContext(Dispatchers.Main) {
                    if (!networkAvailable) {
                        logMessage("警告: 网络不可用，测试可能会失败")
                    } else {
                        logMessage("网络状态正常")
                    }
                }
                
                // 运行完整测试套件
                val report = connectionTestTool.runFullTestSuite(serverConfig)
                
                withContext(Dispatchers.Main) {
                    displayTestResults(report)
                    isTestRunning = false
                    testButton.text = "开始连接测试"
                    
                    if (report.overallSuccess) {
                        statusText.text = "测试完成 - 所有测试通过"
                        statusText.setTextColor(Color.GREEN)
                    } else {
                        statusText.text = "测试完成 - 部分测试失败"
                        statusText.setTextColor(Color.RED)
                        
                        // 提供故障排除建议
                        provideTroubleshootingSuggestions(report)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    logMessage("测试执行异常: ${e.message}")
                    statusText.text = "测试失败"
                    statusText.setTextColor(Color.RED)
                    isTestRunning = false
                    testButton.text = "开始连接测试"
                }
            }
        }
    }
    
    /**
     * 验证IP地址格式
     */
    private fun isValidIPAddress(ip: String): Boolean {
        return try {
            val parts = ip.split(".")
            if (parts.size != 4) return false
            
            parts.forEach { part ->
                val num = part.toInt()
                if (num < 0 || num > 255) return false
            }
            true
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * 检查网络可用性
     */
    private suspend fun checkNetworkAvailability(): Boolean {
        return try {
            // 检查网络连接状态
            val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
            val activeNetwork = connectivityManager.activeNetworkInfo
            
            val isConnected = activeNetwork?.isConnectedOrConnecting == true
            
            if (isConnected) {
                // 尝试连接到公共DNS服务器
                val address = java.net.InetAddress.getByName("8.8.8.8")
                address.isReachable(3000)
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e("SimpleConnectionTest", "检查网络可用性失败", e)
            false
        }
    }
    
    /**
     * 提供故障排除建议
     */
    private fun provideTroubleshootingSuggestions(report: ConnectionTestTool.TestReport) {
        logMessage("\n=== 故障排除建议 ===")
        
        val failedTests = report.testResults.filter { !it.success }
        
        failedTests.forEach { test ->
            when (test.testName) {
                "网络诊断" -> {
                    logMessage("• 网络诊断失败: 检查设备网络连接和IP配置")
                }
                "基础TCP连接" -> {
                    logMessage("• TCP连接失败: 确认服务器已启动且端口 ${report.serverConfig.port} 已开放")
                    logMessage("  - 检查防火墙设置")
                    logMessage("  - 确认服务器IP地址 ${report.serverConfig.ip} 正确")
                }
                "WebSocket连接" -> {
                    logMessage("• WebSocket连接失败: 检查服务器WebSocket服务是否正常运行")
                    logMessage("  - 确认服务器支持WebSocket协议")
                    logMessage("  - 检查网络代理设置")
                }
                "设备信息发送" -> {
                    logMessage("• 设备信息发送失败: 检查服务器消息处理逻辑")
                }
                else -> {
                    logMessage("• ${test.testName}失败: ${test.message}")
                }
            }
        }
        
        // 通用建议
        logMessage("\n=== 通用检查项目 ===")
        logMessage("1. 确认Android设备和服务器在同一网络")
        logMessage("2. 检查服务器是否正在运行")
        logMessage("3. 验证端口是否被其他程序占用")
        logMessage("4. 检查防火墙和安全软件设置")
        logMessage("5. 尝试使用ping命令测试连通性")
        logMessage("========================")
    }
    
    private fun stopTest() {
        connectionTestTool.cancelCurrentTest()
        isTestRunning = false
        testButton.text = "开始连接测试"
        statusText.text = "测试已取消"
        statusText.setTextColor(Color.RED)
        logMessage("测试已取消")
    }
    
    private fun displayTestResults(report: ConnectionTestTool.TestReport) {
        val formattedReport = connectionTestTool.formatTestReport(report)
        logMessage(formattedReport)
        
        // 显示简要统计
        val successCount = report.testResults.count { it.success }
        val totalCount = report.testResults.size
        logMessage("\n测试统计: $successCount/$totalCount 通过")
        
        // 显示失败的测试
        val failedTests = report.testResults.filter { !it.success }
        if (failedTests.isNotEmpty()) {
            logMessage("\n失败的测试:")
            failedTests.forEach { test ->
                logMessage("❌ ${test.testName}: ${test.message}")
            }
        }
    }
    
    private fun logMessage(message: String) {
        runOnUiThread {
            val timestamp = android.text.format.DateFormat.format("HH:mm:ss", java.util.Date()).toString()
            logText.append("[$timestamp] $message\n")
            
            // 滚动到底部
            scrollView.post {
                scrollView.fullScroll(ScrollView.FOCUS_DOWN)
            }
        }
    }
    
    private fun clearLog() {
        logText.text = ""
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (isTestRunning) {
            connectionTestTool.cancelCurrentTest()
        }
    }
}