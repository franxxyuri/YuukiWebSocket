package com.example.windowsandroidconnect.connection

import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * HTTP连接策略实现
 * 使用HTTP/HTTPS协议进行数据传输
 */
class HttpConnectionStrategy : ConnectionStrategy {
    
    private var client: OkHttpClient? = null
    private var serverUrl: String? = null
    private var isConnectedState = false
    private val messageCallbacks = ConcurrentHashMap<String, (JSONObject) -> Unit>()
    
    override suspend fun connect(ip: String, port: Int): Boolean {
        return try {
            Log.d("HttpConnectionStrategy", "尝试使用HTTP连接到 $ip:$port")
            
            // 创建OkHttp客户端
            client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()
            
            // 设置服务器URL
            serverUrl = "http://$ip:$port"
            
            // 尝试连接（发送测试请求）
            val success = testConnection()
            
            if (success) {
                isConnectedState = true
                Log.d("HttpConnectionStrategy", "HTTP连接成功")
            } else {
                Log.e("HttpConnectionStrategy", "HTTP连接测试失败")
            }
            
            success
        } catch (e: Exception) {
            Log.e("HttpConnectionStrategy", "HTTP连接失败", e)
            isConnectedState = false
            false
        }
    }
    
    override fun disconnect() {
        Log.d("HttpConnectionStrategy", "断开HTTP连接")
        
        client?.dispatcher?.executorService?.shutdown()
        client?.connectionPool?.evictAll()
        client = null
        serverUrl = null
        isConnectedState = false
        messageCallbacks.clear()
    }
    
    override fun sendMessage(message: JSONObject) {
        if (isConnected()) {
            try {
                val requestJson = message.toString()
                
                // 创建HTTP请求
                val request = Request.Builder()
                    .url("$serverUrl/api/message")
                    .post(
                        RequestBody.create(
                            "application/json; charset=utf-8".toMediaType(),
                            requestJson
                        )
                    )
                    .build()
                
                // 异步发送请求
                client?.newCall(request)?.enqueue(object : Callback {
                    override fun onFailure(call: Call, e: IOException) {
                        Log.e("HttpConnectionStrategy", "发送HTTP消息失败", e)
                    }
                    
                    override fun onResponse(call: Call, response: Response) {
                        response.use { responseObj ->
                            if (responseObj.isSuccessful) {
                                Log.d("HttpConnectionStrategy", "HTTP消息发送成功")
                                val responseBody = responseObj.body?.string()
                                if (responseBody != null) {
                                    // 处理响应
                                    handleResponse(responseBody)
                                }
                            } else {
                                Log.e("HttpConnectionStrategy", "HTTP消息发送失败: ${responseObj.code}")
                            }
                            Unit // 明确返回Unit
                        }
                    }
                })
                
                Log.d("HttpConnectionStrategy", "发送HTTP消息: ${requestJson.take(50)}...")
            } catch (e: Exception) {
                Log.e("HttpConnectionStrategy", "发送HTTP消息异常", e)
            }
        } else {
            Log.w("HttpConnectionStrategy", "未连接HTTP，无法发送消息")
        }
    }
    
    override fun isConnected(): Boolean {
        return isConnectedState && client != null && serverUrl != null
    }
    
    override fun getConnectionType(): String {
        return "HTTP"
    }
    
    /**
     * 注册消息回调
     */
    fun registerMessageCallback(type: String, callback: (JSONObject) -> Unit) {
        messageCallbacks[type] = callback
    }
    
    /**
     * 测试连接
     */
    private fun testConnection(): Boolean {
        return try {
            val request = Request.Builder()
                .url("$serverUrl/api/ping")
                .get()
                .build()
            
            val response = client?.newCall(request)?.execute()
            response?.use { responseObj -> responseObj.isSuccessful } ?: false
        } catch (e: Exception) {
            Log.e("HttpConnectionStrategy", "连接测试失败", e)
            false
        }
    }
    
    /**
     * 处理服务器响应
     */
    private fun handleResponse(responseBody: String) {
        try {
            val jsonResponse = JSONObject(responseBody)
            val messageType = jsonResponse.optString("type", "unknown")
            
            // 查找并调用相应的回调
            val callback = messageCallbacks[messageType]
            callback?.invoke(jsonResponse)
        } catch (e: Exception) {
            Log.e("HttpConnectionStrategy", "处理响应失败", e)
        }
    }
    
    /**
     * 轮询服务器获取消息（可选实现）
     */
    private fun startPolling() {
        // 实现轮询逻辑以接收服务器消息
        // 这里可以使用协程定期发送请求来获取新消息
    }
}