package com.example.windowsandroidconnect.connection

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.util.Log
import org.json.JSONObject
import java.io.IOException
import java.util.*

/**
 * 蓝牙连接策略实现
 * 使用蓝牙进行设备间通信
 */
class BluetoothConnectionStrategy : ConnectionStrategy {
    
    private var bluetoothSocket: BluetoothSocket? = null
    private var bluetoothDevice: BluetoothDevice? = null
    private var isConnectedState = false
    private var receiveThread: Thread? = null
    private var shouldStop = false
    
    override suspend fun connect(ip: String, port: Int): Boolean {
        // 对于蓝牙，参数ip实际上应该是设备MAC地址，port是RFCOMM通道
        return try {
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
                true
            } catch (e: IOException) {
                Log.e("BluetoothConnectionStrategy", "蓝牙连接失败", e)
                isConnectedState = false
                false
            }
        } catch (e: Exception) {
            Log.e("BluetoothConnectionStrategy", "蓝牙连接异常", e)
            isConnectedState = false
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
        if (isConnected()) {
            try {
                val messageStr = message.toString()
                val outputStream = bluetoothSocket?.outputStream
                outputStream?.write(messageStr.toByteArray())
                outputStream?.flush()
                
                Log.d("BluetoothConnectionStrategy", "发送蓝牙消息: ${messageStr.take(50)}...")
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
    
    private fun createBluetoothSocket(device: BluetoothDevice, port: Int): BluetoothSocket? {
        return try {
            // 使用标准的UUID创建RFCOMM套接字
            val uuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB") // 标准串口UUID
            device.createRfcommSocketToServiceRecord(uuid)
        } catch (e: IOException) {
            Log.e("BluetoothConnectionStrategy", "创建蓝牙套接字失败", e)
            try {
                // 尝试使用反射方法
                device.javaClass.getMethod("createRfcommSocket", Int::class.java)
                    .invoke(device, port) as BluetoothSocket
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
                        
                        // 这里可以添加消息处理逻辑
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
}