import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout, Menu, Typography, Statistic, message, Spin, List, Button, Space } from 'antd';
import {
  WifiOutlined,
  FileTextOutlined,
  DesktopOutlined,
  ControlOutlined,
  BellOutlined,
  CopyOutlined,
  SettingOutlined,
  EyeOutlined,
  NotificationOutlined
} from '@ant-design/icons';
// 导入样式文件
import '../src/styles/global.css';
import '../src/styles/animations.css';
import '../src/styles/responsive.css';
import apiService from '../src/services/api-service';
import DeviceDiscovery from './DeviceDiscovery';
import FileTransfer from './FileTransfer';
import ScreenShare from './ScreenShare';
import RemoteControl from './RemoteControl';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

// DeviceCard组件已移除，使用DeviceDiscovery组件代替

const App = () => {
  const [selectedMenu, setSelectedMenu] = useState('devices');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false, isMockMode: false });
  const [connectionError, setConnectionError] = useState(null);

  // 初始化API服务连接
  useEffect(() => {
    const initConnection = async () => {
      try {
        await apiService.connect();
        
        // 获取连接状态
        const status = apiService.getConnectionStatus ? apiService.getConnectionStatus() : { isConnected: true, isMockMode: false };
        setConnectionStatus(status);
        setConnectionError(null);
        
        if (status.isMockMode) {
          message.info('当前运行在模拟模式下，使用演示数据');
        } else {
          message.success('连接已建立');
        }
        
        // 监听连接状态变化
        apiService.on('connection_established', () => {
          setConnectionStatus(prev => ({ ...prev, isConnected: true }));
          message.success('连接已建立');
        });
        
        apiService.on('connection_lost', () => {
          setConnectedDevice(null);
          setConnectionStatus(prev => ({ ...prev, isConnected: false }));
          message.warning('连接已断开');
        });
      } catch (error) {
        console.warn('连接失败，尝试使用模拟模式:', error.message);
        setConnectionError(error.message);
        
        // 尝试切换到模拟模式
        if (apiService.setConnectionType) {
          apiService.setConnectionType('mock');
          setConnectionStatus({ isConnected: true, isMockMode: true });
          message.warning('无法连接到后端服务，已切换到模拟演示模式');
        }
      }
    };

    initConnection();
    
    // 清理连接
    return () => {
      apiService.disconnect();
    };
  }, []);

  const handleConnectDevice = useCallback((device) => {
    setConnectedDevice(device);
  }, []);

  const menuItems = [
    {
      key: 'devices',
      icon: <WifiOutlined />,
      label: '设备管理'
    },
    {
      key: 'files',
      icon: <DesktopOutlined />,
      label: '文件传输'
    },
    {
      key: 'screen',
      icon: <EyeOutlined />,
      label: '屏幕投屏'
    },
    {
      key: 'control',
      icon: <ControlOutlined />,
      label: '远程控制'
    },
    {
      key: 'notifications',
      icon: <NotificationOutlined />,
      label: '通知同步'
    },
    {
      key: 'clipboard',
      icon: <CopyOutlined />,
      label: '剪贴板'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置'
    }
  ];

  const renderContent = () => {
    switch (selectedMenu) {
      case 'devices':
        return <DeviceDiscovery connectedDevice={connectedDevice} onConnect={handleConnectDevice} />;
      
      case 'screen':
        return <ScreenShare connectedDevice={connectedDevice} />;

      case 'files':
        return <FileTransfer connectedDevice={connectedDevice} />;

      case 'control':
        return <RemoteControl connectedDevice={connectedDevice} />;


      case 'notifications':
        return (
          <div style={{ padding: '20px' }}>
            <Title level={3}>通知同步</Title>
            <div style={{ color: '#666', marginBottom: '20px' }}>
              {connectedDevice ? `已连接 ${connectedDevice.name}` : '请先连接设备'}
            </div>
            {connectedDevice && (
              <List
                itemLayout="horizontal"
                dataSource={[
                  { id: 1, title: '新消息', content: '您有一条新微信消息', time: '2分钟前' },
                  { id: 2, title: '应用更新', content: '微信有可用更新', time: '5分钟前' },
                  { id: 3, title: '系统提醒', content: '电池电量低，请充电', time: '10分钟前' }
                ]}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={
                        <div>
                          <div>{item.content}</div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>{item.time}</Text>
                        </div>
                      }
                    />
                    <Button size="small">查看</Button>
                  </List.Item>
                )}
              />
            )}
          </div>
        );

      case 'clipboard':
        return (
          <div style={{ padding: '20px' }}>
            <Title level={3}>剪贴板同步</Title>
            <div style={{ color: '#666', marginBottom: '20px' }}>
              {connectedDevice ? `已连接 ${connectedDevice.name}` : '请先连接设备'}
            </div>
            {connectedDevice && (
              <div style={{ 
                border: '1px solid #d9d9d9', 
                borderRadius: '8px', 
                padding: '20px', 
                background: '#fafafa'
              }}>
                <Title level={4} style={{ marginBottom: '12px' }}>同步剪贴板内容</Title>
                <div style={{ 
                  minHeight: '100px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px', 
                  padding: '10px', 
                  background: '#fff',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  marginBottom: '12px'
                }}>
                  {window.navigator.clipboard ? '点击同步按钮以同步剪贴板内容' : '浏览器不支持剪贴板API'}
                </div>
                <Space>
                  <Button type="primary" icon={<CopyOutlined />}>同步到设备</Button>
                  <Button icon={<CopyOutlined />}>从设备同步</Button>
                </Space>
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div style={{ padding: '20px' }}>
            <Title level={3}>应用设置</Title>
            <div style={{ color: '#666' }}>
              <div style={{ marginBottom: '24px' }}>
                <Title level={5} style={{ marginBottom: '12px' }}>连接设置</Title>
                <Space orientation="vertical" size="middle">
              <div>
                <Text strong>自动重连: </Text>
                <span>开启</span>
              </div>
              <div>
                <Text strong>超时时间: </Text>
                <span>30秒</span>
              </div>
            </Space>
              </div>
              <div>
                <Title level={5} style={{ marginBottom: '12px' }}>界面设置</Title>
                <Space orientation="vertical" size="middle">
              <div>
                <Text strong>主题: </Text>
                <span>亮色</span>
              </div>
              <div>
                <Text strong>语言: </Text>
                <span>简体中文</span>
              </div>
            </Space>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} style={{ background: '#fff', position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}>
        <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            🔗 Windows-Android Connect
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          items={menuItems}
          onSelect={({ key }) => setSelectedMenu(key)}
          style={{ height: 'calc(100% - 80px)', borderRight: 0 }}
        />
      </Sider>
      
      <Layout style={{ marginLeft: 250 }}>
        <Header style={{ background: '#fff', padding: '0 20px', borderBottom: '1px solid #f0f0f0', position: 'fixed', width: `calc(100% - 250px)`, zIndex: 10, right: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {menuItems.find(item => item.key === selectedMenu)?.label}
              </Title>
            </div>
            <div>
                <Space>
                  <Statistic 
                    value={connectionStatus.isConnected ? "已连接" : connectionStatus.isMockMode ? "模拟模式" : "未连接"} 
                    prefix={<WifiOutlined style={{ 
                      color: connectionStatus.isConnected ? '#52c41a' : 
                             connectionStatus.isMockMode ? '#faad14' : '#ff4d4f' 
                    }} />} 
                    valueStyle={{ 
                      color: connectionStatus.isConnected ? '#52c41a' : 
                             connectionStatus.isMockMode ? '#faad14' : '#ff4d4f', 
                      fontSize: '14px' 
                    }}
                  />
                </Space>
              </div>
          </div>
        </Header>
        
        <Content style={{ marginTop: 64, margin: '20px', background: '#fff', padding: '20px', borderRadius: '6px' }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;