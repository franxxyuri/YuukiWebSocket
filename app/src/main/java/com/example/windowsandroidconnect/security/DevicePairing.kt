package com.example.windowsandroidconnect.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * 设备配对管理器
 * 提供设备配对、认证和安全通信功能
 */
class DevicePairing(private val context: Context) {
    
    companion object {
        private const val TAG = "DevicePairing"
        private const val PREFS_NAME = "device_pairing"
        private const val KEY_PAIRED_DEVICES = "paired_devices"
        private const val KEY_DEVICE_KEY = "device_key"
        private const val PAIRING_CODE_LENGTH = 6
        private const val PAIRING_CODE_EXPIRY = 300000L // 5分钟
    }
    
    /**
     * 配对状态
     */
    enum class PairingStatus {
        NOT_PAIRED,     // 未配对
        PAIRING,        // 配对中
        PAIRED,         // 已配对
        REJECTED        // 被拒绝
    }
    
    /**
     * 已配对设备信息
     */
    data class PairedDevice(
        val deviceId: String,
        val deviceName: String,
        val platform: String,
        val pairingTime: Long,
        val lastConnectedTime: Long,
        val sharedSecret: String,
        val isTrusted: Boolean = true
    )
    
    /**
     * 配对请求
     */
    data class PairingRequest(
        val requestId: String,
        val deviceId: String,
        val deviceName: String,
        val platform: String,
        val pairingCode: String,
        val expiryTime: Long,
        val status: PairingStatus = PairingStatus.PAIRING
    )
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val pendingRequests = mutableMapOf<String, PairingRequest>()
    private var currentPairingCode: String? = null
    private var pairingCodeExpiry: Long = 0
    
    /**
     * 生成配对码
     */
    fun generatePairingCode(): String {
        val random = SecureRandom()
        val code = (0 until PAIRING_CODE_LENGTH)
            .map { random.nextInt(10) }
            .joinToString("")
        
        currentPairingCode = code
        pairingCodeExpiry = System.currentTimeMillis() + PAIRING_CODE_EXPIRY
        
        Log.d(TAG, "生成配对码: $code (有效期5分钟)")
        return code
    }
    
    /**
     * 验证配对码
     */
    fun verifyPairingCode(code: String): Boolean {
        if (currentPairingCode == null) {
            Log.w(TAG, "没有活动的配对码")
            return false
        }
        
        if (System.currentTimeMillis() > pairingCodeExpiry) {
            Log.w(TAG, "配对码已过期")
            currentPairingCode = null
            return false
        }
        
        val isValid = code == currentPairingCode
        if (isValid) {
            currentPairingCode = null // 使用后立即失效
        }
        
        Log.d(TAG, "配对码验证: ${if (isValid) "成功" else "失败"}")
        return isValid
    }
    
    /**
     * 创建配对请求
     */
    fun createPairingRequest(deviceId: String, deviceName: String, platform: String): PairingRequest {
        val requestId = generateRequestId()
        val pairingCode = generatePairingCode()
        
        val request = PairingRequest(
            requestId = requestId,
            deviceId = deviceId,
            deviceName = deviceName,
            platform = platform,
            pairingCode = pairingCode,
            expiryTime = pairingCodeExpiry
        )
        
        pendingRequests[requestId] = request
        Log.d(TAG, "创建配对请求: $requestId for $deviceName")
        return request
    }
    
    /**
     * 接受配对请求
     */
    fun acceptPairingRequest(requestId: String, pairingCode: String): Boolean {
        val request = pendingRequests[requestId] ?: run {
            Log.w(TAG, "配对请求不存在: $requestId")
            return false
        }
        
        if (!verifyPairingCode(pairingCode)) {
            Log.w(TAG, "配对码验证失败")
            return false
        }
        
        // 生成共享密钥
        val sharedSecret = generateSharedSecret()
        
        // 保存配对设备
        val pairedDevice = PairedDevice(
            deviceId = request.deviceId,
            deviceName = request.deviceName,
            platform = request.platform,
            pairingTime = System.currentTimeMillis(),
            lastConnectedTime = System.currentTimeMillis(),
            sharedSecret = sharedSecret
        )
        
        savePairedDevice(pairedDevice)
        pendingRequests.remove(requestId)
        
        Log.d(TAG, "配对成功: ${request.deviceName}")
        return true
    }
    
    /**
     * 拒绝配对请求
     */
    fun rejectPairingRequest(requestId: String) {
        pendingRequests.remove(requestId)
        Log.d(TAG, "配对请求已拒绝: $requestId")
    }
    
    /**
     * 检查设备是否已配对
     */
    fun isPaired(deviceId: String): Boolean {
        return getPairedDevice(deviceId) != null
    }
    
    /**
     * 获取已配对设备
     */
    fun getPairedDevice(deviceId: String): PairedDevice? {
        return getPairedDevices().find { it.deviceId == deviceId }
    }
    
    /**
     * 获取所有已配对设备
     */
    fun getPairedDevices(): List<PairedDevice> {
        return try {
            val json = prefs.getString(KEY_PAIRED_DEVICES, "[]") ?: "[]"
            val jsonArray = JSONArray(json)
            val devices = mutableListOf<PairedDevice>()
            
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                devices.add(parsePairedDevice(obj))
            }
            
            devices
        } catch (e: Exception) {
            Log.e(TAG, "读取已配对设备失败", e)
            emptyList()
        }
    }
    
    /**
     * 保存已配对设备
     */
    private fun savePairedDevice(device: PairedDevice) {
        val devices = getPairedDevices().toMutableList()
        
        // 移除已存在的相同设备
        devices.removeAll { it.deviceId == device.deviceId }
        devices.add(device)
        
        val jsonArray = JSONArray()
        devices.forEach { jsonArray.put(deviceToJson(it)) }
        
        prefs.edit().putString(KEY_PAIRED_DEVICES, jsonArray.toString()).apply()
        Log.d(TAG, "已保存配对设备: ${device.deviceName}")
    }
    
    /**
     * 更新设备最后连接时间
     */
    fun updateLastConnectedTime(deviceId: String) {
        val device = getPairedDevice(deviceId) ?: return
        val updatedDevice = device.copy(lastConnectedTime = System.currentTimeMillis())
        savePairedDevice(updatedDevice)
    }
    
    /**
     * 取消配对
     */
    fun unpairDevice(deviceId: String): Boolean {
        val devices = getPairedDevices().toMutableList()
        val removed = devices.removeAll { it.deviceId == deviceId }
        
        if (removed) {
            val jsonArray = JSONArray()
            devices.forEach { jsonArray.put(deviceToJson(it)) }
            prefs.edit().putString(KEY_PAIRED_DEVICES, jsonArray.toString()).apply()
            Log.d(TAG, "已取消配对: $deviceId")
        }
        
        return removed
    }
    
    /**
     * 设置设备信任状态
     */
    fun setDeviceTrusted(deviceId: String, trusted: Boolean) {
        val device = getPairedDevice(deviceId) ?: return
        val updatedDevice = device.copy(isTrusted = trusted)
        savePairedDevice(updatedDevice)
        Log.d(TAG, "设备信任状态已更新: $deviceId -> $trusted")
    }
    
    /**
     * 加密消息
     */
    fun encryptMessage(deviceId: String, message: String): String? {
        val device = getPairedDevice(deviceId) ?: run {
            Log.w(TAG, "设备未配对，无法加密: $deviceId")
            return null
        }
        
        return try {
            val secretKey = decodeSecretKey(device.sharedSecret)
            val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
            val iv = ByteArray(16)
            SecureRandom().nextBytes(iv)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, IvParameterSpec(iv))
            
            val encrypted = cipher.doFinal(message.toByteArray(Charsets.UTF_8))
            val combined = iv + encrypted
            
            Base64.encodeToString(combined, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "加密失败", e)
            null
        }
    }
    
    /**
     * 解密消息
     */
    fun decryptMessage(deviceId: String, encryptedMessage: String): String? {
        val device = getPairedDevice(deviceId) ?: run {
            Log.w(TAG, "设备未配对，无法解密: $deviceId")
            return null
        }
        
        return try {
            val combined = Base64.decode(encryptedMessage, Base64.NO_WRAP)
            val iv = combined.copyOfRange(0, 16)
            val encrypted = combined.copyOfRange(16, combined.size)
            
            val secretKey = decodeSecretKey(device.sharedSecret)
            val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
            cipher.init(Cipher.DECRYPT_MODE, secretKey, IvParameterSpec(iv))
            
            String(cipher.doFinal(encrypted), Charsets.UTF_8)
        } catch (e: Exception) {
            Log.e(TAG, "解密失败", e)
            null
        }
    }
    
    /**
     * 生成认证令牌
     */
    fun generateAuthToken(deviceId: String): String? {
        val device = getPairedDevice(deviceId) ?: return null
        
        val timestamp = System.currentTimeMillis()
        val data = "$deviceId:$timestamp:${device.sharedSecret}"
        
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(data.toByteArray(Charsets.UTF_8))
            "$timestamp:${Base64.encodeToString(hash, Base64.NO_WRAP)}"
        } catch (e: Exception) {
            Log.e(TAG, "生成认证令牌失败", e)
            null
        }
    }
    
    /**
     * 验证认证令牌
     */
    fun verifyAuthToken(deviceId: String, token: String, maxAge: Long = 300000): Boolean {
        val device = getPairedDevice(deviceId) ?: return false
        
        return try {
            val parts = token.split(":")
            if (parts.size != 2) return false
            
            val timestamp = parts[0].toLong()
            val receivedHash = parts[1]
            
            // 检查时间戳是否过期
            if (System.currentTimeMillis() - timestamp > maxAge) {
                Log.w(TAG, "认证令牌已过期")
                return false
            }
            
            // 重新计算哈希
            val data = "$deviceId:$timestamp:${device.sharedSecret}"
            val digest = MessageDigest.getInstance("SHA-256")
            val expectedHash = Base64.encodeToString(
                digest.digest(data.toByteArray(Charsets.UTF_8)),
                Base64.NO_WRAP
            )
            
            receivedHash == expectedHash
        } catch (e: Exception) {
            Log.e(TAG, "验证认证令牌失败", e)
            false
        }
    }
    
    /**
     * 生成共享密钥
     */
    private fun generateSharedSecret(): String {
        val keyGenerator = KeyGenerator.getInstance("AES")
        keyGenerator.init(256, SecureRandom())
        val secretKey = keyGenerator.generateKey()
        return Base64.encodeToString(secretKey.encoded, Base64.NO_WRAP)
    }
    
    /**
     * 解码密钥
     */
    private fun decodeSecretKey(encodedKey: String): SecretKey {
        val keyBytes = Base64.decode(encodedKey, Base64.NO_WRAP)
        return SecretKeySpec(keyBytes, "AES")
    }
    
    /**
     * 生成请求ID
     */
    private fun generateRequestId(): String {
        return "pairing_${System.currentTimeMillis()}_${java.util.UUID.randomUUID().toString().take(8)}"
    }
    
    /**
     * 设备转JSON
     */
    private fun deviceToJson(device: PairedDevice): JSONObject {
        return JSONObject().apply {
            put("deviceId", device.deviceId)
            put("deviceName", device.deviceName)
            put("platform", device.platform)
            put("pairingTime", device.pairingTime)
            put("lastConnectedTime", device.lastConnectedTime)
            put("sharedSecret", device.sharedSecret)
            put("isTrusted", device.isTrusted)
        }
    }
    
    /**
     * 解析配对设备
     */
    private fun parsePairedDevice(json: JSONObject): PairedDevice {
        return PairedDevice(
            deviceId = json.getString("deviceId"),
            deviceName = json.getString("deviceName"),
            platform = json.optString("platform", "unknown"),
            pairingTime = json.getLong("pairingTime"),
            lastConnectedTime = json.getLong("lastConnectedTime"),
            sharedSecret = json.getString("sharedSecret"),
            isTrusted = json.optBoolean("isTrusted", true)
        )
    }
    
    /**
     * 清除所有配对数据
     */
    fun clearAllPairings() {
        prefs.edit().clear().apply()
        pendingRequests.clear()
        currentPairingCode = null
        Log.d(TAG, "所有配对数据已清除")
    }
}
