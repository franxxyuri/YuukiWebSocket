package com.example.windowsandroidconnect.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*

/**
 * 屏幕投屏管理服务
 * 
 * 管理屏幕投屏的启动、停止和状态
 */
class ScreenProjectionService : Service() {

    companion object {
        private const val TAG = "ScreenProjectionService"
        const val ACTION_START_PROJECTION = "com.example.windowsandroidconnect.START_PROJECTION"
        const val ACTION_STOP_PROJECTION = "com.example.windowsandroidconnect.STOP_PROJECTION"
        const val EXTRA_TARGET_DEVICE_ID = "target_device_id"
    }

    private var networkCommunication: NetworkCommunication? = null
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "屏幕投屏服务已创建")
        
        // 初始化网络通信模块
        networkCommunication = (application as? MyApplication)?.networkCommunication
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_PROJECTION -> {
                val targetDeviceId = intent.getStringExtra(EXTRA_TARGET_DEVICE_ID)
                startProjection(targetDeviceId)
            }
            ACTION_STOP_PROJECTION -> {
                stopProjection()
            }
        }

        return START_STICKY
    }

    /**
     * 开始屏幕投屏
     */
    private fun startProjection(targetDeviceId: String?) {
        Log.d(TAG, "开始屏幕投屏")
        
        // 首先启动屏幕捕获服务
        val captureIntent = Intent(this, ScreenCaptureService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            startForegroundService(captureIntent)
        } else {
            startService(captureIntent)
        }
        
        // 发送开始投屏命令到Windows端
        val projectionStartMessage = org.json.JSONObject().apply {
            put("type", "control_command")
            put("commandType", "start_projection")
            put("targetDeviceId", targetDeviceId ?: "windows")
            put("timestamp", System.currentTimeMillis())
        }
        
        try {
            networkCommunication?.sendMessage(projectionStartMessage)
            Log.d(TAG, "屏幕投屏开始命令已发送")
        } catch (e: Exception) {
            Log.e(TAG, "发送屏幕投屏命令失败", e)
        }
    }

    /**
     * 停止屏幕投屏
     */
    private fun stopProjection() {
        Log.d(TAG, "停止屏幕投屏")
        
        // 停止屏幕捕获服务
        val captureIntent = Intent(this, ScreenCaptureService::class.java)
        stopService(captureIntent)
        
        // 发送停止投屏命令到Windows端
        val projectionStopMessage = org.json.JSONObject().apply {
            put("type", "control_command")
            put("commandType", "stop_projection")
            put("timestamp", System.currentTimeMillis())
        }
        
        try {
            networkCommunication?.sendMessage(projectionStopMessage)
            Log.d(TAG, "屏幕投屏停止命令已发送")
        } catch (e: Exception) {
            Log.e(TAG, "发送屏幕投屏停止命令失败", e)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "屏幕投屏服务已销毁")
        
        // 停止投屏
        stopProjection()
        
        // 取消协程作用域
        coroutineScope.cancel()
    }
}