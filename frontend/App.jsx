import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Spin, ConfigProvider, theme, Badge, message, notification } from 'antd';
import { LaptopOutlined, FileTextOutlined, VideoCameraOutlined, AppstoreOutlined, SettingOutlined, BellOutlined, DisconnectOutlined, BugOutlined } from '@ant-design/icons';
import DeviceDiscovery from './components/DeviceDiscovery';
import FileTransfer from './components/FileTransfer';
import ScreenShare from './components/ScreenShare';
import RemoteControl from './components/RemoteControl';
import ConfigurationPage from './components/ConfigurationPage';
import DebugPage from './components/DebugPage';
import apiService from './src/services/api-service';
import configManager from './src/services/ConfigManager';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;
const { SubMenu } = Menu;

class App extends React.Component {
  state = {
    collapsed: false,
    current: 'device-discovery',
    connected: false,
    loading: true,
    unreadNotifications: 0,
    notifications: []
  };

  componentDidMount() {
    // 初始化应用
    this.initializeApp();
  }

  // 应用初始化
  async initializeApp() {
    try {
      // 加载配置
      const config = configManager.getConfig();
      if (!config) {
        // 设置默认配置
        const defaultConfig = {
          connection: {
            url: 'ws://localhost:8928',
            autoReconnect: true,
            maxReconnectAttempts: 5,
            reconnectDelay: 1000,
            strategyType: 'mock', // 开发环境使用模拟连接
            messageTimeout: 5000
          },
          debugMode: true
        };
        configManager.setConfig(defaultConfig);
      }

      // 尝试连接
      try {
        await apiService.connect();
        this.setState({ connected: true });
        message.success('连接成功');
      } catch (error) {
        console.warn('无法建立连接，将使用模拟模式:', error);
        message.warning('无法建立连接，将使用模拟模式运行');
        // 仍然设置为已连接，因为模拟连接可以正常工作
        this.setState({ connected: true });
      }

      // 注册全局事件监听
      this.registerEventListeners();
      
    } catch (error) {
      console.error('应用初始化失败:', error);
      message.error('应用初始化失败，请检查配置');
    } finally {
      this.setState({ loading: false });
    }
  }

  // 注册全局事件监听器
  registerEventListeners() {
    // 监听连接状态变化
    apiService.on('connection_established', this.handleConnectionEstablished);
    apiService.on('connection_lost', this.handleConnectionLost);
    apiService.on('reconnect_attempt', this.handleReconnectAttempt);
    apiService.on('reconnect_success', this.handleReconnectSuccess);
    
    // 监听设备事件
    apiService.on('device_connected', this.handleDeviceConnected);
    apiService.on('device_disconnected', this.handleDeviceDisconnected);
    
    // 监听通知事件
    apiService.on('notification', this.handleNotification);
    
    // 监听错误事件
    apiService.on('error', this.handleError);
  }

  // 移除全局事件监听器
  removeEventListeners() {
    apiService.off('connection_established');
    apiService.off('connection_lost');
    apiService.off('reconnect_attempt');
    apiService.off('reconnect_success');
    apiService.off('device_connected');
    apiService.off('device_disconnected');
    apiService.off('notification');
    apiService.off('error');
  }

  // 连接建立处理
  handleConnectionEstablished = () => {
    this.setState({ connected: true });
    message.success('连接已建立');
  };

  // 连接断开处理
  handleConnectionLost = () => {
    this.setState({ connected: false });
    message.error('连接已断开');
  };

  // 重连尝试处理
  handleReconnectAttempt = (attemptNumber, maxAttempts) => {
    console.log(`尝试重连... (${attemptNumber}/${maxAttempts})`);
  };

  // 重连成功处理
  handleReconnectSuccess = () => {
    this.setState({ connected: true });
    message.success('重连成功');
  };

  // 设备连接处理
  handleDeviceConnected = (device) => {
    this.addNotification(`设备已连接: ${device.name || device.id}`);
  };

  // 设备断开处理
  handleDeviceDisconnected = (device) => {
    this.addNotification(`设备已断开: ${device.name || device.id}`);
  };

  // 通知处理
  handleNotification = (data) => {
    this.addNotification(data.message || JSON.stringify(data));
  };

  // 错误处理
  handleError = (error) => {
    console.error('应用错误:', error);
    // 只在调试模式显示错误通知
    if (configManager.getConfig()?.debugMode) {
      this.addNotification(`错误: ${error.message || '未知错误'}`, 'error');
    }
  };

  // 添加通知
  addNotification = (message, type = 'info') => {
    const notificationKey = `notification-${Date.now()}`;
    const newNotification = {
      key: notificationKey,
      message,
      type,
      time: new Date().toLocaleTimeString()
    };
    
    this.setState(prev => ({
      notifications: [newNotification, ...prev.notifications],
      unreadNotifications: prev.unreadNotifications + 1
    }));
    
    // 显示通知气泡
    notification[type]({
      message: type === 'error' ? '错误' : type === 'success' ? '成功' : '通知',
      description: message,
      key: notificationKey,
      duration: 3,
      onClose: () => {
        this.setState(prev => ({
          unreadNotifications: Math.max(0, prev.unreadNotifications - 1)
        }));
      }
    });
  };

  // 菜单点击处理
  handleMenuClick = (e) => {
    this.setState({ current: e.key });
  };

  // 切换菜单折叠
  toggle = () => {
    this.setState({ collapsed: !this.state.collapsed });
  };

  // 组件卸载时清理
  componentWillUnmount() {
    this.removeEventListeners();
    apiService.disconnect();
  }

  // 渲染主内容
  renderContent() {
    const { current } = this.state;
    
    switch (current) {
      case 'device-discovery':
        return <DeviceDiscovery />;
      case 'file-transfer':
        return <FileTransfer />;
      case 'screen-share':
        return <ScreenShare />;
      case 'remote-control':
        return <RemoteControl />;
      case 'configuration':
        return <ConfigurationPage />;
      case 'debug':
        return <DebugPage />;
      default:
        return <DeviceDiscovery />;
    }
  }

  render() {
    const { collapsed, current, connected, loading } = this.state;
    const { unreadNotifications } = this.state;
    
    // 自定义主题配置
    const darkTheme = {
      algorithm: theme.darkAlgorithm,
    };
    
    const lightTheme = {
      algorithm: theme.defaultAlgorithm,
    };
    
    // 使用配置中的主题设置
    const currentTheme = configManager.getConfig()?.theme === 'dark' ? darkTheme : lightTheme;

    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" tip="应用初始化中..." />
        </div>
      );
    }

    return (
      <ConfigProvider theme={currentTheme}>
        <Layout style={{ minHeight: '100vh' }}>
          <Header className="header" style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="logo" style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
              <AppstoreOutlined style={{ fontSize: 24, color: '#fff' }} />
              <Title level={3} style={{ color: '#fff', margin: 0, marginLeft: 10 }}>跨设备控制中心</Title>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
              <Badge count={unreadNotifications} overflowCount={99} style={{ marginRight: 24 }}>
                <BellOutlined style={{ fontSize: 20, color: '#fff' }} />
              </Badge>
              
              <Badge 
                status={connected ? 'success' : 'error'} 
                text={connected ? '已连接' : '未连接'}
                style={{ marginRight: 16, color: '#fff' }}
              />
              
              {!connected && (
                <Badge dot color="error" style={{ marginRight: 16 }}>
                  <DisconnectOutlined style={{ fontSize: 20, color: '#fff' }} />
                </Badge>
              )}
            </div>
          </Header>
          
          <Layout>
            <Sider width={200} theme="dark" className="site-layout-background" 
                  collapsible collapsed={collapsed} trigger={null}>
              <Menu
                mode="inline"
                selectedKeys={[current]}
                style={{ height: '100%', borderRight: 0 }}
                onClick={this.handleMenuClick}
              >
                <Menu.Item key="device-discovery" icon={<AppstoreOutlined />}>
                  设备发现
                </Menu.Item>
                <Menu.Item key="file-transfer" icon={<FileTextOutlined />}>
                  文件传输
                </Menu.Item>
                <Menu.Item key="screen-share" icon={<VideoCameraOutlined />}>
                  屏幕共享
                </Menu.Item>
                <Menu.Item key="remote-control" icon={<LaptopOutlined />}>
                  远程控制
                </Menu.Item>
                <Menu.Item key="configuration" icon={<SettingOutlined />}>
                  配置管理
                </Menu.Item>
                <Menu.Item key="debug" icon={<BugOutlined />}>
                  调试中心
                </Menu.Item>
              </Menu>
            </Sider>
            
            <Layout style={{ padding: '24px' }}>
              <Content
                className="site-layout-background"
                style={{
                  padding: 24,
                  margin: 0,
                  minHeight: 280,
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '6px'
                }}
              >
                {this.renderContent()}
              </Content>
            </Layout>
          </Layout>
        </Layout>
      </ConfigProvider>
    );
  }
}

export default App;
