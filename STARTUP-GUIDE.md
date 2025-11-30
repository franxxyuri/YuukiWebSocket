# Windows-Android Connect 项目启动指南

## 前置条件

在启动项目之前，请确保您已经完成以下准备工作：

1. **安装 Node.js**
   - 版本要求：Node.js 18.x 或更高版本
   - 下载地址：https://nodejs.org/
   - 验证安装：
     ```bash
     node --version
     npm --version
     ```

2. **安装依赖**
   - 在项目根目录执行以下命令：
     ```bash
     npm install
     ```

3. **配置文件**
   - 复制 `.env.example` 文件为 `.env`（如果存在）
   - 根据需要修改配置参数

## 启动方式

### 方式一：分离模式（推荐用于开发）

分离模式下，前端和后端服务独立运行，便于开发和调试。

#### 步骤 1：启动后端服务

**命令**：
```bash
npm run server
```

**或** 使用环境变量指定端口：
```bash
npm run server:ports
```

**预期输出**：
```
服务器运行在: http://192.168.x.x:8928
服务器运行在: http://0.0.0.0:8928
等待Android设备连接...
```

**后端服务信息**：
- 默认端口：8928
- API 地址：`http://localhost:8928/api`
- WebSocket 地址：`ws://localhost:8928`

#### 步骤 2：启动前端服务

**命令**：
```bash
npm run dev:vite
```

**预期输出**：
```
VITE v6.4.1  ready in 1000 ms

➜  Local:   http://localhost:8781/
➜  Network: http://192.168.x.x:8781/
➜  press h + enter to show help
```

**前端服务信息**：
- 默认端口：8781
- 访问地址：`http://localhost:8781`

#### 步骤 3：访问应用

在浏览器中访问：`http://localhost:8781`

### 方式二：集成模式

集成模式下，前端和后端服务通过一个脚本统一启动，便于快速部署和测试。

**命令**：
```bash
npm run dev:integrated
```

**预期输出**：
```
Vite开发服务器已在端口8781启动
Vite开发服务器已启动
Windows主服务运行在: http://192.168.x.x:8928
Windows主服务运行在: http://0.0.0.0:8928
Vite开发服务器运行在: http://192.168.x.x:8781
Vite开发服务器运行在: http://0.0.0.0:8781
等待Android设备连接...
```

**访问地址**：
- 前端：`http://localhost:8781`
- 后端API：`http://localhost:8928/api`

### 方式三：一键启动脚本

项目提供了一键启动脚本，便于快速启动分离模式或集成模式。

#### 主启动器（start.bat）

**命令**：
```bash
start.bat
```

**操作步骤**：
1. 运行命令后，会显示启动菜单
2. 根据需要选择启动模式：
   - 1: 开发模式（Development）- 启动集成服务器
   - 2: 测试模式（Testing）- 启动集成服务器并打开测试页面
   - 3: 生产模式（Production）- 启动完整服务器
   - 4: 配置模式（Custom Config）- 使用自定义配置启动
   - 5: 分离模式（Separated Mode）- 前后端分离启动
   - 6: 环境检查 - 检查系统要求
   - 7: 打开测试页面 - 打开测试界面
   - 8: 重启服务器 - 停止并重启服务器
   - 9: 构建项目 - 构建项目
   - 10: 停止所有服务 - 停止运行中的服务
   - 0: 退出 - 退出启动器

#### 分离模式一键启动脚本（start-separated.bat）

**命令**：
```bash
start-separated.bat
```

**预期输出**：
```
========================================
   Windows-Android Connect - Separated Mode
========================================

1. 启动后端服务 (端口: 8928)
2. 启动前端服务 (端口: 8781)
3. 启动设备发现服务 (UDP: 8190)

Stopping any existing server processes...
Waiting for processes to stop...
Starting backend server...
Starting frontend server...

========================================
   Services started successfully!
========================================

Backend service running at: http://localhost:8928
Frontend service running at: http://localhost:8781
Device discovery service running at: UDP 8190

Press any key to exit...
```

## 构建和部署

### 构建前端项目

**命令**：
```bash
npm run build
```

**预期输出**：
```
vite v6.4.1 building for production...
✓ 123 modules transformed.
dist/index.html                  0.50 kB
...
dist/assets/index-123456.js      123.45 kB
✓ built in 2.34s
```

### 预览构建后的项目

**命令**：
```bash
npm run preview
```

**预期输出**：
```
VITE v6.4.1  ready in 500 ms

➜  Local:   http://localhost:4173/
➜  Network: http://192.168.x.x:4173/
```

## 常见问题及解决方法

### 1. 端口被占用

**问题**：启动服务时出现 "EADDRINUSE" 错误

**解决方法**：
- 使用端口清理脚本：
  ```bash
  stop-server.bat
  ```
- 或使用替代端口启动：
  ```bash
  quick-start-alt-ports.bat
  ```
- 或手动指定端口：
  ```bash
  SERVER_PORT=9928 VITE_PORT=9781 npm run server:ports
  ```

### 2. 依赖安装失败

**问题**：执行 `npm install` 时出现错误

**解决方法**：
- 清理缓存并重新安装：
  ```bash
  npm cache clean --force
  npm install
  ```
- 检查网络连接
- 尝试使用国内镜像：
  ```bash
  npm config set registry https://registry.npmmirror.com
  npm install
  ```

### 3. 前端无法连接到后端

**问题**：前端页面无法访问后端API或WebSocket

**解决方法**：
- 检查后端服务是否正常运行
- 检查 `vite.config.js` 中的代理配置是否正确
- 确保防火墙未阻止端口访问

### 4. Android设备无法发现

**问题**：Android设备无法通过局域网发现Windows设备

**解决方法**：
- 确保Windows和Android设备在同一局域网
- 检查Windows防火墙是否允许UDP端口8190的入站连接
- 尝试手动输入Windows设备的IP地址连接

### 5. 启动脚本执行失败

**问题**：执行 `.bat` 脚本时出现错误

**解决方法**：
- 确保使用管理员权限运行命令提示符
- 检查脚本文件的编码格式是否为ANSI或UTF-8
- 尝试手动执行脚本中的命令

## 开发模式配置

### 配置文件

项目支持通过 `.env` 文件配置环境变量：

```env
# 服务器配置
SERVER_PORT=8928
SERVER_HOST=0.0.0.0

# Vite配置
VITE_PORT=8781
VITE_HOST=0.0.0.0

# 设备发现配置
DISCOVERY_PORT=8190

# 网络通信配置
NETWORK_COMM_PORT=8826
```

### 热重载

在开发模式下，前端支持热重载，修改代码后会自动刷新页面。

### 调试模式

**启用调试日志**：
```bash
npm run self-test:verbose
```

**检查服务器状态**：
```bash
npm run check:server
```

## 测试

### 运行单元测试

**命令**：
```bash
npm run test
```

### 运行服务器测试

**命令**：
```bash
npm run test:server
```

### 运行环境测试

**命令**：
```bash
npm run test:environment
```

## 技术栈

- **前端**：React 19 + Vite 6 + WebSocket
- **后端**：Node.js + Express + WebSocket
- **构建工具**：Vite
- **包管理**：npm
- **开发语言**：JavaScript (ES Module)

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
├── package.json    # 项目配置
└── start.bat       # 主启动器
```

## 联系方式

如果您在启动过程中遇到问题，请通过以下方式获取帮助：

- 查看项目文档
- 检查 `README.md` 和 `ARCHITECTURE.md` 文件
- 提交 Issue 到项目仓库

---

**祝您使用愉快！** 🚀
