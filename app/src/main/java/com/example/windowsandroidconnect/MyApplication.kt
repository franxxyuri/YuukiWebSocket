package com.example.windowsandroidconnect

import android.app.Application
import com.example.windowsandroidconnect.network.NetworkCommunication

/**
 * 自定义Application类
 * 用于管理全局的网络通信实例
 */
class MyApplication : Application() {
    
    lateinit var networkCommunication: NetworkCommunication
        private set
    
    override fun onCreate() {
        super.onCreate()
        
        // 初始化网络通信模块
        networkCommunication = NetworkCommunication()
    }
    
    override fun onTerminate() {
        super.onTerminate()
        
        // 销毁网络通信模块
        networkCommunication.destroy()
    }
}