package com.example.windowsandroidconnect.connection

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

/**
 * UDP连接策略实现
 * 使用UDP协议进行数据传输，适用于低延迟场景
 */
class UdpConnectionStrategy : ConnectionStrategy {
    
    private var socket: DatagramSocket? = null
    private var serverAddress: InetAddress? = null
    private var serverPort: Int = -1
    private var isConnectedState = false
    private var receiveThread: Thread? = null
    private var shouldStop = false
    private val statusListeners = mutableListOf<(Boolean) -> Unit>()
    private val messageListeners = mutableListOf<(JSONObject) -> Unit>()
    
    override suspend fun connect(ip: String, port: Int): Boolean {
        return try {
            Log.d("UdpConnectionStrategy", "尝试使用UDP连接到 $ip:$port")
            
            // 创建UDP套接字
            socket = DatagramSocket()
            serverAddress = InetAddress.getByName(ip)
            serverPort = port
            
            // 启动接收线程
            startReceiveThread()
            
            isConnectedState = true
            Log.d("UdpConnectionStrategy", "UDP连接成功")
            // 通知所有状态监听器
            statusListeners.forEach { it(true) }
            true
        } catch (e: Exception) {
            Log.e("UdpConnectionStrategy", "UDP连接失败", e)
            isConnectedState = false
            // 通知所有状态监听器
            statusListeners.forEach { it(false) }
            false
        }
    }
    
    override fun disconnect() {
        Log.d("UdpConnectionStrategy", "断开UDP连接")
        
        shouldStop = true
        receiveThread?.interrupt()
        socket?.close()
        socket = null
        serverAddress = null
        serverPort = -1
        isConnectedState = false
        // 通知所有状态监听器
        statusListeners.forEach { it(false) }
    }
    
    override fun sendMessage(message: JSONObject) {
        if (isConnected()) {
            try {
                val messageStr = message.toString()
                val sendData = messageStr.toByteArray()
                
                val packet = DatagramPacket(
                    sendData,
                    sendData.size,
                    serverAddress,
                    serverPort
                )
                
                socket?.send(packet)
                Log.d("UdpConnectionStrategy", "发送UDP消息: ${messageStr.take(50)}...")
            } catch (e: Exception) {
                Log.e("UdpConnectionStrategy", "发送UDP消息失败", e)
            }
        } else {
            Log.w("UdpConnectionStrategy", "未连接UDP，无法发送消息")
        }
    }
    
    override fun isConnected(): Boolean {
        return isConnectedState && socket != null && !socket!!.isClosed && serverAddress != null && serverPort != -1
    }
    
    override fun getConnectionType(): String {
        return "UDP"
    }
    
    private fun startReceiveThread() {
        receiveThread = Thread {
            val buffer = ByteArray(1024)
            val packet = DatagramPacket(buffer, buffer.size)
            
            shouldStop = false
            while (!shouldStop && socket != null && !socket!!.isClosed) {
                try {
                    socket?.receive(packet)
                    
                    val receivedData = String(packet.data, 0, packet.length)
                    Log.d("UdpConnectionStrategy", "收到UDP消息: $receivedData")
                    
                    // 通知所有消息监听器
                    try {
                        val jsonMessage = JSONObject(receivedData)
                        messageListeners.forEach { it(jsonMessage) }
                    } catch (e: Exception) {
                        Log.e("UdpConnectionStrategy", "解析收到的消息为JSON失败", e)
                    }
                    
                    // 这里可以添加消息处理逻辑
                    // 例如：处理来自服务器的响应
                    
                    // 准备接收下一个数据包
                    packet.data = buffer
                    packet.length = buffer.size
                    packet.address = serverAddress
                    packet.port = serverPort
                    
                } catch (e: Exception) {
                    if (!shouldStop) {
                        Log.e("UdpConnectionStrategy", "接收UDP消息失败", e)
                    }
                }
            }
        }
        receiveThread?.start()
    }
    
    override fun getConfig(): Map<String, Any> {
        val config = mutableMapOf<String, Any>()
        config["connectionType"] = getConnectionType()
        config["connected"] = isConnected()
        config["serverAddress"] = serverAddress?.hostAddress ?: ""
        config["serverPort"] = serverPort
        return config
    }
    
    override fun updateConfig(config: Map<String, Any>) {
        Log.d("UdpConnectionStrategy", "更新配置: $config")
        // 处理配置更新逻辑
    }
    
    override fun registerStatusListener(listener: (Boolean) -> Unit) {
        statusListeners.add(listener)
    }
    
    override fun unregisterStatusListener(listener: (Boolean) -> Unit) {
        statusListeners.remove(listener)
    }
    
    override fun registerMessageListener(listener: (JSONObject) -> Unit) {
        messageListeners.add(listener)
    }
    
    override fun unregisterMessageListener(listener: (JSONObject) -> Unit) {
        messageListeners.remove(listener)
    }
    
    override suspend fun reset(): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // 断开现有连接
                disconnect()
                
                // 重新连接到之前的服务器（如果有）
                if (serverAddress != null && serverPort != -1) {
                    connect(serverAddress!!.hostAddress, serverPort)
                } else {
                    false
                }
            } catch (e: Exception) {
                Log.e("UdpConnectionStrategy", "重置连接失败", e)
                false
            }
        }
    }
}