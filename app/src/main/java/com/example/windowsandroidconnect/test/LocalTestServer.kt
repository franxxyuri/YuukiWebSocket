package com.example.windowsandroidconnect.test

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.*
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.atomic.AtomicBoolean

/**
 * 本地测试服务器
 * 用于在设备上进行自测试，无需外部服务器
 */
class LocalTestServer {
    private var serverSocket: ServerSocket? = null
    private val isRunning = AtomicBoolean(false)
    private var clientSocket: Socket? = null
    private var serverPort: Int = 8929 // 默认端口
    
    companion object {
        private const val TAG = "LocalTestServer"
    }
    
    /**
     * 启动本地测试服务器
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
                Log.d(TAG, "本地测试服务器启动，监听端口: $serverPort")
                
                while (isRunning.get()) {
                    try {
                        Log.d(TAG, "等待客户端连接...")
                        val socket = serverSocket?.accept()
                        
                        if (socket != null) {
                            Log.d(TAG, "客户端已连接: ${socket.remoteSocketAddress}")
                            clientSocket = socket
                            
                            // 处理客户端消息
                            handleClient(socket)
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
        } catch (e: IOException) {
            Log.e(TAG, "启动服务器失败", e)
            isRunning.set(false)
            return false
        }
    }
    
    /**
     * 处理客户端连接
     */
    private fun handleClient(socket: Socket) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val input = BufferedReader(InputStreamReader(socket.getInputStream()))
                val output = PrintWriter(socket.getOutputStream(), true)
                
                // 发送欢迎消息
                output.println("""{"type":"welcome","message":"Local test server connected"}""")
                
                var line: String?
                while (socket.isConnected && !socket.isClosed && isRunning.get()) {
                    line = input.readLine()
                    if (line != null) {
                        Log.d(TAG, "收到客户端消息: $line")
                        
                        // 回显消息或根据类型处理
                        try {
                            val response = handleClientMessage(line)
                            output.println(response)
                        } catch (e: Exception) {
                            Log.e(TAG, "处理消息时出错", e)
                            output.println("""{"type":"error","message":"${e.message}"}""")
                        }
                    } else {
                        // 客户端断开连接
                        break
                    }
                }
            } catch (e: IOException) {
                Log.e(TAG, "处理客户端时出错", e)
            } finally {
                try {
                    socket.close()
                    Log.d(TAG, "客户端连接已关闭")
                } catch (e: IOException) {
                    Log.e(TAG, "关闭客户端连接时出错", e)
                }
            }
        }
    }
    
    /**
     * 处理客户端消息
     */
    private fun handleClientMessage(message: String): String {
        return try {
            // 这里可以处理各种消息类型
            // 暂时返回一个简单的回显响应
            """{"type":"echo","original":"$message","status":"received"}"""
        } catch (e: Exception) {
            """{"type":"error","message":"Failed to process message"}"""
        }
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
            Log.d(TAG, "本地测试服务器已停止")
        } catch (e: IOException) {
            Log.e(TAG, "停止服务器时出错", e)
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