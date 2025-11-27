# Windows-Android Connect 技术文档

## 通信协议

### 概述
- **协议**: WebSocket (ws://)
- **端口**: 8928 (由服务端配置决定)
- **消息格式**: JSON字符串
- **消息分隔符**: 换行符(\n) (对于TCP连接)

## 消息类型定义

### 1. 设备管理

#### device_info
客户端发送设备信息
```json
{
  "type": "device_info",
  "deviceInfo": {
    "deviceId": "string",
    "deviceName": "string",
    "platform": "android",
    "version": "string",
    "capabilities": ["file_transfer", "screen_mirror", "remote_control", "notification", "clipboard_sync"]
  }
}
```

#### device_found
服务端广播发现的新设备
```json
{
  "type": "device_found",
  "device": {
    "deviceId": "string",
    "deviceName": "string",
    "platform": "string",
    "ip": "string",
    "port": "number",
    "lastSeen": "number"
  }
}
```

#### device_connected
设备连接成功通知
```json
{
  "type": "device_connected",
  "deviceInfo": {
    "deviceId": "string",
    "deviceName": "string",
    "platform": "string"
  },
  "clientId": "string"
}
```

### 2. 屏幕投屏

#### screen_frame
客户端发送屏幕帧数据
```json
{
  "type": "screen_frame",
  "frameData": "base64_encoded_image_data",
  "timestamp": "number",
  "width": "number",
  "height": "number",
  "format": "jpeg|png"
}
```

#### start_streaming
Web端请求开始屏幕投屏
```json
{
  "type": "control_command",
  "commandType": "start_streaming",
  "deviceInfo": {
    "deviceId": "string"
  }
}
```

#### stop_streaming
Web端请求停止屏幕投屏
```json
{
  "type": "control_command",
  "commandType": "stop_streaming",
  "deviceInfo": {
    "deviceId": "string"
  }
}
```

### 3. 文件传输

#### file_transfer
文件传输相关消息
```json
{
  "type": "file_transfer",
  "action": "send|receive|progress|complete|error",
  "transferId": "string",
  "fileName": "string",
  "fileSize": "number",
  "filePath": "string",
  "targetDeviceId": "string",
  "progress": "number",
  "data": "base64_file_data",
  "error": "string"
}
```

### 4. 远程控制

#### control_command
控制命令消息
```json
{
  "type": "control_command",
  "commandType": "enable_control|send_event",
  "deviceInfo": {
    "deviceId": "string"
  },
  "eventType": "touch|key|mouse",
  "eventData": {
    "x": "number",
    "y": "number",
    "action": "down|up|move",
    "keyCode": "number",
    "keyName": "string"
  }
}
```

#### control_response
控制命令响应
```json
{
  "type": "control_response",
  "success": "boolean",
  "message": "string",
  "data": "object"
}
```

### 5. 剪贴板同步

#### clipboard
剪贴板同步消息
```json
{
  "type": "clipboard",
  "data": "string",
  "dataType": "text|image|file",
  "sourceClientId": "string",
  "timestamp": "number"
}
```

### 6. 通知同步

#### notification
通知消息
```json
{
  "type": "notification",
  "title": "string",
  "content": "string",
  "packageName": "string",
  "icon": "base64_icon_data",
  "actions": [
    {
      "id": "string",
      "title": "string"
    }
  ],
  "sourceClientId": "string"
}
```

### 7. 心跳检测

#### heartbeat
心跳消息
```json
{
  "type": "heartbeat",
  "timestamp": "number"
}
```

## 错误处理

### 错误消息格式
```json
{
  "type": "error",
  "code": "number",
  "message": "string",
  "details": "object"
}
```

### 常见错误码
- 1001: 连接被拒绝
- 1002: 认证失败
- 1003: 设备不支持该功能
- 1004: 参数错误
- 1005: 内部服务器错误

## 连接建立流程

### 1. Android客户端连接
1. 客户端使用WebSocket连接到 `ws://<Windows_IP>:8928`
2. 连接建立后，客户端发送设备信息消息
3. 服务端确认连接并分配客户端ID

### 2. 设备信息注册
客户端连接成功后，立即发送设备信息：
```json
{
  "type": "device_info",
  "deviceInfo": {
    "deviceId": "android-device-uuid",
    "deviceName": "设备型号",
    "platform": "android",
    "version": "1.0.0",
    "capabilities": ["file_transfer", "screen_mirror", "remote_control", "notification", "clipboard_sync"]
  }
}
```

## 安全考虑

1. **连接验证**: 客户端连接时需要发送有效的设备信息
2. **消息验证**: 服务端验证所有接收到的消息格式
3. **权限控制**: 根据设备类型限制可用的功能
4. **数据加密**: 敏感数据传输时应进行加密处理

## 性能优化

1. **消息压缩**: 大数据消息使用压缩算法
2. **帧率控制**: 屏幕投屏根据网络状况调整帧率
3. **断点续传**: 大文件传输支持断点续传
4. **连接池**: 服务端维护连接池提高并发性能

## 连接诊断指南

### 常见连接问题及解决方案

#### 问题1：端口被占用
**症状**：启动失败，提示端口已被使用
**解决方案**：
1. 使用 `scripts\stop-services.bat` 停止所有服务
2. 检查端口占用：`netstat -an | findstr ":8928"`
3. 修改端口配置：编辑 `backend/config/config.mjs`

#### 问题2：Android设备无法连接
**症状**：Android客户端显示连接超时
**解决方案**：
1. 确认设备在同一局域网
2. 检查防火墙设置
3. 验证IP地址和端口配置(8928)
4. 使用 `scripts\check-environment.bat` 检查环境

#### 问题3：WebSocket连接断开
**症状**：连接频繁断开
**解决方案**：
1. 检查网络稳定性
2. 增加心跳间隔
3. 实现自动重连机制

#### 问题4：设备发现失败
**症状**：无法自动发现设备
**解决方案**：
1. 确认UDP端口8190开放
2. 检查网络广播权限
3. 手动输入IP地址连接