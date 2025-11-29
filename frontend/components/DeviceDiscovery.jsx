import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, List, Avatar, Tag, Spin, message, Typography, Empty, Space, Divider, Input, Form, Modal } from 'antd';
import { 
  PlusOutlined 
} from '@ant-design/icons';
import { 
  AndroidOutlined, 
  WifiOutlined, 
  DisconnectOutlined, 
  ReloadOutlined, 
  SearchOutlined, 
  CheckCircleOutlined, 
  LoadingOutlined,
  StarOutlined,
  StarFilled,
  InfoCircleOutlined
} from '@ant-design/icons';
import apiService from '../src/services/api-service';
import deviceDiscoveryService from '../services/DeviceDiscoveryService';

const { Title, Text, Paragraph } = Typography;

const DeviceDiscovery = ({ onDeviceConnect, onDeviceDisconnect, connectedDevice: parentConnectedDevice }) => {
  // 设备状态
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(parentConnectedDevice || null);
  const [isScanning, setIsScanning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [connectionHistory, setConnectionHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [connectionMode, setConnectionMode] = useState('normal'); // normal, mock
  
  // 手动IP连接状态
  const [manualConnectModalVisible, setManualConnectModalVisible] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualDeviceName, setManualDeviceName] = useState('');
  const [manualConnectLoading, setManualConnectLoading] = useState(false);
  const [manualConnectForm] = Form.useForm();
  
  const scanIntervalRef = useRef(null);
  const lastScanTimeRef = useRef(null);

  // 监听父组件传递的连接设备变化
  useEffect(() => {
    if (parentConnectedDevice !== connectedDevice) {
      setConnectedDevice(parentConnectedDevice);
    }
  }, [parentConnectedDevice]);

  // 组件加载时尝试恢复收藏设备列表
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteDevices');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Failed to load favorite devices', e);
      }
    }

    // 连接到服务器
    const connectToServer = async () => {
      try {
        await apiService.connect();
        setConnectionStatus(true);
        setConnectionError(null);
      } catch (err) {
        console.warn('连接失败:', err.message);
        setConnectionStatus(false);
        setConnectionError(err.message);
        message.error('无法连接到服务器，请确保后端服务正在运行');
      }
    };

    connectToServer();

    // 监听连接状态变化
    const handleConnectionStateChanged = (data) => {
      setConnectionStatus(data.isConnected);
      if (data.isConnected) {
        message.success('已连接到服务器');
      } else {
        message.warning('已断开与服务器的连接');
      }
    };

    apiService.on('connectionStateChanged', handleConnectionStateChanged);

    // 初始化设备发现
    initializeDeviceDiscovery();

    // 清理函数
    return () => {
      handleStopScan();
      apiService.off('connectionStateChanged', handleConnectionStateChanged);
    };
  }, []);

  // 初始化设备发现
  const initializeDeviceDiscovery = useCallback(async () => {
    try {
      // 注册设备发现事件监听器
      deviceDiscoveryService.on('deviceFound', (device) => {
        setDiscoveredDevices(prevDevices => {
          // 检查设备是否已存在
          const existingIndex = prevDevices.findIndex(d => d.id === device.id || d.ip === device.ip);
          if (existingIndex === -1) {
            // 添加新设备，过滤掉已连接的设备
            if (connectedDevice && connectedDevice.id === device.id) {
              return prevDevices;
            }
            return [...prevDevices, device];
          } else {
            // 更新现有设备
            const updatedDevices = [...prevDevices];
            updatedDevices[existingIndex] = device;
            return updatedDevices;
          }
        });
      });

      deviceDiscoveryService.on('deviceStatusChanged', (data) => {
        setDiscoveredDevices(prevDevices => {
          return prevDevices.map(device => {
            if (device.id === data.device.id) {
              return data.device;
            }
            return device;
          });
        });
      });

      deviceDiscoveryService.on('deviceRemoved', (data) => {
        setDiscoveredDevices(prevDevices => {
          return prevDevices.filter(device => device.id !== data.device.id);
        });
      });

      deviceDiscoveryService.on('scanCompleted', (data) => {
        setDiscoveredDevices(prevDevices => {
          // 过滤掉已连接的设备
          const filteredDevices = data.devices.filter(device => !connectedDevice || device.id !== connectedDevice.id);
          return filteredDevices;
        });
        setIsScanning(false);
        message.success('设备扫描完成');
      });

      deviceDiscoveryService.on('scanError', (data) => {
        setError(`扫描设备失败: ${data.error}`);
        setIsScanning(false);
        message.error(`扫描设备失败: ${data.error}`);
      });

      // 启动设备发现服务
      await deviceDiscoveryService.startScan(true, 30000); // 连续扫描，每30秒一次
    } catch (err) {
      setError(`初始化设备发现失败: ${err.message}`);
      console.error('Failed to initialize device discovery:', err);
    }
  }, [connectedDevice]);

  // 扫描设备
  const handleScanDevices = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    lastScanTimeRef.current = Date.now();
    
    try {
      // 检查连接状态
      const currentConnectionStatus = apiService.getConnectionStatus ? apiService.getConnectionStatus() : { isConnected: connectionStatus };
      
      if (!currentConnectionStatus.isConnected && !currentConnectionStatus.isMockMode) {
        // 未连接且非mock模式，显示提示
        message.warning('未连接到服务器，无法扫描设备');
        setError('未连接到服务器');
        setIsScanning(false);
        return;
      }
      
      // 使用设备发现服务扫描设备
      await deviceDiscoveryService.scan();
      
      // 启动定期扫描
      handleStartAutoScan();
    } catch (err) {
      console.warn('扫描设备失败:', err.message);
      setError(`扫描设备失败: ${err.message}`);
      message.error(`扫描设备失败: ${err.message}`);
      setIsScanning(false);
    }
  }, [connectionStatus]);

  // 开始自动扫描
  const handleStartAutoScan = useCallback(() => {
    // 清除现有的扫描定时器
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    // 设置新的扫描定时器（每30秒扫描一次）
    scanIntervalRef.current = setInterval(() => {
      if (!isScanning) {
        handleRefreshDevices();
      }
    }, 30000);
  }, [isScanning]);

  // 停止扫描
  const handleStopScan = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // 停止设备发现服务
    deviceDiscoveryService.stopScan();
    
    setIsScanning(false);
  }, []);

  // 刷新设备列表
  const handleRefreshDevices = useCallback(async () => {
    if (isScanning || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      await deviceDiscoveryService.scan();
      message.success('设备列表已更新');
    } catch (err) {
      message.error('刷新设备列表失败');
    } finally {
      setIsRefreshing(false);
    }
  }, [isScanning, isRefreshing]);

  // 连接设备
  const handleConnectDevice = useCallback(async (device) => {
    if (isScanning) {
      message.error('正在扫描设备，请等待扫描完成');
      return;
    }

    try {
      // 检查连接状态
      const currentConnectionStatus = apiService.getConnectionStatus ? apiService.getConnectionStatus() : { isConnected: connectionStatus };
      
      // 断开现有连接
      if (connectedDevice) {
        await handleDisconnectDevice();
      }

      // 设置为连接中状态
      setConnectedDevice({
        ...device,
        status: 'connecting'
      });

      if (currentConnectionStatus.isConnected) {
        // 已连接到服务器，正常调用API服务连接设备
        await apiService.connectDevice(device.id);

        // 模拟连接延迟
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 更新连接状态
        const connectedDeviceData = {
          ...device,
          status: 'connected',
          connectedTime: new Date().toISOString()
        };
        
        setConnectedDevice(connectedDeviceData);
        
        // 更新连接历史
        addToConnectionHistory(connectedDeviceData);
        
        // 通知父组件
        if (onDeviceConnect) {
          onDeviceConnect(connectedDeviceData);
        }
        
        message.success(`已成功连接到 ${device.name}`);
      } else if (currentConnectionStatus.isMockMode) {
        // 在mock模式下，模拟连接成功
        setTimeout(() => {
          // 添加mock数据到设备信息
          const mockDevice = {
            ...device,
            battery: device.battery || 85,
            status: 'connected',
            model: device.model || 'Mock-Model',
            connectedTime: new Date().toISOString()
          };
          
          setConnectedDevice(mockDevice);
          
          // 更新连接历史
          addToConnectionHistory(mockDevice);
          
          // 通知父组件
          if (onDeviceConnect) {
            onDeviceConnect(mockDevice);
          }
          
          message.success(`已成功连接到 ${device.name}`);
        }, 1500);
        return; // 提前返回
      } else {
        // 未连接到服务器，尝试直接连接到设备
        try {
          // 使用直接连接模式连接到设备
          const result = await apiService.connectDirectlyToDevice(device);
          
          // 更新连接状态
          const connectedDeviceData = {
            ...device,
            status: 'connected',
            connectedTime: new Date().toISOString()
          };
          
          setConnectedDevice(connectedDeviceData);
          
          // 更新连接历史
          addToConnectionHistory(connectedDeviceData);
          
          // 通知父组件
          if (onDeviceConnect) {
            onDeviceConnect(connectedDeviceData);
          }
          
          message.success(`已直接连接到 ${device.name}`);
        } catch (directConnectError) {
          // 直接连接失败，显示错误信息
          setError(`直接连接设备失败: ${directConnectError.message}`);
          setConnectedDevice(null);
          message.error(`直接连接设备失败: ${directConnectError.message || '未知错误'}`);
        }
      }
    } catch (err) {
      console.warn('连接设备失败:', err.message);
      setError(`连接设备失败: ${err.message}`);
      setConnectedDevice(null);
      message.error(`连接设备失败: ${err.message || '未知错误'}`);
    }
  }, [connectedDevice, isScanning, onDeviceConnect, connectionStatus]);

  // 断开设备连接
  const handleDisconnectDevice = useCallback(async () => {
    if (!connectedDevice) return;

    try {
      // 调用API服务断开连接
      await apiService.disconnectDevice({
        deviceId: connectedDevice.id
      });

      // 通知父组件
      if (onDeviceDisconnect) {
        onDeviceDisconnect(connectedDevice);
      }

      message.success(`已断开与 ${connectedDevice.name} 的连接`);
      
      // 更新状态
      setConnectedDevice(null);
    } catch (err) {
      message.error(`断开连接失败: ${err.message || '未知错误'}`);
    }
  }, [connectedDevice, onDeviceDisconnect]);

  // 打开手动连接模态框
  const handleOpenManualConnectModal = useCallback(() => {
    setManualConnectModalVisible(true);
  }, []);

  // 关闭手动连接模态框
  const handleCloseManualConnectModal = useCallback(() => {
    setManualConnectModalVisible(false);
    manualConnectForm.resetFields();
    setManualIp('');
    setManualDeviceName('');
  }, [manualConnectForm]);

  // 处理手动连接
  const handleManualConnect = useCallback(async (values) => {
    const { ip, deviceName } = values;
    
    if (!ip) {
      message.error('请输入设备IP地址');
      return;
    }

    setManualConnectLoading(true);
    
    try {
      // 创建手动输入的设备对象
      const manualDevice = {
        id: `manual_${ip.replace(/\./g, '_')}`,
        name: deviceName || `手动连接设备`,
        model: 'Manual Connection',
        ip: ip,
        battery: 100,
        status: 'available',
        lastSeen: new Date().toISOString()
      };

      // 调用连接设备函数
      await handleConnectDevice(manualDevice);
      
      // 关闭模态框
      handleCloseManualConnectModal();
    } catch (err) {
      console.warn('手动连接设备失败:', err.message);
      message.error(`手动连接设备失败: ${err.message || '未知错误'}`);
    } finally {
      setManualConnectLoading(false);
    }
  }, [handleConnectDevice, handleCloseManualConnectModal]);

  // 切换收藏设备
  const toggleFavorite = useCallback((deviceId) => {
    const isFavorite = favorites.some(fav => fav.id === deviceId);
    let newFavorites;
    
    if (isFavorite) {
      // 移除收藏
      newFavorites = favorites.filter(fav => fav.id !== deviceId);
      message.info('已取消收藏');
    } else {
      // 添加收藏
      const device = discoveredDevices.find(d => d.id === deviceId) || 
                   connectionHistory.find(d => d.id === deviceId);
      
      if (device) {
        newFavorites = [...favorites, { id: device.id, name: device.name, model: device.model }];
        message.success('已添加到收藏');
      } else {
        message.error('设备不存在');
        return;
      }
    }
    
    setFavorites(newFavorites);
    localStorage.setItem('favoriteDevices', JSON.stringify(newFavorites));
  }, [favorites, discoveredDevices, connectionHistory]);

  // 更新连接历史
  const updateConnectionHistory = useCallback((devices) => {
    // 这里可以从localStorage加载历史记录
    // 为简化示例，我们只在内存中维护
  }, []);

  // 添加到连接历史
  const addToConnectionHistory = useCallback((device) => {
    const historyEntry = {
      id: Date.now(),
      deviceId: device.id,
      deviceName: device.name,
      deviceModel: device.model,
      connectionTime: new Date().toISOString(),
      status: 'connected'
    };
    
    setConnectionHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // 只保留最近10条记录
    
    // 保存到localStorage
    const savedHistory = localStorage.getItem('connectionHistory');
    let history = [];
    if (savedHistory) {
      try {
        history = JSON.parse(savedHistory);
      } catch (e) {
        console.error('Failed to parse connection history', e);
      }
    }
    
    history.unshift(historyEntry);
    history = history.slice(0, 20); // 最多保存20条记录
    localStorage.setItem('connectionHistory', JSON.stringify(history));
  }, []);

  // 格式化时间显示
  const formatTimeAgo = useCallback((dateTimeString) => {
    const date = new Date(dateTimeString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}秒前`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  }, []);

  // 格式化电池显示
  const getBatteryStatus = useCallback((batteryLevel) => {
    if (batteryLevel >= 70) return { status: 'good', color: 'green' };
    if (batteryLevel >= 30) return { status: 'normal', color: 'orange' };
    return { status: 'low', color: 'red' };
  }, []);

  // 渲染设备卡片
  const renderDeviceCard = useCallback((device) => {
    const isConnected = connectedDevice && connectedDevice.id === device.id;
    const isConnecting = device.status === 'connecting';
    const isFavorite = favorites.some(fav => fav.id === device.id);
    const batteryStatus = getBatteryStatus(device.battery);
    
    return (
      <Card
        key={device.id}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size="middle" align="center">
              <Avatar icon={<AndroidOutlined />} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{device.name}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>{device.model}</div>
              </div>
            </Space>
            <Button
              type="text"
              icon={isFavorite ? <StarFilled style={{ color: '#ffd700' }} /> : <StarOutlined />}
              onClick={() => toggleFavorite(device.id)}
              size="small"
            />
          </div>
        }
        extra={
          <Space orientation="vertical" align="end">
            {isConnected ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>已连接</Tag>
            ) : isConnecting ? (
              <Tag icon={<LoadingOutlined spin />} color="processing">连接中...</Tag>
            ) : (
              <Tag color="blue">可用</Tag>
            )}
            <Text type="secondary">{device.ip}</Text>
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <Space size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">电池</Text>
            <div style={{ marginTop: '4px' }}>
              <Tag color={batteryStatus.color}>{device.battery}%</Tag>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">上次在线</Text>
            <div style={{ marginTop: '4px' }}>
              <Text>{formatTimeAgo(device.lastSeen)}</Text>
            </div>
          </div>
        </Space>
        
        <Divider />
        
        <div style={{ textAlign: 'right' }}>
          {isConnected ? (
            <Button
              type="default"
              danger
              icon={<DisconnectOutlined />}
              onClick={() => handleDisconnectDevice()}
            >
              断开连接
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<WifiOutlined />}
              onClick={() => handleConnectDevice(device)}
              disabled={isConnecting || isScanning}
            >
              {isConnecting ? (
                <>
                  <LoadingOutlined spin />
                  <span>连接中...</span>
                </>
              ) : '连接设备'}
            </Button>
          )}
        </div>
      </Card>
    );
  }, [connectedDevice, favorites, isScanning, getBatteryStatus, formatTimeAgo, toggleFavorite, handleConnectDevice, handleDisconnectDevice]);

  // 渲染已连接设备信息
  const renderConnectedDeviceInfo = useCallback(() => {
    if (!connectedDevice) return null;
    
    const batteryStatus = getBatteryStatus(connectedDevice.battery);
    
    return (
      <Card
        title="已连接设备"
        extra={<Tag color="success" icon={<CheckCircleOutlined />}>已连接</Tag>}
        style={{ marginBottom: '24px' }}
      >
        <Space size="large" align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="center">
            <Avatar size={64} icon={<AndroidOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>{connectedDevice.name}</Title>
              <Text type="secondary">{connectedDevice.model}</Text>
            </div>
          </Space>
          
          <Space orientation="vertical" align="end">
            <Button
              type="default"
              danger
              icon={<DisconnectOutlined />}
              onClick={handleDisconnectDevice}
              style={{ marginBottom: '8px' }}
            >
              断开连接
            </Button>
            <div>
              <Tag color={batteryStatus.color}>电池: {connectedDevice.battery}%</Tag>
            </div>
          </Space>
        </Space>
      </Card>
    );
  }, [connectedDevice, getBatteryStatus, handleDisconnectDevice]);

  // 渲染收藏设备
  const renderFavoriteDevices = useCallback(() => {
    if (favorites.length === 0) return null;
    
    // 获取收藏设备的详细信息
    const favoriteDevicesList = favorites.map(fav => {
      const device = discoveredDevices.find(d => d.id === fav.id) || 
                    (connectedDevice && connectedDevice.id === fav.id ? connectedDevice : null);
      return device || fav;
    });
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <Title level={4}>收藏设备</Title>
        <div className="favorite-devices-list">
          {favoriteDevicesList.map(device => (
            <Card 
              key={device.id} 
              style={{ marginBottom: '12px' }}
              bodyStyle={{ padding: '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar icon={<AndroidOutlined />} style={{ marginRight: '12px' }} />
                  <div>
                    <Space size="middle" align="center">
                      <span>{device.name}</span>
                      {device.model && <Text type="secondary">{device.model}</Text>}
                      <StarFilled style={{ color: '#ffd700' }} />
                    </Space>
                    <Space size="middle" style={{ marginTop: '4px', display: 'block' }}>
                      {device.ip && <Text type="secondary">{device.ip}</Text>}
                      {connectedDevice && connectedDevice.id === device.id && (
                        <Tag color="success">已连接</Tag>
                      )}
                    </Space>
                  </div>
                </div>
                <Button
                  type="link"
                  icon={<WifiOutlined />}
                  onClick={() => {
                    const fullDevice = discoveredDevices.find(d => d.id === device.id);
                    if (fullDevice) {
                      handleConnectDevice(fullDevice);
                    } else {
                      message.error('设备当前不可用，请先扫描设备');
                      handleScanDevices();
                    }
                  }}
                >
                  连接
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }, [favorites, discoveredDevices, connectedDevice, handleConnectDevice, handleScanDevices]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={3}>设备发现</Title>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            backgroundColor: connectionStatus ? '#52c41a' : '#d9d9d9',
            marginRight: 8,
            display: 'inline-block'
          }} />
          <Text type="secondary">
            {connectionStatus ? '已连接' : '未连接'}
          </Text>
        </div>
      </div>
      
      {error && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px', 
          backgroundColor: '#fff2f0', 
          border: '1px solid #ffccc7', 
          borderRadius: '4px',
          color: '#ff4d4f',
          display: 'flex',
          alignItems: 'center'
        }}>
          <InfoCircleOutlined style={{ marginRight: '8px' }} />
          <Text>{error}</Text>
        </div>
      )}
      
      {/* 已连接设备信息 */}
      {renderConnectedDeviceInfo()}
      
      {/* 设备扫描控制 */}
      <div style={{ marginBottom: '24px' }}>
        <Card>
          <Space size="large">
            <Button
              type="primary"
              icon={isScanning ? <LoadingOutlined spin /> : <SearchOutlined />}
              onClick={handleScanDevices}
              loading={isScanning}
              disabled={isScanning}
              size="large"
            >
              {isScanning ? '扫描中...' : '扫描设备'}
            </Button>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleOpenManualConnectModal}
              size="large"
            >
              手动输入IP连接
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefreshDevices}
              loading={isRefreshing}
              disabled={isScanning || isRefreshing}
              size="large"
            >
              刷新列表
            </Button>
            <Button
              danger
              icon={<DisconnectOutlined />}
              onClick={handleStopScan}
              disabled={!isScanning}
              size="large"
            >
              停止扫描
            </Button>
          </Space>
          
          {lastScanTimeRef.current && (
            <div style={{ marginTop: '12px', color: '#666' }}>
              <Text type="secondary">上次扫描: {formatTimeAgo(lastScanTimeRef.current)}</Text>
            </div>
          )}
        </Card>
      </div>
      
      {/* 手动IP连接模态框 */}
      <Modal
        title="手动输入IP连接"
        open={manualConnectModalVisible}
        onCancel={handleCloseManualConnectModal}
        footer={null}
        width={500}
      >
        <Form
          form={manualConnectForm}
          layout="vertical"
          onFinish={handleManualConnect}
        >
          <Form.Item
            name="deviceName"
            label="设备名称"
            rules={[{ required: false, message: '请输入设备名称' }]}
          >
            <Input
              placeholder="例如: My Android Device"
              onChange={(e) => setManualDeviceName(e.target.value)}
            />
          </Form.Item>
          
          <Form.Item
            name="ip"
            label="设备IP地址"
            rules={[
              { required: true, message: '请输入设备IP地址' },
              {
                pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                message: '请输入有效的IP地址'
              }
            ]}
          >
            <Input
              placeholder="例如: 192.168.1.100"
              onChange={(e) => setManualIp(e.target.value)}
            />
          </Form.Item>
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleCloseManualConnectModal}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={manualConnectLoading}>
                连接设备
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 收藏设备 */}
      {renderFavoriteDevices()}
      
      {/* 发现的设备列表 */}
      <div>
        <Title level={4}>发现的设备</Title>
        
        {isScanning ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large">
              <p style={{ marginTop: '20px' }}>正在搜索附近的设备...</p>
            </Spin>
          </div>
        ) : discoveredDevices.length === 0 ? (
          <Empty
            description="未发现可用设备"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleScanDevices}>
              重新扫描
            </Button>
            <Paragraph style={{ marginTop: '16px', color: '#666' }}>
              请确保您的Android设备已启用WiFi并运行相关服务
            </Paragraph>
          </Empty>
        ) : (
          <List
            dataSource={discoveredDevices}
            renderItem={device => renderDeviceCard(device)}
            pagination={{
              pageSize: 3,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 台设备`
            }}
          />
        )}
      </div>
      
      {/* 连接提示 */}
      <Card style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <InfoCircleOutlined style={{ marginRight: '8px', color: '#1890ff', fontSize: '20px' }} />
          <Text>
            连接到Android设备后，您可以使用文件传输、屏幕共享等功能。
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default DeviceDiscovery;