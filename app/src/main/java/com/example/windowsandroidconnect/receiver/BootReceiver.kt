package com.example.windowsandroidconnect.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * 开机启动接收器
 * 监听系统启动完成事件，自动启动必要的后台服务
 */
class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> {
                handleBootCompleted(context)
            }
            else -> {
                Log.d(TAG, "收到未知广播: ${intent.action}")
            }
        }
    }
    
    /**
     * 处理开机完成事件
     */
    private fun handleBootCompleted(context: Context) {
        Log.d(TAG, "系统启动完成，开始启动后台服务")
        
        try {
            // 启动设备发现服务
            val discoveryIntent = Intent(context, com.example.windowsandroidconnect.service.DeviceDiscoveryService::class.java)
            context.startService(discoveryIntent)
            
            Log.d(TAG, "已启动后台服务")
            
        } catch (e: Exception) {
            Log.e(TAG, "启动后台服务失败", e)
        }
    }
}