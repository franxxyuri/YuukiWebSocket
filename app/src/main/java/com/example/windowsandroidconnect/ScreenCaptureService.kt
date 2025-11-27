package com.example.windowsandroidconnect

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import android.widget.Toast

/**
 * 屏幕捕获服务
 * 
 * 用于处理Android设备的屏幕捕获和共享
 */
class ScreenCaptureService : Service() {

    companion object {
        private const val TAG = "ScreenCaptureService"
        const val ACTION_START_CAPTURE = "com.example.windowsandroidconnect.START_CAPTURE"
        const val ACTION_STOP_CAPTURE = "com.example.windowsandroidconnect.STOP_CAPTURE"
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_CAPTURE -> {
                startScreenCapture()
            }
            ACTION_STOP_CAPTURE -> {
                stopScreenCapture()
            }
            else -> {
                startScreenCapture() // 默认开始捕获
            }
        }

        return START_STICKY // 服务被杀死后尝试重启
    }

    /**
     * 开始屏幕捕获
     */
    private fun startScreenCapture() {
        Log.d(TAG, "开始屏幕捕获")
        Toast.makeText(this, "开始屏幕捕获", Toast.LENGTH_SHORT).show()
        
        // TODO: 实现屏幕捕获逻辑
        // 1. 请求屏幕捕获权限
        // 2. 使用MediaProjection API捕获屏幕
        // 3. 将捕获的帧发送到Windows设备
    }

    /**
     * 停止屏幕捕获
     */
    private fun stopScreenCapture() {
        Log.d(TAG, "停止屏幕捕获")
        Toast.makeText(this, "停止屏幕捕获", Toast.LENGTH_SHORT).show()
        
        // TODO: 停止屏幕捕获并清理资源
        stopSelf() // 停止服务
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "屏幕捕获服务已销毁")
        stopScreenCapture()
    }
}