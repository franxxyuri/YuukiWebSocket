# Windows-Android Connect 协议规范文档

## 1. 概述

本文档详细描述了 Windows Android Connect 应用中设计与客户端交互采用的协议字段、消息格式和通信流程，以便后续评估和维护。

## 2. 架构设计

### 2.1 连接管理架构

系统采用策略模式实现多种连接方式，核心组件包括：

- **ConnectionManager**：统一的连接管理入口，负责管理不同的连接策略
- **WebSocketStrategy**：基于WebSocket的实际连接实现
- **MockConnectionStrategy**：用于开发环境的模拟连接实现
- **ConfigManager**：负责配置管理和持久化

### 2.2 连接模式

系统支持两种主要的连接模式：

- **WebSocket模式**：与真实服务器建立WebSocket连接
- **模拟模式**：提供模拟数据和响应，用于开发测试

连接模式可通过配置或用户界面手动切换，优先尊重用户选择。

## 3. WebSocket 连接规范

### 3.1 连接URL格式

```plaintext
ws://[服务器IP]:[端口]/ws
```

默认开发服务器地址：`ws://localhost:8781/ws`

### 3.2 重连机制

- 最大重连次数：默认5次
- 重连延迟：默认1000ms
- 自动重连：默认启用
- 消息超时：默认5000ms


## 4. 消息格式规范

所有通信消息均采用JSON格式，基本结构如下：

```json
{
  "type": "消息类型",
  "requestId": "请求ID（可选）",
  "[其他特定字段]": "字段值"
}
```

### 4.1 设备信息消息

**客户端发送设备信息：**

```json
{
  "type": "device_info",
  "deviceInfo": {
    "deviceId": "设备唯一标识",
    "deviceName": "设备名称",
    "platform": "平台(web/android)",
    "version": "版本号",
    "ip": "IP地址",
    "capabilities": ["功能列表"]
  }
}
```

### 4.2 连接确认消息

**服务器响应连接确认：**

```json
{
  "type": "connection_established",
  "clientId": "客户端ID",
  "serverTime": "服务器时间戳"
}
```

### 4.3 设备发现相关消息

**开始设备发现命令：**

```json
{
  "type": "start_device_discovery"
}
```

**停止设备发现命令：**

```json
{
  "type": "stop_device_discovery"
}
```

**获取设备列表请求：**

```json
{
  "type": "get_discovered_devices"
}
```

**设备发现事件通知：**

```json
{
  "type": "device_found",
  "device": {
    "id": "设备ID",
    "name": "设备名称",
    "model": "设备型号",
    "ip": "IP地址",
    "status": "设备状态",
    "lastSeen": "最后在线时间"
  }
}
```

### 4.4 文件传输相关消息

**发送文件请求：**

```json
{
  "type": "file_transfer",
  "action": "send",
  "filePath": "文件路径",
  "targetDeviceId": "目标设备ID",
  "options": {}
}
```

**接收文件请求：**

```json
{
  "type": "file_transfer",
  "action": "receive",
  "transferInfo": "传输信息",
  "savePath": "保存路径"
}
```

**文件传输进度通知：**

```json
{
  "type": "file_transfer",
  "action": "progress",
  "transferId": "传输ID",
  "progress": 50,
  "status": "in_progress"
}
```

**文件传输完成通知：**

```json
{
  "type": "file_transfer",
  "action": "complete",
  "transferId": "传输ID",
  "status": "completed"
}
```

**文件传输错误通知：**

```json
{
  "type": "file_transfer",
  "action": "error",
  "transferId": "传输ID",
  "error": "错误信息",
  "status": "error"
}
```

### 4.5 屏幕投屏相关消息

**屏幕帧数据：**

```json
{
  "type": "screen_frame",
  "frameId": 1,
  "timestamp": "时间戳",
  "width": 1280,
  "height": 720,
  "format": "jpeg",
  "data": "帧数据",
  "fps": 15,
  "quality": 0.8
}
```

### 4.6 远程控制相关消息

**控制命令：**

```json
{
  "type": "control_command",
  "commandType": "类型(touch/move/key/text)",
  "startX": 100,  // 触摸起始X坐标
  "startY": 100,  // 触摸起始Y坐标
  "endX": 200,    // 触摸结束X坐标
  "endY": 200,    // 触摸结束Y坐标
  "keyCode": 65,  // 键码(A键)
  "key": "a",     // 按键字符
  "text": "文本内容",
  "deviceId": "设备ID"
}
```

**控制命令响应：**

```json
{
  "type": "control_command_response",
  "success": true,
  "message": "响应消息"
}
```

## 5. API接口规范

### 5.1 连接管理API

#### `ConnectionManager.initialize(config)`

初始化连接管理器

- **参数**: `config` - 配置对象
- **返回值**: 连接管理器实例（支持链式调用）

#### `ConnectionManager.connect(serverUrl)`

连接到服务器

- **参数**: `serverUrl` - 服务器URL
- **返回值**: Promise对象

#### `ConnectionManager.disconnect()`

断开连接

- **返回值**: 无

#### `ConnectionManager.switchStrategy(strategyType)`

切换连接策略

- **参数**: `strategyType` - 策略类型('websocket' | 'mock')
- **返回值**: Promise对象

#### `ConnectionManager.getCurrentStrategyType()`

获取当前策略类型

- **返回值**: 策略类型字符串

#### `ConnectionManager.isConnected()`

检查是否已连接

- **返回值**: 布尔值

### 5.2 设备发现API

#### `ConnectionManager.startDeviceDiscovery()`

开始设备发现

- **返回值**: Promise对象，解析为设备列表

#### `ConnectionManager.stopDeviceDiscovery()`

停止设备发现

- **返回值**: Promise对象

#### `ConnectionManager.getDiscoveredDevices()`

获取已发现的设备

- **返回值**: Promise对象，解析为设备列表

### 5.3 文件传输API

#### `ConnectionManager.sendFile(filePath, targetDeviceId, options)`

发送文件

- **参数**:
  - `filePath`: 文件路径
  - `targetDeviceId`: 目标设备ID
  - `options`: 传输选项
- **返回值**: Promise对象

#### `ConnectionManager.receiveFile(transferInfo, savePath)`

接收文件

- **参数**:
  - `transferInfo`: 传输信息
  - `savePath`: 保存路径
- **返回值**: Promise对象

### 5.4 屏幕投屏API

#### `ConnectionManager.startScreenStreaming(deviceInfo, options)`

开始屏幕投屏

- **参数**:
  - `deviceInfo`: 设备信息或设备ID
  - `options`: 投屏选项
- **返回值**: Promise对象

#### `ConnectionManager.stopScreenStreaming(deviceInfo)`

停止屏幕投屏

- **参数**: `deviceInfo` - 设备信息或设备ID
- **返回值**: Promise对象

### 5.5 远程控制API

#### `ConnectionManager.enableRemoteControl(deviceInfo)`

启用远程控制

- **参数**: `deviceInfo` - 设备信息或设备ID
- **返回值**: Promise对象

#### `ConnectionManager.disableRemoteControl(deviceId)`

禁用远程控制

- **参数**: `deviceId` - 设备ID
- **返回值**: Promise对象

#### `ConnectionManager.sendControlEvent(eventType, eventData)`

发送控制事件

- **参数**:
  - `eventType`: 事件类型
  - `eventData`: 事件数据
- **返回值**: Promise对象

## 6. 事件系统规范

### 6.1 事件注册机制

```javascript
connectionManager.on('event_name', handlerFunction);
connectionManager.off('event_name', handlerFunction);
```

### 6.2 主要事件类型

#### 连接相关事件

- `connect`: 连接成功
- `disconnect`: 连接断开
- `connection_lost`: 连接丢失

#### 设备相关事件

- `device_discovered`: 发现新设备
- `device_status_update`: 设备状态更新

#### 屏幕投屏事件

- `screen_stream_data`: 接收到屏幕流数据

#### 文件传输事件

- `file_transfer_progress`: 文件传输进度更新
- `file_transfer_completed`: 文件传输完成
- `file_transfer_error`: 文件传输错误

#### 控制相关事件

- `control_response`: 控制命令响应

## 7. 模拟数据规范

### 7.1 模拟设备数据结构

```javascript
{
  id: 'device-id',
  name: '设备名称',
  platform: '平台(android)',
  model: '设备型号',
  version: '系统版本',
  ip: 'IP地址',
  port: 8928,
  status: '在线状态',
  lastSeen: '最后在线时间戳'
}
```

### 7.2 模拟文件传输数据

```javascript
{
  id: 'transfer-id',
  type: 'send/receive',
  deviceId: '设备ID',
  filePath: '文件路径',
  status: 'completed',
  progress: 100,
  startTime: '开始时间戳',
  endTime: '结束时间戳'
}
```

### 7.3 模拟屏幕帧数据

```javascript
{
  frameId: 1,
  timestamp: '时间戳',
  width: 1280,
  height: 720,
  format: 'jpeg',
  data: '帧数据',
  fps: 15,
  quality: 0.8
}
```

## 8. 配置参数规范

### 8.1 默认配置

```javascript
{
  connectionType: 'websocket', // 默认连接类型
  serverUrl: 'ws://localhost:8781/ws', // 默认服务器地址
  useMock: false, // 是否使用模拟连接
  mockMode: false // 模拟模式开关
}
```

### 8.2 URL参数配置

支持通过URL参数覆盖默认配置：

- `useMock=true`: 使用模拟连接
- `mock=true`: 启用模拟模式

## 9. 安全考虑

- 所有消息应进行适当验证，防止注入攻击
- 文件路径应进行安全检查，防止路径遍历攻击
- 敏感操作应有权限控制
- WebSocket连接应考虑证书验证和加密通信


## 10. 兼容性说明

- 支持的设备平台：Android、Web客户端
- 最低Android系统版本：推荐Android 8.0+
- 浏览器支持：Chrome 70+, Firefox 63+, Safari 12+, Edge 79+

---

*本文档基于当前代码实现生成，如有更新请同步更新此文档。*
