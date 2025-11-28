package com.example.windowsandroidconnect.connection.example

import android.util.Log
import com.example.windowsandroidconnect.connection.ConnectionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * 连接策略使用示例
 * 展示如何使用策略模式切换不同的连接方式
 */
class ConnectionExample {
    
    private val connectionManager = ConnectionManager()
    private val scope = CoroutineScope(Dispatchers.IO)
    
    /**
     * 使用TCP连接
     */
    fun useTcpConnection() {
        scope.launch {
            // 选择TCP策略
            if (connectionManager.selectStrategy("tcp")) {
                Log.d("ConnectionExample", "选择TCP策略成功")
                
                // 连接到服务器
                val connected = connectionManager.connect("192.168.1.100", 8080)
                if (connected) {
                    Log.d("ConnectionExample", "TCP连接成功")
                    
                    // 发送消息
                    val message = JSONObject()
                    message.put("type", "test")
                    message.put("content", "Hello via TCP")
                    connectionManager.sendMessage(message)
                    
                    // 断开连接
                    connectionManager.disconnect()
                } else {
                    Log.e("ConnectionExample", "TCP连接失败")
                }
            }
        }
    }
    
    /**
     * 使用UDP连接
     */
    fun useUdpConnection() {
        scope.launch {
            // 选择UDP策略
            if (connectionManager.selectStrategy("udp")) {
                Log.d("ConnectionExample", "选择UDP策略成功")
                
                // 连接到服务器
                val connected = connectionManager.connect("192.168.1.100", 8080)
                if (connected) {
                    Log.d("ConnectionExample", "UDP连接成功")
                    
                    // 发送消息
                    val message = JSONObject()
                    message.put("type", "test")
                    message.put("content", "Hello via UDP")
                    connectionManager.sendMessage(message)
                    
                    // 断开连接
                    connectionManager.disconnect()
                } else {
                    Log.e("ConnectionExample", "UDP连接失败")
                }
            }
        }
    }
    
    /**
     * 使用HTTP连接
     */
    fun useHttpConnection() {
        scope.launch {
            // 选择HTTP策略
            if (connectionManager.selectStrategy("http")) {
                Log.d("ConnectionExample", "选择HTTP策略成功")
                
                // 连接到服务器
                val connected = connectionManager.connect("192.168.1.100", 8080)
                if (connected) {
                    Log.d("ConnectionExample", "HTTP连接成功")
                    
                    // 发送消息
                    val message = JSONObject()
                    message.put("type", "test")
                    message.put("content", "Hello via HTTP")
                    connectionManager.sendMessage(message)
                    
                    // 断开连接
                    connectionManager.disconnect()
                } else {
                    Log.e("ConnectionExample", "HTTP连接失败")
                }
            }
        }
    }
    
    /**
     * 动态切换连接策略
     */
    fun switchConnectionStrategies() {
        scope.launch {
            val strategies = listOf("tcp", "udp", "http", "kcp")
            val serverIp = "192.168.1.100"
            val serverPort = 8080
            
            for (strategy in strategies) {
                Log.d("ConnectionExample", "尝试切换到 $strategy 策略")
                
                if (connectionManager.selectStrategy(strategy)) {
                    Log.d("ConnectionExample", "成功切换到 $strategy 策略")
                    
                    // 尝试连接
                    val connected = connectionManager.connect(serverIp, serverPort)
                    if (connected) {
                        Log.d("ConnectionExample", "$strategy 连接成功")
                        
                        // 发送测试消息
                        val message = createTestMessage(strategy)
                        connectionManager.sendMessage(message)
                        
                        // 等待一段时间
                        kotlinx.coroutines.delay(1000)
                        
                        connectionManager.disconnect()
                        Log.d("ConnectionExample", "$strategy 连接已断开")
                    } else {
                        Log.e("ConnectionExample", "$strategy 连接失败")
                    }
                } else {
                    Log.e("ConnectionExample", "无法选择 $strategy 策略")
                }
            }
        }
    }
    
    /**
     * 获取当前连接类型
     */
    fun getCurrentConnectionType(): String {
        return connectionManager.getCurrentConnectionType()
    }
    
    /**
     * 获取所有支持的连接类型
     */
    fun getSupportedConnectionTypes(): List<String> {
        return connectionManager.getSupportedConnectionTypes()
    }
    
    private fun createTestMessage(strategy: String): JSONObject {
        val message = JSONObject()
        message.put("type", "connection_test")
        message.put("strategy", strategy)
        message.put("timestamp", System.currentTimeMillis())
        message.put("content", "Test message sent via $strategy")
        return message
    }
}