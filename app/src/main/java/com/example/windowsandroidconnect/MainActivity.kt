package com.example.windowsandroidconnect



import android.app.Activity



import android.content.Intent



import android.content.Context



import android.net.wifi.WifiManager



import android.os.Bundle



import android.provider.Settings



import android.util.Log



import android.view.View



import android.widget.Button



import android.widget.TextView



import android.widget.Toast



import androidx.recyclerview.widget.LinearLayoutManager



import androidx.recyclerview.widget.RecyclerView



import com.example.windowsandroidconnect.network.NetworkCommunication



import com.example.windowsandroidconnect.service.ClipboardService



import com.example.windowsandroidconnect.service.DeviceDiscoveryService



import com.example.windowsandroidconnect.service.NotificationService



import com.example.windowsandroidconnect.service.RemoteControlService



import com.example.windowsandroidconnect.service.ScreenCaptureService



import kotlinx.coroutines.*



import org.json.JSONObject



import java.util.*







// 导入R类以访问资源



import com.example.windowsandroidconnect.R







// 导入DeviceInfo类



import com.example.windowsandroidconnect.DeviceInfo







// 导入DeviceAdapter类



import com.example.windowsandroidconnect.DeviceAdapter







// 导入测试页面



import com.example.windowsandroidconnect.DeviceDiscoveryTestActivity



import com.example.windowsandroidconnect.DebugTestActivity

/**
 * Windows-Android Connect Android客户端
 * 
 * 这个Activity展示了未来的Android客户端主要功能：
 * - 设备发现和连接
 * - 文件传输
 * - 屏幕共享
 * - 远程控制
 * - 通知同步
 * - 剪贴板同步
 */
class MainActivity : Activity() {
    
    private lateinit var deviceInfoText: TextView



    private lateinit var connectButton: Button



    private lateinit var fileTransferButton: Button



    private lateinit var screenShareButton: Button



    private lateinit var deviceListRecycler: RecyclerView



    private lateinit var statusText: TextView



    private lateinit var testPageButton: Button



    private lateinit var configButton: Button

    private lateinit var debugTestButton: Button
    
    private val discoveredDevices = mutableListOf<DeviceInfo>()
    private var isConnected = false
    private var currentDevice: DeviceInfo? = null
    private lateinit var networkCommunication: NetworkCommunication
    private lateinit var deviceAdapter: DeviceAdapter
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initNetworkCommunication()
        initViews()
        setupClickListeners()
        initializeDeviceDiscovery()
        startBackgroundServices()
    }
    
    private fun initViews() {

        deviceInfoText = findViewById(R.id.device_info_text)

        connectButton = findViewById(R.id.connect_button)

        fileTransferButton = findViewById(R.id.file_transfer_button)

        screenShareButton = findViewById(R.id.screen_share_button)

        deviceListRecycler = findViewById(R.id.device_list_recycler)

        statusText = findViewById(R.id.status_text)

        testPageButton = findViewById(R.id.test_page_button)



        configButton = findViewById(R.id.config_button)



        debugTestButton = findViewById(R.id.debug_test_button)

        

        // 初始化设备适配器



        deviceAdapter = DeviceAdapter(discoveredDevices) { device: DeviceInfo ->



            // 点击设备项时的处理



            showToast("选择设备: ${device.deviceName}")



            // 可以在这里实现连接逻辑



        }

        

        // 设置RecyclerView

        deviceListRecycler.layoutManager = LinearLayoutManager(this)

        deviceListRecycler.adapter = deviceAdapter

        

        updateUI()

    }
    
    private fun setupClickListeners() {



        connectButton.setOnClickListener {



            if (isConnected) {



                disconnectFromDevice()



            } else {



                connectToWindowsDevice()



            }



        }



        



        fileTransferButton.setOnClickListener {



            if (isConnected) {



                startFileTransfer()



            } else {



                showToast("请先连接到Windows设备")



            }



        }



        



        screenShareButton.setOnClickListener {



            if (isConnected) {



                startScreenSharing()



            } else {



                showToast("请先连接到Windows设备")



            }



        }



        



        // 添加跳转到测试页面的点击监听器



        testPageButton.setOnClickListener {



            val intent = Intent(this, DeviceDiscoveryTestActivity::class.java)



            startActivity(intent)



        }



        



        // 添加跳转到配置界面的点击监听器

        configButton.setOnClickListener {

            val intent = Intent(this, ClientConfigActivity::class.java)

            startActivity(intent)

        }

        



        // 添加跳转到调试测试页面的点击监听器







        debugTestButton.setOnClickListener {







            val intent = Intent(this, SimpleConnectionTestActivity::class.java)







            startActivity(intent)







        }



    }

    /**
     * 初始化网络通信模块
     */
    private fun initNetworkCommunication() {
        networkCommunication = NetworkCommunication()
        networkCommunication.registerMessageHandler("control_command") { message ->
            handleControlCommand(message)
        }
        networkCommunication.registerMessageHandler("file_transfer") { message ->
            handleFileTransferRequest(message)
        }
        networkCommunication.registerMessageHandler("screen_stream_request") { message ->
            handleScreenStreamRequest(message)
        }
        networkCommunication.registerMessageHandler("device_discovered") { message ->
            handleDeviceDiscovered(message)
        }
    }

    /**
     * 启动后台服务
     */
    private fun startBackgroundServices() {
        // 启动剪贴板同步服务
        val clipboardIntent = Intent(this, ClipboardService::class.java)
        startService(clipboardIntent)

        // 启动通知同步服务
        val notificationIntent = Intent(this, NotificationService::class.java)
        startService(notificationIntent)
    }

    /**
     * 处理控制命令
     */
    private fun handleControlCommand(message: JSONObject) {
        try {
            val command = message.getString("command")
            Log.d(TAG, "收到控制命令: $command")
            // 这里会转发给RemoteControlService处理
        } catch (e: Exception) {
            Log.e(TAG, "处理控制命令失败", e)
        }
    }

    /**
     * 处理文件传输请求
     */
    private fun handleFileTransferRequest(message: JSONObject) {
        try {
            val action = message.getString("action")
            Log.d(TAG, "收到文件传输请求: $action")
            // 这里会转发给FileTransferService处理
        } catch (e: Exception) {
            Log.e(TAG, "处理文件传输请求失败", e)
        }
    }

    /**
     * 处理屏幕流请求
     */
    private fun handleScreenStreamRequest(message: JSONObject) {
        try {
            val action = message.getString("action")
            Log.d(TAG, "收到屏幕流请求: $action")
            if (action == "start") {
                startScreenSharing()
            } else if (action == "stop") {
                stopScreenSharing()
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理屏幕流请求失败", e)
        }
    }

    /**
     * 停止屏幕共享
     */
    private fun stopScreenSharing() {
        val intent = Intent(this, ScreenCaptureService::class.java)
        stopService(intent)
        showToast("屏幕共享已停止")
    }
    
    /**
     * 初始化设备发现服务
     * 负责在局域网中搜索Windows设备
     */
    private fun initializeDeviceDiscovery() {
        val deviceInfo = DeviceInfo(
            deviceId = generateDeviceId(),
            deviceName = android.os.Build.MODEL,
            platform = "android",
            version = "1.0.0",
            ip = getLocalIPAddress(),
            capabilities = listOf(
                "file_transfer",
                "screen_mirror", 
                "remote_control",
                "notification",
                "clipboard_sync"
            )
        )
        
        deviceInfoText.text = """
            设备信息:
            名称: ${deviceInfo.deviceName}
            IP地址: ${deviceInfo.ip}
            平台: ${deviceInfo.platform}
            版本: ${deviceInfo.version}
        """.trimIndent()
        
        // 开始设备发现服务
        startDeviceDiscoveryService()
    }
    
    /**
     * 启动设备发现服务
     * 通过启动后台服务来发现Windows设备
     */
    private fun startDeviceDiscoveryService() {
        statusText.text = "正在启动设备发现服务..."
        
        try {
            // 启动设备发现服务
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_START_DISCOVERY
            startService(intent)
            
            statusText.text = "设备发现服务已启动"
            showToast("设备发现服务已启动")
        } catch (e: Exception) {
            Log.e(TAG, "启动设备发现服务失败", e)
            statusText.text = "启动设备发现服务失败"
            showToast("启动设备发现服务失败")
        }
    }
    
    /**
     * 停止设备发现服务
     */
    private fun stopDeviceDiscoveryService() {
        try {
            val intent = Intent(this, DeviceDiscoveryService::class.java)
            intent.action = DeviceDiscoveryService.ACTION_STOP_DISCOVERY
            startService(intent)
            
            statusText.text = "设备发现服务已停止"
            showToast("设备发现服务已停止")
        } catch (e: Exception) {
            Log.e(TAG, "停止设备发现服务失败", e)
            statusText.text = "停止设备发现服务失败"
            showToast("停止设备发现服务失败")
        }
    }
    
    /**
     * 发送设备信息广播
     * @deprecated 使用 DeviceDiscoveryService 替代
     */
    @Deprecated("使用 DeviceDiscoveryService 替代此功能")
    private suspend fun broadcastDeviceInfo() {
        // 旧的实现方法，现在使用 DeviceDiscoveryService 进行设备发现
        Log.d(TAG, "使用旧的设备发现方法")
    }
    
    /**

     * 连接到Windows设备

     */

    private fun connectToWindowsDevice() {

        // 如果没有发现设备，提示用户手动输入IP

        if (discoveredDevices.isEmpty()) {

            // 简化处理，使用固定IP进行演示，实际应用中应弹出对话框让用户输入

            val windowsDeviceIp = getLocalIPAddress().replace(Regex("\\d+$"), "1") // 获取网段的网关IP作为默认值，例如192.168.1.1

            connectToDeviceIP(windowsDeviceIp)

            return

        }

        

        // 从发现的设备列表中选择第一个Windows设备

        val windowsDevice = discoveredDevices.find { it.platform == "windows" }

        if (windowsDevice != null) {

            connectToDeviceIP(windowsDevice.ip)

        } else {

            // 如果没有发现Windows设备，提示用户手动输入IP

            val defaultIp = getLocalIPAddress().replace(Regex("\\d+$"), "1")

            connectToDeviceIP(defaultIp)

        }

    }

    

    /**

     * 连接到指定IP的设备

     */

    private fun connectToDeviceIP(ip: String) {

        serviceScope.launch {

            try {

                withContext(Dispatchers.Main) {

                    statusText.text = "正在连接到 $ip..."

                }

                

                // 连接到Windows设备 (使用配置的端口)

                val config = com.example.windowsandroidconnect.config.ClientConfig.getInstance(this@MainActivity)





                val success = networkCommunication.connect(ip, config.serverPort)

                

                withContext(Dispatchers.Main) {

                    if (success) {

                        isConnected = true

                        currentDevice = DeviceInfo(

                            deviceId = generateDeviceId(),

                            deviceName = "Connected Windows Device",

                            platform = "windows",

                            version = "1.0.0",

                            ip = ip,

                            capabilities = listOf("file_transfer", "screen_mirror", "remote_control", "notification", "clipboard_sync")

                        )

                        statusText.text = "已连接到Windows设备: $ip"

                        showToast("连接成功")

                        updateUI()

                    } else {

                        statusText.text = "连接失败: $ip"

                        showToast("连接失败")

                    }

                }

                

            } catch (e: Exception) {

                Log.e(TAG, "连接设备失败", e)

                withContext(Dispatchers.Main) {

                    statusText.text = "连接失败: ${e.message}"

                    showToast("连接失败: ${e.message}")

                }

            }

        }

    }
    
    /**
     * 断开与设备的连接
     */
    private fun disconnectFromDevice() {
        networkCommunication.disconnect()
        isConnected = false
        currentDevice = null
        statusText.text = "已断开连接"
        updateUI()
        showToast("已断开连接")
    }
    
    /**
     * 处理设备发现消息
     */
    private fun handleDeviceDiscovered(message: JSONObject) {
        try {
            val deviceInfo = message.getJSONObject("deviceInfo")
            val deviceId = deviceInfo.getString("deviceId")
            val deviceName = deviceInfo.getString("deviceName")
            val platform = deviceInfo.getString("platform")
            val ip = deviceInfo.getString("ip")
            
            Log.d(TAG, "发现设备: $deviceName ($ip)")
            
            // 更新UI

            this@MainActivity.runOnUiThread {

                statusText.text = "发现设备: $deviceName"

                showToast("发现设备: $deviceName")

                

                // 添加到设备列表

                val newDevice = DeviceInfo(

                    deviceId = deviceId,

                    deviceName = deviceName,

                    platform = platform,

                    version = deviceInfo.optString("version", "1.0.0"),

                    ip = ip,

                    capabilities = emptyList()

                )

                

                // 检查是否已存在

                if (!discoveredDevices.any { it.deviceId == deviceId }) {

                    discoveredDevices.add(newDevice)

                    deviceAdapter.updateDevices(discoveredDevices)

                }

            }
        } catch (e: Exception) {
            Log.e(TAG, "处理设备发现消息失败", e)
        }
    }
    
    /**
     * 启动文件传输
     */
    private fun startFileTransfer() {
        if (!isConnected || currentDevice == null) {
            showToast("未连接到Windows设备")
            return
        }
        
        // 启动文件传输Activity或Service
        // val intent = Intent(this, FileTransferActivity::class.java)
        // intent.putExtra("device_info", currentDevice)
        // startActivity(intent)
        
        showToast("文件传输功能开发中...")
    }
    
    /**
     * 启动屏幕共享
     */
    private fun startScreenSharing() {
        if (!isConnected || currentDevice == null) {
            showToast("未连接到Windows设备")
            return
        }
        
        // 检查屏幕共享权限
        checkScreenCapturePermission()
    }
    
    /**
     * 检查辅助功能服务是否启用
     */
    private fun isAccessibilityServiceEnabled(): Boolean {
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        
        return enabledServices.contains("com.example.windowsandroidconnect/.service.RemoteControlService")
    }
    
    /**
     * 请求辅助功能权限
     */
    private fun requestAccessibilityPermission() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        showToast("请在辅助功能设置中启用'Windows-Android Connect'")
    }
    
    /**
     * 检查屏幕捕获权限
     */
    private fun checkScreenCapturePermission() {
        // TODO: 检查和请求屏幕捕获权限
        // 使用MediaProjection API
        
        // 启动屏幕捕获服务
        val intent = Intent(this, ScreenCaptureService::class.java)
        startForegroundService(intent)
        
        showToast("正在启动屏幕共享...")
    }
    
    /**
     * 获取本地IP地址
     */
    private fun getLocalIPAddress(): String {
        val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val dhcpInfo = wifiManager.dhcpInfo
        return android.text.format.Formatter.formatIpAddress(dhcpInfo.serverAddress)
    }
    
    /**
     * 生成设备ID
     */
    private fun generateDeviceId(): String {
        return java.util.UUID.randomUUID().toString()
    }
    
    /**
     * 连接到设备
     * 返回连接是否成功
     */
    private suspend fun connectToDevice(device: DeviceInfo): Boolean {
        // TODO: 实现真实的网络连接逻辑
        // 这里需要通过TCP/WebSocket连接到Windows设备
        
        delay(2000) // 模拟连接延迟
        
        // 模拟连接成功
        return device.platform == "windows"
    }
    
    private fun updateUI() {
        if (isConnected) {
            connectButton.text = "断开连接"
            connectButton.setBackgroundColor(getColor(android.R.color.holo_red_dark))
            fileTransferButton.visibility = View.VISIBLE
            screenShareButton.visibility = View.VISIBLE
        } else {
            connectButton.text = "连接"
            connectButton.setBackgroundColor(getColor(android.R.color.holo_blue_dark))
            fileTransferButton.visibility = View.GONE
            screenShareButton.visibility = View.GONE
        }
    }
    
    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    // runOnUiThread 方法已由 Activity 父类提供，无需重新定义
    
    companion object {

        private const val TAG = "MainActivity"

    }

}