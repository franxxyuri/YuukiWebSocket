import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Card, List, Space, Tag, Typography, Statistic, message } from 'antd';
import { 
  WifiOutlined, 
  PhoneOutlined, 
  DesktopOutlined, 
  UploadOutlined, 
  DownloadOutlined,
  EyeOutlined,
  ControlOutlined,
  NotificationOutlined,
  CopyOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  StopOutlined
} from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const App = () => {
  const [selectedMenu, setSelectedMenu] = useState('devices');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [screenSharing, setScreenSharing] = useState(false);

  // 模拟设备数据
  const mockDevices = [
    {
      id: 'device_1',
      name: '我的Android手机',
      type: 'android',
      ip: '192.168.1.100',
      status: 'online',
      capabilities: ['file_transfer', 'screen_mirror', 'remote_control', 'notification']
    },
    {
      id: 'device_2',
      name: '测试平板',
      type: 'android',
      ip: '192.168.1.101',
      status: 'online',
      capabilities: ['file_transfer', 'screen_mirror']
    }
  ];

  useEffect(() => {
    if (isDiscovering) {
      // 开始设备发现
      handleStartDiscovery();
    } else {
      setDevices([]);
    }
  }, [isDiscovering]);

  // 监听设备发现事件
  useEffect(() => {
    if (window.electronAPI) {
      const handleDeviceFound = (event, device) => {
        setDevices(prev => {
          const existing = prev.find(d => d.deviceId === device.deviceId);
          if (existing) {
            return prev.map(d => d.deviceId === device.deviceId ? { ...d, ...device } : d);
          } else {
            message.success(`发现设备: ${device.name}`);
            return [...prev, device];
          }
        });
      };

      const handleDeviceLost = (event, data) => {
        setDevices(prev => prev.filter(d => d.deviceId !== data.deviceId));
        message.warning(`设备失去连接`);
      };

      window.electronAPI.onDeviceFound(handleDeviceFound);
      window.electronAPI.onDeviceLost(handleDeviceLost);

      return () => {
        window.electronAPI.removeAllListeners('device-found');
        window.electronAPI.removeAllListeners('device-lost');
      };
    }
  }, []);

  const handleStartDiscovery = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.startDeviceDiscovery();
        if (result) {
          setIsDiscovering(true);
          message.info('开始搜索设备...');
        }
      } catch (error) {
        console.error('启动设备发现失败:', error);
        message.error(`启动设备发现失败: ${error.message}`);
      }
    } else {
      // 开发模式模拟
      setIsDiscovering(true);
      setTimeout(() => {
        setDevices(mockDevices);
        message.success(`发现 ${mockDevices.length} 台设备（模拟）`);
      }, 2000);
    }
  };

  const handleStopDiscovery = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.stopDeviceDiscovery();
        if (result) {
          setIsDiscovering(false);
          setDevices([]);
          message.info('已停止设备搜索');
        }
      } catch (error) {
        console.error('停止设备发现失败:', error);
        message.error(`停止设备发现失败: ${error.message}`);
      }
    } else {
      setIsDiscovering(false);
    }
  };

  const handleConnectDevice = async (device) => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.connectToDevice(device);
        if (result.success) {
          setConnectedDevice(device);
          message.success(`已连接到 ${device.name}`);
        } else {
          message.error(`连接失败: ${result.error}`);
        }
      } catch (error) {
        console.error('连接设备失败:', error);
        message.error(`连接设备失败: ${error.message}`);
      }
    } else {
      // 开发模式模拟
      setConnectedDevice(device);
      message.success(`已连接到 ${device.name}（模拟）`);
    }
  };

  const handleScreenShare = async () => {
    if (!screenSharing) {
      if (window.electronAPI) {
        try {
          await window.electronAPI.captureScreen();
          setScreenSharing(true);
          message.success('开始屏幕投屏');
        } catch (error) {
          console.error('启动屏幕投屏失败:', error);
          message.error('启动屏幕投屏失败');
        }
      } else {
        setScreenSharing(true);
        message.success('开始屏幕投屏');
      }
    } else {
      if (window.electronAPI) {
        try {
          await window.electronAPI.stopScreenCapture();
          setScreenSharing(false);
          message.success('停止屏幕投屏');
        } catch (error) {
          console.error('停止屏幕投屏失败:', error);
          message.error('停止屏幕投屏失败');
        }
      } else {
        setScreenSharing(false);
        message.success('停止屏幕投屏');
      }
    }
  };

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

  const DeviceCard = ({ device }) => (
    <Card 
      hoverable
      className="device-card"
      actions={[
        connectedDevice?.id === device.id ? (
          <Button type="primary" icon={<StopOutlined />} danger>
            断开连接
          </Button>
        ) : (
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={() => handleConnectDevice(device)}
          >
            连接
          </Button>
        )
      ]}
    >
      <Card.Meta
        avatar={<PhoneOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
        title={device.name}
        description={
          <div>
            <div>IP地址: {device.ip}</div>
            <div>状态: <Tag color={device.status === 'online' ? 'green' : 'red'}>{device.status}</Tag></div>
            <div>
              能力:
              <div style={{ marginTop: '5px' }}>
                {device.capabilities.map(cap => (
                  <Tag key={cap} color="blue" style={{ marginBottom: '2px' }}>
                    {cap}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        }
      />
    </Card>
  );

  const renderContent = () => {
    switch (selectedMenu) {
      case 'devices':
        return (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <Space>
                <Button 
                  type="primary" 
                  icon={<WifiOutlined />}
                  onClick={handleStartDiscovery}
                  disabled={isDiscovering}
                >
                  开始发现
                </Button>
                <Button 
                  icon={<StopOutlined />}
                  onClick={handleStopDiscovery}
                  disabled={!isDiscovering}
                >
                  停止发现
                </Button>
              </Space>
            </div>
            
            {devices.length > 0 ? (
              <List
                grid={{ gutter: 16, column: 2 }}
                dataSource={devices}
                renderItem={device => (
                  <List.Item>
                    <DeviceCard device={device} />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                <WifiOutlined style={{ fontSize: '48px', marginBottom: '20px' }} />
                <div>点击"开始发现"搜索附近设备</div>
              </div>
            )}
          </div>
        );
      
      case 'screen':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Title level={3}>屏幕投屏</Title>
            {connectedDevice ? (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <Text>已连接设备: {connectedDevice.name}</Text>
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={screenSharing ? <StopOutlined /> : <EyeOutlined />}
                  onClick={handleScreenShare}
                >
                  {screenSharing ? '停止投屏' : '开始投屏'}
                </Button>
                {screenSharing && (
                  <div style={{ marginTop: '20px', padding: '20px', background: '#000', color: '#fff' }}>
                    <div>屏幕投屏窗口</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>(这是演示界面)</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#666' }}>
                请先连接设备
              </div>
            )}
          </div>
        );

      case 'files':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Title level={3}>文件传输</Title>
            <div style={{ color: '#666' }}>
              {connectedDevice ? `已连接 ${connectedDevice.name}` : '请先连接设备'}
            </div>
          </div>
        );

      case 'control':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Title level={3}>远程控制</Title>
            <div style={{ color: '#666' }}>
              {connectedDevice ? `已连接 ${connectedDevice.name}` : '请先连接设备'}
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Title level={3}>通知同步</Title>
            <div style={{ color: '#666' }}>
              {connectedDevice ? `已连接 ${connectedDevice.name}` : '请先连接设备'}
            </div>
          </div>
        );

      case 'clipboard':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Title level={3}>剪贴板同步</Title>
            <div style={{ color: '#666' }}>
              {connectedDevice ? `已连接 ${connectedDevice.name}` : '请先连接设备'}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div style={{ padding: '20px' }}>
            <Title level={3}>应用设置</Title>
            <div style={{ color: '#666' }}>
              设置功能开发中...
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} style={{ background: '#fff' }}>
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
          style={{ height: '100%', borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ background: '#fff', padding: '0 20px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {menuItems.find(item => item.key === selectedMenu)?.label}
              </Title>
            </div>
            <div>
              <Space>
                {connectedDevice && (
                  <Statistic 
                    value="已连接" 
                    prefix={<WifiOutlined style={{ color: '#52c41a' }} />} 
                    valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                  />
                )}
              </Space>
            </div>
          </div>
        </Header>
        
        <Content style={{ margin: '20px', background: '#fff', padding: '20px', borderRadius: '6px' }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;