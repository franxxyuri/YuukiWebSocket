package com.example.windowsandroidconnect.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.network.NetworkCommunication
import org.json.JSONObject

/**
 * 远程控制服务
 * 
 * 通过辅助功能服务实现远程控制功能
 */
class RemoteControlService : AccessibilityService() {

    companion object {
        private const val TAG = "RemoteControlService"
        const val ACTION_ENABLE_CONTROL = "com.example.windowsandroidconnect.ENABLE_CONTROL"
        const val ACTION_DISABLE_CONTROL = "com.example.windowsandroidconnect.DISABLE_CONTROL"
        const val EXTRA_DEVICE_ID = "device_id"
        const val EXTRA_DEVICE_IP = "device_ip"
        const val EXTRA_DEVICE_PORT = "device_port"
        
        // 控制命令类型
        const val CMD_TYPE_CLICK = "click"
        const val CMD_TYPE_LONG_PRESS = "long_press"
        const val CMD_TYPE_SWIPE = "swipe"
        const val CMD_TYPE_TEXT_INPUT = "text_input"
        const val CMD_TYPE_KEY_EVENT = "key_event"
        const val CMD_TYPE_HOME = "home"
        const val CMD_TYPE_BACK = "back"
        const val CMD_TYPE_RECENTS = "recents"
    }

    private var networkCommunication: NetworkCommunication? = null
    private var isRemoteControlEnabled = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "远程控制服务已连接")
        Toast.makeText(this, "远程控制服务已启用", Toast.LENGTH_SHORT).show()
        
        // 初始化网络通信模块
        networkCommunication = (application as? MyApplication)?.networkCommunication
        
        // 注册远程控制命令处理器
        networkCommunication?.registerMessageHandler("control_command") { message ->
            handleRemoteControlCommand(message)
        }
        
        isRemoteControlEnabled = true
    }

    /**
     * 处理远程控制命令
     */
    private fun handleRemoteControlCommand(message: JSONObject) {
        try {
            val commandType = message.optString("commandType")
            Log.d(TAG, "处理远程控制命令: $commandType")
            
            when (commandType) {
                CMD_TYPE_CLICK -> {
                    val x = message.optDouble("x", 0.0).toFloat()
                    val y = message.optDouble("y", 0.0).toFloat()
                    performClick(x, y)
                }
                CMD_TYPE_LONG_PRESS -> {
                    val x = message.optDouble("x", 0.0).toFloat()
                    val y = message.optDouble("y", 0.0).toFloat()
                    performLongPress(x, y)
                }
                CMD_TYPE_SWIPE -> {
                    val startX = message.optDouble("startX", 0.0).toFloat()
                    val startY = message.optDouble("startY", 0.0).toFloat()
                    val endX = message.optDouble("endX", 0.0).toFloat()
                    val endY = message.optDouble("endY", 0.0).toFloat()
                    val duration = message.optLong("duration", 500L)
                    performSwipe(startX, startY, endX, endY, duration)
                }
                CMD_TYPE_TEXT_INPUT -> {
                    val text = message.optString("text", "")
                    performTextInput(text)
                }
                CMD_TYPE_KEY_EVENT -> {
                    val keyCode = message.optInt("keyCode", 0)
                    performKeyEvent(keyCode)
                }
                CMD_TYPE_HOME -> {
                    performHomeAction()
                }
                CMD_TYPE_BACK -> {
                    performBackAction()
                }
                CMD_TYPE_RECENTS -> {
                    performRecentsAction()
                }
                else -> {
                    Log.w(TAG, "未知的控制命令类型: $commandType")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理远程控制命令失败", e)
            // 发送错误响应
            val errorResponse = JSONObject().apply {
                put("type", "control_command_response")
                put("success", false)
                put("error", e.message)
                put("commandType", message.optString("commandType"))
            }
            networkCommunication?.sendMessage(errorResponse)
        }
    }

    /**
     * 执行点击操作
     */
    private fun performClick(x: Float, y: Float) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val path = Path()
            path.moveTo(x, y)
            
            val gestureBuilder = GestureDescription.Builder()
            val stroke = GestureDescription.StrokeDescription(path, 0, 1)
            gestureBuilder.addStroke(stroke)
            
            val callback = object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    Log.d(TAG, "点击操作完成: ($x, $y)")
                    // 发送成功响应
                    sendControlCommandResponse(true, "click", "点击操作完成")
                }
                
                override fun onCancelled(gestureDescription: GestureDescription?) {
                    Log.d(TAG, "点击操作被取消: ($x, $y)")
                    sendControlCommandResponse(false, "click", "点击操作被取消")
                }
            }
            
            dispatchGesture(gestureBuilder.build(), callback, null)
        } else {
            // 对于较低版本的Android，使用其他方法
            performLegacyClick(x, y)
        }
    }

    /**
     * 执行长按操作
     */
    private fun performLongPress(x: Float, y: Float) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val path = Path()
            path.moveTo(x, y)
            
            val gestureBuilder = GestureDescription.Builder()
            // 长按持续1秒
            val stroke = GestureDescription.StrokeDescription(path, 0, 1000)
            gestureBuilder.addStroke(stroke)
            
            val callback = object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    Log.d(TAG, "长按操作完成: ($x, $y)")
                    sendControlCommandResponse(true, "long_press", "长按操作完成")
                }
                
                override fun onCancelled(gestureDescription: GestureDescription?) {
                    Log.d(TAG, "长按操作被取消: ($x, $y)")
                    sendControlCommandResponse(false, "long_press", "长按操作被取消")
                }
            }
            
            dispatchGesture(gestureBuilder.build(), callback, null)
        }
    }

    /**
     * 执行滑动操作
     */
    private fun performSwipe(startX: Float, startY: Float, endX: Float, endY: Float, duration: Long) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val path = Path()
            path.moveTo(startX, startY)
            path.lineTo(endX, endY)
            
            val gestureBuilder = GestureDescription.Builder()
            val stroke = GestureDescription.StrokeDescription(path, 0, duration)
            gestureBuilder.addStroke(stroke)
            
            val callback = object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    Log.d(TAG, "滑动操作完成: ($startX, $startY) -> ($endX, $endY)")
                    sendControlCommandResponse(true, "swipe", "滑动操作完成")
                }
                
                override fun onCancelled(gestureDescription: GestureDescription?) {
                    Log.d(TAG, "滑动操作被取消: ($startX, $startY) -> ($endX, $endY)")
                    sendControlCommandResponse(false, "swipe", "滑动操作被取消")
                }
            }
            
            dispatchGesture(gestureBuilder.build(), callback, null)
        }
    }

    /**
     * 执行文本输入
     */
    private fun performTextInput(text: String) {
        // 尝试找到当前焦点视图并输入文本
        val focusedView = rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        if (focusedView != null && focusedView.isEditable) {
            val bundle = Bundle()
            bundle.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
            focusedView.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, bundle)
            focusedView.recycle()
            
            Log.d(TAG, "文本输入完成: $text")
            sendControlCommandResponse(true, "text_input", "文本输入完成")
        } else {
            // 如果没有找到可编辑的视图，跳过关闭输入法（某些Android版本不支持该操作）
            
            // 发送文本到剪贴板，然后粘贴（作为备选方案）
            val clipboardManager = getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("text", text)
            clipboardManager.setPrimaryClip(clip)
            
            // 模拟粘贴操作（Ctrl+V）
            // 这里需要通过其他方式实现，因为AccessibilityService无法直接发送按键
            Log.d(TAG, "文本已复制到剪贴板: $text")
            sendControlCommandResponse(true, "text_input", "文本已复制到剪贴板")
        }
    }

    /**
     * 执行按键事件
     */
    private fun performKeyEvent(keyCode: Int) {
        // AccessibilityService无法直接发送按键事件
        // 但可以执行一些系统级操作
        when (keyCode) {
            android.view.KeyEvent.KEYCODE_HOME -> performHomeAction()
            android.view.KeyEvent.KEYCODE_BACK -> performBackAction()
            android.view.KeyEvent.KEYCODE_APP_SWITCH -> performRecentsAction()
            else -> {
                Log.w(TAG, "无法处理的按键码: $keyCode")
                sendControlCommandResponse(false, "key_event", "无法处理的按键码")
            }
        }
    }

    /**
     * 执行Home键操作
     */
    private fun performHomeAction() {
        try {
            startActivity(Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
            sendControlCommandResponse(true, "home", "Home键操作完成")
        } catch (e: Exception) {
            Log.e(TAG, "执行Home键操作失败", e)
            sendControlCommandResponse(false, "home", "执行Home键操作失败")
        }
    }

    /**
     * 执行返回键操作
     */
    private fun performBackAction() {
        try {
            performGlobalAction(GLOBAL_ACTION_BACK)
            sendControlCommandResponse(true, "back", "返回键操作完成")
        } catch (e: Exception) {
            Log.e(TAG, "执行返回键操作失败", e)
            sendControlCommandResponse(false, "back", "执行返回键操作失败")
        }
    }

    /**
     * 执行最近任务操作
     */
    private fun performRecentsAction() {
        try {
            performGlobalAction(GLOBAL_ACTION_RECENTS)
            sendControlCommandResponse(true, "recents", "最近任务操作完成")
        } catch (e: Exception) {
            Log.e(TAG, "执行最近任务操作失败", e)
            sendControlCommandResponse(false, "recents", "执行最近任务操作失败")
        }
    }

    /**
     * Android较低版本的点击操作实现
     */
    private fun performLegacyClick(x: Float, y: Float) {
        // 对于较低版本的Android，尝试使用Instrumentation（需要Shell权限，通常不可行）
        // 或者使用无障碍服务的其他功能
        Log.d(TAG, "使用低版本API执行点击: ($x, $y)")
        
        // 尝试查找并点击最接近坐标的可点击元素
        val node = findClickableNodeAt(x.toInt(), y.toInt())
        if (node != null) {
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            node.recycle()
            sendControlCommandResponse(true, "click", "点击操作完成（低版本API）")
        } else {
            Log.w(TAG, "未找到可点击的节点: ($x, $y)")
            sendControlCommandResponse(false, "click", "未找到可点击的节点")
        }
    }

    /**
     * 在指定坐标查找可点击的节点
     */
    private fun findClickableNodeAt(x: Int, y: Int): AccessibilityNodeInfo? {
        val root = rootInActiveWindow ?: return null
        
        // 深度优先搜索可点击的节点
        val queue = mutableListOf<AccessibilityNodeInfo>()
        queue.add(root)
        
        while (queue.isNotEmpty()) {
            val node = queue.removeAt(0)
            
            // 检查节点是否在指定坐标范围内
            val bounds = android.graphics.Rect()
            node.getBoundsInScreen(bounds)
            
            if (bounds.contains(x, y) && (node.isClickable || node.isLongClickable)) {
                return node
            }
            
            // 添加子节点到队列
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    queue.add(child)
                }
            }
        }
        
        return null
    }

    /**
     * 发送控制命令响应
     */
    private fun sendControlCommandResponse(success: Boolean, commandType: String, message: String) {
        try {
            val response = JSONObject().apply {
                put("type", "control_command_response")
                put("success", success)
                put("commandType", commandType)
                put("message", message)
                put("timestamp", System.currentTimeMillis())
            }
            
            networkCommunication?.sendMessage(response)
        } catch (e: Exception) {
            Log.e(TAG, "发送控制命令响应失败", e)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // 处理辅助功能事件
        Log.d(TAG, "接收到辅助功能事件: ${event?.eventType}")
        
        // 如果需要将Android端的事件同步到Windows端，可以在这里处理
        // 例如：触摸事件、按键事件等
        
        if (isRemoteControlEnabled) {
            // 根据需要处理特定类型的事件
            when (event?.eventType) {
                AccessibilityEvent.TYPE_VIEW_CLICKED -> {
                    // 可以将点击事件发送到Windows端（如果需要双向同步）
                }
                AccessibilityEvent.TYPE_VIEW_FOCUSED -> {
                    // 可以将焦点变化发送到Windows端
                }
            }
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "远程控制服务被中断")
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "远程控制服务已销毁")
        
        // 注销消息处理器
        networkCommunication?.unregisterMessageHandler("control_command")
        
        isRemoteControlEnabled = false
    }
}