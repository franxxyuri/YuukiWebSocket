package com.example.windowsandroidconnect.test

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.*
import java.net.ServerSocket
import java.net.Socket
import java.security.MessageDigest
import java.util.*
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.text.Charsets

/**
 * 本地WebSocket测试服务器
 * 用于在设备上进行自测试，支持WebSocket协议
 */
class LocalWebSocketTestServer {
    private var serverSocket: ServerSocket? = null
    private val isRunning = AtomicBoolean(false)
    private var clientSocket: Socket? = null
    private var serverPort: Int = 8929 // 默认端口
    
    companion object {
        private const val TAG = "LocalWebSocketTestServer"
        private const val WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
    }
    
    /**
     * 启动本地WebSocket测试服务器
     */
    fun startServer(port: Int = 8929): Boolean {
        if (isRunning.get()) {
            Log.w(TAG, "服务器已在运行")
            return true
        }
        
        try {
            serverPort = port
            serverSocket = ServerSocket(serverPort)
            isRunning.set(true)
            
            // 在协程中监听连接
            CoroutineScope(Dispatchers.IO).launch {
                Log.d(TAG, "本地WebSocket测试服务器启动，监听端口: $serverPort")
                
                while (isRunning.get()) {
                    try {
                        Log.d(TAG, "等待WebSocket客户端连接...")
                        val socket = serverSocket?.accept()
                        
                        if (socket != null) {
                            Log.d(TAG, "WebSocket客户端已连接: ${socket.remoteSocketAddress}")
                            clientSocket = socket
                            
                            // 处理客户端WebSocket握手和消息
                            handleWebSocketClient(socket)
                        }
                    } catch (e: IOException) {
                        if (isRunning.get()) {
                            Log.e(TAG, "接受连接时出错", e)
                        }
                        break
                    }
                }
            }
            
            return true
        } catch (e: Exception) {
            Log.e(TAG, "启动WebSocket服务器失败", e)
            isRunning.set(false)
            return false
        }
    }
    
    /**
     * 处理WebSocket客户端连接（包括握手和消息处理）
     */
    private fun handleWebSocketClient(socket: Socket) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val input = BufferedReader(InputStreamReader(socket.getInputStream()))
                val output = PrintWriter(socket.getOutputStream(), true)
                
                // 读取HTTP握手请求
                var line: String?
                val requestLines = mutableListOf<String>()
                while (true) {
                    line = input.readLine()
                    if (line.isNullOrEmpty()) {
                        break
                    }
                    requestLines.add(line)
                }
                
                // 解析握手请求并获取Sec-WebSocket-Key
                var webSocketKey: String? = null
                for (requestLine in requestLines) {
                    if (requestLine.startsWith("Sec-WebSocket-Key: ", true)) {
                        webSocketKey = requestLine.substring("Sec-WebSocket-Key: ".length).trim()
                        break
                    }
                }
                
                if (webSocketKey != null) {
                    // 发送WebSocket握手响应
                    val acceptKey = generateAcceptKey(webSocketKey)
                    val handshakeResponse = buildString {
                        append("HTTP/1.1 101 Switching Protocols\r\n")
                        append("Upgrade: websocket\r\n")
                        append("Connection: Upgrade\r\n")
                        append("Sec-WebSocket-Accept: $acceptKey\r\n")
                        append("\r\n")
                    }
                    
                    output.print(handshakeResponse)
                    output.flush()
                    
                    Log.d(TAG, "WebSocket握手成功")
                    
                    // 发送欢迎消息
                    sendWebSocketMessage(output, """{"type":"welcome","message":"Local WebSocket test server connected"}""")
                    
                    // 监听后续消息
                    listenToWebSocketMessages(input, output)
                } else {
                    Log.e(TAG, "WebSocket握手失败：缺少Sec-WebSocket-Key")
                    output.print("HTTP/1.1 400 Bad Request\r\n\r\n")
                    output.flush()
                }
                
            } catch (e: IOException) {
                Log.e(TAG, "处理WebSocket客户端时出错", e)
            } finally {
                try {
                    socket.close()
                    Log.d(TAG, "WebSocket客户端连接已关闭")
                } catch (e: IOException) {
                    Log.e(TAG, "关闭WebSocket客户端连接时出错", e)
                }
            }
        }
    }
    
    /**
     * 监听WebSocket消息
     */
    private fun listenToWebSocketMessages(input: BufferedReader, output: PrintWriter) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                var line: String?
                while (true) {
                    line = input.readLine()
                    if (line != null) {
                        Log.d(TAG, "收到WebSocket消息: $line")
                        
                        // 根据消息类型处理
                        try {
                            val response = handleWebSocketMessage(line)
                            sendWebSocketMessage(output, response)
                        } catch (e: Exception) {
                            Log.e(TAG, "处理WebSocket消息时出错", e)
                            sendWebSocketMessage(output, """{"type":"error","message":"${e.message}"}""")
                        }
                    } else {
                        // 客户端断开连接
                        break
                    }
                }
            } catch (e: IOException) {
                Log.e(TAG, "监听WebSocket消息时出错", e)
            }
        }
    }
    
    /**
     * 处理WebSocket消息
     */
    private fun handleWebSocketMessage(message: String): String {
        return try {
            // 这里可以处理各种WebSocket消息类型
            // 暂时返回一个简单的回显响应
            """{"type":"echo","original":"$message","status":"received"}"""
        } catch (e: Exception) {
            """{"type":"error","message":"Failed to process message"}"""
        }
    }
    
    /**
     * 发送WebSocket消息
     */
    private fun sendWebSocketMessage(output: PrintWriter, message: String) {
        // 简化的WebSocket消息发送（实际应该使用WebSocket帧格式）
        // 这里只是发送原始文本
        output.println(message)
    }
    
    /**
     * 生成WebSocket握手的接受密钥
     */
    private fun generateAcceptKey(key: String): String {
        val concatenated = key + WS_GUID
        val sha1 = MessageDigest.getInstance("SHA-1")
        val hashed = sha1.digest(concatenated.toByteArray(Charsets.UTF_8))
        return android.util.Base64.encodeToString(hashed, android.util.Base64.NO_WRAP)
    }
    
    /**
     * 停止服务器
     */
    fun stopServer() {
        if (!isRunning.get()) {
            return
        }
        
        isRunning.set(false)
        
        try {
            clientSocket?.close()
            serverSocket?.close()
            Log.d(TAG, "本地WebSocket测试服务器已停止")
        } catch (e: IOException) {
            Log.e(TAG, "停止WebSocket服务器时出错", e)
        }
    }
    
    /**
     * 获取服务器端口
     */
    fun getPort(): Int {
        return serverPort
    }
    
    /**
     * 检查服务器是否正在运行
     */
    fun isRunning(): Boolean {
        return isRunning.get() && serverSocket?.isClosed == false
    }
}