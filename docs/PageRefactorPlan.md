# Android应用页面重构方案

## 当前问题
当前应用页面过多且功能分散，导致用户体验不佳：
- MainActivity：功能过于复杂
- DeviceDiscoveryTestActivity：单独的设备发现页面
- DebugTestActivity：单独的调试页面
- QuickTestActivity：快速测试页面
- MockTestActivity：模拟测试页面
- FileTransferActivity：文件传输页面

## 重构目标
- 精简页面数量，提高用户体验
- 集中功能到核心页面
- 保持所有必要功能

## 重构方案

### 1. MainActivity（精简版）
- 移除所有测试功能
- 只保留基本导航
- 显示当前连接状态
- 提供到QuickTestActivity的导航按钮

### 2. QuickTestActivity（功能集中版）
将以下功能模块整合到QuickTestActivity中：

#### 2.1 设备发现模块
- 启动/停止设备发现按钮
- 设备列表显示区域
- 连接设备功能

#### 2.2 连接管理模块
- 连接/断开设备按钮
- 当前连接状态显示
- 设备信息展示

#### 2.3 调试信息模块
- 实时日志显示
- 系统状态信息
- 错误信息展示

#### 2.4 功能测试模块
- 屏幕捕获测试按钮
- 文件传输测试按钮
- 其他功能测试按钮

### 3. 移除冗余页面
- DeviceDiscoveryTestActivity：功能移至QuickTestActivity
- DebugTestActivity：功能移至QuickTestActivity
- MockTestActivity：功能移至QuickTestActivity
- FileTransferActivity：功能移至QuickTestActivity

## 实现步骤

### 第一步：更新QuickTestActivity
- 添加设备发现功能区域
- 添加连接管理功能区域
- 添加调试信息区域
- 添加功能测试按钮

### 第二步：精简MainActivity
- 移除测试相关代码
- 保留基本导航功能
- 添加到QuickTestActivity的导航

### 第三步：更新AndroidManifest.xml
- 移除已合并页面的声明
- 保持必要的权限声明

### 第四步：更新相关代码
- 更新启动Intent指向
- 确保功能正常迁移

## 预期效果
- 页面数量从6个减少到2个核心页面
- 功能集中，便于测试和使用
- 用户界面更简洁清晰
- 维护成本降低