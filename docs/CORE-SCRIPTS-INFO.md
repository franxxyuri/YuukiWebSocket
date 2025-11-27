# Windows-Android Connect 项目 - 核心启动脚本说明

## 主要脚本（开发过程中仅需关注这些）

### 1. start.bat
- 项目主启动器，提供菜单选择
- 推荐日常开发使用

### 2. scripts/start-unified.bat
- 统一启动脚本，支持多种模式
- 使用方法：
  - `scripts\start-unified.bat dev` → 开发模式
  - `scripts\start-unified.bat test` → 测试模式
  - `scripts\start-unified.bat prod` → 生产模式
  - `scripts\start-unified.bat config` → 配置模式

### 3. scripts/check-environment.bat
- 检查开发环境是否正常
- 在启动服务前使用

### 4. scripts/restart-server.bat
- 重启服务（无需关闭终端）

### 5. scripts/stop-services.bat
- 停止所有服务

## 端口配置
- WebSocket主服务: 8928
- Vite前端服务: 8781
- 设备发现服务: 8190