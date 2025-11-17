package com.example.windowsandroidconnect

import android.app.Activity
import android.os.Bundle
import android.widget.*
import com.example.windowsandroidconnect.config.ClientConfig

/**
 * 客户端配置管理界面
 * 允许用户配置服务器连接参数
 */
class ClientConfigActivity : Activity() {
    
    private lateinit var serverIpInput: EditText
    private lateinit var serverPortInput: EditText
    private lateinit var discoveryPortInput: EditText
    private lateinit var debugModeCheckbox: CheckBox
    private lateinit var saveButton: Button
    private lateinit var resetButton: Button
    private lateinit var statusText: TextView
    
    private lateinit var config: ClientConfig
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 初始化配置
        config = ClientConfig.getInstance(this)
        
        // 创建界面
        createConfigInterface()
    }
    
    private fun createConfigInterface() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(50, 50, 50, 50)
        }
        
        // 标题
        val title = TextView(this).apply {
            text = "客户端配置管理"
            textSize = 24f
            setTextColor(resources.getColor(android.R.color.black))
        }
        layout.addView(title)
        
        // 服务器IP输入
        val ipLabel = TextView(this).apply {
            text = "服务器IP地址:"
            textSize = 16f
            setTextColor(resources.getColor(android.R.color.black))
            setPadding(0, 20, 0, 5)
        }
        layout.addView(ipLabel)
        
        serverIpInput = EditText(this).apply {
            hint = "例如: 192.168.1.100"
            setText(config.serverIp)
        }
        layout.addView(serverIpInput)
        
        // 服务器端口输入
        val portLabel = TextView(this).apply {
            text = "服务器端口:"
            textSize = 16f
            setTextColor(resources.getColor(android.R.color.black))
            setPadding(0, 20, 0, 5)
        }
        layout.addView(portLabel)
        
        serverPortInput = EditText(this).apply {
            hint = "例如: ${ClientConfig.DEFAULT_SERVER_PORT}"
            setText(config.serverPort.toString())
        }
        layout.addView(serverPortInput)
        
        // 设备发现端口输入
        val discoveryPortLabel = TextView(this).apply {
            text = "设备发现端口:"
            textSize = 16f
            setTextColor(resources.getColor(android.R.color.black))
            setPadding(0, 20, 0, 5)
        }
        layout.addView(discoveryPortLabel)
        
        discoveryPortInput = EditText(this).apply {
            hint = "例如: ${ClientConfig.DEFAULT_DISCOVERY_PORT}"
            setText(config.discoveryPort.toString())
        }
        layout.addView(discoveryPortInput)
        
        // 调试模式复选框
        debugModeCheckbox = CheckBox(this).apply {
            text = "启用调试模式"
            isChecked = config.isDebugMode
        }
        layout.addView(debugModeCheckbox)
        
        // 状态文本
        statusText = TextView(this).apply {
            text = "配置已加载"
            setTextColor(resources.getColor(android.R.color.holo_green_dark))
            setPadding(0, 10, 0, 10)
        }
        layout.addView(statusText)
        
        // 按钮布局
        val buttonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        
        // 保存按钮
        saveButton = Button(this).apply {
            text = "保存配置"
            setBackgroundColor(resources.getColor(android.R.color.holo_blue_dark))
            setTextColor(resources.getColor(android.R.color.white))
            setOnClickListener {
                saveConfiguration()
            }
        }
        buttonLayout.addView(saveButton)
        
        // 重置按钮
        resetButton = Button(this).apply {
            text = "重置默认"
            setBackgroundColor(resources.getColor(android.R.color.holo_red_dark))
            setTextColor(resources.getColor(android.R.color.white))
            setOnClickListener {
                resetToDefaults()
            }
        }
        buttonLayout.addView(resetButton)
        
        layout.addView(buttonLayout)
        
        // 设置内容视图
        setContentView(layout)
    }
    
    private fun saveConfiguration() {
        try {
            // 验证输入
            val serverIp = serverIpInput.text.toString().trim()
            if (serverIp.isEmpty()) {
                showStatus("错误: 服务器IP不能为空", true)
                return
            }
            
            val serverPortStr = serverPortInput.text.toString().trim()
            if (serverPortStr.isEmpty()) {
                showStatus("错误: 服务器端口不能为空", true)
                return
            }
            val serverPort = serverPortStr.toInt()
            if (serverPort < 1 || serverPort > 65535) {
                showStatus("错误: 端口号必须在1-65535之间", true)
                return
            }
            
            val discoveryPortStr = discoveryPortInput.text.toString().trim()
            if (discoveryPortStr.isEmpty()) {
                showStatus("错误: 设备发现端口不能为空", true)
                return
            }
            val discoveryPort = discoveryPortStr.toInt()
            if (discoveryPort < 1 || discoveryPort > 65535) {
                showStatus("错误: 端口号必须在1-65535之间", true)
                return
            }
            
            // 保存配置
            config.serverIp = serverIp
            config.serverPort = serverPort
            config.discoveryPort = discoveryPort
            config.isDebugMode = debugModeCheckbox.isChecked
            
            showStatus("配置已保存成功", false)
            
        } catch (e: NumberFormatException) {
            showStatus("错误: 端口号必须是数字", true)
        } catch (e: Exception) {
            showStatus("保存配置失败: ${e.message}", true)
        }
    }
    
    private fun resetToDefaults() {
        config.resetToDefaults()
        // 更新界面显示
        serverIpInput.setText(ClientConfig.DEFAULT_SERVER_IP)
        serverPortInput.setText(ClientConfig.DEFAULT_SERVER_PORT.toString())
        discoveryPortInput.setText(ClientConfig.DEFAULT_DISCOVERY_PORT.toString())
        debugModeCheckbox.isChecked = ClientConfig.DEFAULT_DEBUG_MODE
        showStatus("配置已重置为默认值", false)
    }
    
    private fun showStatus(message: String, isError: Boolean) {
        statusText.text = message
        if (isError) {
            statusText.setTextColor(resources.getColor(android.R.color.holo_red_dark))
        } else {
            statusText.setTextColor(resources.getColor(android.R.color.holo_green_dark))
        }
    }
}