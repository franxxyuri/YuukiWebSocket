package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import org.json.JSONObject

/**
 * 剪贴板同步服务
 * 监听Android设备剪贴板变化并同步到Windows端
 */
class ClipboardService : Service() {
    
    private lateinit var clipboardManager: ClipboardManager
    private var isSyncing = false
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var lastClipboardContent: String? = null
    private var networkCommunication: NetworkCommunication? = null
    
    override fun onCreate() {
        super.onCreate()
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        
        // 获取网络通信实例
        networkCommunication = (application as? MyApplication)?.networkCommunication
        
        startClipboardMonitoring()
        Log.d(TAG, "剪贴板同步服务已启动")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "收到服务启动命令: ${intent?.action}")
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        Log.d(TAG, "剪贴板同步服务已停止")
    }
    
    /**
     * 启动剪贴板监听
     */
    private fun startClipboardMonitoring() {
        clipboardManager.addPrimaryClipChangedListener {
            val clipData = clipboardManager.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val text = clipData.getItemAt(0).text.toString()
                
                if (text != lastClipboardContent && text.isNotEmpty()) {
                    lastClipboardContent = text
                    Log.d(TAG, "剪贴板内容已更新: $text")
                    
                    // 发送到Windows端
                    serviceScope.launch {
                        syncClipboardToWindows(text)
                    }
                }
            }
        }
    }
    
    /**
     * 同步剪贴板内容到Windows端
     */
    private suspend fun syncClipboardToWindows(content: String) {
        try {
            // 检查网络连接
            if (networkCommunication == null || !networkCommunication!!.isConnected()) {
                Log.w(TAG, "网络未连接，无法同步剪贴板内容")
                return
            }
            
            // 发送剪贴板内容到Windows端
            val message = JSONObject().apply {
                put("type", "clipboard")
                put("action", "sync")
                put("data", content)
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(message)
            Log.d(TAG, "剪贴板内容已同步到Windows端: ${content.length} characters")
            
        } catch (e: Exception) {
            Log.e(TAG, "同步剪贴板内容失败", e)
        }
    }
    
    companion object {
        private const val TAG = "ClipboardService"
    }
}