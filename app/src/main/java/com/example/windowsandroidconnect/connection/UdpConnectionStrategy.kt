package com.example.windowsandroidconnect.connection

import android.util.Log
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
            true
        } catch (e: Exception) {
            Log.e("UdpConnectionStrategy", "UDP连接失败", e)
            isConnectedState = false
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
}