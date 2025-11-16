package com.example.windowsandroidconnect.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
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
    
    private val screenWidth = 1280
    private val screenHeight = 720
    private val screenDpi = 240
    private var networkCommunication: NetworkCommunication? = null
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.d(TAG, "屏幕捕获服务已启动")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "收到服务启动命令: ${intent?.action}")
        
        // 获取网络通信实例（需要从应用单例或通过其他方式获取）
        // 这里简化处理，实际开发中需要更好的架构设计
        startScreenCapture()
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopScreenCapture()
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
        
        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        
        // 请求用户授权屏幕捕获

        val intent = Intent(this, com.example.windowsandroidconnect.ScreenCaptureRequestActivity::class.java)

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        startActivity(intent)
        
        // 模拟屏幕捕获
        serviceScope.launch {
            try {
                // 模拟屏幕捕获循环
                while (isCapturing || !isCapturing) {
                    kotlinx.coroutines.delay(100) // 10 FPS
                    
                    // 捕获实际屏幕数据
                    captureScreenFrame()
                    
                    Log.d(TAG, "捕获屏幕帧...")
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "屏幕捕获失败", e)
            }
        }
        
        isCapturing = true
    }
    
    /**
     * 停止屏幕捕获
     */
    private fun stopScreenCapture() {
        if (!isCapturing) return
        
        isCapturing = false
        virtualDisplay?.release()
        mediaProjection?.stop()
        imageReader?.close()
        
        Log.d(TAG, "屏幕捕获已停止")
    }
    
    /**
     * 捕获屏幕帧
     */
    private suspend fun captureScreenFrame() {
        try {
            val image = imageReader?.acquireLatestImage()
            if (image != null) {
                val planes = image.planes
                val buffer = planes[0].buffer
                val pixelStride = planes[0].pixelStride
                val rowStride = planes[0].rowStride
                val rowPadding = rowStride - pixelStride * screenWidth
                
                val bitmap = Bitmap.createBitmap(
                    screenWidth + rowPadding / pixelStride,
                    screenHeight, Bitmap.Config.ARGB_8888
                )
                bitmap.copyPixelsFromBuffer(buffer)
                
                val croppedBitmap = Bitmap.createBitmap(
                    bitmap,
                    0, 0,
                    screenWidth,
                    screenHeight
                )
                
                // 发送到Windows端
                val compressedData = compressBitmap(croppedBitmap)
                sendFrameToWindows(compressedData)
                
                image.close()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "捕获屏幕帧失败", e)
        }
    }
    
    /**
     * 压缩Bitmap
     */
    private fun compressBitmap(bitmap: Bitmap): ByteArray {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        return outputStream.toByteArray()
    }
    
    /**
     * 发送帧到Windows端
     */
    private suspend fun sendFrameToWindows(data: ByteArray) {

        try {

            // 获取网络通信实例并发送数据

            // 这里简化处理，实际中需要确保networkCommunication已经被初始化

            val networkComm = (application as? com.example.windowsandroidconnect.MyApplication)?.networkCommunication

            if (networkComm != null && networkComm.isConnected()) {

                networkComm.sendScreenFrame(data)

            } else {

                Log.w(TAG, "网络未连接，无法发送屏幕帧")

            }

        } catch (e: Exception) {

            Log.e(TAG, "发送帧到Windows端失败", e)

        }

    }
    
    companion object {
        private const val TAG = "ScreenCaptureService"
        private const val CHANNEL_ID = "screen_capture_channel"
        private const val NOTIFICATION_ID = 1001
    }
}