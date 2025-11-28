package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.ClipboardManager
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.network.NetworkCommunication
import org.json.JSONObject

/**
 * 剪贴板同步服务
 * 
 * 监听Android剪贴板变化并同步到Windows设备
 */
class ClipboardSyncService : Service(), ClipboardManager.OnPrimaryClipChangedListener {

    companion object {
        private const val TAG = "ClipboardSyncService"
        const val ACTION_START_SYNC = "com.example.windowsandroidconnect.START_CLIPBOARD_SYNC"
        const val ACTION_STOP_SYNC = "com.example.windowsandroidconnect.STOP_CLIPBOARD_SYNC"
        const val EXTRA_TARGET_DEVICE_ID = "target_device_id"
    }

    private var clipboardManager: ClipboardManager? = null
    private var networkCommunication: NetworkCommunication? = null
    private var isSyncEnabled = false
    private var targetDeviceId: String? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "剪贴板同步服务已创建")
        
        clipboardManager = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
        networkCommunication = (application as? MyApplication)?.networkCommunication
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_SYNC -> {
                targetDeviceId = intent?.getStringExtra(EXTRA_TARGET_DEVICE_ID)
                startSync()
            }
            ACTION_STOP_SYNC -> {
                stopSync()
            }
        }

        return START_STICKY
    }

    /**
     * 开始剪贴板同步
     */
    private fun startSync() {
        if (isSyncEnabled) {
            Log.d(TAG, "剪贴板同步已在运行")
            return
        }

        Log.d(TAG, "开始剪贴板同步")
        
        // 注册剪贴板变化监听器
        clipboardManager?.addPrimaryClipChangedListener(this)
        isSyncEnabled = true
        
        // 发送同步开始命令到Windows端
        sendSyncStatus(true)
        
        Log.d(TAG, "剪贴板同步已启动")
    }

    /**
     * 停止剪贴板同步
     */
    private fun stopSync() {
        if (!isSyncEnabled) {
            Log.d(TAG, "剪贴板同步未运行")
            return
        }

        Log.d(TAG, "停止剪贴板同步")
        
        // 注销剪贴板变化监听器
        clipboardManager?.removePrimaryClipChangedListener(this)
        isSyncEnabled = false
        
        // 发送同步停止命令到Windows端
        sendSyncStatus(false)
        
        Log.d(TAG, "剪贴板同步已停止")
    }

    /**
     * 发送同步状态
     */
    private fun sendSyncStatus(enabled: Boolean) {
        try {
            val statusMessage = JSONObject().apply {
                put("type", "clipboard_sync_status")
                put("enabled", enabled)
                put("timestamp", System.currentTimeMillis())
                targetDeviceId?.let { put("targetDeviceId", it) }
            }
            
            networkCommunication?.sendMessage(statusMessage)
        } catch (e: Exception) {
            Log.e(TAG, "发送剪贴板同步状态失败", e)
        }
    }

    /**
     * 剪贴板内容变化回调
     */
    override fun onPrimaryClipChanged() {
        if (!isSyncEnabled || networkCommunication?.isConnected() != true) {
            return
        }

        try {
            val clip = clipboardManager?.primaryClip
            if (clip != null && clip.itemCount > 0) {
                val text = clip.getItemAt(0).text?.toString() ?: ""
                
                Log.d(TAG, "剪贴板内容已变化: ${text.take(50)}...")
                
                // 发送剪贴板内容到Windows端
                val clipboardMessage = JSONObject().apply {
                    put("type", "clipboard")
                    put("data", text)
                    put("timestamp", System.currentTimeMillis())
                    put("source", "android")
                    targetDeviceId?.let { put("targetDeviceId", it) }
                }
                
                networkCommunication?.sendMessage(clipboardMessage)
                Log.d(TAG, "剪贴板内容已发送到Windows端")
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理剪贴板变化失败", e)
        }
    }

    /**
     * 从Windows端接收剪贴板内容
     */
    fun receiveClipboardFromWindows(clipboardData: String) {
        if (!isSyncEnabled) {
            return
        }

        try {
            // 设置剪贴板内容
            val clip = android.content.ClipData.newPlainText("Shared Clipboard", clipboardData)
            clipboardManager?.setPrimaryClip(clip)
            
            Log.d(TAG, "从Windows端接收的剪贴板内容已设置")
        } catch (e: Exception) {
            Log.e(TAG, "设置剪贴板内容失败", e)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "剪贴板同步服务已销毁")
        
        // 停止同步
        stopSync()
    }
}