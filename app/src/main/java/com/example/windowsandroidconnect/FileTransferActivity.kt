package com.example.windowsandroidconnect

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.windowsandroidconnect.service.FileTransferService
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

/**
 * 文件传输Activity
 * 
 * 用于处理Android设备与Windows设备之间的文件传输
 */
class FileTransferActivity : Activity() {

    companion object {
        private const val TAG = "FileTransferActivity"
        private const val REQUEST_CODE_PICK_FILE = 1001
    }

    private lateinit var deviceInfo: DeviceInfo
    private lateinit var fileSelectButton: Button
    private lateinit var startTransferButton: Button
    private lateinit var selectedFileText: TextView
    private lateinit var progressText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var fileListRecycler: RecyclerView
    private lateinit var fileAdapter: FileTransferAdapter
    
    private var selectedFileUri: Uri? = null
    private var selectedFileName: String = ""
    private var selectedFileSize: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 设置布局
        setContentView(R.layout.activity_file_transfer)
        
        // 获取传递的设备信息
        val deviceInfoParcelable = intent.getParcelableExtra<DeviceInfo>("device_info")
        
        if (deviceInfoParcelable != null) {
            deviceInfo = deviceInfoParcelable
            initializeUI()
        } else {
            Toast.makeText(this, "设备信息缺失", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    /**
     * 初始化UI组件
     */
    private fun initializeUI() {
        // 初始化视图组件
        fileSelectButton = findViewById(R.id.file_select_button)
        startTransferButton = findViewById(R.id.start_transfer_button)
        selectedFileText = findViewById(R.id.selected_file_text)
        progressText = findViewById(R.id.progress_text)
        progressBar = findViewById(R.id.progress_bar)
        fileListRecycler = findViewById(R.id.file_list_recycler)
        
        // 设置文件选择按钮点击事件
        fileSelectButton.setOnClickListener {
            selectFile()
        }
        
        // 设置开始传输按钮点击事件
        startTransferButton.setOnClickListener {
            startFileTransfer()
        }
        
        // 配置进度条
        progressBar.max = 100
        progressBar.visibility = View.GONE
        progressText.visibility = View.GONE
        
        // 设置RecyclerView
        fileAdapter = FileTransferAdapter(mutableListOf())
        fileListRecycler.layoutManager = LinearLayoutManager(this)
        fileListRecycler.adapter = fileAdapter
        
        // 显示目标设备信息
        val deviceInfoText = findViewById<TextView>(R.id.device_info_text)
        deviceInfoText.text = "目标设备: ${deviceInfo.deviceName}"
    }

    /**
     * 选择文件
     */
    private fun selectFile() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*" // 允许选择所有类型的文件
        }
        startActivityForResult(intent, REQUEST_CODE_PICK_FILE)
    }

    /**
     * 启动文件传输
     */
    private fun startFileTransfer() {
        if (selectedFileUri == null) {
            Toast.makeText(this, "请选择要传输的文件", Toast.LENGTH_SHORT).show()
            return
        }
        
        // 获取文件路径
        val filePath = getRealPathFromURI(selectedFileUri!!)
        if (filePath == null) {
            Toast.makeText(this, "无法获取文件路径", Toast.LENGTH_SHORT).show()
            return
        }
        
        val file = File(filePath)
        if (!file.exists()) {
            Toast.makeText(this, "文件不存在", Toast.LENGTH_SHORT).show()
            return
        }
        
        // 生成传输ID
        val transferId = "transfer_${System.currentTimeMillis()}"
        
        // 启动文件传输服务
        val intent = Intent(this, FileTransferService::class.java).apply {
            action = FileTransferService.ACTION_START_TRANSFER
            putExtra(FileTransferService.EXTRA_FILE_PATH, file.absolutePath)
            putExtra(FileTransferService.EXTRA_TARGET_DEVICE_ID, deviceInfo.deviceId)
            putExtra(FileTransferService.EXTRA_TRANSFER_ID, transferId)
        }
        
        startService(intent)
        
        Toast.makeText(this, "开始传输文件: $selectedFileName", Toast.LENGTH_SHORT).show()
        
        // 更新UI状态
        startTransferButton.isEnabled = false
        fileSelectButton.isEnabled = false
        progressBar.visibility = View.VISIBLE
        progressText.visibility = View.VISIBLE
        
        // 添加到传输列表
        val transferItem = TransferItem(
            transferId,
            selectedFileName,
            selectedFileSize,
            "传输中...",
            0
        )
        fileAdapter.addItem(transferItem)
        
        // 模拟进度更新（实际的进度更新应由服务通过广播提供）
        simulateProgress(transferItem)
    }

    /**
     * 模拟进度更新（实际应用中应通过服务回调获取真实进度）
     */
    private fun simulateProgress(transferItem: TransferItem) {
        // 注意：在实际应用中，应该通过广播接收器获取真实进度
        // 这里仅用于演示UI效果
        transferItem.status = "正在传输"
        transferItem.progress = 50 // 示例进度
        fileAdapter.notifyDataSetChanged()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == REQUEST_CODE_PICK_FILE && resultCode == RESULT_OK) {
            data?.data?.let { uri ->
                selectedFileUri = uri
                selectedFileName = getFileNameFromUri(uri)
                selectedFileSize = getFileSizeFromUri(uri)
                
                selectedFileText.text = "已选择: $selectedFileName (${formatFileSize(selectedFileSize)})"
                startTransferButton.isEnabled = true
                
                Toast.makeText(this, "文件选择成功: $selectedFileName", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * 从URI获取真实文件路径
     */
    private fun getRealPathFromURI(uri: Uri): String? {
        var filePath: String? = null
        val projection = arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)
        
        contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                
                val fileName = if (nameIndex != -1) cursor.getString(nameIndex) else ""
                val fileSize = if (sizeIndex != -1) cursor.getLong(sizeIndex) else 0
                
                // 为了获取文件路径，我们可能需要将文件复制到临时位置
                val tempFile = File(cacheDir, fileName)
                copyFileFromUri(uri, tempFile)
                filePath = tempFile.absolutePath
            }
        }
        
        return filePath
    }

    /**
     * 从URI获取文件名
     */
    private fun getFileNameFromUri(uri: Uri): String {
        var fileName = "未知文件"
        
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex != -1) {
                    fileName = cursor.getString(nameIndex) ?: "未知文件"
                }
            }
        }
        
        return fileName
    }

    /**
     * 从URI获取文件大小
     */
    private fun getFileSizeFromUri(uri: Uri): Long {
        var fileSize = 0L
        
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (sizeIndex != -1) {
                    fileSize = cursor.getLong(sizeIndex)
                }
            }
        }
        
        return fileSize
    }

    /**
     * 从URI复制文件到本地
     */
    private fun copyFileFromUri(uri: Uri, destination: File) {
        contentResolver.openInputStream(uri)?.use { inputStream ->
            FileOutputStream(destination).use { outputStream ->
                inputStream.copyTo(outputStream)
            }
        }
    }

    /**
     * 格式化文件大小
     */
    private fun formatFileSize(sizeInBytes: Long): String {
        return when {
            sizeInBytes < 1024 -> "$sizeInBytes B"
            sizeInBytes < 1024 * 1024 -> "${String.format("%.2f", sizeInBytes / 1024.0)} KB"
            sizeInBytes < 1024 * 1024 * 1024 -> "${String.format("%.2f", sizeInBytes / (1024.0 * 1024))} MB"
            else -> "${String.format("%.2f", sizeInBytes / (1024.0 * 1024 * 1024))} GB"
        }
    }

    /**
     * 文件传输项目
     */
    inner class TransferItem(
        val id: String,
        val fileName: String,
        val fileSize: Long,
        var status: String,
        var progress: Int
    )
    
    /**
     * 文件传输适配器
     */
    inner class FileTransferAdapter(
        private val transferList: MutableList<TransferItem>
    ) : RecyclerView.Adapter<FileTransferAdapter.ViewHolder>() {
        
        fun addItem(item: TransferItem) {
            transferList.add(item)
            notifyItemInserted(transferList.size - 1)
        }
        
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val textView = TextView(parent.context).apply {
                layoutParams = RecyclerView.LayoutParams(
                    RecyclerView.LayoutParams.MATCH_PARENT,
                    RecyclerView.LayoutParams.WRAP_CONTENT
                )
                setPadding(32, 16, 32, 16)
            }
            return ViewHolder(textView)
        }
        
        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = transferList[position]
            holder.textView.text = "${item.fileName} (${formatFileSize(item.fileSize)}) - ${item.status} (${item.progress}%)"
        }
        
        override fun getItemCount(): Int = transferList.size
        
        inner class ViewHolder(val textView: TextView) : RecyclerView.ViewHolder(textView)
    }
}