package com.example.windowsandroidconnect.service

import android.app.Notification
import android.app.NotificationManager
import android.content.Intent
import android.os.IBinder
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.network.NetworkCommunication
import org.json.JSONObject

/**
 * 通知同步服务
 * 
 * 通过NotificationListenerService监听Android通知并同步到Windows设备
 */
class NotificationSyncService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationSyncService"
    }

    private var networkCommunication: NetworkCommunication? = null
    private var isSyncEnabled = false

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "通知同步服务已创建")
        
        // 初始化网络通信模块
        networkCommunication = (application as? MyApplication)?.networkCommunication
        isSyncEnabled = true
    }

    /**
     * 通知状态栏通知被添加时调用
     */
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (!isSyncEnabled || sbn == null) {
            return
        }

        try {
            val packageName = sbn.packageName
            val notification = sbn.notification
            
            // 获取通知标题和内容
            val title = extractNotificationTitle(notification, packageName)
            val text = extractNotificationText(notification)
            
            // 检查是否是系统通知，避免发送不必要的通知
            if (isSystemNotification(packageName)) {
                Log.d(TAG, "忽略系统通知: $packageName")
                return
            }
            
            Log.d(TAG, "新通知: $title - $text")
            
            // 构建通知数据对象
            val notificationData = JSONObject().apply {
                put("type", "notification")
                put("title", title)
                put("text", text)
                put("packageName", packageName)
                put("timestamp", sbn.postTime)
                put("id", sbn.id)
                put("userId", sbn.userId)
            }
            
            // 发送通知到Windows端
            networkCommunication?.sendMessage(notificationData)
            Log.d(TAG, "通知已发送到Windows端: $title")
            
        } catch (e: Exception) {
            Log.e(TAG, "处理通知失败", e)
        }
    }

    /**
     * 通知状态栏通知被移除时调用
     */
    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (!isSyncEnabled || sbn == null) {
            return
        }

        try {
            val packageName = sbn.packageName
            
            Log.d(TAG, "通知已移除: $packageName")
            
            // 构建通知移除数据对象
            val notificationData = JSONObject().apply {
                put("type", "notification_removed")
                put("packageName", packageName)
                put("id", sbn.id)
                put("timestamp", System.currentTimeMillis())
            }
            
            // 发送通知移除信息到Windows端
            networkCommunication?.sendMessage(notificationData)
            Log.d(TAG, "通知移除信息已发送到Windows端")
            
        } catch (e: Exception) {
            Log.e(TAG, "处理通知移除失败", e)
        }
    }

    /**
     * 提取通知标题
     */
    private fun extractNotificationTitle(notification: Notification, packageName: String): String {
        // 优先从extras中获取标题
        return try {
            val extras = notification.extras
            extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: packageName
        } catch (e: Exception) {
            Log.w(TAG, "无法提取通知标题", e)
            packageName
        }
    }

    /**
     * 提取通知文本
     */
    private fun extractNotificationText(notification: Notification): String {
        return try {
            val extras = notification.extras
            extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()
                ?: ""
        } catch (e: Exception) {
            Log.w(TAG, "无法提取通知文本", e)
            ""
        }
    }

    /**
     * 检查是否是系统通知
     */
    private fun isSystemNotification(packageName: String): Boolean {
        return packageName.startsWith("com.android.") ||
               packageName.startsWith("com.google.android.") ||
               packageName == "android" ||
               packageName == "com.example.windowsandroidconnect" // 避免自循环
    }

    /**
     * 启用通知同步
     */
    fun enableSync() {
        isSyncEnabled = true
        Log.d(TAG, "通知同步已启用")
    }

    /**
     * 禁用通知同步
     */
    fun disableSync() {
        isSyncEnabled = false
        Log.d(TAG, "通知同步已禁用")
    }

    /**
     * 获取当前同步状态
     */
    fun isSyncEnabled(): Boolean {
        return isSyncEnabled
    }

    /**
     * 发送所有活动通知到Windows端
     */
    fun sendActiveNotifications() {
        try {
            val activeNotifications = activeNotifications
            Log.d(TAG, "发送 ${activeNotifications.size} 个活动通知")
            
            for (sbn in activeNotifications) {
                // 重新处理每个活动通知
                onNotificationPosted(sbn)
            }
        } catch (e: Exception) {
            Log.e(TAG, "发送活动通知失败", e)
        }
    }

    /**
     * 从Windows端接收通知操作
     */
    fun handleNotificationAction(notificationId: Int, packageName: String, action: String) {
        try {
            when (action) {
                "dismiss" -> {
                    // 取消通知
                    cancelNotification(null, packageName, notificationId)
                }
                "open" -> {
                    // 打开应用
                    openApp(packageName)
                }
                else -> Log.w(TAG, "未知的通知操作: $action")
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理通知操作失败", e)
        }
    }

    /**
     * 打开应用
     */
    private fun openApp(packageName: String) {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(launchIntent)
                Log.d(TAG, "已启动应用: $packageName")
            }
        } catch (e: Exception) {
            Log.e(TAG, "启动应用失败: $packageName", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "通知同步服务已销毁")
        isSyncEnabled = false
    }
}