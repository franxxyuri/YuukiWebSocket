# Windows-Android Connect 端口配置说明

## 默认端口分配

- **WebSocket主服务**: 8928
  - 用于Android设备与Windows PC之间的主要通信
  - WebSocket连接端点: ws://localhost:8928/ws

- **Vite前端服务**: 8781
  - 用于Web界面访问
  - 提供设备管理、屏幕投屏等前端功能

- **UDP设备发现**: 8190
  - 用于局域网内的设备自动发现
  - 使用UDP广播协议

- **调试服务器**: 8181
  - 用于开发和调试目的

## 环境变量配置

可以通过环境变量自定义端口：

```bash
# 设置主服务端口
export SERVER_PORT=8928

# 设置Vite前端端口
export VITE_PORT=8781

# 设置设备发现端口
export DISCOVERY_PORT=8190

# 设置调试端口
export DEBUG_PORT=8181
```

## 防火墙设置

如果在使用中遇到连接问题，请确保以下端口在防火墙中开放：

- 8928 (TCP) - 主WebSocket服务
- 8781 (TCP) - 前端服务
- 8190 (UDP) - 设备发现服务
- 8181 (TCP) - 调试服务 (可选)

## 常见问题

1. **端口被占用**: 如果启动时提示端口被占用，请检查是否有其他程序使用这些端口
2. **连接失败**: 确保Windows防火墙允许应用程序通过
3. **设备发现失败**: 确保UDP端口8190未被防火墙阻止