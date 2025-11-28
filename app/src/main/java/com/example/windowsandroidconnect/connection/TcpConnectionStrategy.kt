package com.example.windowsandroidconnect.connection

import android.util.Log
import com.example.windowsandroidconnect.network.NetworkCommunication
import org.json.JSONObject

/**
 * TCP连接策略实现
 * 基于WebSocket的TCP连接
 */
class TcpConnectionStrategy : ConnectionStrategy {
    
    private var networkCommunication: NetworkCommunication? = null
    
    override suspend fun connect(ip: String, port: Int): Boolean {
        return try {
            networkCommunication = NetworkCommunication()
            val result = networkCommunication?.connect(ip, port) ?: false
            result
        } catch (e: Exception) {
            Log.e("TcpConnectionStrategy", "TCP连接失败", e)
            false
        }
    }
    
    override fun disconnect() {
        networkCommunication?.disconnect()
        networkCommunication = null
    }
    
    override fun sendMessage(message: JSONObject) {
        if (isConnected()) {
            networkCommunication?.sendMessage(message)
        } else {
            Log.w("TcpConnectionStrategy", "未连接，无法发送消息")
        }
    }
    
    override fun isConnected(): Boolean {
        return networkCommunication?.isConnected() == true
    }
    
    override fun getConnectionType(): String {
        return "TCP/WebSocket"
    }
}