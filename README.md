# Windows-Android Connect

Windows-Android局域网互联软件，实现设备发现、文件传输、屏幕投屏等功能。

## 快速启动

运行主启动器 (推荐):
```bash
start.bat
```

选择启动模式:
1. 开发模式 (Development) - 启动开发服务器
2. 测试模式 (Testing) - 启动开发服务器并打开测试页面
3. 生产模式 (Production) - 启动完整服务器
4. 配置模式 (Custom Config) - 使用自定义配置启动
5. 环境检查 - 检查系统要求
6. 打开测试页面 - 打开测试界面
7. 重启服务器 - 停止并重启服务器
8. 构建项目 - 构建项目
9. 停止所有服务 - 停止运行中的服务
0. 退出 - 退出启动器

或者直接使用统一脚本:
```bash
scripts\start-unified.bat dev
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

使用替代端口时，访问地址为：
- 主服务：http://localhost:9928
- 前端界面：http://localhost:9781

## 主要功能

- ✅ 设备自动发现
- ✅ 文件传输
- ✅ 屏幕投屏
- ✅ 远程控制
- ✅ 剪贴板同步

## 端口配置

- 默认WebSocket主服务: 8928
- 默认Vite前端服务: 8781
- 默认设备发现服务: 8190

使用替代端口时：
- WebSocket主服务: 9928
- Vite前端服务: 9781
- 设备发现服务: 9190

## 项目结构

```
├── scripts/        # 启动脚本
├── docs/           # 项目文档
├── backend/        # 后端服务
├── frontend/       # 前端资源
├── src/           # 源代码
└── app/           # Android应用
```

## 文档 (精简版)

为简化开发，文档已精简为4个核心文档：

- **[用户手册](docs/USER-MANUAL.md)** - 快速开始、启动说明和常见问题
- **[技术文档](docs/TECHNICAL-DOC.md)** - 通信协议和API说明
- **[架构说明](docs/ARCHITECTURE.md)** - 系统架构和设计决策
- **[开发计划](docs/DEVELOPMENT-PLAN.md)** - 开发路线图和脚本优化

## 核心脚本 (开发中仅需关注这些)

- **`start.bat`** - 主启动器，提供菜单选择
- **`scripts/start-unified.bat`** - 统一启动脚本 (dev/test/prod/config 模式)
- **`scripts/check-environment.bat`** - 环境检查
- **`scripts/restart-server.bat`** - 重启服务
- **`scripts/stop-services.bat`** - 停止服务