import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Spin, ConfigProvider, theme, Badge, message, notification } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  DashboardOutlined, 
  AppstoreOutlined, 
  FileTextOutlined, 
  VideoCameraOutlined, 
  LaptopOutlined, 
  SettingOutlined, 
  BellOutlined, 
  DisconnectOutlined, 
  BugOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import apiService from '../src/services/api-service';
import configManager from '../src/services/ConfigManager';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // 初始化应用
  useEffect(() => {
    initializeApp();
    
    // 注册事件监听器
    registerEventListeners();
    
    return () => {
      // 移除事件监听器
      removeEventListeners();
    };
  }, []);

  // 处理URL查询参数，自动导航到对应的页面
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const page = urlParams.get('page');
    if (page) {
      // 将URL参数映射到内部路由
      const pageMap = {
        'dashboard': '/',
        'devices': '/devices',
        'device-manager': '/devices',
        'screen': '/screen-share',
        'screen-stream': '/screen-share',
        'file-transfer': '/file-transfer',
        'remote-control': '/remote-control',
        'configuration': '/settings',
        'debug': '/debug'
      };
      const targetRoute = pageMap[page] || '/';
      
      // 只在当前路径不是目标路径时导航
      if (location.pathname !== targetRoute) {
        navigate(targetRoute, { replace: true });
      }
    }
  }, [location, navigate]);

  // 应用初始化
  async function initializeApp() {
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
            strategyType: 'websocket',
            mockMode: false,
            messageTimeout: 5000
          },
          debugMode: true
        };
        configManager.setConfig(defaultConfig);
      }

      // 尝试连接
      try {
        await apiService.connect();
        setConnected(true);
        message.success('连接成功');
      } catch (error) {
        console.warn('无法建立连接:', error);
        message.error('无法建立连接，请检查服务器状态或网络连接');
        setConnected(false);
      }
    } catch (error) {
      console.error('应用初始化失败:', error);
      message.error('应用初始化失败，请检查配置');
      setConnected(false);
    }
  }

  // 注册事件监听器
  function registerEventListeners() {
    // 监听连接状态变化
    apiService.on('connection_established', handleConnectionEstablished);
    apiService.on('connection_lost', handleConnectionLost);
    apiService.on('reconnect_attempt', handleReconnectAttempt);
    apiService.on('reconnect_success', handleReconnectSuccess);
    
    // 监听设备事件
    apiService.on('device_connected', handleDeviceConnected);
    apiService.on('device_disconnected', handleDeviceDisconnected);
    
    // 监听通知事件
    apiService.on('notification', handleNotification);
    
    // 监听错误事件
    apiService.on('error', handleError);
  }

  // 移除事件监听器
  function removeEventListeners() {
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
  const handleConnectionEstablished = () => {
    setConnected(true);
    message.success('连接已建立');
  };

  // 连接断开处理
  const handleConnectionLost = () => {
    setConnected(false);
    message.error('连接已断开');
  };

  // 重连尝试处理
  const handleReconnectAttempt = (attemptNumber, maxAttempts) => {
    console.log(`尝试重连... (${attemptNumber}/${maxAttempts})`);
  };

  // 重连成功处理
  const handleReconnectSuccess = () => {
    setConnected(true);
    message.success('重连成功');
  };

  // 设备连接处理
  const handleDeviceConnected = (device) => {
    addNotification(`设备已连接: ${device.name || device.id}`);
    setConnectedDevice(device);
  };

  // 设备断开处理
  const handleDeviceDisconnected = (device) => {
    addNotification(`设备已断开: ${device.name || device.id}`);
    setConnectedDevice(null);
  };

  // 通知处理
  const handleNotification = (data) => {
    addNotification(data.message || JSON.stringify(data));
  };

  // 错误处理
  const handleError = (error) => {
    console.error('应用错误:', error);
    // 只在调试模式显示错误通知
    if (configManager.getConfig()?.debugMode) {
      addNotification(`错误: ${error.message || '未知错误'}`, 'error');
    }
  };

  // 添加通知
  const addNotification = (message, type = 'info') => {
    const notificationKey = `notification-${Date.now()}`;
    const newNotification = {
      key: notificationKey,
      message,
      type,
      time: new Date().toLocaleTimeString()
    };
    
    setNotifications(prev => [newNotification, ...prev.notifications]);
    setUnreadNotifications(prev => prev.unreadNotifications + 1);
    
    // 显示通知气泡
    notification[type]({
      message: type === 'error' ? '错误' : type === 'success' ? '成功' : '通知',
      description: message,
      key: notificationKey,
      duration: 3,
      onClose: () => {
        setUnreadNotifications(prev => Math.max(0, prev.unreadNotifications - 1));
      }
    });
  };

  // 菜单点击处理
  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  // 切换菜单折叠
  const toggle = () => {
    setCollapsed(!collapsed);
  };

  // 导航菜单配置
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/devices',
      icon: <AppstoreOutlined />,
      label: '设备发现',
    },
    {
      key: '/file-transfer',
      icon: <FileTextOutlined />,
      label: '文件传输',
    },
    {
      key: '/screen-share',
      icon: <VideoCameraOutlined />,
      label: '屏幕共享',
    },
    {
      key: '/remote-control',
      icon: <LaptopOutlined />,
      label: '远程控制',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '配置管理',
    },
    {
      key: '/debug',
      icon: <BugOutlined />,
      label: '调试中心',
    },
  ];

  // 自定义主题配置
  const darkTheme = {
    algorithm: theme.darkAlgorithm,
  };
  
  const lightTheme = {
    algorithm: theme.defaultAlgorithm,
  };
  
  // 使用配置中的主题设置
  const currentTheme = configManager.getConfig()?.theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ConfigProvider theme={currentTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header className="header" style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: toggle,
              style: { color: '#fff', fontSize: 20, marginRight: 16, cursor: 'pointer' }
            })}
            <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
              <AppstoreOutlined style={{ fontSize: 24, color: '#fff' }} />
              <Title level={3} style={{ color: '#fff', margin: 0, marginLeft: 10 }}>跨设备控制中心</Title>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
            <Badge count={unreadNotifications} overflowCount={99} style={{ marginRight: 24 }}>
              <BellOutlined style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }} />
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
          <Sider 
            width={200} 
            theme="dark" 
            className="site-layout-background" 
            collapsible 
            collapsed={collapsed} 
            trigger={null}
            breakpoint="lg"
            collapsedWidth="80"
          >
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              style={{ height: '100%', borderRight: 0 }}
              onClick={handleMenuClick}
              items={menuItems}
            />
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
              <React.Suspense fallback={<Spin size="large" tip="加载中..." style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }} />}>
                <Outlet />
              </React.Suspense>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default AppLayout;