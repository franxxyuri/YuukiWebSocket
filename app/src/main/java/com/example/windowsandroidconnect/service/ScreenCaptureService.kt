package com.example.windowsandroidconnect.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.windowsandroidconnect.MyApplication
import com.example.windowsandroidconnect.ScreenCaptureRequestActivity
import com.example.windowsandroidconnect.network.NetworkCommunication
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

/**
 * 屏幕捕获服务
 * 使用MediaProjection API捕获Android设备屏幕并传输到Windows端
 */
class ScreenCaptureService : Service() {
    
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var isCapturing = false
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var captureJob: Job? = null
    private var networkCommunication: NetworkCommunication? = null
    
    private val screenWidth = 1280
    private val screenHeight = 720
    private val screenDpi = 240
    private val screenCaptureFormat = android.graphics.ImageFormat.PRIVATE
    private val screenCaptureFlags = DisplayManager.VIRTUAL_DISPLAY_FLAG_PRESENTATION
    
    private val screenCaptureReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == ScreenCaptureRequestActivity.ACTION_CAPTURE_PERMISSION_GRANTED) {
                val resultCode = intent.getIntExtra(ScreenCaptureRequestActivity.EXTRA_RESULT_CODE, 0)
                val resultData = intent.getParcelableExtra<Intent>(ScreenCaptureRequestActivity.EXTRA_RESULT_DATA)
                setupMediaProjection(resultCode, resultData)
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        registerReceiver(screenCaptureReceiver, IntentFilter(ScreenCaptureRequestActivity.ACTION_CAPTURE_PERMISSION_GRANTED))
        Log.d(TAG, "屏幕捕获服务已启动")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_CAPTURE -> {
                Log.d(TAG, "收到开始屏幕捕获命令")
                // 检查是否有MediaProjection数据
                val resultCode = intent.getIntExtra("resultCode", 0)
                val data = intent.getParcelableExtra<Intent>("data")
                if (resultCode != 0 && data != null) {
                    setupMediaProjection(resultCode, data)
                    startScreenCapture()
                } else {
                    Log.w(TAG, "未提供屏幕捕获权限，请求权限")
                    startScreenCapture() // 这会触发权限请求
                }
            }
            ACTION_STOP_CAPTURE -> {
                Log.d(TAG, "收到停止屏幕捕获命令")
                stopScreenCapture()
            }
            else -> {
                Log.d(TAG, "收到服务启动命令: ${intent?.action}")
                // 获取网络通信实例
                networkCommunication = (application as? MyApplication)?.networkCommunication
                startScreenCapture()
            }
        }
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopScreenCapture()
        unregisterReceiver(screenCaptureReceiver)
        serviceScope.cancel()
        Log.d(TAG, "屏幕捕获服务已停止")
    }
    
    /**
     * 创建通知渠道
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "屏幕捕获服务",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "屏幕投屏服务"
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
            
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Windows-Android Connect")
                .setContentText("屏幕投屏服务运行中")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .build()
            
            startForeground(NOTIFICATION_ID, notification)
        }
    }
    
    /**
     * 开始屏幕捕获
     */
    private fun startScreenCapture() {
        if (isCapturing) return

        // 检查是否已有MediaProjection权限
        if (mediaProjection == null) {
            Log.d(TAG, "没有MediaProjection权限，启动权限请求")
            // 请求用户授权屏幕捕获
            val intent = Intent(this, ScreenCaptureRequestActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        } else {
            // 开始实际的屏幕捕获
            Log.d(TAG, "已有MediaProjection权限，开始屏幕捕获")
            // 创建ImageReader用于接收屏幕数据
            imageReader = ImageReader.newInstance(screenWidth, screenHeight, screenCaptureFormat, 2)
            imageReader?.setOnImageAvailableListener(imageAvailableListener, null)

            // 创建虚拟显示器
            virtualDisplay = mediaProjection?.createVirtualDisplay(
                "ScreenCapture",
                screenWidth, screenHeight, screenDpi,
                screenCaptureFlags,
                imageReader?.surface,
                null, null
            )

            // 开始捕获屏幕
            startCaptureLoop()
            isCapturing = true
            Log.d(TAG, "屏幕捕获已开始")
        }
    }
    
    /**
     * 设置MediaProjection
     */
    private fun setupMediaProjection(resultCode: Int, resultData: Intent?) {
        // 首先启动前台服务
        createNotificationChannel()
        
        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        if (resultData != null) {
            mediaProjection = projectionManager.getMediaProjection(resultCode, resultData)
                ?: run {
                    Log.e(TAG, "无法获取MediaProjection")
                    return
                }
        } else {
            Log.e(TAG, "resultData 为 null，无法创建MediaProjection")
            return
        }
        
        // 创建ImageReader用于接收屏幕数据
        imageReader = ImageReader.newInstance(screenWidth, screenHeight, screenCaptureFormat, 2)
        imageReader?.setOnImageAvailableListener(imageAvailableListener, null)
        
        // 创建虚拟显示器
        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "ScreenCapture",
            screenWidth, screenHeight, screenDpi,
            screenCaptureFlags,
            imageReader?.surface,
            null, null
        )
        
        // 开始捕获屏幕
        startCaptureLoop()
        isCapturing = true
        Log.d(TAG, "屏幕捕获已开始")
    }
    
    /**
     * 开始捕获循环
     */
    private fun startCaptureLoop() {
        captureJob = serviceScope.launch {
            while (isCapturing) {
                delay(50) // 20 FPS，可根据需要调整
            }
        }
    }
    
    /**
     * 停止屏幕捕获
     */
    private fun stopScreenCapture() {
        isCapturing = false
        captureJob?.cancel()
        virtualDisplay?.release()
        mediaProjection?.stop()
        imageReader?.close()
        mediaProjection?.unregisterCallback(mediaProjectionCallback)
        mediaProjection = null
        Log.d(TAG, "屏幕捕获已停止")
    }
    
    /**
     * Image可用监听器
     */
    private val imageAvailableListener = ImageReader.OnImageAvailableListener { reader ->
        var image: Image? = null
        try {
            image = reader.acquireLatestImage()
            if (image != null) {
                serviceScope.launch {
                    try {
                        val bitmap = imageToBitmap(image)
                        // 检查Bitmap是否有效
                        if (bitmap != null && !bitmap.isRecycled) {
                            val compressedData = compressBitmap(bitmap)
                            sendFrameToWindows(compressedData)
                        } else {
                            Log.w(TAG, "获取的Bitmap无效或已被回收")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "处理屏幕帧失败", e)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "获取图像失败", e)
        } finally {
            // 确保图像在主线程中关闭，避免与ImageReader的内部线程冲突
            try {
                image?.close()
            } catch (e: Exception) {
                Log.e(TAG, "关闭图像失败", e)
            }
        }
    }
    
    /**
     * Image转Bitmap
     */
    private fun imageToBitmap(image: Image): Bitmap {
        val format = image.format
        return when (format) {
            android.graphics.ImageFormat.JPEG -> {
                val planes = image.planes
                if (planes.isEmpty()) {
                    Log.w(TAG, "JPEG图像planes数组为空，返回空位图")
                    return Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
                }
                if (planes[0].buffer == null) {
                    Log.w(TAG, "JPEG图像缓冲区为空，返回空位图")
                    return Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
                }
                val buffer = planes[0].buffer
                if (buffer.remaining() == 0) {
                    Log.w(TAG, "JPEG图像缓冲区为空，返回空位图")
                    return Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
                }
                val bytes = ByteArray(buffer.remaining())
                try {
                    buffer.get(bytes)
                } catch (e: Exception) {
                    Log.e(TAG, "从JPEG缓冲区读取数据失败", e)
                    return Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
                }
                val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                // 如果解码失败，返回默认位图
                bitmap ?: Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
            }
            else -> {
                // 对于其他格式（包括RGBA_8888等），使用通用处理方法
                val planes = image.planes
                
                // 检查planes数组是否为空
                if (planes.isEmpty()) {
                    Log.w(TAG, "图像planes数组为空，返回空位图")
                    return Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
                }
                
                val buffer = planes[0].buffer
                
                // 检查缓冲区是否有效
                if (buffer == null || buffer.remaining() == 0) {
                    Log.w(TAG, "图像缓冲区为空，返回空位图")
                    return Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
                }
                
                val pixelStride = planes[0].pixelStride
                val rowStride = planes[0].rowStride
                val rowPadding = rowStride - pixelStride * image.width
                
                // 确保不会出现负数或零的尺寸
                val actualWidth = if (image.width + rowPadding / pixelStride <= 0) image.width else image.width + rowPadding / pixelStride
                val actualHeight = if (image.height <= 0) 1 else image.height
                
                try {
                    val bitmap = Bitmap.createBitmap(
                        actualWidth,
                        actualHeight, Bitmap.Config.ARGB_8888
                    )
                    // 确保缓冲区有效且有数据
                    if (buffer != null && buffer.remaining() > 0) {
                        try {
                            bitmap.copyPixelsFromBuffer(buffer)
                        } catch (e: Exception) {
                            Log.w(TAG, "copyPixelsFromBuffer失败，可能缓冲区无效", e)
                        }
                    }
                    // 调整为指定尺寸，确保返回正确的屏幕尺寸
                    if (actualWidth >= screenWidth && actualHeight >= screenHeight) {
                        Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
                    } else {
                        // 如果尺寸不匹配，直接返回创建的bitmap
                        bitmap
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "创建位图失败", e)
                    // 如果创建位图失败，返回一个空位图
                    Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
                }
            }
        }
    }
    
    /**
     * 压缩Bitmap
     */
    private fun compressBitmap(bitmap: Bitmap): ByteArray {
        // 检查bitmap是否有效
        if (bitmap.isRecycled) {
            Log.w(TAG, "Bitmap已被回收，返回空字节数组")
            return ByteArray(0)
        }
        val outputStream = ByteArrayOutputStream()
        // 根据网络状况调整压缩质量，以平衡清晰度和性能
        val result = bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream)
        if (!result) {
            Log.e(TAG, "Bitmap压缩失败")
            return ByteArray(0)
        }
        return outputStream.toByteArray()
    }
    
    /**
     * 发送帧到Windows端
     */
    private suspend fun sendFrameToWindows(data: ByteArray) {
        try {
            // 检查数据是否有效
            if (data.isEmpty()) {
                Log.w(TAG, "屏幕帧数据为空，跳过发送")
                return
            }
            if (networkCommunication?.isConnected() == true) {
                val frameHeader = mapOf(
                    "type" to "screen_frame",
                    "timestamp" to System.currentTimeMillis(),
                    "width" to screenWidth,
                    "height" to screenHeight,
                    "size" to data.size
                )
                
                // 先发送帧头信息
                val headerMessage = org.json.JSONObject(frameHeader)
                networkCommunication?.sendMessage(headerMessage)
                
                // 再发送实际的帧数据
                networkCommunication?.sendScreenFrame(data)
            } else {
                Log.w(TAG, "网络未连接，无法发送屏幕帧")
            }
        } catch (e: Exception) {
            Log.e(TAG, "发送帧到Windows端失败", e)
        }
    }
    
    /**
     * MediaProjection回调
     */
    private val mediaProjectionCallback = object : MediaProjection.Callback() {
        override fun onStop() {
            Log.d(TAG, "MediaProjection已停止")
            stopScreenCapture()
        }
    }
    
    companion object {
        private const val TAG = "ScreenCaptureService"
        const val ACTION_START_CAPTURE = "com.example.windowsandroidconnect.START_CAPTURE"
        const val ACTION_STOP_CAPTURE = "com.example.windowsandroidconnect.STOP_CAPTURE"
        private const val CHANNEL_ID = "screen_capture_channel"
        private const val NOTIFICATION_ID = 1001
    }
}