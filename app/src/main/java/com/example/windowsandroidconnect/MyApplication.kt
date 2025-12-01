package com.example.windowsandroidconnect

import android.app.Application
import android.content.Context
import com.example.utils.LogUtils
import com.example.windowsandroidconnect.connection.*
import com.example.windowsandroidconnect.network.NetworkCommunication

/**
 * 自定义Application类
 * 用于管理全局的网络通信实例
 */
class MyApplication : Application() {
    
    companion object {
        lateinit var instance: MyApplication
            private set
        
        // 提供全局Context访问
        fun applicationContext(): Context = instance.applicationContext
    }
    
    lateinit var networkCommunication: NetworkCommunication
        private set
    
    lateinit var connectionManager: ConnectionManager
        private set
    
    override fun onCreate() {
        super.onCreate()
        
        // 初始化instance
        instance = this
        
        // 初始化日志工具
        LogUtils.init()
        
        // 初始化连接管理器
        connectionManager = ConnectionManager()
        
        // 注册连接策略
        registerConnectionStrategies()
        
        // 初始化网络通信模块
        networkCommunication = NetworkCommunication()
    }
    
    /**
     * 注册所有支持的连接策略
     */
    private fun registerConnectionStrategies() {
        // 使用工厂模式注册连接策略，延迟创建实例
        connectionManager.registerStrategyFactory("websocket") { WebSocketConnectionStrategy() }
        connectionManager.registerStrategyFactory("tcp") { TcpConnectionStrategy() }
        connectionManager.registerStrategyFactory("kcp") { KcpConnectionStrategy() }
        connectionManager.registerStrategyFactory("udp") { UdpConnectionStrategy() }
        connectionManager.registerStrategyFactory("http") { HttpConnectionStrategy() }
        connectionManager.registerStrategyFactory("bluetooth") { BluetoothConnectionStrategy(this) }
        
        // 选择默认连接策略
        connectionManager.selectStrategy("websocket")
    }
    
    override fun onTerminate() {
        super.onTerminate()
        
        // 销毁网络通信模块
        networkCommunication.destroy()
        
        // 清理连接管理器资源
        connectionManager.cleanup()
    }
}