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
        var input: BufferedReader? = null
        var output: PrintWriter? = null
        var outputStream: java.io.OutputStream? = null
        var inputSocketStream: java.io.InputStream? = null
        
        try {
            input = BufferedReader(InputStreamReader(socket.getInputStream()))
            outputStream = socket.getOutputStream()
            output = PrintWriter(outputStream, false) // false: 不自动flush
            inputSocketStream = socket.getInputStream()
            
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
                sendWebSocketFrame(outputStream, """{"type":"welcome","message":"Local WebSocket test server connected"}""")
                
                // 监听后续消息（现在使用socket的输入流来解析WebSocket帧）
                // 直接在当前线程中处理消息，以保持连接
                listenToWebSocketMessages(socket, outputStream, inputSocketStream)
            } else {
                Log.e(TAG, "WebSocket握手失败：缺少Sec-WebSocket-Key")
                output.print("HTTP/1.1 400 Bad Request\r\n\r\n")
                output.flush()
            }
            
        } catch (e: IOException) {
            Log.e(TAG, "处理WebSocket客户端时出错", e)
        } finally {
            try {
                input?.close()
                output?.close()
                outputStream?.close()
                inputSocketStream?.close()
                if (!socket.isClosed) {
                    socket.close()
                    Log.d(TAG, "WebSocket客户端连接已关闭")
                }
            } catch (e: IOException) {
                Log.e(TAG, "关闭WebSocket客户端连接时出错", e)
            }
        }
    }
    
    /**
     * 监听WebSocket消息
     */
    private fun listenToWebSocketMessages(socket: Socket, outputStream: java.io.OutputStream, inputSocketStream: java.io.InputStream) {
        try {
            val buffer = ByteArray(1024)
            
            while (!socket.isClosed && isRunning.get()) {
                try {
                    // 阻塞读取，而不是使用available()检查
                    val bytesRead = inputSocketStream.read(buffer)
                    if (bytesRead > 0) {
                        // 解析WebSocket帧
                        val message = parseWebSocketFrame(buffer, bytesRead)
                        if (message != null) {
                            Log.d(TAG, "收到WebSocket消息: $message")
                            
                            // 根据消息类型处理
                            try {
                                val response = handleWebSocketMessage(message)
                                sendWebSocketFrame(outputStream, response)
                            } catch (e: Exception) {
                                Log.e(TAG, "处理WebSocket消息时出错", e)
                                sendWebSocketFrame(outputStream, """{"type":"error","message":"${e.message}"}""")
                            }
                        }
                    } else if (bytesRead == -1) {
                        // 连接已关闭
                        Log.d(TAG, "客户端连接已关闭 (read返回-1)")
                        break
                    }
                } catch (e: IOException) {
                    if (e is java.net.SocketException && e.message?.contains("Socket closed", ignoreCase = true) == true) {
                        Log.d(TAG, "Socket已关闭，正常退出")
                    } else if (!socket.isClosed) {
                        Log.e(TAG, "读取WebSocket消息时出错", e)
                    }
                    break
                }
            }
        } catch (e: Exception) {
            if (isRunning.get()) {
                Log.e(TAG, "监听WebSocket消息时出错", e)
            }
        }
    }
    
    /**
     * 解析WebSocket帧
     */
    private fun parseWebSocketFrame(buffer: ByteArray, length: Int): String? {
        if (length < 2) return null
        
        try {
            var offset = 0
            
            // 读取帧头
            val fin = (buffer[offset].toInt() and 0x80) != 0
            val rsv1 = (buffer[offset].toInt() and 0x40) != 0
            val rsv2 = (buffer[offset].toInt() and 0x20) != 0
            val rsv3 = (buffer[offset].toInt() and 0x10) != 0
            val opcode = buffer[offset].toInt() and 0x0F
            offset++
            
            val mask = (buffer[offset].toInt() and 0x80) != 0
            var payloadLength = buffer[offset].toInt() and 0x7F
            offset++
            
            // 处理不同长度的payload
            if (payloadLength == 126) {
                if (offset + 1 >= length) return null
                payloadLength = ((buffer[offset].toInt() and 0xFF) shl 8) or (buffer[offset + 1].toInt() and 0xFF)
                offset += 2
            } else if (payloadLength == 127) {
                if (offset + 7 >= length) return null
                // 只取低32位，避免64位计算的复杂性
                offset += 4 // 跳过高4字节
                payloadLength = ((buffer[offset].toInt() and 0xFF) shl 24) or
                        ((buffer[offset + 1].toInt() and 0xFF) shl 16) or
                        ((buffer[offset + 2].toInt() and 0xFF) shl 8) or
                        (buffer[offset + 3].toInt() and 0xFF)
                offset += 4
            }
            
            // 如果有掩码，读取掩码密钥
            val maskKey = if (mask) {
                if (offset + 3 >= length) return null
                val key = buffer.sliceArray(offset until offset + 4)
                offset += 4
                key
            } else {
                null
            }
            
            // 提取实际载荷数据
            val dataStart = offset
            val dataEnd = if (dataStart + payloadLength <= length) dataStart + payloadLength else length
            val actualDataLength = dataEnd - dataStart
            
            if (actualDataLength > 0) {
                var data = buffer.sliceArray(dataStart until dataEnd)
                
                // 如果有掩码，则解码
                if (mask && maskKey != null) {
                    for (i in data.indices) {
                        data[i] = (data[i].toInt() xor maskKey[i % 4].toInt()).toByte()
                    }
                }
                
                // 根据opcode处理不同类型的数据
                when (opcode) {
                    1 -> { // 文本帧
                        return String(data, Charsets.UTF_8)
                    }
                    8 -> { // 连接关闭帧
                        Log.d(TAG, "收到关闭帧")
                        return null
                    }
                    9 -> { // ping帧
                        Log.d(TAG, "收到ping帧")
                        // 在实际应用中，应该发送pong帧作为响应
                        // 这里暂时只记录日志
                        return null
                    }
                    10 -> { // pong帧
                        Log.d(TAG, "收到pong帧")
                        return null
                    }
                    else -> {
                        Log.d(TAG, "收到未处理的帧类型: $opcode")
                        return null
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "解析WebSocket帧时出错", e)
        }
        
        return null
    }
    
    /**
     * 发送pong帧作为ping的响应
     */
    private fun sendPongFrame(payload: ByteArray) {
        // 这个方法暂时只用于记录，实际发送需要通过输出流
        Log.d(TAG, "Pong响应已准备")
    }
    
    /**
     * 处理WebSocket消息
     */
    private fun handleWebSocketMessage(message: String): String {
        return try {
            // 这里可以处理各种WebSocket消息类型
            // 对于测试，我们识别特定的消息类型
            if (message.contains("\"type\":\"device_info\"")) {
                // 返回一个简单的确认响应
                """{"type":"device_info_response","status":"received","message":"Device info received successfully"}"""
            } else {
                // 对其他消息返回回显响应
                """{"type":"echo","original":"$message","status":"received"}"""
            }
        } catch (e: Exception) {
            """{"type":"error","message":"Failed to process message"}"""
        }
    }
    
    /**
     * 发送WebSocket帧
     */
    private fun sendWebSocketFrame(outputStream: java.io.OutputStream, message: String) {
        try {
            val messageBytes = message.toByteArray(Charsets.UTF_8)
            val frame = createWebSocketFrame(messageBytes, 0x1) // 0x1 = 文本帧
            outputStream.write(frame)
            outputStream.flush()
        } catch (e: Exception) {
            Log.e(TAG, "发送WebSocket帧失败", e)
        }
    }
    
    /**
     * 创建WebSocket帧
     * @param payload 数据载荷
     * @param opcode 操作码 (0x1=文本帧, 0x8=关闭帧)
     */
    private fun createWebSocketFrame(payload: ByteArray, opcode: Int): ByteArray {
        val frame = mutableListOf<Byte>()
        
        // FIN位设置为1，opcode
        frame.add((0x80 or opcode).toByte()) // FIN=1, opcode=指定值
        
        // 载荷长度处理
        if (payload.size < 126) {
            frame.add(payload.size.toByte())
        } else if (payload.size <= 0xFFFF) {
            frame.add(126.toByte())
            frame.add((payload.size shr 8).toByte())
            frame.add(payload.size.toByte())
        } else {
            frame.add(127.toByte())
            // 64位长度，高位清零，只填低位32位
            for (i in 0..3) frame.add(0) // 高4字节
            frame.add((payload.size shr 24).toByte())
            frame.add((payload.size shr 16).toByte())
            frame.add((payload.size shr 8).toByte())
            frame.add(payload.size.toByte())
        }
        
        // 添加载荷数据
        payload.forEach { frame.add(it) }
        
        return frame.toByteArray()
    }
    
    /**
     * 读取WebSocket消息
     */
    private fun readWebSocketMessage(input: BufferedReader): String? {
        // WebSocket帧解析是复杂的，这里我们保持简单，使用原始的读取方法
        // 但实际应用中需要正确解析WebSocket帧
        return try {
            input.readLine()
        } catch (e: Exception) {
            Log.e(TAG, "读取WebSocket消息失败", e)
            null
        }
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