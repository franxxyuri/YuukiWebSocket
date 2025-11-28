package com.example.windowsandroidconnect.utils

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * 事件总线
 * 基于观察者模式实现，用于组件间的解耦通信
 */
object EventBus {
    
    private val eventListeners = ConcurrentHashMap<Class<*>, CopyOnWriteArrayList<EventListener<*>>>()
    
    /**
     * 注册事件监听器
     */
    fun <T> register(eventType: Class<T>, listener: (T) -> Unit) {
        val listeners = eventListeners.computeIfAbsent(eventType) { CopyOnWriteArrayList() }
        listeners.add(EventListener(listener))
    }
    
    /**
     * 取消注册事件监听器
     */
    fun <T> unregister(eventType: Class<T>, listener: (T) -> Unit) {
        val listeners = eventListeners[eventType]
        listeners?.removeIf { it.listener == listener }
        if (listeners?.isEmpty() == true) {
            eventListeners.remove(eventType)
        }
    }
    
    /**
     * 发布事件
     */
    fun <T> post(event: T) {
        val listeners = eventListeners[event!!::class.java]
        listeners?.forEach { 
            @Suppress("UNCHECKED_CAST")
            (it.listener as (T) -> Unit).invoke(event)
        }
    }
    
    /**
     * 清空所有事件监听器
     */
    fun clear() {
        eventListeners.clear()
    }
    
    /**
     * 事件监听器包装类
     */
    private data class EventListener<T>(val listener: (T) -> Unit)
}

/**
 * 事件类型定义
 */
sealed class AppEvent {
    
    /**
     * 设备发现事件
     */
    data class DeviceFoundEvent(val deviceId: String, val deviceName: String, val platform: String, val ip: String, val port: Int) : AppEvent()
    
    /**
     * 连接状态变化事件
     */
    data class ConnectionStatusEvent(val isConnected: Boolean, val connectionType: String) : AppEvent()
    
    /**
     * 设备连接成功事件
     */
    data class DeviceConnectedEvent(val deviceId: String, val deviceName: String) : AppEvent()
    
    /**
     * 设备断开连接事件
     */
    data class DeviceDisconnectedEvent(val deviceId: String) : AppEvent()
    
    /**
     * 剪贴板同步事件
     */
    data class ClipboardSyncEvent(val data: String, val source: String) : AppEvent()
    
    /**
     * 文件传输进度事件
     */
    data class FileTransferProgressEvent(val transferId: String, val progress: Int, val total: Long, val sent: Long) : AppEvent()
    
    /**
     * 屏幕帧事件
     */
    data class ScreenFrameEvent(val frameData: ByteArray, val timestamp: Long) : AppEvent() {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as ScreenFrameEvent
            if (!frameData.contentEquals(other.frameData)) return false
            if (timestamp != other.timestamp) return false
            return true
        }
        
        override fun hashCode(): Int {
            var result = frameData.contentHashCode()
            result = 31 * result + timestamp.hashCode()
            return result
        }
    }
    
    /**
     * 通知事件
     */
    data class NotificationEvent(val title: String, val content: String, val packageName: String) : AppEvent()
    
    /**
     * 错误事件
     */
    data class ErrorEvent(val errorCode: String, val errorMessage: String) : AppEvent()
}