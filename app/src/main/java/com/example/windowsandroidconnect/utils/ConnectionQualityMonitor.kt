package com.example.windowsandroidconnect.utils

import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONObject
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicLong

/**
 * 连接质量监控器
 * 监控WebSocket连接的延迟、丢包率等指标
 */
class ConnectionQualityMonitor {
    
    companion object {
        private const val TAG = "ConnectionQualityMonitor"
        private const val PING_INTERVAL = 5000L // 5秒发送一次ping
        private const val HISTORY_SIZE = 20 // 保留最近20次测量结果
        private const val TIMEOUT_THRESHOLD = 10000L // 10秒超时
    }
    
    /**
     * 连接质量等级
     */
    enum class ConnectionStrength {
        EXCELLENT,  // 延迟 < 50ms, 丢包率 < 1%
        GOOD,       // 延迟 < 100ms, 丢包率 < 5%
        FAIR,       // 延迟 < 200ms, 丢包率 < 10%
        POOR,       // 延迟 < 500ms, 丢包率 < 20%
        DISCONNECTED // 无法连接
    }
    
    /**
     * 连接质量指标
     */
    data class QualityMetrics(
        val latencyMs: Long,
        val averageLatencyMs: Long,
        val minLatencyMs: Long,
        val maxLatencyMs: Long,
        val packetLossRate: Float,
        val jitterMs: Long,
        val connectionStrength: ConnectionStrength,
        val timestamp: Long = System.currentTimeMillis()
    )
    
    /**
     * Ping结果
     */
    private data class PingResult(
        val latencyMs: Long,
        val success: Boolean,
        val timestamp: Long
    )
    
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var monitoringJob: Job? = null
    private val listeners = CopyOnWriteArrayList<(QualityMetrics) -> Unit>()
    
    private val pingHistory = mutableListOf<PingResult>()
    private val pendingPings = mutableMapOf<Long, Long>() // pingId -> sendTime
    private val pingIdCounter = AtomicLong(0)
    
    private var isMonitoring = false
    private var sendPingCallback: ((JSONObject) -> Unit)? = null
    
    /**
     * 开始监控
     * @param sendPing 发送ping消息的回调
     */
    fun startMonitoring(sendPing: (JSONObject) -> Unit) {
        if (isMonitoring) {
            Log.d(TAG, "监控已在运行中")
            return
        }
        
        isMonitoring = true
        sendPingCallback = sendPing
        
        monitoringJob = coroutineScope.launch {
            Log.d(TAG, "开始连接质量监控")
            while (isActive && isMonitoring) {
                sendPingMessage()
                checkTimeouts()
                delay(PING_INTERVAL)
            }
        }
    }
    
    /**
     * 停止监控
     */
    fun stopMonitoring() {
        isMonitoring = false
        monitoringJob?.cancel()
        monitoringJob = null
        pendingPings.clear()
        Log.d(TAG, "连接质量监控已停止")
    }
    
    /**
     * 发送ping消息
     */
    private fun sendPingMessage() {
        val pingId = pingIdCounter.incrementAndGet()
        val sendTime = System.currentTimeMillis()
        
        pendingPings[pingId] = sendTime
        
        val pingMessage = JSONObject().apply {
            put("type", "ping")
            put("pingId", pingId)
            put("timestamp", sendTime)
        }
        
        sendPingCallback?.invoke(pingMessage)
        Log.d(TAG, "发送ping: $pingId")
    }
    
    /**
     * 处理pong响应
     */
    fun onPongReceived(pingId: Long) {
        val sendTime = pendingPings.remove(pingId)
        if (sendTime != null) {
            val latency = System.currentTimeMillis() - sendTime
            recordPingResult(latency, true)
            Log.d(TAG, "收到pong: $pingId, 延迟: ${latency}ms")
        }
    }
    
    /**
     * 检查超时的ping
     */
    private fun checkTimeouts() {
        val currentTime = System.currentTimeMillis()
        val timeoutPings = pendingPings.filter { (_, sendTime) ->
            currentTime - sendTime > TIMEOUT_THRESHOLD
        }
        
        timeoutPings.forEach { (pingId, _) ->
            pendingPings.remove(pingId)
            recordPingResult(TIMEOUT_THRESHOLD, false)
            Log.w(TAG, "Ping超时: $pingId")
        }
    }
    
    /**
     * 记录ping结果
     */
    private fun recordPingResult(latencyMs: Long, success: Boolean) {
        synchronized(pingHistory) {
            pingHistory.add(PingResult(latencyMs, success, System.currentTimeMillis()))
            
            // 保持历史记录在限定大小内
            while (pingHistory.size > HISTORY_SIZE) {
                pingHistory.removeAt(0)
            }
        }
        
        // 计算并通知质量指标
        val metrics = calculateMetrics()
        notifyListeners(metrics)
    }
    
    /**
     * 计算质量指标
     */
    private fun calculateMetrics(): QualityMetrics {
        synchronized(pingHistory) {
            if (pingHistory.isEmpty()) {
                return QualityMetrics(
                    latencyMs = 0,
                    averageLatencyMs = 0,
                    minLatencyMs = 0,
                    maxLatencyMs = 0,
                    packetLossRate = 0f,
                    jitterMs = 0,
                    connectionStrength = ConnectionStrength.DISCONNECTED
                )
            }
            
            val successfulPings = pingHistory.filter { it.success }
            val latencies = successfulPings.map { it.latencyMs }
            
            val currentLatency = latencies.lastOrNull() ?: 0
            val averageLatency = if (latencies.isNotEmpty()) latencies.average().toLong() else 0
            val minLatency = latencies.minOrNull() ?: 0
            val maxLatency = latencies.maxOrNull() ?: 0
            
            // 计算丢包率
            val packetLossRate = if (pingHistory.isNotEmpty()) {
                (pingHistory.count { !it.success }.toFloat() / pingHistory.size) * 100
            } else 0f
            
            // 计算抖动 (延迟变化的标准差)
            val jitter = if (latencies.size >= 2) {
                val differences = latencies.zipWithNext { a, b -> kotlin.math.abs(b - a) }
                differences.average().toLong()
            } else 0
            
            // 确定连接质量等级
            val strength = determineConnectionStrength(averageLatency, packetLossRate)
            
            return QualityMetrics(
                latencyMs = currentLatency,
                averageLatencyMs = averageLatency,
                minLatencyMs = minLatency,
                maxLatencyMs = maxLatency,
                packetLossRate = packetLossRate,
                jitterMs = jitter,
                connectionStrength = strength
            )
        }
    }
    
    /**
     * 确定连接质量等级
     */
    private fun determineConnectionStrength(latencyMs: Long, packetLossRate: Float): ConnectionStrength {
        return when {
            packetLossRate >= 50 -> ConnectionStrength.DISCONNECTED
            latencyMs < 50 && packetLossRate < 1 -> ConnectionStrength.EXCELLENT
            latencyMs < 100 && packetLossRate < 5 -> ConnectionStrength.GOOD
            latencyMs < 200 && packetLossRate < 10 -> ConnectionStrength.FAIR
            latencyMs < 500 && packetLossRate < 20 -> ConnectionStrength.POOR
            else -> ConnectionStrength.DISCONNECTED
        }
    }
    
    /**
     * 获取当前质量指标
     */
    fun getMetrics(): QualityMetrics = calculateMetrics()
    
    /**
     * 添加质量变化监听器
     */
    fun addListener(listener: (QualityMetrics) -> Unit) {
        listeners.add(listener)
    }
    
    /**
     * 移除质量变化监听器
     */
    fun removeListener(listener: (QualityMetrics) -> Unit) {
        listeners.remove(listener)
    }
    
    /**
     * 通知所有监听器
     */
    private fun notifyListeners(metrics: QualityMetrics) {
        listeners.forEach { listener ->
            try {
                listener(metrics)
            } catch (e: Exception) {
                Log.e(TAG, "通知监听器失败", e)
            }
        }
    }
    
    /**
     * 清除历史记录
     */
    fun clearHistory() {
        synchronized(pingHistory) {
            pingHistory.clear()
        }
        pendingPings.clear()
    }
    
    /**
     * 清理资源
     */
    fun cleanup() {
        stopMonitoring()
        listeners.clear()
        clearHistory()
        coroutineScope.cancel()
        Log.d(TAG, "ConnectionQualityMonitor资源已清理")
    }
}
