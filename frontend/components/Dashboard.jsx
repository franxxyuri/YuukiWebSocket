import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Timeline, Button, Space, Tag, Progress, Avatar, Badge } from 'antd';
import {
  AppstoreOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  LaptopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SendOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  ControlOutlined
} from '@ant-design/icons';
import apiService from '../src/services/api-service';
import configManager from '../src/services/ConfigManager';

const Dashboard = () => {
  // 状态管理
  const [connectedDevices, setConnectedDevices] = useState(0);
  const [totalDevices, setTotalDevices] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemStatus, setSystemStatus] = useState({ status: 'unknown', cpuUsage: 0, memoryUsage: 0, networkDelay: 0 });
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(false);

  // 初始化数据
  useEffect(() => {
    loadDashboardData();
    
    // 定期刷新数据
    const interval = setInterval(() => {
      loadDashboardData();
    }, 5000);
    
    // 监听连接状态变化
    apiService.on('connectionStateChanged', handleConnectionStateChanged);
    
    return () => {
      clearInterval(interval);
      apiService.off('connectionStateChanged', handleConnectionStateChanged);
    };
  }, []);

  // 处理连接状态变化
  const handleConnectionStateChanged = (data) => {
    setConnectionStatus(data.isConnected);
    if (data.isConnected) {
      loadDashboardData();
    }
  };

  // 加载仪表盘数据
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const currentStrategy = apiService.getCurrentConnectionStrategy();
      
      if (currentStrategy === 'mock') {
        // 模拟模式下使用模拟数据
        const mockData = {
          connectedDevices: 2,
          totalDevices: 5,
          recentActivities: [
            { id: 1, type: 'device_connected', deviceName: 'Android Phone', time: '2024-01-15 14:30:00', status: 'success' },
            { id: 2, type: 'file_transfer', fileName: 'document.pdf', deviceName: 'Windows PC', time: '2024-01-15 14:25:00', status: 'success' },
            { id: 3, type: 'screen_share', deviceName: 'Android Tablet', time: '2024-01-15 14:20:00', status: 'success' },
            { id: 4, type: 'device_disconnected', deviceName: 'iOS Device', time: '2024-01-15 14:15:00', status: 'error' },
            { id: 5, type: 'remote_control', deviceName: 'Windows PC', time: '2024-01-15 14:10:00', status: 'success' }
          ],
          systemStatus: { status: 'running', cpuUsage: 35, memoryUsage: 65, networkDelay: 12 },
          notifications: [
            { id: 1, message: '设备 "Android Phone" 已连接', type: 'success', time: '2024-01-15 14:30:00', read: false },
            { id: 2, message: '文件 "document.pdf" 传输完成', type: 'success', time: '2024-01-15 14:25:00', read: false },
            { id: 3, message: '设备 "iOS Device" 已断开连接', type: 'warning', time: '2024-01-15 14:15:00', read: true }
          ]
        };
        
        // 更新状态
        setConnectedDevices(mockData.connectedDevices);
        setTotalDevices(mockData.totalDevices);
        setRecentActivities(mockData.recentActivities);
        setSystemStatus(mockData.systemStatus);
        setNotifications(mockData.notifications);
        setConnectionStatus(true);
      } else {
        // 真实模式下从API获取数据
        try {
          // 这里可以添加真实API调用逻辑
          // 目前暂时使用模拟数据
          const mockData = {
            connectedDevices: 0,
            totalDevices: 0,
            recentActivities: [],
            systemStatus: { status: 'running', cpuUsage: 0, memoryUsage: 0, networkDelay: 0 },
            notifications: []
          };
          
          // 更新状态
          setConnectedDevices(mockData.connectedDevices);
          setTotalDevices(mockData.totalDevices);
          setRecentActivities(mockData.recentActivities);
          setSystemStatus(mockData.systemStatus);
          setNotifications(mockData.notifications);
          setConnectionStatus(true);
        } catch (error) {
          console.error('加载真实数据失败:', error);
          setConnectionStatus(false);
        }
      }
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
      setConnectionStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // 渲染设备状态卡片
  const renderDeviceStatusCards = () => {
    return (
      <Row gutter={[16, 16]}>
        <Col span={24} md={8}>
          <Card>
            <Statistic
              title="已连接设备"
              value={connectedDevices}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${totalDevices} 台设备`}
            />
          </Card>
        </Col>
        <Col span={24} md={8}>
          <Card>
            <Statistic
              title="系统状态"
              value={systemStatus.status === 'running' ? '运行中' : '异常'}
              prefix={systemStatus.status === 'running' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              valueStyle={{ color: systemStatus.status === 'running' ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={24} md={8}>
          <Card>
            <Statistic
              title="网络延迟"
              value={systemStatus.networkDelay}
              prefix={<ClockCircleOutlined />}
              suffix="ms"
              valueStyle={{ color: systemStatus.networkDelay < 100 ? '#52c41a' : systemStatus.networkDelay < 200 ? '#faad14' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染系统资源使用情况
  const renderSystemResources = () => {
    return (
      <Card title="系统资源使用情况" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={24} md={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>CPU 使用率</span>
                <span>{systemStatus.cpuUsage}%</span>
              </div>
              <Progress percent={systemStatus.cpuUsage} status="active" />
            </div>
          </Col>
          <Col span={24} md={12}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>内存使用率</span>
                <span>{systemStatus.memoryUsage}%</span>
              </div>
              <Progress percent={systemStatus.memoryUsage} status="active" />
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  // 渲染最近活动
  const renderRecentActivities = () => {
    const activityTypes = {
      device_connected: { icon: <CheckCircleOutlined />, color: '#52c41a', text: '设备连接' },
      device_disconnected: { icon: <CloseCircleOutlined />, color: '#ff4d4f', text: '设备断开' },
      file_transfer: { icon: <FileTextOutlined />, color: '#1890ff', text: '文件传输' },
      screen_share: { icon: <VideoCameraOutlined />, color: '#722ed1', text: '屏幕共享' },
      remote_control: { icon: <LaptopOutlined />, color: '#fa8c16', text: '远程控制' }
    };

    return (
      <Card title="最近活动" style={{ marginTop: 16 }}>
        <Timeline>
          {recentActivities.map(activity => {
            const typeInfo = activityTypes[activity.type] || { icon: <InfoCircleOutlined />, color: '#8c8c8c', text: '未知活动' };
            return (
              <Timeline.Item key={activity.id} color={activity.status === 'success' ? 'green' : 'red'}>
                <Space size="middle">
                  {typeInfo.icon}
                  <span>
                    <strong>{typeInfo.text}</strong> - {activity.deviceName}
                    {activity.fileName && <span> (文件: {activity.fileName})</span>}
                  </span>
                  <Tag color={typeInfo.color}>{activity.time}</Tag>
                </Space>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Card>
    );
  };

  // 渲染快捷操作
  const renderQuickActions = () => {
    return (
      <Card title="快捷操作" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={24} md={6}>
            <Button type="primary" block size="large" icon={<AppstoreOutlined />}>
              设备发现
            </Button>
          </Col>
          <Col span={24} md={6}>
            <Button type="primary" block size="large" icon={<SendOutlined />}>
              发送文件
            </Button>
          </Col>
          <Col span={24} md={6}>
            <Button type="primary" block size="large" icon={<ShareAltOutlined />}>
              屏幕共享
            </Button>
          </Col>
          <Col span={24} md={6}>
            <Button type="primary" block size="large" icon={<ControlOutlined />}>
              远程控制
            </Button>
          </Col>
        </Row>
      </Card>
    );
  };

  // 渲染通知中心
  const renderNotificationCenter = () => {
    return (
      <Card title="通知中心" style={{ marginTop: 16 }}>
        <List
          dataSource={notifications}
          renderItem={notification => (
            <List.Item
              actions={[<Button size="small" type="link">标记已读</Button>]}
            >
              <List.Item.Meta
                avatar={
                  <Badge dot={!notification.read}>
                    <Avatar
                      icon={
                        notification.type === 'success' ? <CheckCircleOutlined /> :
                        notification.type === 'warning' ? <InfoCircleOutlined /> :
                        <CloseCircleOutlined />
                      }
                      style={{
                        backgroundColor: notification.type === 'success' ? '#52c41a' :
                        notification.type === 'warning' ? '#faad14' : '#ff4d4f'
                      }}
                    />
                  </Badge>
                }
                title={notification.message}
                description={notification.time}
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>仪表盘</h2>
        <Space>
          <Button
            type="primary"
            icon={loading ? <LoadingOutlined /> : <ReloadOutlined />}
            onClick={loadDashboardData}
            loading={loading}
          >
            刷新数据
          </Button>
          <Button
            type={apiService.getCurrentConnectionStrategy() === 'mock' ? 'primary' : 'default'}
            icon={apiService.getCurrentConnectionStrategy() === 'mock' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            onClick={() => {
              const currentStrategy = apiService.getCurrentConnectionStrategy();
              const newStrategy = currentStrategy === 'mock' ? 'websocket' : 'mock';
              apiService.switchConnectionStrategy(newStrategy);
              loadDashboardData();
            }}
          >
            {apiService.getCurrentConnectionStrategy() === 'mock' ? '模拟模式' : '真实模式'}
          </Button>
        </Space>
      </div>
      
      {!connectionStatus && (
        <Card title="连接状态" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
            <InfoCircleOutlined style={{ fontSize: 24, color: '#faad14', marginRight: 16 }} />
            <span style={{ fontSize: 16 }}>未连接到服务器，请检查网络连接或服务器状态</span>
          </div>
        </Card>
      )}
      
      {connectionStatus && (
        <>
          {renderDeviceStatusCards()}
          {renderSystemResources()}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24} md={12}>
              {renderRecentActivities()}
            </Col>
            <Col span={24} md={12}>
              {renderNotificationCenter()}
            </Col>
          </Row>
          {renderQuickActions()}
        </>
      )}
    </div>
  );
};

export default Dashboard;