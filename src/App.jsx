import React, { useState, useEffect } from 'react'
import './App.css'
import websocketService from './services/websocket-service.js'

function App() {
  const [connectedDevices, setConnectedDevices] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('未连接')

  // 连接到WebSocket服务器

  const connectToServer = async () => {

    try {

      setConnectionStatus('正在连接...')

      // 使用 Vite 代理路径，将通过 ws://localhost:8080/ws 代理到 ws://localhost:8828

      await websocketService.connect('ws://localhost:8080/ws')

      setIsConnected(true)

      setConnectionStatus('已连接到服务器')

      

      // 开始设备发现

      const devices = await websocketService.startDeviceDiscovery()

      setConnectedDevices(devices)

      

      console.log('✅ 连接成功')

    } catch (error) {

      console.error('❌ 连接失败:', error)

      setConnectionStatus(`连接失败: ${error.message}`)

    }

  }

  // 断开连接
  const disconnectFromServer = async () => {
    try {
      await websocketService.stopDeviceDiscovery()
      websocketService.disconnect()
      setIsConnected(false)
      setConnectionStatus('未连接')
      setConnectedDevices([])
      console.log('🔌 已断开连接')
    } catch (error) {
      console.error('断开连接时出错:', error)
    }
  }

  // 文件传输功能
  const handleFileTransfer = () => {
    // 这里可以打开文件选择器并调用websocketService.sendFile
    alert('文件传输功能将在完整版本中实现')
  }

  // 屏幕投屏功能
  const handleScreenMirror = async () => {
    if (connectedDevices.length > 0) {
      try {
        const device = connectedDevices[0] // 使用第一个连接的设备
        await websocketService.startScreenStreaming(device)
        console.log('开始屏幕投屏:', device.name)
      } catch (error) {
        console.error('开始屏幕投屏失败:', error)
        alert('屏幕投屏失败: ' + error.message)
      }
    } else {
      alert('请先连接到设备')
    }
  }

  // 远程控制功能
  const handleRemoteControl = async () => {
    if (connectedDevices.length > 0) {
      try {
        const device = connectedDevices[0] // 使用第一个连接的设备
        await websocketService.enableRemoteControl(device)
        console.log('启用远程控制:', device.name)
      } catch (error) {
        console.error('启用远程控制失败:', error)
        alert('远程控制失败: ' + error.message)
      }
    } else {
      alert('请先连接到设备')
    }
  }

  // 在组件挂载时设置WebSocket事件监听
  useEffect(() => {
    // 监听设备发现事件
    websocketService.on('device_discovered', (deviceInfo) => {
      setConnectedDevices(prev => {
        // 检查是否已存在该设备
        const exists = prev.find(device => device.id === deviceInfo.id)
        if (!exists) {
          return [...prev, deviceInfo]
        }
        return prev
      })
    })

    // 监听设备状态更新
    websocketService.on('device_status_update', (statusInfo) => {
      setConnectedDevices(prev => 
        prev.map(device => 
          device.id === statusInfo.id 
            ? { ...device, status: statusInfo.status }
            : device
        )
      )
    })

    // 监听连接状态变化
    const checkConnection = () => {
      const status = websocketService.getConnectionStatus()
      if (!status.isConnected && isConnected) {
        setIsConnected(false)
        setConnectionStatus('连接已断开')
        setConnectedDevices([])
      }
    }

    // 定期检查连接状态
    const interval = setInterval(checkConnection, 1000)

    // 清理函数
    return () => {
      clearInterval(interval)
      websocketService.disconnect()
    }
  }, [isConnected])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Windows-Android Connect</h1>
        <p>跨平台设备互联解决方案</p>
      </header>

      <main className="app-main">
        <section className="connection-section">
          <h2>连接状态</h2>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{connectionStatus}</span>
          </div>
          
          {!isConnected ? (
            <button className="connect-btn" onClick={connectToServer}>
              搜索并连接设备
            </button>
          ) : (
            <button className="disconnect-btn" onClick={disconnectFromServer}>
              断开连接
            </button>
          )}
        </section>

        {isConnected && (
          <section className="features-section">
            <h2>已连接设备</h2>
            <div className="devices-list">
              {connectedDevices.map(device => (
                <div key={device.id} className="device-card">
                  <h3>{device.name || device.id}</h3>
                  <p>类型: {device.type || 'Android'}</p>
                  <p>状态: {device.status || '已连接'}</p>
                </div>
              ))}
            </div>

            <h2>功能选项</h2>
            <div className="features-grid">
              <div className="feature-card" onClick={handleFileTransfer}>
                <div className="feature-icon">📁</div>
                <h3>文件传输</h3>
                <p>在设备间传输文件</p>
              </div>
              <div className="feature-card" onClick={handleScreenMirror}>
                <div className="feature-icon">📱</div>
                <h3>屏幕镜像</h3>
                <p>查看和控制Android屏幕</p>
              </div>
              <div className="feature-card" onClick={handleRemoteControl}>
                <div className="feature-icon">🎮</div>
                <h3>远程控制</h3>
                <p>用电脑控制Android设备</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📋</div>
                <h3>剪贴板同步</h3>
                <p>双向剪贴板同步</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔔</div>
                <h3>通知同步</h3>
                <p>接收Android通知</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>安全连接</h3>
                <p>端到端加密</p>
              </div>
            </div>
          </section>
        )}

        <section className="info-section">
          <h2>应用信息</h2>
          <div className="info-grid">
            <div className="info-card">

              <h3>服务端状态</h3>

              <p>端口: 8828</p>

              <p>状态: {connectionStatus}</p>

            </div>
            <div className="info-card">
              <h3>应用版本</h3>
              <p>1.0.0</p>
              <p>Vite + React 版本</p>
            </div>
            <div className="info-card">
              <h3>连接协议</h3>
              <p>WebSocket</p>
              <p>局域网连接</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App