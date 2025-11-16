package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.util.Log

/**
 * 屏幕捕获权限请求Activity
 * 用于请求用户授权屏幕捕获功能
 */
class ScreenCaptureRequestActivity : Activity() {
    
    private lateinit var mediaProjectionManager: MediaProjectionManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        mediaProjectionManager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        
        // 请求屏幕捕获权限
        requestScreenCapturePermission()
    }
    
    /**
     * 请求屏幕捕获权限
     */
    private fun requestScreenCapturePermission() {
        try {
            val intent = mediaProjectionManager.createScreenCaptureIntent()
            startActivityForResult(intent, REQUEST_CODE_CAPTURE)
        } catch (e: Exception) {
            Log.e(TAG, "请求屏幕捕获权限失败", e)
            finish()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == REQUEST_CODE_CAPTURE) {
            if (resultCode == RESULT_OK && data != null) {
                // 权限已授予，保存结果以便ScreenCaptureService使用
                // 这里可以通过单例模式或全局变量传递结果给Service
                Log.d(TAG, "屏幕捕获权限已授予")
                
                // 通知ScreenCaptureService开始捕获
                val resultIntent = Intent(ACTION_CAPTURE_PERMISSION_GRANTED).apply {
                    putExtra(EXTRA_RESULT_CODE, resultCode)
                    putExtra(EXTRA_RESULT_DATA, data)
                }
                sendBroadcast(resultIntent)
            } else {
                Log.d(TAG, "屏幕捕获权限被拒绝")
            }
        }
        
        // 关闭此Activity
        finish()
    }
    
    companion object {
        private const val TAG = "ScreenCaptureRequestActivity"
        private const val REQUEST_CODE_CAPTURE = 1001
        const val ACTION_CAPTURE_PERMISSION_GRANTED = "capture_permission_granted"
        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_RESULT_DATA = "result_data"
    }
}