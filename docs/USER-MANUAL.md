# Windows-Android Connect 用户手册

## 快速开始

### 统一启动器（推荐）
双击运行 `start.bat`，在菜单中选择启动模式：
- 1 - 开发模式
- 2 - 测试模式（包含测试页面）
- 3 - 生产模式
- 4 - 配置模式

### 直接运行脚本
```bash
# 开发模式
quick-start-dev.bat

# 替代端口启动（避免端口冲突）
quick-start-alt-ports.bat

# 前后端分离启动
start-separated.bat
```

## 端口配置

| 服务 | 端口 | 协议 | 说明 |
|------|------|------|------|
| WebSocket主服务 | 8928 | TCP | 主要通信端口 |
| Vite开发服务器 | 8781 | TCP | 前端开发和代理 |
| 设备发现服务 | 8190 | UDP | 局域网设备发现 |

## 访问地址

启动成功后，可通过以下地址访问：

- **主界面**: http://localhost:8781
- **测试页面**: http://localhost:8781/test-server-functions.html
- **屏幕镜像**: http://localhost:8781/pages/screen-stream.html

## Android客户端连接

1. 确保Android设备与Windows在同一局域网
2. 在Android客户端中输入Windows IP地址
3. 使用端口8928进行WebSocket连接
4. 连接成功后可使用各项功能

## 启动模式说明

### 开发模式
- 启动完整的服务环境
- 包含热重载功能
- 适合日常开发调试

### 测试模式
- 开发模式 + 自动打开测试页面
- 包含所有功能测试界面
- 方便功能验证

### 生产模式
- 优化性能配置
- 关闭调试功能
- 适合生产环境部署

### 配置模式
- 支持自定义端口配置
- 可通过环境变量配置
- 适合特殊部署需求

## 常见问题解决

### 端口冲突
如果遇到端口被占用，可以：
1. 使用选项9停止所有服务
2. 修改 `backend/config/config.mjs` 中的端口配置
3. 重新启动服务

### 连接失败
1. 检查防火墙设置
2. 确认网络连通性
3. 验证IP地址和端口配置
4. 查看控制台错误信息

### 依赖问题
1. 删除 `node_modules` 目录
2. 重新运行 `npm install`
3. 重启服务

## 常用工具脚本

### 环境检查
```bash
scripts\check-environment.bat
```

### 服务重启
```bash
scripts\restart-server.bat
```

### 停止服务
```bash
scripts\stop-services.bat
```

### 构建项目
```bash
scripts\build.bat
```

## 日志查看

开发模式下，日志会显示在控制台中。如需保存日志：
1. 使用 `scripts\manual-start-with-log.bat`
2. 日志将保存到 `server-startup.log`