package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import kotlinx.coroutines.*

/**
 * 剪贴板同步服务
 * 监听Android设备剪贴板变化并同步到Windows端
 */
class ClipboardService : Service() {
    
    private lateinit var clipboardManager: ClipboardManager
    private var isSyncing = false
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var lastClipboardContent: String? = null
    
    override fun onCreate() {
        super.onCreate()
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        
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
                    
                    // TODO: 发送到Windows端
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
            // TODO: 实现网络传输到Windows端
            Log.d(TAG, "正在同步剪贴板内容到Windows端: $content")
            
            // 模拟网络延迟
            kotlinx.coroutines.delay(100)
            
            Log.d(TAG, "剪贴板内容已同步到Windows端")
            
        } catch (e: Exception) {
            Log.e(TAG, "同步剪贴板内容失败", e)
        }
    }
    
    companion object {
        private const val TAG = "ClipboardService"
    }
}