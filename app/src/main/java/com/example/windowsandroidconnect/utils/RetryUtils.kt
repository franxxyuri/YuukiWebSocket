package com.example.windowsandroidconnect.utils

import com.example.utils.LogUtils
import kotlinx.coroutines.delay
import kotlinx.coroutines.withTimeoutOrNull

/**
 * 重试工具类
 * 提供通用的重试逻辑，用于处理网络请求等可能失败的操作
 */
object RetryUtils {
    
    /**
     * 重试执行异步操作
     * @param maxRetries 最大重试次数
     * @param initialDelayMs 初始延迟时间（毫秒）
     * @param delayFactor 延迟因子，每次重试延迟时间会乘以该因子
     * @param timeoutMs 单次操作超时时间（毫秒）
     * @param operation 要执行的异步操作
     * @return 操作结果，如果所有重试都失败则返回null
     */
    suspend fun <T> retry(
        maxRetries: Int = 3,
        initialDelayMs: Long = 1000,
        delayFactor: Double = 2.0,
        timeoutMs: Long = 10000,
        operation: suspend () -> T?
    ): T? {
        var lastException: Exception? = null
        
        for (retryCount in 0..maxRetries) {
            try {
                // 执行操作，带超时
                val result = withTimeoutOrNull(timeoutMs) {
                    operation()
                }
                
                if (result != null) {
                    return result
                }
            } catch (e: Exception) {
                lastException = e
                LogUtils.e("RetryUtils", "操作失败 (重试 ${retryCount + 1}/$maxRetries): ${e.message}")
            }
            
            // 如果不是最后一次重试，等待一段时间后再重试
            if (retryCount < maxRetries) {
                val delayMs = (initialDelayMs * Math.pow(delayFactor, retryCount.toDouble())).toLong()
                LogUtils.d("RetryUtils", "等待 $delayMs 毫秒后重试")
                delay(delayMs)
            }
        }
        
        // 所有重试都失败，返回null
        LogUtils.e("RetryUtils", "所有重试都失败: ${lastException?.message}")
        return null
    }
    
    /**
     * 重试执行布尔类型的异步操作
     * @param maxRetries 最大重试次数
     * @param initialDelayMs 初始延迟时间（毫秒）
     * @param delayFactor 延迟因子，每次重试延迟时间会乘以该因子
     * @param timeoutMs 单次操作超时时间（毫秒）
     * @param operation 要执行的异步操作，返回true表示成功，false表示失败
     * @return 操作结果，如果所有重试都失败则返回false
     */
    suspend fun retryBoolean(
        maxRetries: Int = 3,
        initialDelayMs: Long = 1000,
        delayFactor: Double = 2.0,
        timeoutMs: Long = 10000,
        operation: suspend () -> Boolean
    ): Boolean {
        return retry(
            maxRetries = maxRetries,
            initialDelayMs = initialDelayMs,
            delayFactor = delayFactor,
            timeoutMs = timeoutMs
        ) { if (operation()) true else null } ?: false
    }
}
