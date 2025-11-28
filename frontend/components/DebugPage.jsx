import React, { useState, useEffect } from 'react';
import { Card, Tabs, Button, message, Table, Input, Form, Switch, Collapse, Badge, Divider } from 'antd';
import { 
  PlayCircleOutlined, StopOutlined, ReloadOutlined, BugOutlined, 
  MonitorOutlined, FileOutlined, MobileOutlined, MessageOutlined,
  LinkOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, DatabaseOutlined, EditOutlined
} from '@ant-design/icons';
import './DebugPage.css';

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { TextArea } = Input;

// 模拟数据
const mockDevices = [
  { id: 'android-001', type: 'Android', name: 'Pixel 7', ip: '192.168.1.101', status: 'connected' },
  { id: 'windows-001', type: 'Windows', name: 'Desktop PC', ip: '192.168.1.102', status: 'connected' },
  { id: 'android-002', type: 'Android', name: 'Samsung Galaxy', ip: '192.168.1.103', status: 'disconnected' },
];

const mockConnectionLog = [
  { id: 1, timestamp: new Date().toLocaleString(), type: 'info', message: '系统启动成功' },
  { id: 2, timestamp: new Date().toLocaleString(), type: 'success', message: 'WebSocket服务器启动在端口 8928' },
  { id: 3, timestamp: new Date().toLocaleString(), type: 'warning', message: '发现潜在的网络延迟' },
];

const DebugPage = () => {
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [simulatedDevices, setSimulatedDevices] = useState(mockDevices);
  const [logs, setLogs] = useState(mockConnectionLog);
  const [activeTab, setActiveTab] = useState('connection');
  const [messageInput, setMessageInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  // 添加日志记录
  const addLog = (type, message) => {
    const newLog = {
      id: logs.length + 1,
      timestamp: new Date().toLocaleString(),
      type,
      message
    };
    setLogs([...logs, newLog]);
  };

  // 模拟WebSocket连接
  const simulateConnection = () => {
    setConnectionStatus(true);
    addLog('success', '模拟WebSocket连接建立成功');
    message.success('WebSocket连接已模拟');
  };

  // 断开模拟连接
  const disconnectConnection = () => {
    setConnectionStatus(false);
    addLog('error', 'WebSocket连接已断开');
    message.info('WebSocket连接已断开');
  };

  // 模拟设备发现
  const simulateDeviceDiscovery = () => {
    const newDevice = {
      id: `android-${Date.now()}`,
      type: 'Android',
      name: `模拟设备-${Math.floor(Math.random() * 1000)}`,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      status: 'connected'
    };
    setSimulatedDevices([...simulatedDevices, newDevice]);
    addLog('info', `发现新设备: ${newDevice.name} (${newDevice.ip})`);
    message.success(`设备发现成功: ${newDevice.name}`);
  };

  // 模拟发送消息
  const sendTestMessage = () => {
    if (!messageInput.trim()) {
      message.warning('请输入消息内容');
      return;
    }
    addLog('info', `发送测试消息: ${messageInput}`);
    message.success('测试消息已发送');
    setMessageInput('');
  };

  // 模拟文件传输
  const simulateFileTransfer = () => {
    addLog('info', '开始模拟文件传输...');
    message.loading('文件传输模拟中...', 1.5)
      .then(() => {
        addLog('success', '文件传输完成: document.pdf (2.5MB)');
        message.success('文件传输模拟成功');
      });
  };

  // 模拟屏幕共享
  const toggleScreenSharing = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      addLog('info', '开始模拟屏幕共享');
      message.success('屏幕共享已启动');
    } else {
      addLog('info', '停止屏幕共享');
      message.info('屏幕共享已停止');
    }
  };

  // 连接状态表格列配置
  const logColumns = [
    {
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        let color = 'default';
        let icon = <MessageOutlined />;
        
        switch(type) {
          case 'success':
            color = 'success';
            icon = <CheckCircleOutlined />;
            break;
          case 'error':
            color = 'error';
            icon = <CloseCircleOutlined />;
            break;
          case 'warning':
            color = 'warning';
            icon = <BugOutlined />;
            break;
          case 'info':
          default:
            color = 'info';
        }
        
        return <Badge color={color} text={<span>{icon} {type}</span>} />;
      }
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    }
  ];

  // 设备表格列配置
  const deviceColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: '设备类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span>
          {type === 'Android' ? 
            <MobileOutlined style={{ color: '#3f8600' }} /> : 
            <MonitorOutlined style={{ color: '#1890ff' }} />
          } {type}
        </span>
      )
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          color={status === 'connected' ? 'success' : 'default'} 
          text={status === 'connected' ? '已连接' : '未连接'} 
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          size="small" 
          icon={record.status === 'connected' ? <LinkOutlined /> : <CloseCircleOutlined />}
          onClick={() => {
            const updatedDevices = simulatedDevices.map(device => 
              device.id === record.id 
                ? { ...device, status: device.status === 'connected' ? 'disconnected' : 'connected' }
                : device
            );
            setSimulatedDevices(updatedDevices);
            addLog('info', `${record.name} 连接状态切换为 ${record.status === 'connected' ? 'disconnected' : 'connected'}`);
          }}
        >
          {record.status === 'connected' ? '断开' : '连接'}
        </Button>
      )
    }
  ];

  return (
    <div className="debug-page">
      <Card 
        title={<span><BugOutlined /> 调试中心</span>} 
        className="main-debug-card"
        extra={
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={() => {
              window.location.reload();
            }}
          >
            重置调试
          </Button>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="debug-tabs">
          {/* 连接测试标签页 */}
          <TabPane 
            tab={<span><LinkOutlined /> 连接测试</span>} 
            key="connection"
          >
            <Card title="WebSocket连接状态" size="small" className="status-card">
              <div className="connection-status-container">
                <div className="status-indicator">
                  <Badge 
                    status={connectionStatus ? 'success' : 'default'} 
                    text={connectionStatus ? '已连接' : '未连接'} 
                  />
                </div>
                <div className="connection-actions">
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />} 
                    onClick={simulateConnection}
                    disabled={connectionStatus}
                  >
                    模拟连接
                  </Button>
                  <Button 
                    danger 
                    icon={<StopOutlined />} 
                    onClick={disconnectConnection}
                    disabled={!connectionStatus}
                  >
                    断开连接
                  </Button>
                </div>
              </div>
              
              <Divider orientation="left">连接配置</Divider>
              <Form layout="vertical">
                <Form.Item label="WebSocket URL">
                  <Input value="ws://localhost:8928" disabled />
                </Form.Item>
                <Form.Item label="重连间隔 (ms)">
                  <Input type="number" defaultValue={3000} />
                </Form.Item>
                <Form.Item>
                  <Switch defaultChecked /> 自动重连
                </Form.Item>
              </Form>
            </Card>

            <Card title="设备发现测试" size="small" className="status-card" style={{ marginTop: 16 }}>
              <Button 
                type="primary" 
                icon={<MobileOutlined />} 
                onClick={simulateDeviceDiscovery}
                style={{ marginBottom: 16 }}
              >
                模拟发现设备
              </Button>
              <Table 
                columns={deviceColumns} 
                dataSource={simulatedDevices} 
                rowKey="id" 
                size="small"
                pagination={false}
              />
            </Card>
          </TabPane>

          {/* 功能测试标签页 */}
          <TabPane 
            tab={<span><PlayCircleOutlined /> 功能测试</span>} 
            key="functions"
          >
            <Card title="消息传输测试" size="small" className="function-card">
              <Form layout="vertical">
                <Form.Item label="测试消息">
                  <TextArea 
                    rows={4} 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="输入测试消息..."
                  />
                </Form.Item>
                <Form.Item>
                  <Button 
                    type="primary" 
                    icon={<MessageOutlined />} 
                    onClick={sendTestMessage}
                  >
                    发送测试消息
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card title="文件传输测试" size="small" className="function-card" style={{ marginTop: 16 }}>
              <div className="file-transfer-simulation">
                <p>模拟文件: document.pdf (2.5MB)</p>
                <Button 
                  type="primary" 
                  icon={<FileOutlined />} 
                  onClick={simulateFileTransfer}
                  style={{ marginBottom: 16 }}
                >
                  模拟文件传输
                </Button>
                <div className="file-transfer-progress">
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: '0%' }}></div>
                  </div>
                  <div className="progress-text">0%</div>
                </div>
              </div>
            </Card>

            <Card title="屏幕共享测试" size="small" className="function-card" style={{ marginTop: 16 }}>
              <div className="screen-share-simulation">
                <Badge 
                  status={isRecording ? 'processing' : 'default'} 
                  text={isRecording ? '屏幕共享中' : '未共享'} 
                  style={{ marginBottom: 16 }}
                />
                <Button 
                  type={isRecording ? 'default' : 'primary'} 
                  icon={isRecording ? <StopOutlined /> : <PlayCircleOutlined />} 
                  onClick={toggleScreenSharing}
                >
                  {isRecording ? '停止共享' : '开始共享'}
                </Button>
                {isRecording && (
                  <div className="screen-preview">
                    <div className="preview-placeholder">
                      <MonitorOutlined style={{ fontSize: 48, color: '#ccc' }} />
                      <p>模拟屏幕预览</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabPane>

          {/* 日志监控标签页 */}
          <TabPane 
            tab={<span><DatabaseOutlined /> 日志监控</span>} 
            key="logs"
          >
            <Card title="系统日志" size="small" className="logs-card">
              <div className="logs-controls">
                <Button 
                  icon={<DatabaseOutlined />} 
                  onClick={() => {
                    addLog('info', '手动添加日志测试');
                  }}
                >
                  添加测试日志
                </Button>
                <Button 
                  danger 
                  icon={<StopOutlined />} 
                  onClick={() => {
                    setLogs([]);
                    addLog('warning', '日志已清空');
                  }}
                >
                  清空日志
                </Button>
              </div>
              <Table 
                columns={logColumns} 
                dataSource={logs} 
                rowKey="id" 
                size="small"
                pagination={{ pageSize: 10 }}
                scroll={{ y: 400 }}
                className="logs-table"
              />
            </Card>
          </TabPane>

          {/* 高级测试标签页 */}
          <TabPane 
            tab={<span><EyeOutlined /> 高级测试</span>} 
            key="advanced"
          >
            <Card title="模拟链路测试" size="small" className="advanced-card">
              <Collapse defaultActiveKey={['1']}>
                <Panel header="完整链路模拟" key="1">
                  <p>此功能可模拟从设备发现到数据传输的完整链路</p>
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />} 
                    size="large"
                    onClick={() => {
                      simulateConnection();
                      setTimeout(simulateDeviceDiscovery, 1000);
                      setTimeout(() => {
                        setMessageInput('测试链路消息');
                        setTimeout(sendTestMessage, 500);
                      }, 2000);
                      setTimeout(toggleScreenSharing, 3000);
                      setTimeout(simulateFileTransfer, 4000);
                      message.success('完整链路模拟已启动，观察日志面板查看执行过程');
                    }}
                  >
                    启动完整链路测试
                  </Button>
                </Panel>
                <Panel header="故障模拟" key="2">
                  <p>模拟网络故障和连接问题</p>
                  <div className="fault-simulation">
                    <Button 
                      danger 
                      icon={<BugOutlined />}
                      onClick={() => {
                        disconnectConnection();
                        addLog('error', '模拟网络故障: 连接超时');
                        message.error('网络故障模拟已触发');
                      }}
                      style={{ marginRight: 10 }}
                    >
                      模拟连接超时
                    </Button>
                    <Button 
                      danger 
                      icon={<CloseCircleOutlined />}
                      onClick={() => {
                        addLog('error', '模拟数据损坏: 接收到无效数据包');
                        message.error('数据损坏模拟已触发');
                      }}
                    >
                      模拟数据损坏
                    </Button>
                  </div>
                </Panel>
              </Collapse>
            </Card>

            <Card title="性能监控" size="small" className="advanced-card" style={{ marginTop: 16 }}>
              <div className="performance-monitor">
                <p>模拟性能指标:</p>
                <div className="performance-metrics">
                  <div className="metric-item">
                    <span className="metric-label">CPU使用率:</span>
                    <Badge color="blue" text="12%" />
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">内存占用:</span>
                    <Badge color="green" text="256MB" />
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">网络延迟:</span>
                    <Badge color="success" text="8ms" />
                  </div>
                </div>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default DebugPage;