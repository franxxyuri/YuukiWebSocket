package com.example.windowsandroidconnect.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import org.json.JSONObject

/**
 * 远程控制服务
 * 接收来自Windows端的控制事件并模拟Android设备操作
 */
class RemoteControlService : AccessibilityService() {
    
    private var isControlling = false
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var networkCommunication: NetworkCommunication? = null
    
    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "远程控制服务已连接")
        
        // 注册到网络通信模块
        networkCommunication = (application as? MyApplication)?.networkCommunication
        networkCommunication?.registerMessageHandler("control_command") { message ->
            handleControlCommand(message)
        }
    }
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // 处理辅助功能事件
        Log.d(TAG, "收到辅助功能事件: ${event?.eventType}")
    }
    
    override fun onInterrupt() {
        Log.d(TAG, "远程控制服务被中断")
        stopRemoteControl()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        networkCommunication?.unregisterMessageHandler("control_command")
        stopRemoteControl()
        serviceScope.cancel()
        Log.d(TAG, "远程控制服务已销毁")
    }
    
    /**
     * 开始远程控制
     */
    private fun startRemoteControl() {
        if (isControlling) return
        
        isControlling = true
        Log.d(TAG, "开始远程控制")
    }
    
    /**
     * 停止远程控制
     */
    private fun stopRemoteControl() {
        if (!isControlling) return
        
        isControlling = false
        Log.d(TAG, "停止远程控制")
    }
    
    /**
     * 处理控制命令
     */
    private fun handleControlCommand(message: JSONObject) {
        try {
            val commandType = message.getString("commandType")
            when (commandType) {
                "touch" -> {
                    val x = message.getDouble("x").toFloat()
                    val y = message.getDouble("y").toFloat()
                    val action = message.optString("action", "down")
                    handleTouch(x, y, action)
                }
                "swipe" -> {
                    val startX = message.getDouble("startX").toFloat()
                    val startY = message.getDouble("startY").toFloat()
                    val endX = message.getDouble("endX").toFloat()
                    val endY = message.getDouble("endY").toFloat()
                    val duration = message.optLong("duration", 300L)
                    handleSwipe(startX, startY, endX, endY, duration)
                }
                "key" -> {
                    val keyCode = message.getInt("keyCode")
                    handleKeyPress(keyCode)
                }
                "text" -> {
                    val text = message.getString("text")
                    handleTextEntry(text)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理控制命令失败", e)
        }
    }
    
    /**
     * 处理触摸事件
     */
    private fun handleTouch(x: Float, y: Float, action: String = "down") {
        when (action) {
            "down" -> performTouchDown(x, y)
            "up" -> performTouchUp(x, y)
            "move" -> performTouchMove(x, y)
        }
    }
    
    /**
     * 执行触摸按下
     */
    private fun performTouchDown(x: Float, y: Float) {
        val path = Path().apply {
            moveTo(x, y)
        }
        
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 1))
            .build()
        
        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                Log.d(TAG, "触摸按下事件已完成: ($x, $y)")
            }
            
            override fun onCancelled(gestureDescription: GestureDescription?) {
                Log.d(TAG, "触摸按下事件已取消: ($x, $y)")
            }
        }, null)
    }
    
    /**
     * 执行触摸移动
     */
    private fun performTouchMove(x: Float, y: Float) {
        // 简化处理，实际中可能需要更复杂的实现
        val path = Path().apply {
            moveTo(x, y)
        }
        
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 1))
            .build()
        
        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                Log.d(TAG, "触摸移动事件已完成: ($x, $y)")
            }
            
            override fun onCancelled(gestureDescription: GestureDescription?) {
                Log.d(TAG, "触摸移动事件已取消: ($x, $y)")
            }
        }, null)
    }
    
    /**
     * 执行触摸抬起
     */
    private fun performTouchUp(x: Float, y: Float) {
        // 简化处理，实际中可能需要更复杂的实现
        Log.d(TAG, "触摸抬起事件: ($x, $y)")
    }
    
    /**
     * 处理滑动事件
     */
    private fun handleSwipe(startX: Float, startY: Float, endX: Float, endY: Float, duration: Long) {
        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }
        
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, duration))
            .build()
        
        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                Log.d(TAG, "滑动事件已完成: ($startX, $startY) -> ($endX, $endY)")
            }
            
            override fun onCancelled(gestureDescription: GestureDescription?) {
                Log.d(TAG, "滑动事件已取消: ($startX, $startY) -> ($endX, $endY)")
            }
        }, null)
    }
    
    /**
     * 处理键盘事件
     */
    private fun handleKeyPress(keyCode: Int) {
        // 使用AccessibilityService的全局操作来模拟按键
        when (keyCode) {
            4 -> performGlobalAction(GLOBAL_ACTION_BACK) // 返回键
            3 -> performGlobalAction(GLOBAL_ACTION_HOME) // 主页键
            27 -> performGlobalAction(GLOBAL_ACTION_RECENTS) // 最近任务
            else -> {
                // 对于其他按键，可能需要使用其他方法
                Log.d(TAG, "模拟按键: $keyCode")
            }
        }
    }
    
    /**
     * 处理文本输入
     */
    private fun handleTextEntry(text: String) {
        Log.d(TAG, "文本输入: $text")
        // 这里可以使用辅助功能服务来模拟文本输入
        // 但实现会比较复杂，需要找到当前焦点的输入框
    }
    
    companion object {
        private const val TAG = "RemoteControlService"
    }
}