package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log

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
        
        // 从Intent获取捕获Intent
        val captureIntent = intent.getParcelableExtra<Intent>("capture_intent")
        
        if (captureIntent != null) {
            // 启动屏幕捕获权限请求
            startActivityForResult(captureIntent, REQUEST_CODE_SCREEN_CAPTURE)
        } else {
            Log.e(TAG, "未提供捕获Intent")
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
                broadcastIntent.putExtra(EXTRA_RESULT_DATA, data)
                sendBroadcast(broadcastIntent)
                
                // 同时启动ScreenCaptureService
                val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                    action = ScreenCaptureService.ACTION_START_CAPTURE
                    putExtra("resultCode", resultCode)
                    putExtra("data", data)
                }
                startService(serviceIntent)
                
                Log.d(TAG, "屏幕捕获权限已获取，启动服务")
            } else {
                Log.e(TAG, "屏幕捕获权限被拒绝")
                // 可以显示错误消息或重试
            }
        }
        
        // 关闭Activity
        finish()
    }
}