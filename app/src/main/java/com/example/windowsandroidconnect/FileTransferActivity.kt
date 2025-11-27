package com.example.windowsandroidconnect

import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.widget.Toast

/**
 * 文件传输Activity
 * 
 * 用于处理Android设备与Windows设备之间的文件传输
 */
class FileTransferActivity : Activity() {

    companion object {
        private const val TAG = "FileTransferActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 获取传递的设备信息
        val deviceInfo = intent.getParcelableExtra<DeviceInfo>("device_info")
        
        if (deviceInfo != null) {
            // 初始化文件传输界面或服务
            initializeFileTransfer(deviceInfo)
        } else {
            Toast.makeText(this, "设备信息缺失", Toast.LENGTH_SHORT).show()
            finish() // 关闭Activity
        }
    }

    /**
     * 初始化文件传输
     */
    private fun initializeFileTransfer(deviceInfo: DeviceInfo) {
        Log.d(TAG, "初始化文件传输，目标设备: ${deviceInfo.deviceName}")
        
        // TODO: 实现文件传输功能
        // 1. 显示文件选择界面
        // 2. 建立与目标设备的文件传输连接
        // 3. 处理文件选择和传输逻辑
        
        Toast.makeText(this, "文件传输功能开发中", Toast.LENGTH_SHORT).show()
        finish() // 暂时返回
    }
}