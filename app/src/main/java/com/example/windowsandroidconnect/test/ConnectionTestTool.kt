package com.example.windowsandroidconnect.test

import android.content.Context
import android.util.Log
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * 连接测试工具类
 * 用于测试Android客户端与服务器之间的连接状态
 */
class ConnectionTestTool(private val context: Context) {
    
    data class TestResult(
        val testName: String,
        val success: Boolean,
        val message: String,
        val timestamp: Long = System.currentTimeMillis(),
        val duration: Long = 0L
    )
    
    data class TestReport(
        val serverConfig: ServerConfig,
        val testResults: List<TestResult>,
        val overallSuccess: Boolean,
        val totalDuration: Long
    )
    
    data class ServerConfig(
        val name: String,
        val ip: String,
        val port: Int,
        val description: String = ""
    )
    
    private val testResults = ConcurrentLinkedQueue<TestResult>()
    private var isTestRunning = false
    private var currentTestJob: Job? = null
    private val dateFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())
    
    companion object {
        private const val TAG = "ConnectionTestTool"
        private const val TEST_TIMEOUT_MS = 10000L
        private const val HEARTBEAT_INTERVAL_MS = 3000L
    }
    
    /**
     * 获取默认的服务器配置列表
     */
    fun getDefaultServerConfigs(): List<ServerConfig> {
        val config = ClientConfig.getInstance(context)
        return listOf(
            ServerConfig(
                name = "本地服务器",
                ip = "127.0.0.1",
                port = config.serverPort,
                description = "本地开发服务器"
            ),
            ServerConfig(
                name = "局域网服务器",
                ip = "192.168.1.100",
                port = config.serverPort,
                description = "局域网内的Windows服务器"
            ),
            ServerConfig(
                name = "备用服务器",
                ip = "192.168.0.100",
                port = config.serverPort,
                description = "备用连接地址"
            )
        )
    }
    
    /**
     * 运行完整的连接测试套件
     */
    suspend fun runFullTestSuite(serverConfig: ServerConfig): TestReport {
        return withContext(Dispatchers.IO) {
            val startTime = System.currentTimeMillis()
            testResults.clear()
            
            Log.d(TAG, "开始对 ${serverConfig.name} (${serverConfig.ip}:${serverConfig.port}) 进行完整测试")
            
            try {
                // 0. 网络诊断
                addTestResult(testNetworkDiagnostics(serverConfig))
                
                // 1. 基础连接测试
                addTestResult(testBasicConnection(serverConfig))
                
                // 2. WebSocket连接测试
                addTestResult(testWebSocketConnection(serverConfig))
                
                // 3. 设备信息发送测试
                addTestResult(testDeviceInfoSending(serverConfig))
                
                // 4. 心跳测试
                addTestResult(testHeartbeat(serverConfig))
                
                // 5. 消息发送测试
                addTestResult(testMessageSending(serverConfig))
                
                // 6. 屏幕帧传输测试
                addTestResult(testScreenFrameTransfer(serverConfig))
                
                // 7. 文件传输测试
                addTestResult(testFileTransfer(serverConfig))
                
                // 8. 剪贴板同步测试
                addTestResult(testClipboardSync(serverConfig))
                
                // 9. 通知同步测试
                addTestResult(testNotificationSync(serverConfig))
                
                // 10. 控制命令测试
                addTestResult(testControlCommand(serverConfig))
                
            } catch (e: Exception) {
                Log.e(TAG, "测试套件执行异常", e)
                addTestResult(TestResult(
                    testName = "测试套件执行",
                    success = false,
                    message = "执行异常: ${e.message}"
                ))
            }
            
            val totalDuration = System.currentTimeMillis() - startTime
            val allResults = testResults.toList()
            val overallSuccess = allResults.all { it.success }
            
            TestReport(
                serverConfig = serverConfig,
                testResults = allResults,
                overallSuccess = overallSuccess,
                totalDuration = totalDuration
            )
        }
    }
    
    /**
     * 测试基础网络连接
     */
    private suspend fun testBasicConnection(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试基础连接: ${serverConfig.ip}:${serverConfig.port}")
            
            // 尝试TCP连接
            val socket = java.net.Socket()
            socket.connect(java.net.InetSocketAddress(serverConfig.ip, serverConfig.port), 5000)
            socket.close()
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "基础TCP连接",
                success = true,
                message = "TCP连接成功，耗时 ${duration}ms",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "基础TCP连接",
                success = false,
                message = "TCP连接失败: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试WebSocket连接
     */
    private suspend fun testWebSocketConnection(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试WebSocket连接: ${serverConfig.ip}:${serverConfig.port}")
            
            val networkComm = NetworkCommunication()
            val success = networkComm.connect(serverConfig.ip, serverConfig.port)
            networkComm.disconnect()
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "WebSocket连接",
                success = success,
                message = if (success) "WebSocket连接成功，耗时 ${duration}ms" 
                         else "WebSocket连接失败",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "WebSocket连接",
                success = false,
                message = "WebSocket连接异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试设备信息发送
     */
    private suspend fun testDeviceInfoSending(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试设备信息发送")
            
            val networkComm = NetworkCommunication()
            var messageReceived = false
            
            // 注册消息处理器
            networkComm.registerMessageHandler("authentication_success") { message ->
                messageReceived = true
                Log.d(TAG, "收到认证成功响应")
            }
            
            val connected = networkComm.connect(serverConfig.ip, serverConfig.port)
            if (connected) {
                // 等待响应
                delay(3000)
                networkComm.disconnect()
            }
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "设备信息发送",
                success = connected && messageReceived,
                message = if (connected && messageReceived) 
                         "设备信息发送成功，收到服务器响应，耗时 ${duration}ms"
                         else "设备信息发送失败或未收到响应",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "设备信息发送",
                success = false,
                message = "设备信息发送异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试心跳机制
     */
    private suspend fun testHeartbeat(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试心跳机制")
            
            val networkComm = NetworkCommunication()
            var heartbeatReceived = false
            
            networkComm.registerMessageHandler("heartbeat") { message ->
                heartbeatReceived = true
                Log.d(TAG, "收到心跳响应")
            }
            
            val connected = networkComm.connect(serverConfig.ip, serverConfig.port)
            if (connected) {
                // 发送心跳
                val heartbeatMsg = JSONObject().apply {
                    put("type", "heartbeat")
                    put("timestamp", System.currentTimeMillis())
                }
                networkComm.sendMessage(heartbeatMsg)
                
                // 等待响应
                delay(HEARTBEAT_INTERVAL_MS)
                networkComm.disconnect()
            }
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "心跳机制",
                success = connected && heartbeatReceived,
                message = if (connected && heartbeatReceived)
                         "心跳测试成功，耗时 ${duration}ms"
                         else "心跳测试失败",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "心跳机制",
                success = false,
                message = "心跳测试异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试消息发送
     */
    private suspend fun testMessageSending(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试消息发送")
            
            val networkComm = NetworkCommunication()
            var echoReceived = false
            
            networkComm.registerMessageHandler("echo_response") { message ->
                echoReceived = true
                Log.d(TAG, "收到回声响应")
            }
            
            val connected = networkComm.connect(serverConfig.ip, serverConfig.port)
            if (connected) {
                // 发送测试消息
                val testMsg = JSONObject().apply {
                    put("type", "echo")
                    put("data", "test_message_${System.currentTimeMillis()}")
                }
                networkComm.sendMessage(testMsg)
                
                // 等待响应
                delay(2000)
                networkComm.disconnect()
            }
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "消息发送",
                success = connected && echoReceived,
                message = if (connected && echoReceived)
                         "消息发送测试成功，耗时 ${duration}ms"
                         else "消息发送测试失败",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "消息发送",
                success = false,
                message = "消息发送测试异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试屏幕帧传输
     */
    private suspend fun testScreenFrameTransfer(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试屏幕帧传输")
            
            val networkComm = NetworkCommunication()
            var frameResponseReceived = false
            
            networkComm.registerMessageHandler("screen_frame_response") { message ->
                frameResponseReceived = true
                Log.d(TAG, "收到屏幕帧响应")
            }
            
            val connected = networkComm.connect(serverConfig.ip, serverConfig.port)
            if (connected) {
                // 发送测试屏幕帧
                val testFrameData = "test_frame_data".toByteArray()
                networkComm.sendScreenFrame(testFrameData)
                
                // 等待响应
                delay(3000)
                networkComm.disconnect()
            }
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "屏幕帧传输",
                success = connected && frameResponseReceived,
                message = if (connected && frameResponseReceived)
                         "屏幕帧传输测试成功，耗时 ${duration}ms"
                         else "屏幕帧传输测试失败",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "屏幕帧传输",
                success = false,
                message = "屏幕帧传输测试异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试文件传输
     */
    private suspend fun testFileTransfer(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试文件传输")
            
            val networkComm = NetworkCommunication()
            var fileResponseReceived = false
            
            networkComm.registerMessageHandler("file_transfer_response") { message ->
                fileResponseReceived = true
                Log.d(TAG, "收到文件传输响应")
            }
            
            val connected = networkComm.connect(serverConfig.ip, serverConfig.port)
            if (connected) {
                // 发送文件传输消息
                val fileMsg = JSONObject().apply {
                    put("type", "file_transfer")
                    put("action", "test")
                    put("fileName", "test.txt")
                    put("fileSize", 1024)
                }
                networkComm.sendMessage(fileMsg)
                
                // 等待响应
                delay(3000)
                networkComm.disconnect()
            }
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "文件传输",
                success = connected && fileResponseReceived,
                message = if (connected && fileResponseReceived)
                         "文件传输测试成功，耗时 ${duration}ms"
                         else "文件传输测试失败",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "文件传输",
                success = false,
                message = "文件传输测试异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试剪贴板同步
     */
    private suspend fun testClipboardSync(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试剪贴板同步")
            
            val networkComm = NetworkCommunication()
            var clipboardResponseReceived = false
            
            networkComm.registerMessageHandler("clipboard_response") { message ->
                clipboardResponseReceived = true
                Log.d(TAG, "收到剪贴板同步响应")
            }
            
            val connected = networkComm.connect(serverConfig.ip, serverConfig.port)
            if (connected) {
                // 发送剪贴板同步消息
                val clipboardMsg = JSONObject().apply {
                    put("type", "clipboard")
                    put("action", "sync")
                    put("data", "Android测试剪贴板内容")
                    put("timestamp", System.currentTimeMillis())
                }
                networkComm.sendMessage(clipboardMsg)
                
                // 等待响应
                delay(2000)
                networkComm.disconnect()
            }
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "剪贴板同步",
                success = connected && clipboardResponseReceived,
                message = if (connected && clipboardResponseReceived)
                         "剪贴板同步测试成功，耗时 ${duration}ms"
                         else "剪贴板同步测试失败",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "剪贴板同步",
                success = false,
                message = "剪贴板同步测试异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试通知同步
     */
    private suspend fun testNotificationSync(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试通知同步")
            
            val networkComm = NetworkCommunication()
            var notificationResponseReceived = false
            
            networkComm.registerMessageHandler("notification_response") { message ->
                notificationResponseReceived = true
                Log.d(TAG, "收到通知同步响应")
            }
            
            val connected = networkComm.connect(serverConfig.ip, serverConfig.port)
            if (connected) {
                // 发送通知同步消息
                val notificationMsg = JSONObject().apply {
                    put("type", "notification")
                    put("action", "new")
                    put("title", "测试通知")
                    put("text", "这是一条测试通知")
                    put("packageName", "com.example.test")
                    put("timestamp", System.currentTimeMillis())
                }
                networkComm.sendMessage(notificationMsg)
                
                // 等待响应
                delay(2000)
                networkComm.disconnect()
            }
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "通知同步",
                success = connected && notificationResponseReceived,
                message = if (connected && notificationResponseReceived)
                         "通知同步测试成功，耗时 ${duration}ms"
                         else "通知同步测试失败",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "通知同步",
                success = false,
                message = "通知同步测试异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 测试控制命令
     */
    private suspend fun testControlCommand(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        return try {
            Log.d(TAG, "测试控制命令")
            
            val networkComm = NetworkCommunication()
            var controlResponseReceived = false
            
            networkComm.registerMessageHandler("control_response") { message ->
                controlResponseReceived = true
                Log.d(TAG, "收到控制命令响应")
            }
            
            val connected = networkComm.connect(serverConfig.ip, serverConfig.port)
            if (connected) {
                // 发送控制命令
                val controlMsg = JSONObject().apply {
                    put("type", "control_command")
                    put("commandType", "test_click")
                    put("x", 100)
                    put("y", 200)
                }
                networkComm.sendMessage(controlMsg)
                
                // 等待响应
                delay(2000)
                networkComm.disconnect()
            }
            
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "控制命令",
                success = connected && controlResponseReceived,
                message = if (connected && controlResponseReceived)
                         "控制命令测试成功，耗时 ${duration}ms"
                         else "控制命令测试失败",
                duration = duration
            )
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            TestResult(
                testName = "控制命令",
                success = false,
                message = "控制命令测试异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 添加测试结果
     */
    private fun addTestResult(result: TestResult) {
        testResults.offer(result)
        Log.d(TAG, "测试结果: ${result.testName} - ${if (result.success) "成功" else "失败"} - ${result.message}")
    }
    
    /**
     * 格式化测试报告
     */
    fun formatTestReport(report: TestReport): String {
        val builder = StringBuilder()
        builder.appendLine("=".repeat(60))
        builder.appendLine("连接测试报告")
        builder.appendLine("=".repeat(60))
        builder.appendLine("服务器: ${report.serverConfig.name} (${report.serverConfig.ip}:${report.serverConfig.port})")
        builder.appendLine("描述: ${report.serverConfig.description}")
        builder.appendLine("测试时间: ${dateFormat.format(Date(report.testResults.firstOrNull()?.timestamp ?: System.currentTimeMillis()))}")
        builder.appendLine("总耗时: ${report.totalDuration}ms")
        builder.appendLine("总体结果: ${if (report.overallSuccess) "✅ 成功" else "❌ 失败"}")
        builder.appendLine()
        
        builder.appendLine("详细测试结果:")
        builder.appendLine("-".repeat(40))
        
        for (result in report.testResults) {
            val status = if (result.success) "✅" else "❌"
            builder.appendLine("$status ${result.testName}")
            builder.appendLine("   ${result.message}")
            if (result.duration > 0) {
                builder.appendLine("   耗时: ${result.duration}ms")
            }
            builder.appendLine()
        }
        
        val successCount = report.testResults.count { it.success }
        val totalCount = report.testResults.size
        builder.appendLine("测试统计: $successCount/$totalCount 通过")
        
        return builder.toString()
    }
    
    /**
     * 取消当前测试
     */
    fun cancelCurrentTest() {
        currentTestJob?.cancel()
        isTestRunning = false
        Log.d(TAG, "测试已取消")
    }
    
    /**
     * 网络诊断测试
     */
    private suspend fun testNetworkDiagnostics(serverConfig: ServerConfig): TestResult {
        val startTime = System.currentTimeMillis()
        val diagnostics = mutableListOf<String>()
        
        try {
            Log.d(TAG, "开始网络诊断")
            
            // 1. 检查网络接口
            val networkInterfaces = java.net.NetworkInterface.getNetworkInterfaces().toList()
            val activeInterfaces = networkInterfaces.filter { 
                it.isUp && !it.isLoopback && !it.isVirtual 
            }
            
            diagnostics.add("发现 ${networkInterfaces.size} 个网络接口，其中 ${activeInterfaces.size} 个活跃")
            
            // 2. 获取本机IP地址
            val localIPs = mutableListOf<String>()
            for (networkInterface in activeInterfaces) {
                val addresses = networkInterface.inetAddresses.toList()
                for (address in addresses) {
                    if (!address.isLoopbackAddress && address.hostAddress.indexOf(':') == -1) {
                        localIPs.add(address.hostAddress)
                    }
                }
            }
            
            diagnostics.add("本机IP地址: ${localIPs.joinToString(", ")}")
            
            // 3. 检查目标IP是否在同一网段
            val targetIP = serverConfig.ip
            val isSameSubnet = localIPs.any { localIP ->
                isSameSubnet(localIP, targetIP)
            }
            
            diagnostics.add(if (isSameSubnet) "目标IP $targetIP 在同一网段" else "目标IP $targetIP 不在同一网段")
            
            // 4. 检查网络连通性
            val connectivityTest = testConnectivity(targetIP)
            diagnostics.add(connectivityTest)
            
            // 5. 检查端口状态
            val portTest = testPortAvailability(serverConfig.ip, serverConfig.port)
            diagnostics.add(portTest)
            
            val duration = System.currentTimeMillis() - startTime
            val message = diagnostics.joinToString("; ")
            
            return TestResult(
                testName = "网络诊断",
                success = true,
                message = message,
                duration = duration
            )
            
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            return TestResult(
                testName = "网络诊断",
                success = false,
                message = "网络诊断异常: ${e.message}",
                duration = duration
            )
        }
    }
    
    /**
     * 检查两个IP是否在同一网段
     */
    private fun isSameSubnet(ip1: String, ip2: String): Boolean {
        try {
            val parts1 = ip1.split(".")
            val parts2 = ip2.split(".")
            
            // 简单的C类网络检查（前三个段相同）
            if (parts1.size >= 3 && parts2.size >= 3) {
                return parts1[0] == parts2[0] && parts1[1] == parts2[1] && parts1[2] == parts2[2]
            }
        } catch (e: Exception) {
            Log.e(TAG, "检查子网时出错", e)
        }
        return false
    }
    
    /**
     * 测试网络连通性
     */
    private suspend fun testConnectivity(targetIP: String): String {
        return try {
            val address = java.net.InetAddress.getByName(targetIP)
            val reachable = address.isReachable(3000) // 3秒超时
            
            if (reachable) {
                "目标 $targetIP 网络可达"
            } else {
                "目标 $targetIP 网络不可达"
            }
        } catch (e: Exception) {
            "测试网络连通性失败: ${e.message}"
        }
    }
    
    /**
     * 测试端口可用性
     */
    private suspend fun testPortAvailability(ip: String, port: Int): String {
        return try {
            val socket = java.net.Socket()
            socket.connect(java.net.InetSocketAddress(ip, port), 2000) // 2秒超时
            socket.close()
            
            "端口 $port 开放且可连接"
        } catch (e: java.net.ConnectException) {
            "端口 $port 连接被拒绝（服务器可能未运行或端口未开放）"
        } catch (e: java.net.SocketTimeoutException) {
            "端口 $port 连接超时"
        } catch (e: Exception) {
            "测试端口 $port 时出错: ${e.message}"
        }
    }
    
    /**
     * 检查测试是否正在运行
     */
    fun isTestRunning(): Boolean = isTestRunning
}