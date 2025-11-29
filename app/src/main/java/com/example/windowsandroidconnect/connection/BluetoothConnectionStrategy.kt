package com.example.windowsandroidconnect.connection

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresPermission
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.IOException
import java.util.*

/**
 * 蓝牙连接策略实现
 * 使用蓝牙进行设备间通信
 */
class BluetoothConnectionStrategy(context: Context) : ConnectionStrategy {
    private val context: Context = context
    
    // 权限请求常量
    private val REQUEST_BLUETOOTH_PERMISSIONS = 1001
    
    /**
     * 检查是否拥有所有必要的蓝牙权限
     */
    fun checkBluetoothPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12及以上版本
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            // Android 11及以下版本
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    /**
     * 请求蓝牙权限
     * 注意：此方法需要从Activity中调用，因为权限请求需要Activity上下文
     */
    fun requestBluetoothPermissions(activityContext: Context) {
        // 检查是否已经显示过权限说明
        if (shouldShowRequestPermissionRationale(activityContext)) {
            // 显示权限说明对话框，解释为什么需要这些权限
            showPermissionRationaleDialog(activityContext)
        } else {
            // 直接请求权限
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12及以上版本
                ActivityCompat.requestPermissions(
                    activityContext as android.app.Activity,
                    arrayOf(
                        Manifest.permission.BLUETOOTH_SCAN,
                        Manifest.permission.BLUETOOTH_CONNECT
                    ),
                    REQUEST_BLUETOOTH_PERMISSIONS
                )
            } else {
                // Android 11及以下版本
                ActivityCompat.requestPermissions(
                    activityContext as android.app.Activity,
                    arrayOf(
                        Manifest.permission.BLUETOOTH,
                        Manifest.permission.BLUETOOTH_ADMIN
                    ),
                    REQUEST_BLUETOOTH_PERMISSIONS
                )
            }
        }
    }
    
    /**
     * 检查是否需要显示权限说明
     */
    private fun shouldShowRequestPermissionRationale(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.shouldShowRequestPermissionRationale(context as android.app.Activity, Manifest.permission.BLUETOOTH_SCAN) ||
            ActivityCompat.shouldShowRequestPermissionRationale(context, Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            ActivityCompat.shouldShowRequestPermissionRationale(context as android.app.Activity, Manifest.permission.BLUETOOTH) ||
            ActivityCompat.shouldShowRequestPermissionRationale(context, Manifest.permission.BLUETOOTH_ADMIN)
        }
    }
    
    /**
     * 显示权限说明对话框
     */
    private fun showPermissionRationaleDialog(context: Context) {
        if (context is android.app.Activity) {
            android.app.AlertDialog.Builder(context)
                .setTitle("需要蓝牙权限")
                .setMessage("为了能够使用蓝牙功能，应用需要获取蓝牙扫描和连接权限。请在接下来的对话框中允许这些权限。")
                .setPositiveButton("确定") { _, _ ->
                    // 用户点击确定后，再次请求权限
                    requestBluetoothPermissions(context)
                }
                .setNegativeButton("取消", null)
                .create()
                .show()
        }
    }
    
    /**
     * 处理权限被拒绝的情况，显示友好提示并提供跳转到设置的选项
     */
    fun handlePermissionDenied(context: Context) {
        if (context is android.app.Activity) {
            android.app.AlertDialog.Builder(context)
                .setTitle("权限被拒绝")
                .setMessage("蓝牙功能需要相应的权限才能正常工作。您可以在应用设置中手动授予这些权限。")
                .setPositiveButton("前往设置") { _, _ ->
                    // 跳转到应用的设置页面
                    val intent = Intent()
                    intent.action = android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                    val uri = android.net.Uri.fromParts("package", context.packageName, null)
                    intent.data = uri
                    context.startActivity(intent)
                }
                .setNegativeButton("取消", null)
                .create()
                .show()
        }
    }
    
    /**
     * 显示错误消息给用户
     */
    fun showErrorMessage(context: Context, message: String) {
        if (context is android.app.Activity) {
            context.runOnUiThread {
                android.app.AlertDialog.Builder(context)
                    .setTitle("错误")
                    .setMessage(message)
                    .setPositiveButton("确定", null)
                    .create()
                    .show()
            }
        }
    }
    
    /**
     * 检查蓝牙是否已启用
     */
    fun isBluetoothEnabled(): Boolean {
        val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
        return bluetoothAdapter?.isEnabled == true
    }
    
    /**
     * 启动蓝牙启用请求
     */
    @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
    fun requestEnableBluetooth(activityContext: Context) {
        val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
        (activityContext as Activity).startActivityForResult(enableBtIntent, REQUEST_BLUETOOTH_PERMISSIONS)
    }
    
    private var bluetoothSocket: BluetoothSocket? = null
    private var bluetoothDevice: BluetoothDevice? = null
    private var isConnectedState = false
    private var receiveThread: Thread? = null
    private var shouldStop = false
    private val statusListeners = mutableListOf<(Boolean) -> Unit>()
    private val messageListeners = mutableListOf<(JSONObject) -> Unit>()
    
    override suspend fun connect(ip: String, port: Int): Boolean {
        // 对于蓝牙，参数ip实际上应该是设备MAC地址，port是RFCOMM通道
        return try {
            // 检查是否拥有必要的权限
            if (!checkBluetoothPermissions()) {
                Log.e("BluetoothConnectionStrategy", "缺少必要的蓝牙权限")
                return false
            }
            
            Log.d("BluetoothConnectionStrategy", "尝试使用蓝牙连接到设备: $ip")
            
            val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
            if (bluetoothAdapter == null) {
                Log.e("BluetoothConnectionStrategy", "设备不支持蓝牙")
                return false
            }
            
            if (!bluetoothAdapter.isEnabled) {
                Log.e("BluetoothConnectionStrategy", "蓝牙未启用")
                return false
            }
            
            try {
                // 获取蓝牙设备
                bluetoothDevice = bluetoothAdapter.getRemoteDevice(ip)
                if (bluetoothDevice == null) {
                    Log.e("BluetoothConnectionStrategy", "无法获取蓝牙设备")
                    return false
                }
            
                // 创建蓝牙套接字
                bluetoothSocket = createBluetoothSocket(bluetoothDevice!!, port)
                
                // 连接到设备
                try {
                    bluetoothSocket?.connect()
                    Log.d("BluetoothConnectionStrategy", "蓝牙连接成功")
                    
                    // 启动接收线程
                    startReceiveThread()
                    
                    isConnectedState = true
                    // 通知状态监听器
                    statusListeners.forEach { it(true) }
                    true
                } catch (e: IOException) {
                    Log.e("BluetoothConnectionStrategy", "蓝牙连接失败", e)
                    isConnectedState = false
                    // 通知状态监听器
                    statusListeners.forEach { it(false) }
                    false
                }
            } catch (e: SecurityException) {
                // 捕获权限相关的安全异常
                Log.e("BluetoothConnectionStrategy", "蓝牙权限不足: ${e.message}")
                isConnectedState = false
                // 通知状态监听器
                statusListeners.forEach { it(false) }
                false
            }
        } catch (e: Exception) {
            Log.e("BluetoothConnectionStrategy", "蓝牙连接异常", e)
            isConnectedState = false
            // 通知状态监听器
            statusListeners.forEach { it(false) }
            false
        }
    }
    
    override fun disconnect() {
        Log.d("BluetoothConnectionStrategy", "断开蓝牙连接")
        
        shouldStop = true
        receiveThread?.interrupt()
        
        try {
            bluetoothSocket?.close()
        } catch (e: IOException) {
            Log.e("BluetoothConnectionStrategy", "关闭蓝牙套接字失败", e)
        }
        
        bluetoothSocket = null
        bluetoothDevice = null
        isConnectedState = false
    }
    
    override fun sendMessage(message: JSONObject) {
        // 首先检查是否拥有必要的蓝牙权限
        if (!checkBluetoothPermissions()) {
            Log.e("BluetoothConnectionStrategy", "缺少蓝牙权限，无法发送消息")
            showErrorMessage(context, "缺少蓝牙权限，无法发送消息")
            return
        }
        
        if (isConnected()) {
            try {
                val messageStr = message.toString()
                val outputStream = bluetoothSocket?.outputStream
                outputStream?.write(messageStr.toByteArray())
                outputStream?.flush()
                
                Log.d("BluetoothConnectionStrategy", "发送蓝牙消息: ${messageStr.take(50)}...")
            } catch (e: SecurityException) {
                // 专门捕获权限相关的安全异常
                Log.e("BluetoothConnectionStrategy", "发送消息时权限被拒绝", e)
                showErrorMessage(context, "蓝牙权限被拒绝，无法发送消息。请检查应用权限设置。")
                // 通知监听器连接状态变化
                isConnectedState = false
                statusListeners.forEach { it(false) }
            } catch (e: Exception) {
                Log.e("BluetoothConnectionStrategy", "发送蓝牙消息失败", e)
            }
        } else {
            Log.w("BluetoothConnectionStrategy", "未连接蓝牙，无法发送消息")
        }
    }
    
    override fun isConnected(): Boolean {
        return isConnectedState && 
               bluetoothSocket != null && 
               bluetoothSocket?.isConnected == true
    }
    
    override fun getConnectionType(): String {
        return "Bluetooth"
    }
    
    @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
    override fun getConfig(): Map<String, Any> {
        return mapOf(
            "connectionType" to "Bluetooth",
            "connected" to isConnectedState,
            "deviceName" to (bluetoothDevice?.name ?: "Unknown Device")
        )
    }
    
    override fun updateConfig(config: Map<String, Any>) {
        // 实现蓝牙连接配置更新
        Log.d("BluetoothConnectionStrategy", "更新蓝牙配置: $config")
        
        // 这里可以根据需要处理传入的配置参数
        // 例如，如果配置中包含特定的蓝牙设置，可以在这里应用
    }
    
    override fun registerStatusListener(listener: (Boolean) -> Unit) {
        statusListeners.add(listener)
        
        // 检查权限状态，如果权限不足，立即通知连接状态为false
        if (!checkBluetoothPermissions()) {
            Log.w("BluetoothConnectionStrategy", "注册状态监听器时发现缺少蓝牙权限")
            // 将连接状态设置为false并通知监听器
            isConnectedState = false
            listener(false)
        } else {
            // 立即通知当前连接状态
            listener(isConnectedState)
        }
    }
    
    override fun unregisterStatusListener(listener: (Boolean) -> Unit) {
        statusListeners.remove(listener)
    }
    
    override fun registerMessageListener(listener: (JSONObject) -> Unit) {
        messageListeners.add(listener)
        
        // 检查权限状态，如果权限不足，可以考虑发送一个错误消息通知
        if (!checkBluetoothPermissions()) {
            Log.w("BluetoothConnectionStrategy", "注册消息监听器时发现缺少蓝牙权限")
            // 创建一个错误通知消息
            val errorMessage = JSONObject()
            errorMessage.put("type", "error")
            errorMessage.put("code", "PERMISSION_DENIED")
            errorMessage.put("message", "缺少蓝牙权限，无法接收消息")
            // 立即发送错误消息给新注册的监听器
            listener(errorMessage)
        }
    }
    
    override fun unregisterMessageListener(listener: (JSONObject) -> Unit) {
        messageListeners.remove(listener)
    }
    
    override suspend fun reset(): Boolean {
        // 首先检查是否拥有必要的蓝牙权限
        if (!checkBluetoothPermissions()) {
            Log.e("BluetoothConnectionStrategy", "缺少蓝牙权限，无法重置连接")
            showErrorMessage(context, "缺少蓝牙权限，无法重置连接")
            return false
        }
        
        try {
            disconnect()
            val config = getConfig()
            val ip = config["ip"] as? String ?: return false
            val port = config["port"] as? Int ?: return false
            return connect(ip, port)
        } catch (e: SecurityException) {
            // 专门捕获权限相关的安全异常
            Log.e("BluetoothConnectionStrategy", "重置连接时权限被拒绝", e)
            showErrorMessage(context, "蓝牙权限被拒绝，无法重置连接。请检查应用权限设置。")
            // 通知监听器连接状态变化
            isConnectedState = false
            statusListeners.forEach { it(false) }
            return false
        } catch (e: Exception) {
            Log.e("BluetoothConnectionStrategy", "重置连接失败", e)
            return false
        }
    }
    
    private fun createBluetoothSocket(device: BluetoothDevice, port: Int): BluetoothSocket? {
        // 首先检查是否拥有必要的蓝牙权限
        if (!checkBluetoothPermissions()) {
            Log.e("BluetoothConnectionStrategy", "缺少蓝牙权限，无法创建蓝牙套接字")
            showErrorMessage(context, "缺少蓝牙权限，无法创建蓝牙连接")
            return null
        }
        
        return try {
            // 使用标准的UUID创建RFCOMM套接字
            val uuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB") // 标准串口UUID
            device.createRfcommSocketToServiceRecord(uuid)
        } catch (e: SecurityException) {
            // 专门捕获权限相关的安全异常
            Log.e("BluetoothConnectionStrategy", "创建蓝牙套接字时权限被拒绝", e)
            showErrorMessage(context, "蓝牙权限被拒绝，无法创建蓝牙连接。请检查应用权限设置。")
            null
        } catch (e: IOException) {
            Log.e("BluetoothConnectionStrategy", "创建蓝牙套接字失败", e)
            try {
                // 尝试使用反射方法
                device.javaClass.getMethod("createRfcommSocket", Int::class.java)
                    .invoke(device, port) as BluetoothSocket
            } catch (ex: SecurityException) {
                // 反射方法也可能抛出安全异常
                Log.e("BluetoothConnectionStrategy", "反射创建蓝牙套接字时权限被拒绝", ex)
                showErrorMessage(context, "蓝牙权限被拒绝，无法创建蓝牙连接。请检查应用权限设置。")
                null
            } catch (ex: Exception) {
                Log.e("BluetoothConnectionStrategy", "反射创建蓝牙套接字也失败", ex)
                null
            }
        }
    }
    
    private fun startReceiveThread() {
        receiveThread = Thread {
            val buffer = ByteArray(1024)
            shouldStop = false
            
            while (!shouldStop && bluetoothSocket?.isConnected == true) {
                try {
                        val inputStream = bluetoothSocket?.inputStream
                        val bytes = inputStream?.read(buffer)
                        
                        if (bytes != -1 && bytes != null) {
                            val receivedData = String(buffer, 0, bytes)
                            Log.d("BluetoothConnectionStrategy", "收到蓝牙消息: $receivedData")
                            
                            try {
                                // 尝试将接收到的数据解析为JSON对象
                                val jsonMessage = JSONObject(receivedData)
                                // 通知所有消息监听器
                                messageListeners.forEach { it(jsonMessage) }
                            } catch (e: Exception) {
                                Log.w("BluetoothConnectionStrategy", "无法将收到的数据解析为JSON", e)
                            }
                        }
                    } catch (e: IOException) {
                    if (!shouldStop) {
                        Log.e("BluetoothConnectionStrategy", "接收蓝牙消息失败", e)
                    }
                }
            }
        }
        receiveThread?.start()
    }
    
    companion object {
        private const val TAG = "BluetoothConnectionStrategy"
        
        /**
         * 检查权限请求结果
         */
        fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray): Boolean {
            if (requestCode == REQUEST_BLUETOOTH_PERMISSIONS) {
                // 检查所有请求的权限是否都被授予
                return grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            }
            return false
        }
        
        // 权限请求常量
        const val REQUEST_BLUETOOTH_PERMISSIONS = 1001
    }
}