# Windows-Android Connect

Windows-Android局域网互联软件，实现设备发现、文件传输、屏幕投屏等功能。

## 快速启动

### 1. 主启动器 (推荐)

运行主启动器:
```bash
start.bat
```

选择启动模式:
1. 开发模式 (Development) - 启动开发服务器
2. 测试模式 (Testing) - 启动开发服务器并打开测试页面
3. 生产模式 (Production) - 启动完整服务器
4. 配置模式 (Custom Config) - 使用自定义配置启动
5. 分离模式 (Separated Mode) - 前后端分离启动
6. 环境检查 - 检查系统要求
7. 打开测试页面 - 打开测试界面
8. 重启服务器 - 停止并重启服务器
9. 构建项目 - 构建项目
10. 停止所有服务 - 停止运行中的服务
0. 退出 - 退出启动器

### 2. 直接启动方式

#### 2.1 集成模式 (默认)
```bash
# 开发模式
quick-start-dev.bat

# 替代端口启动
quick-start-alt-ports.bat
```

#### 2.2 分离模式
```bash
# 前后端分离启动
start-separated.bat

# 或手动启动
# 启动后端服务
node backend/scripts/complete-server.js

# 启动前端服务
npm run dev:vite
```

## 端口冲突解决

如果遇到端口被占用的错误（如"EADDRINUSE"），请尝试以下方法：

1. 使用端口清理脚本：
```bash
stop-server.bat
```

2. 或使用替代端口启动：
```bash
quick-start-alt-ports.bat
```

## 端口配置

### 默认端口
- **后端服务**: 8928 (WebSocket + API)
- **前端服务**: 8781 (Vite)
- **设备发现**: 8190 (UDP)
- **调试服务**: 8181

### 替代端口 (quick-start-alt-ports.bat)
- **后端服务**: 9928
- **前端服务**: 9781
- **设备发现**: 9190

## 主要功能

- ✅ 设备自动发现
- ✅ 文件传输
- ✅ 屏幕投屏
- ✅ 远程控制
- ✅ 剪贴板同步

## 项目结构

```
├── backend/        # 后端服务
│   ├── scripts/    # 后端脚本
│   ├── config/     # 后端配置
│   ├── src/        # 后端源代码
│   └── utils/      # 后端工具函数
├── frontend/       # 前端资源
│   ├── components/ # React组件
│   ├── pages/      # 页面组件
│   ├── src/        # 前端源代码
│   └── utils/      # 前端工具函数
├── docs/           # 项目文档
├── app/            # Android应用
├── vite.config.js  # Vite配置
├── start.bat       # 主启动器
├── start-separated.bat # 分离模式启动脚本
├── quick-start-dev.bat # 开发模式快速启动
└── quick-start-alt-ports.bat # 替代端口启动
```

## 架构模式

### 1. 集成模式 (默认)
- 后端和前端服务通过 `integrated-vite-server.js` 集成启动
- 适合开发和测试
- 启动命令: `quick-start-dev.bat`

### 2. 分离模式
- 后端服务和前端服务独立启动
- 适合生产部署和性能测试
- 启动命令: `start-separated.bat`

## 文档 (精简版)

为简化开发，文档已精简为4个核心文档：

- **[用户手册](docs/USER-MANUAL.md)** - 快速开始、启动说明和常见问题
- **[技术文档](docs/TECHNICAL-DOC.md)** - 通信协议和API说明
- **[架构说明](docs/ARCHITECTURE.md)** - 系统架构和设计决策
- **[开发计划](docs/DEVELOPMENT-PLAN.md)** - 开发路线图和脚本优化

## 核心脚本

| 脚本名称 | 用途 | 启动命令 |
|---------|------|---------|
| `start.bat` | 主启动器，提供菜单选择 | `start.bat` |
| `start-separated.bat` | 前后端分离模式启动 | `start-separated.bat` |
| `quick-start-dev.bat` | 开发模式快速启动 | `quick-start-dev.bat` |
| `quick-start-alt-ports.bat` | 替代端口启动 | `quick-start-alt-ports.bat` |
| `stop-server.bat` | 停止所有服务 | `stop-server.bat` |
| `check-server-status.bat` | 检查服务器状态 | `check-server-status.bat` |

## 访问地址

### 集成模式
- 前端页面: `http://localhost:8781`
- API接口: `http://localhost:8781/api`
- WebSocket: `ws://localhost:8781/ws`

### 分离模式
- 前端页面: `http://localhost:8781`
- 后端服务: `http://localhost:8928`
- API接口: `http://localhost:8928/api` 或 `http://localhost:8781/api`
- WebSocket: `ws://localhost:8928` 或 `ws://localhost:8781/ws`

### 替代端口
- 前端页面: `http://localhost:9781`
- 后端服务: `http://localhost:9928`
- API接口: `http://localhost:9928/api` 或 `http://localhost:9781/api`
- WebSocket: `ws://localhost:9928` 或 `ws://localhost:9781/ws`