# Scripts 目录

这个目录包含了项目的各种启动和管理脚本。

## 主要脚本

### 启动脚本
- `start-unified.bat` - 统一启动器，支持多种模式
- `check-environment.bat` - 环境检查模块
- `start-services.bat` - 服务启动模块
- `open-test-pages.bat` - 测试页面打开模块

### 服务器管理
- `restart-server.bat` - 重启服务器
- `start-server.bat` - 启动服务器
- `start-web.bat` - 启动Web服务

### 手动启动
- `manual-start.bat` - 手动启动
- `manual-start-with-log.bat` - 带日志的手动启动

### 构建相关
- `build.bat` - 构建脚本

### Android构建
- `gradlew.bat` - Gradle包装器

### 多语言支持
- `启动所有服务.bat` - 中文版启动脚本
- `start-all-services-en.bat` - 英文版启动脚本

## 使用方法

推荐使用统一启动器：
```bash
# 开发模式
scripts\start-unified.bat dev

# 测试模式
scripts\start-unified.bat test

# 生产模式
scripts\start-unified.bat prod

# 配置模式
scripts\start-unified.bat config
```