package com.example.windowsandroidconnect.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import org.json.JSONObject

/**
 * 通知同步服务
 * 监听Android设备通知变化并同步到Windows端
 */
class NotificationService : NotificationListenerService() {
    
    private var isSyncing = false
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var networkCommunication: NetworkCommunication? = null
    
    override fun onCreate() {
        super.onCreate()
        
        createNotificationChannel()
        Log.d(TAG, "通知同步服务已启动")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "收到服务启动命令: ${intent?.action}")
        
        // 获取网络通信实例
        networkCommunication = (application as? MyApplication)?.networkCommunication
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return super.onBind(intent)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        Log.d(TAG, "通知同步服务已停止")
    }
    
    /**
     * 创建通知渠道
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Windows-Android Connect",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "通知同步服务"
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    /**
     * 当有新通知发布时调用
     */
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        
        if (sbn != null) {
            Log.d(TAG, "收到新通知: ${sbn.packageName}")
            
            // 同步通知到Windows端
            serviceScope.launch {
                syncNotificationToWindows(sbn)
            }
        }
    }
    
    /**
     * 当通知被移除时调用
     */
    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        
        if (sbn != null) {
            Log.d(TAG, "通知被移除: ${sbn.packageName}")
            
            // 通知Windows端通知已被移除
            serviceScope.launch {
                removeNotificationOnWindows(sbn)
            }
        }
    }
    
    /**
     * 同步通知到Windows端
     */
    private suspend fun syncNotificationToWindows(sbn: StatusBarNotification) {
        try {
            // 检查网络连接
            if (networkCommunication == null || !networkCommunication!!.isConnected()) {
                Log.w(TAG, "网络未连接，无法同步通知")
                return
            }
            
            val notification = sbn.notification
            val extras = notification.extras
            
            // 构造通知数据
            val message = JSONObject().apply {
                put("type", "notification")
                put("action", "posted")
                put("notificationId", sbn.id)
                put("packageName", sbn.packageName)
                put("title", extras.getString("android.title", ""))
                put("text", extras.getString("android.text", ""))
                put("time", sbn.postTime)
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(message)
            Log.d(TAG, "通知已同步到Windows端: ${sbn.packageName}")
            
        } catch (e: Exception) {
            Log.e(TAG, "同步通知失败", e)
        }
    }
    
    /**
     * 通知Windows端通知已被移除
     */
    private suspend fun removeNotificationOnWindows(sbn: StatusBarNotification) {
        try {
            // 检查网络连接
            if (networkCommunication == null || !networkCommunication!!.isConnected()) {
                Log.w(TAG, "网络未连接，无法同步通知移除")
                return
            }
            
            // 发送通知移除消息
            val message = JSONObject().apply {
                put("type", "notification")
                put("action", "removed")
                put("notificationId", sbn.id)
                put("packageName", sbn.packageName)
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(message)
            Log.d(TAG, "通知移除已同步到Windows端: ${sbn.packageName}")
            
        } catch (e: Exception) {
            Log.e(TAG, "同步通知移除失败", e)
        }
    }
    
    companion object {
        private const val TAG = "NotificationService"
        private const val CHANNEL_ID = "notification_sync_channel"
    }
}