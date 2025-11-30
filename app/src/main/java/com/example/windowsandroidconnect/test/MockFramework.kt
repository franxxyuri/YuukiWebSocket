package com.example.windowsandroidconnect.test

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.*
import java.net.*
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.text.Charsets

/**
 * Mock层框架
 * 提供灵活的Mock服务，支持HTTP、WebSocket、UDP等多种协议
 */
class MockFramework {
    private val mockServices = ConcurrentHashMap<String, MockService>()
    private val mockRules = ConcurrentHashMap<String, MutableList<MockRule>>()
    private val isInitialized = AtomicBoolean(false)
    
    companion object {
        private const val TAG = "MockFramework"
        private const val WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        @Volatile
        private var instance: MockFramework? = null
        
        fun getInstance(): MockFramework {
            if (instance == null) {
                synchronized(this) {
                    if (instance == null) {
                        instance = MockFramework()
                    }
                }
            }
            return instance!!
        }
    }
    
    /**
     * Mock规则数据类
     */
    data class MockRule(
        val id: String,
        val protocol: Protocol,
        val path: String,
        val method: String = "GET",
        val response: MockResponse,
        val conditions: List<Condition> = emptyList(),
        val priority: Int = 50,
        val enabled: Boolean = true
    ) {
        enum class Protocol {
            HTTP,
            WEBSOCKET,
            UDP,
            TCP
        }
        
        data class Condition(
            val type: ConditionType,
            val key: String,
            val value: Any,
            val operator: Operator = Operator.EQUALS
        ) {
            enum class ConditionType {
                HEADER,
                QUERY_PARAM,
                BODY,
                PATH_PARAM,
                COOKIE
            }
            
            enum class Operator {
                EQUALS,
                NOT_EQUALS,
                CONTAINS,
                STARTS_WITH,
                ENDS_WITH,
                REGEX
            }
        }
    }
    
    /**
     * Mock响应数据类
     */
    data class MockResponse(
        val statusCode: Int = 200,
        val body: Any? = null,
        val headers: Map<String, String> = emptyMap(),
        val delay: Long = 0,
        val repeatCount: Int = -1, // -1表示无限次
        val callback: ((MockRequest) -> MockResponse)? = null
    )
    
    /**
     * Mock请求数据类
     */
    data class MockRequest(
        val protocol: MockRule.Protocol,
        val path: String,
        val method: String,
        val headers: Map<String, String>,
        val body: String?,
        val queryParams: Map<String, String>,
        val timestamp: Long
    )
    
    /**
     * Mock服务接口
     */
    interface MockService {
        fun start()
        fun stop()
        fun isRunning(): Boolean
        fun getServiceName(): String
        fun addMockRule(rule: MockRule)
        fun removeMockRule(ruleId: String)
        fun clearMockRules()
    }
    
    /**
     * 初始化Mock框架
     */
    fun initialize() {
        if (isInitialized.compareAndSet(false, true)) {
            Log.d(TAG, "Mock框架初始化")
            
            // 注册默认的Mock服务
            registerMockService(HttpMockService())
            registerMockService(WebSocketMockService())
            registerMockService(UdpMockService())
        }
    }
    
    /**
     * 注册Mock服务
     */
    fun registerMockService(service: MockService) {
        mockServices[service.getServiceName()] = service
        Log.d(TAG, "已注册Mock服务: ${service.getServiceName()}")
    }
    
    /**
     * 获取Mock服务
     */
    fun getMockService(serviceName: String): MockService? {
        return mockServices[serviceName]
    }
    
    /**
     * 添加Mock规则
     */
    fun addMockRule(rule: MockRule) {
        val service = getMockService(rule.protocol.name.lowercase())
        if (service != null) {
            service.addMockRule(rule)
            
            // 同时添加到全局规则列表
            val rules = mockRules.computeIfAbsent(rule.protocol.name) { mutableListOf() }
            rules.add(rule)
            
            Log.d(TAG, "已添加Mock规则: ${rule.id} (${rule.protocol}) ${rule.method} ${rule.path}")
        } else {
            Log.e(TAG, "未找到对应的Mock服务: ${rule.protocol}")
        }
    }
    
    /**
     * 移除Mock规则
     */
    fun removeMockRule(ruleId: String) {
        // 从所有服务中移除规则
        for (service in mockServices.values) {
            service.removeMockRule(ruleId)
        }
        
        // 从全局规则列表中移除
        for (rules in mockRules.values) {
            rules.removeIf { it.id == ruleId }
        }
        
        Log.d(TAG, "已移除Mock规则: $ruleId")
    }
    
    /**
     * 清除所有Mock规则
     */
    fun clearAllMockRules() {
        for (service in mockServices.values) {
            service.clearMockRules()
        }
        mockRules.clear()
        Log.d(TAG, "已清除所有Mock规则")
    }
    
    /**
     * 启动所有Mock服务
     */
    fun startAllMockServices() {
        for (service in mockServices.values) {
            try {
                service.start()
                Log.d(TAG, "Mock服务已启动: ${service.getServiceName()}")
            } catch (e: Exception) {
                Log.e(TAG, "启动Mock服务失败: ${service.getServiceName()}", e)
            }
        }
    }
    
    /**
     * 停止所有Mock服务
     */
    fun stopAllMockServices() {
        for (service in mockServices.values) {
            try {
                service.stop()
                Log.d(TAG, "Mock服务已停止: ${service.getServiceName()}")
            } catch (e: Exception) {
                Log.e(TAG, "停止Mock服务失败: ${service.getServiceName()}", e)
            }
        }
    }
    
    /**
     * HTTP Mock服务
     */
    inner class HttpMockService : MockService {
        private var serverSocket: ServerSocket? = null
        private val isRunning = AtomicBoolean(false)
        private val mockRules = mutableListOf<MockRule>()
        private val serverPort = 8930
        
        override fun start() {
            if (isRunning.get()) {
                Log.w(TAG, "HTTP Mock服务已在运行")
                return
            }
            
            try {
                serverSocket = ServerSocket(serverPort)
                isRunning.set(true)
                
                CoroutineScope(Dispatchers.IO).launch {
                    Log.d(TAG, "HTTP Mock服务启动，监听端口: $serverPort")
                    
                    while (isRunning.get()) {
                        try {
                            val socket = serverSocket?.accept()
                            if (socket != null) {
                                handleHttpRequest(socket)
                            }
                        } catch (e: IOException) {
                            if (isRunning.get()) {
                                Log.e(TAG, "HTTP Mock服务接受连接时出错", e)
                            }
                            break
                        }
                    }
                }
            } catch (e: IOException) {
                Log.e(TAG, "启动HTTP Mock服务失败", e)
                isRunning.set(false)
            }
        }
        
        private fun handleHttpRequest(socket: Socket) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val input = BufferedReader(InputStreamReader(socket.getInputStream()))
                    val output = PrintWriter(socket.getOutputStream(), true)
                    
                    // 读取HTTP请求
                    val requestLine = input.readLine() ?: return@launch
                    val requestParts = requestLine.split(" ")
                    if (requestParts.size < 3) {
                        sendHttpResponse(output, 400, "Bad Request")
                        return@launch
                    }
                    
                    val method = requestParts[0]
                    val path = requestParts[1]
                    val headers = mutableMapOf<String, String>()
                    
                    // 读取请求头
                    var line: String?
                    while (input.readLine().also { line = it } != null && line?.isNotEmpty() == true) {
                        val headerParts = line?.split(":", limit = 2)
                        if (headerParts?.size == 2) {
                            headers[headerParts[0].trim()] = headerParts[1].trim()
                        }
                    }
                    
                    // 读取请求体
                    var body: String? = null
                    val contentLength = headers["Content-Length"]?.toIntOrNull() ?: 0
                    if (contentLength > 0) {
                        val bodyBuffer = CharArray(contentLength)
                        input.read(bodyBuffer, 0, contentLength)
                        body = String(bodyBuffer)
                    }
                    
                    // 解析查询参数
                    val queryParams = mutableMapOf<String, String>()
                    val pathParts = path.split("?")
                    val actualPath = pathParts[0]
                    if (pathParts.size > 1) {
                        val queryString = pathParts[1]
                        queryString.split("&").forEach { param ->
                            val paramParts = param.split("=")
                            if (paramParts.size == 2) {
                                queryParams[paramParts[0]] = paramParts[1]
                            }
                        }
                    }
                    
                    // 查找匹配的Mock规则
                    val mockRequest = MockRequest(
                        protocol = MockRule.Protocol.HTTP,
                        path = actualPath,
                        method = method,
                        headers = headers,
                        body = body,
                        queryParams = queryParams,
                        timestamp = System.currentTimeMillis()
                    )
                    
                    val matchedRule = findMatchingRule(mockRequest)
                    if (matchedRule != null) {
                        // 应用延迟
                        if (matchedRule.response.delay > 0) {
                            Thread.sleep(matchedRule.response.delay)
                        }
                        
                        // 生成响应
                        val response = matchedRule.response.callback?.invoke(mockRequest) ?: matchedRule.response
                        sendHttpResponse(output, response.statusCode, response.body?.toString() ?: "{}", response.headers)
                    } else {
                        sendHttpResponse(output, 404, "Not Found")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "处理HTTP请求时出错", e)
                } finally {
                    try {
                        socket.close()
                    } catch (e: IOException) {
                        Log.e(TAG, "关闭HTTP连接时出错", e)
                    }
                }
            }
        }
        
        private fun sendHttpResponse(output: PrintWriter, statusCode: Int, body: String, headers: Map<String, String> = emptyMap()) {
            val statusText = when (statusCode) {
                200 -> "OK"
                400 -> "Bad Request"
                404 -> "Not Found"
                500 -> "Internal Server Error"
                else -> "Unknown Status"
            }
            
            output.println("HTTP/1.1 $statusCode $statusText")
            output.println("Content-Type: application/json")
            output.println("Content-Length: ${body.toByteArray(Charsets.UTF_8).size}")
            output.println("Connection: close")
            
            // 添加自定义响应头
            for ((key, value) in headers) {
                output.println("$key: $value")
            }
            
            output.println()
            output.println(body)
            output.flush()
        }
        
        private fun findMatchingRule(request: MockRequest): MockRule? {
            // 按优先级排序，优先级高的先匹配
            return mockRules.filter { it.enabled }
                .sortedByDescending { it.priority }
                .firstOrNull { rule ->
                    rule.protocol == MockRule.Protocol.HTTP &&
                    rule.method.equals(request.method, ignoreCase = true) &&
                    rule.path == request.path
                }
        }
        
        override fun stop() {
            if (isRunning.compareAndSet(true, false)) {
                try {
                    serverSocket?.close()
                    Log.d(TAG, "HTTP Mock服务已停止")
                } catch (e: IOException) {
                    Log.e(TAG, "停止HTTP Mock服务失败", e)
                }
            }
        }
        
        override fun isRunning(): Boolean {
            return isRunning.get()
        }
        
        override fun getServiceName(): String {
            return "http"
        }
        
        override fun addMockRule(rule: MockRule) {
            mockRules.add(rule)
        }
        
        override fun removeMockRule(ruleId: String) {
            mockRules.removeIf { it.id == ruleId }
        }
        
        override fun clearMockRules() {
            mockRules.clear()
        }
    }
    
    /**
     * WebSocket Mock服务
     */
    inner class WebSocketMockService : MockService {
        private var serverSocket: ServerSocket? = null
        private val isRunning = AtomicBoolean(false)
        private val mockRules = mutableListOf<MockRule>()
        private val serverPort = 8931
        
        override fun start() {
            if (isRunning.get()) {
                Log.w(TAG, "WebSocket Mock服务已在运行")
                return
            }
            
            try {
                serverSocket = ServerSocket(serverPort)
                isRunning.set(true)
                
                CoroutineScope(Dispatchers.IO).launch {
                    Log.d(TAG, "WebSocket Mock服务启动，监听端口: $serverPort")
                    
                    while (isRunning.get()) {
                        try {
                            val socket = serverSocket?.accept()
                            if (socket != null) {
                                handleWebSocketConnection(socket)
                            }
                        } catch (e: IOException) {
                            if (isRunning.get()) {
                                Log.e(TAG, "WebSocket Mock服务接受连接时出错", e)
                            }
                            break
                        }
                    }
                }
            } catch (e: IOException) {
                Log.e(TAG, "启动WebSocket Mock服务失败", e)
                isRunning.set(false)
            }
        }
        
        private fun handleWebSocketConnection(socket: Socket) {
            CoroutineScope(Dispatchers.IO).launch {
                var input: BufferedReader? = null
                var outputStream: OutputStream? = null
                var inputStream: InputStream? = null
                
                try {
                    input = BufferedReader(InputStreamReader(socket.getInputStream()))
                    outputStream = socket.getOutputStream()
                    inputStream = socket.getInputStream()
                    
                    // 处理WebSocket握手
                    if (!handleWebSocketHandshake(input, outputStream)) {
                        return@launch
                    }
                    
                    // 处理WebSocket消息
                    handleWebSocketMessages(socket, inputStream, outputStream)
                } catch (e: Exception) {
                    Log.e(TAG, "处理WebSocket连接时出错", e)
                } finally {
                    try {
                        input?.close()
                        outputStream?.close()
                        inputStream?.close()
                        socket.close()
                    } catch (e: IOException) {
                        Log.e(TAG, "关闭WebSocket连接时出错", e)
                    }
                }
            }
        }
        
        private fun handleWebSocketHandshake(input: BufferedReader, outputStream: OutputStream): Boolean {
            try {
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
                    
                    outputStream.write(handshakeResponse.toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    return true
                }
            } catch (e: Exception) {
                Log.e(TAG, "处理WebSocket握手时出错", e)
            }
            return false
        }
        
        private fun generateAcceptKey(key: String): String {
            val concatenated = key + MockFramework.WS_GUID
            val sha1 = java.security.MessageDigest.getInstance("SHA-1")
            val hashed = sha1.digest(concatenated.toByteArray(Charsets.UTF_8))
            return android.util.Base64.encodeToString(hashed, android.util.Base64.NO_WRAP)
        }
        
        private fun handleWebSocketMessages(socket: Socket, inputStream: InputStream, outputStream: OutputStream) {
            try {
                val buffer = ByteArray(1024)
                
                while (!socket.isClosed && isRunning.get()) {
                    val bytesRead = inputStream.read(buffer)
                    if (bytesRead > 0) {
                        val message = parseWebSocketFrame(buffer, bytesRead)
                        if (message != null) {
                            Log.d(TAG, "收到WebSocket消息: $message")
                            
                            // 查找匹配的Mock规则
                            val mockRequest = MockRequest(
                                protocol = MockRule.Protocol.WEBSOCKET,
                                path = "/",
                                method = "MESSAGE",
                                headers = emptyMap(),
                                body = message,
                                queryParams = emptyMap(),
                                timestamp = System.currentTimeMillis()
                            )
                            
                            val matchedRule = findMatchingRule(mockRequest)
                            if (matchedRule != null) {
                                // 应用延迟
                                if (matchedRule.response.delay > 0) {
                                    Thread.sleep(matchedRule.response.delay)
                                }
                                
                                // 生成响应
                                val response = matchedRule.response.callback?.invoke(mockRequest) ?: matchedRule.response
                                sendWebSocketFrame(outputStream, response.body?.toString() ?: "{}")
                            }
                        }
                    } else if (bytesRead == -1) {
                        break
                    }
                }
            } catch (e: Exception) {
                if (isRunning.get() && !socket.isClosed) {
                    Log.e(TAG, "处理WebSocket消息时出错", e)
                }
            }
        }
        
        private fun parseWebSocketFrame(buffer: ByteArray, length: Int): String? {
            if (length < 2) return null
            
            try {
                var offset = 0
                
                // 读取帧头
                val fin = (buffer[offset].toInt() and 0x80) != 0
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
                    
                    // 只处理文本帧
                    if (opcode == 1) {
                        return String(data, Charsets.UTF_8)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "解析WebSocket帧时出错", e)
            }
            
            return null
        }
        
        private fun sendWebSocketFrame(outputStream: OutputStream, message: String) {
            try {
                val messageBytes = message.toByteArray(Charsets.UTF_8)
                val frame = createWebSocketFrame(messageBytes, 0x1) // 0x1 = 文本帧
                outputStream.write(frame)
                outputStream.flush()
            } catch (e: Exception) {
                Log.e(TAG, "发送WebSocket帧失败", e)
            }
        }
        
        private fun createWebSocketFrame(payload: ByteArray, opcode: Int): ByteArray {
            val frame = mutableListOf<Byte>()
            
            // FIN位设置为1，opcode
            frame.add((0x80 or opcode).toByte())
            
            // 载荷长度处理
            if (payload.size < 126) {
                frame.add(payload.size.toByte())
            } else if (payload.size <= 0xFFFF) {
                frame.add(126.toByte())
                frame.add((payload.size shr 8).toByte())
                frame.add(payload.size.toByte())
            } else {
                frame.add(127.toByte())
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
        
        private fun findMatchingRule(request: MockRequest): MockRule? {
            return mockRules.filter { it.enabled }
                .sortedByDescending { it.priority }
                .firstOrNull { rule ->
                    rule.protocol == MockRule.Protocol.WEBSOCKET
                }
        }
        
        override fun stop() {
            if (isRunning.compareAndSet(true, false)) {
                try {
                    serverSocket?.close()
                    Log.d(TAG, "WebSocket Mock服务已停止")
                } catch (e: IOException) {
                    Log.e(TAG, "停止WebSocket Mock服务失败", e)
                }
            }
        }
        
        override fun isRunning(): Boolean {
            return isRunning.get()
        }
        
        override fun getServiceName(): String {
            return "websocket"
        }
        
        override fun addMockRule(rule: MockRule) {
            mockRules.add(rule)
        }
        
        override fun removeMockRule(ruleId: String) {
            mockRules.removeIf { it.id == ruleId }
        }
        
        override fun clearMockRules() {
            mockRules.clear()
        }
    }
    
    /**
     * UDP Mock服务
     */
    inner class UdpMockService : MockService {
        private var datagramSocket: DatagramSocket? = null
        private val isRunning = AtomicBoolean(false)
        private val mockRules = mutableListOf<MockRule>()
        private val serverPort = 8932
        
        override fun start() {
            if (isRunning.get()) {
                Log.w(TAG, "UDP Mock服务已在运行")
                return
            }
            
            try {
                datagramSocket = DatagramSocket(serverPort)
                isRunning.set(true)
                
                CoroutineScope(Dispatchers.IO).launch {
                    Log.d(TAG, "UDP Mock服务启动，监听端口: $serverPort")
                    
                    while (isRunning.get()) {
                        try {
                            val buffer = ByteArray(1024)
                            val packet = DatagramPacket(buffer, buffer.size)
                            datagramSocket?.receive(packet)
                            
                            val message = String(packet.data, 0, packet.length, Charsets.UTF_8)
                            Log.d(TAG, "收到UDP消息: $message from ${packet.address}:${packet.port}")
                            
                            // 处理UDP消息
                            handleUdpMessage(packet, message)
                        } catch (e: IOException) {
                            if (isRunning.get()) {
                                Log.e(TAG, "UDP Mock服务接收消息时出错", e)
                            }
                            break
                        }
                    }
                }
            } catch (e: IOException) {
                Log.e(TAG, "启动UDP Mock服务失败", e)
                isRunning.set(false)
            }
        }
        
        private fun handleUdpMessage(packet: DatagramPacket, message: String) {
            try {
                // 查找匹配的Mock规则
                val mockRequest = MockRequest(
                    protocol = MockRule.Protocol.UDP,
                    path = "/",
                    method = "MESSAGE",
                    headers = emptyMap(),
                    body = message,
                    queryParams = emptyMap(),
                    timestamp = System.currentTimeMillis()
                )
                
                val matchedRule = findMatchingRule(mockRequest)
                if (matchedRule != null) {
                    // 应用延迟
                    if (matchedRule.response.delay > 0) {
                        Thread.sleep(matchedRule.response.delay)
                    }
                    
                    // 生成响应
                    val response = matchedRule.response.callback?.invoke(mockRequest) ?: matchedRule.response
                    val responseBytes = response.body?.toString()?.toByteArray(Charsets.UTF_8) ?: ByteArray(0)
                    
                    // 发送UDP响应
                    val responsePacket = DatagramPacket(
                        responseBytes,
                        responseBytes.size,
                        packet.address,
                        packet.port
                    )
                    datagramSocket?.send(responsePacket)
                    Log.d(TAG, "发送UDP响应: ${String(responseBytes, Charsets.UTF_8)} to ${packet.address}:${packet.port}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "处理UDP消息时出错", e)
            }
        }
        
        private fun findMatchingRule(request: MockRequest): MockRule? {
            return mockRules.filter { it.enabled }
                .sortedByDescending { it.priority }
                .firstOrNull { rule ->
                    rule.protocol == MockRule.Protocol.UDP
                }
        }
        
        override fun stop() {
            if (isRunning.compareAndSet(true, false)) {
                try {
                    datagramSocket?.close()
                    Log.d(TAG, "UDP Mock服务已停止")
                } catch (e: IOException) {
                    Log.e(TAG, "停止UDP Mock服务失败", e)
                }
            }
        }
        
        override fun isRunning(): Boolean {
            return isRunning.get()
        }
        
        override fun getServiceName(): String {
            return "udp"
        }
        
        override fun addMockRule(rule: MockRule) {
            mockRules.add(rule)
        }
        
        override fun removeMockRule(ruleId: String) {
            mockRules.removeIf { it.id == ruleId }
        }
        
        override fun clearMockRules() {
            mockRules.clear()
        }
    }
    
    /**
     * 停止Mock框架
     */
    fun shutdown() {
        stopAllMockServices()
        mockServices.clear()
        mockRules.clear()
        isInitialized.set(false)
        Log.d(TAG, "Mock框架已关闭")
    }
}