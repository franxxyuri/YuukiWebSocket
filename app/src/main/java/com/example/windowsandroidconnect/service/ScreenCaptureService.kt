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
        Log.d(TAG, "收到服务启动命令: ${intent?.action}")
        
        // 获取网络通信实例
        networkCommunication = (application as? MyApplication)?.networkCommunication
        startScreenCapture()
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
        
        // 请求用户授权屏幕捕获
        val intent = Intent(this, ScreenCaptureRequestActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
    }
    
    /**
     * 设置MediaProjection
     */
    private fun setupMediaProjection(resultCode: Int, resultData: Intent?) {
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
        val image: Image? = reader.acquireLatestImage()
        if (image != null) {
            serviceScope.launch {
                try {
                    val bitmap = imageToBitmap(image)
                    val compressedData = compressBitmap(bitmap)
                    sendFrameToWindows(compressedData)
                } catch (e: Exception) {
                    Log.e(TAG, "处理屏幕帧失败", e)
                } finally {
                    image.close()
                }
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
                val buffer = image.planes[0].buffer
                val bytes = ByteArray(buffer.remaining())
                buffer.get(bytes)
                android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            }
            else -> {
                // 对于其他格式（包括RGBA_8888等），使用通用处理方法
                val planes = image.planes
                val buffer = planes[0].buffer
                val pixelStride = planes[0].pixelStride
                val rowStride = planes[0].rowStride
                val rowPadding = rowStride - pixelStride * screenWidth
                
                // 确保不会出现负数或零的尺寸
                val actualWidth = if (screenWidth + rowPadding / pixelStride <= 0) screenWidth else screenWidth + rowPadding / pixelStride
                val actualHeight = if (screenHeight <= 0) 1 else screenHeight
                
                try {
                    val bitmap = Bitmap.createBitmap(
                        actualWidth,
                        actualHeight, Bitmap.Config.ARGB_8888
                    )
                    if (buffer.remaining() > 0) {
                        bitmap.copyPixelsFromBuffer(buffer)
                    }
                    Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
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
        val outputStream = ByteArrayOutputStream()
        // 根据网络状况调整压缩质量，以平衡清晰度和性能
        bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream)
        return outputStream.toByteArray()
    }
    
    /**
     * 发送帧到Windows端
     */
    private suspend fun sendFrameToWindows(data: ByteArray) {
        try {
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
        private const val CHANNEL_ID = "screen_capture_channel"
        private const val NOTIFICATION_ID = 1001
    }
}