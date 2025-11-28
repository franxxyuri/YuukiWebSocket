package com.example.windowsandroidconnect

import android.app.Activity
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.widget.Toast
import androidx.annotation.RequiresApi
import com.example.windowsandroidconnect.config.ClientConfig
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

/**
 * 屏幕捕获服务
 * 
 * 用于处理Android设备的屏幕捕获和共享
 */
class ScreenCaptureService : Service() {

    companion object {
        private const val TAG = "ScreenCaptureService"
        const val ACTION_START_CAPTURE = "com.example.windowsandroidconnect.START_CAPTURE"
        const val ACTION_STOP_CAPTURE = "com.example.windowsandroidconnect.STOP_CAPTURE"
        const val REQUEST_CODE_SCREEN_CAPTURE = 1001
        
        // 全局实例
        var instance: ScreenCaptureService? = null
            private set
    }

    private var mediaProjection: MediaProjection? = null
    private var screenCaptureWorker: ScreenCaptureWorker? = null
    private var isCapturing = false
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var networkCommunication: NetworkCommunication? = null

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_CAPTURE -> {
                startScreenCapture()
            }
            ACTION_STOP_CAPTURE -> {
                stopScreenCapture()
            }
            else -> {
                // 检查Intent中是否有MediaProjection数据
                if (intent?.hasExtra("resultCode") == true && intent.hasExtra("data")) {
                    val resultCode = intent.getIntExtra("resultCode", Activity.RESULT_CANCELED)
                    val data = intent.getParcelableExtra<Intent>("data")
                    if (resultCode == Activity.RESULT_OK && data != null) {
                        initializeMediaProjection(resultCode, data)
                        startScreenCapture()
                    } else {
                        Log.e(TAG, "无效的MediaProjection数据")
                        stopSelf()
                    }
                } else {
                    Log.w(TAG, "未提供屏幕捕获权限，请求权限")
                    requestScreenCapturePermission()
                }
            }
        }

        return START_STICKY // 服务被杀死后尝试重启
    }

    /**
     * 请求屏幕捕获权限
     */
    private fun requestScreenCapturePermission() {
        Log.d(TAG, "请求屏幕捕获权限")
        val mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        val intent = mediaProjectionManager.createScreenCaptureIntent()
        
        // 创建一个临时Activity来请求权限
        val permissionIntent = Intent(this, ScreenCaptureRequestActivity::class.java).apply {
            putExtra("capture_intent", intent)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(permissionIntent)
    }

    /**
     * 初始化MediaProjection
     */
    fun initializeMediaProjection(resultCode: Int, data: Intent) {
        val mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = mediaProjectionManager.getMediaProjection(resultCode, data)
        
        // 初始化网络通信模块
        networkCommunication = (application as? MyApplication)?.networkCommunication
    }

    /**
     * 开始屏幕捕获
     */
    private fun startScreenCapture() {
        if (isCapturing) {
            Log.w(TAG, "屏幕捕获已在进行中")
            return
        }

        if (mediaProjection == null) {
            Log.e(TAG, "MediaProjection未初始化，请先获取屏幕捕获权限")
            requestScreenCapturePermission()
            return
        }

        Log.d(TAG, "开始屏幕捕获")
        Toast.makeText(this, "开始屏幕捕获", Toast.LENGTH_SHORT).show()

        isCapturing = true
        instance = this

        // 初始化网络通信模块
        if (networkCommunication == null) {
            networkCommunication = (application as? MyApplication)?.networkCommunication
        }

        // 创建屏幕捕获工作器
        screenCaptureWorker = ScreenCaptureWorker(
            this,
            mediaProjection!!,
            this.networkCommunication
        )
        
        // 启动屏幕捕获
        screenCaptureWorker?.startCapture()
        
        // 启动前台服务以避免被系统杀死
        startForegroundService()
    }

    /**
     * 停止屏幕捕获
     */
    private fun stopScreenCapture() {
        Log.d(TAG, "停止屏幕捕获")
        Toast.makeText(this, "停止屏幕捕获", Toast.LENGTH_SHORT).show()
        
        isCapturing = false
        instance = null
        
        screenCaptureWorker?.stopCapture()
        screenCaptureWorker = null
        
        mediaProjection?.stop()
        mediaProjection = null
        
        stopForeground(true) // 停止前台服务
        stopSelf() // 停止服务
    }

    /**
     * 启动前台服务
     */
    private fun startForegroundService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notification = createNotification()
            startForeground(1, notification)
        }
    }

    /**
     * 创建通知
     */
    @RequiresApi(Build.VERSION_CODES.O)
    private fun createNotification(): android.app.Notification {
        val notificationChannelId = "ScreenCaptureChannel"
        
        val channel = android.app.NotificationChannel(
            notificationChannelId,
            "屏幕捕获服务",
            android.app.NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "屏幕捕获和投屏服务"
        }
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        notificationManager.createNotificationChannel(channel)
        
        return android.app.Notification.Builder(this, notificationChannelId)
            .setContentTitle("屏幕投屏服务运行中")
            .setContentText("正在投屏到Windows设备")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "屏幕捕获服务已销毁")
        stopScreenCapture()
        
        // 取消协程作用域
        coroutineScope.cancel()
    }
    
    /**
     * 检查是否正在捕获
     */
    fun isCapturing(): Boolean {
        return isCapturing
    }
    
    /**
     * 获取当前网络通信实例
     */
    fun getNetworkCommunication(): NetworkCommunication? {
        return networkCommunication
    }
}

/**
 * 屏幕捕获工作器
 * 负责实际的屏幕捕获和数据传输
 */
class ScreenCaptureWorker(
    private val context: Context,
    private val mediaProjection: MediaProjection,
    private val networkCommunication: NetworkCommunication?
) {
    private var isCapturing = false
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var captureJob: Job? = null
    
    // 使用VirtualDisplay和ImageReader进行屏幕捕获
    private var virtualDisplay: android.hardware.display.VirtualDisplay? = null
    private var imageReader: android.media.ImageReader? = null
    
    companion object {
        private const val TAG = "ScreenCaptureWorker"
        private const val SCREEN_WIDTH = 1280
        private const val SCREEN_HEIGHT = 720
        private const val BIT_RATE = 4000000 // 4Mbps
        private const val DPI = 320
    }
    
    /**
     * 开始捕获
     */
    fun startCapture() {
        if (isCapturing) {
            Log.w(TAG, "屏幕捕获已在进行中")
            return
        }
        
        isCapturing = true
        Log.d(TAG, "屏幕捕获工作器开始工作")
        
        // 创建ImageReader
        imageReader = android.media.ImageReader.newInstance(
            SCREEN_WIDTH, 
            SCREEN_HEIGHT, 
            android.graphics.ImageFormat.PRIVATE, 
            2
        )
        
        // 创建虚拟显示
        virtualDisplay = mediaProjection.createVirtualDisplay(
            "ScreenCapture",
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            DPI,
            0, // 使用默认标志
            imageReader?.surface,
            null,
            null
        )
        
        // 开始捕获循环
        captureJob = coroutineScope.launch {
            captureLoop()
        }
    }
    
    /**
     * 捕获循环
     */
    private suspend fun captureLoop() {
        while (isCapturing) {
            try {
                // 获取最新的图像
                val image = withContext(Dispatchers.Main) {
                    imageReader?.acquireLatestImage()
                }
                
                if (image != null) {
                    // 将图像转换为字节数组
                    val bitmap = imageToBitmap(image)
                    val frameData = bitmapToByteArray(bitmap)
                    
                    // 通过网络发送帧数据
                    if (networkCommunication?.isConnected() == true) {
                        networkCommunication?.sendScreenFrame(frameData)
                    } else {
                        Log.w(TAG, "网络未连接，跳过帧发送")
                    }
                    
                    // 限制帧率（例如30fps）
                    delay((1000 / 30).toLong())
                    
                    // 关闭图像
                    image.close()
                } else {
                    // 没有新图像，短暂休眠
                    delay(16) // 约60fps
                }
            } catch (e: Exception) {
                Log.e(TAG, "捕获循环错误", e)
                delay(100) // 错误后短暂休眠
            }
        }
    }
    
    /**
     * 将Image转换为Bitmap
     */
    private fun imageToBitmap(image: android.media.Image): android.graphics.Bitmap {
        val planes = image.planes
        val buffer = planes[0].buffer
        val pixelStride = planes[0].pixelStride
        val rowStride = planes[0].rowStride
        val rowPadding = rowStride - pixelStride * image.width
        
        val bitmap = android.graphics.Bitmap.createBitmap(
            image.width + rowPadding / pixelStride,
            image.height,
            android.graphics.Bitmap.Config.ARGB_8888
        )
        bitmap.copyPixelsFromBuffer(buffer)
        return bitmap
    }
    
    /**
     * 将Bitmap转换为字节数组
     */
    private fun bitmapToByteArray(bitmap: android.graphics.Bitmap): ByteArray {
        val outputStream = ByteArrayOutputStream()
        
        // 压缩图像以减少网络传输量
        val quality = 60 // 压缩质量（60%）
        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, quality, outputStream)
        
        return outputStream.toByteArray()
    }
    
    /**
     * 停止捕获
     */
    fun stopCapture() {
        Log.d(TAG, "停止屏幕捕获工作器")
        isCapturing = false
        
        // 取消捕获协程
        captureJob?.cancel()
        captureJob = null
        
        // 关闭虚拟显示
        virtualDisplay?.release()
        virtualDisplay = null
        
        // 关闭ImageReader
        imageReader?.close()
        imageReader = null
        
        // 取消协程作用域
        coroutineScope.cancel()
    }
}