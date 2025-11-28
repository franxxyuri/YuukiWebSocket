package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.util.Log
import com.example.windowsandroidconnect.service.OptimizedScreenCaptureService

/**
 * 屏幕捕获权限请求Activity
 * 
 * 这是一个透明的Activity，用于请求屏幕捕获权限
 */
class ScreenCaptureRequestActivity : Activity() {
    
    companion object {
        private const val TAG = "ScreenCaptureRequest"
        private const val REQUEST_CODE_SCREEN_CAPTURE = 1001
        
        // 广播动作和额外数据的常量
        const val ACTION_CAPTURE_PERMISSION_GRANTED = "com.example.windowsandroidconnect.CAPTURE_PERMISSION_GRANTED"
        const val EXTRA_RESULT_CODE = "extra_result_code"
        const val EXTRA_RESULT_DATA = "extra_result_data"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        try {
            // 获取MediaProjectionManager并启动屏幕捕获意图
            val mediaProjectionManager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            val captureIntent = mediaProjectionManager.createScreenCaptureIntent()
            
            // 检查Intent是否可解析（即是否有Activity可以处理该Intent）
            val packageManager = packageManager
            val activities = packageManager.queryIntentActivities(captureIntent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
            if (activities.size > 0) {
                if (captureIntent != null) {
                    // 启动屏幕捕获权限请求
                    startActivityForResult(captureIntent, REQUEST_CODE_SCREEN_CAPTURE)
                } else {
                    Log.e(TAG, "无法创建屏幕捕获意图")
                    finish()
                }
            } else {
                Log.e(TAG, "没有可用的Activity来处理屏幕捕获权限请求")
                // 发送权限被拒绝的广播
                val broadcastIntent = Intent(ACTION_CAPTURE_PERMISSION_GRANTED)
                broadcastIntent.putExtra(EXTRA_RESULT_CODE, -1) // RESULT_CANCELED
                broadcastIntent.putExtra(EXTRA_RESULT_DATA, null as android.content.Intent?)
                sendBroadcast(broadcastIntent)
                finish()
            }
        } catch (e: Exception) {
            Log.e(TAG, "启动屏幕捕获权限请求失败: ${e.message}", e)
            // 发送权限被拒绝的广播
            val broadcastIntent = Intent(ACTION_CAPTURE_PERMISSION_GRANTED)
            broadcastIntent.putExtra(EXTRA_RESULT_CODE, -1) // RESULT_CANCELED
            broadcastIntent.putExtra(EXTRA_RESULT_DATA, null as android.content.Intent?)
            sendBroadcast(broadcastIntent)
            finish()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE) {
            if (resultCode == RESULT_OK && data != null) {
                // 发送广播告知权限已授予
                val broadcastIntent = Intent(ACTION_CAPTURE_PERMISSION_GRANTED)
                broadcastIntent.putExtra(EXTRA_RESULT_CODE, resultCode)
                broadcastIntent.putExtra(EXTRA_RESULT_DATA, data as android.content.Intent?)
                sendBroadcast(broadcastIntent)
                
                // 同时启动优化的ScreenCaptureService
                val serviceIntent = Intent(this, OptimizedScreenCaptureService::class.java).apply {
                    action = OptimizedScreenCaptureService.ACTION_START_CAPTURE
                    putExtra("resultCode", resultCode)
                    putExtra("data", data)
                }
                // 使用startForegroundService启动前台服务（适用于Android 8.0+）
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
                
                Log.d(TAG, "屏幕捕获权限已获取，启动服务")
            } else {
                Log.e(TAG, "屏幕捕获权限被拒绝或取消")
                // 发送权限被拒绝的广播
                val broadcastIntent = Intent(ACTION_CAPTURE_PERMISSION_GRANTED)
                broadcastIntent.putExtra(EXTRA_RESULT_CODE, resultCode)
                broadcastIntent.putExtra(EXTRA_RESULT_DATA, data as android.content.Intent?)
                sendBroadcast(broadcastIntent)
            }
        }
        
        // 关闭Activity
        finish()
    }
}