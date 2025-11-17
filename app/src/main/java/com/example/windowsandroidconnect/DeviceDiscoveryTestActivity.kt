package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import com.example.windowsandroidconnect.service.DeviceDiscoveryService

/**
 * 设备发现功能测试页面
 * 用于调试和测试设备发现功能
 */
class DeviceDiscoveryTestActivity : Activity() {
    
    private lateinit var statusText: TextView
    private lateinit var startDiscoveryButton: Button
    private lateinit var stopDiscoveryButton: Button
    private lateinit var backButton: Button
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_device_discovery_test)
        
        initViews()
        setupClickListeners()
    }
    
    private fun initViews() {
        statusText = findViewById(R.id.discovery_status_text)
        startDiscoveryButton = findViewById(R.id.start_discovery_button)
        stopDiscoveryButton = findViewById(R.id.stop_discovery_button)
        backButton = findViewById(R.id.back_button)
        
        statusText.text = "设备发现测试页面\n请使用此页面测试设备发现功能"
    }
    
    private fun setupClickListeners() {
        startDiscoveryButton.setOnClickListener {
            startDeviceDiscovery()
        }
        
        stopDiscoveryButton.setOnClickListener {
            stopDeviceDiscovery()
        }
        
        backButton.setOnClickListener {
            finish()
        }
    }
    
    private fun startDeviceDiscovery() {
        try {
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_START_DISCOVERY
            startService(intent)
            
            statusText.text = "设备发现服务已启动\n正在搜索设备..."
            showToast("设备发现服务已启动")
            Log.d(TAG, "设备发现服务已启动")
        } catch (e: Exception) {
            Log.e(TAG, "启动设备发现服务失败", e)
            statusText.text = "启动设备发现服务失败: ${e.message}"
            showToast("启动设备发现服务失败")
        }
    }
    
    private fun stopDeviceDiscovery() {
        try {
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_STOP_DISCOVERY
            startService(intent)
            
            statusText.text = "设备发现服务已停止"
            showToast("设备发现服务已停止")
            Log.d(TAG, "设备发现服务已停止")
        } catch (e: Exception) {
            Log.e(TAG, "停止设备发现服务失败", e)
            statusText.text = "停止设备发现服务失败: ${e.message}"
            showToast("停止设备发现服务失败")
        }
    }
    
    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    companion object {
        private const val TAG = "DeviceDiscoveryTest"
    }
}