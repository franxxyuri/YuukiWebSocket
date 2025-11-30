import React, { useState, useEffect } from 'react';
import './ConfigurationPage.css';
import { Card, Form, Input, Select, Switch, Button, message, Statistic, Row, Col, Divider, Tabs, Table, Tooltip } from 'antd';
import { SettingOutlined, LinkOutlined, DisconnectOutlined, SendOutlined, EyeOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, ClockCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import apiService from '../src/services/api-service';
import configManager from '../src/services/ConfigManager';
import connectionManager from '../src/services/ConnectionManager';

const ConfigurationPage = () => {
  const [form] = Form.useForm();
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [connectionType, setConnectionType] = useState('');
  const [testResponse, setTestResponse] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('config');
  // 自测状态管理
  const [isRunningSelfTest, setIsRunningSelfTest] = useState(false);
  const [selfTestResults, setSelfTestResults] = useState(null);

  // 初始化配置和连接状态
  useEffect(() => {
    // 加载当前配置
    const currentConfig = configManager.getConfig();
    form.setFieldsValue({
      connectionUrl: currentConfig.connection.url || '',
      autoReconnect: currentConfig.connection.autoReconnect || true,
      reconnectAttempts: currentConfig.connection.maxReconnectAttempts || 5,
      reconnectDelay: currentConfig.connection.reconnectDelay || 1000,
      strategyType: currentConfig.connection.strategyType || 'websocket',
      messageTimeout: currentConfig.connection.messageTimeout || 5000,
      debugMode: currentConfig.debugMode || false
    });

    // 获取当前连接状态
    setConnectionStatus(connectionManager.isConnected());
    setConnectionType(connectionManager.getCurrentStrategyType());

    // 监听连接状态变化
    apiService.on('connection_established', handleConnectionEstablished);
    apiService.on('connection_lost', handleConnectionLost);

    return () => {
      apiService.off('connection_established');
      apiService.off('connection_lost');
    };
  }, []);

  // 连接状态处理
  const handleConnectionEstablished = () => {
    setConnectionStatus(true);
    setConnectionType(connectionManager.getCurrentStrategyType());
    addLog('连接已建立');
  };

  const handleConnectionLost = () => {
    setConnectionStatus(false);
    addLog('连接已断开');
  };

  // 添加日志记录
  const addLog = (message) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message
    };
    setLogs(prev => [newLog, ...prev.slice(0, 50)]); // 只保留最近50条日志
  };

  // 保存配置
  const handleSaveConfig = async (values) => {
    try {
      const newConfig = {
        connection: {
          url: values.connectionUrl,
          autoReconnect: values.autoReconnect,
          maxReconnectAttempts: values.reconnectAttempts,
          reconnectDelay: values.reconnectDelay,
          strategyType: values.strategyType,
          messageTimeout: values.messageTimeout
        },
        debugMode: values.debugMode
      };
      
      configManager.set(newConfig);
      message.success('配置已保存');
      addLog('配置已保存并应用');
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败');
    }
  };

  // 重新连接
  const handleReconnect = async () => {
    try {
      addLog('开始重新连接...');
      await apiService.connect();
      message.success('重连成功');
    } catch (error) {
      console.error('重连失败:', error);
      message.error('重连失败');
      addLog('重连失败: ' + error.message);
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    try {
      addLog('断开连接...');
      await apiService.disconnect();
      message.success('已断开连接');
    } catch (error) {
      console.error('断开连接失败:', error);
      message.error('断开连接失败');
    }
  };

  // 切换连接策略
  const handleStrategySwitch = async (strategyType) => {
    try {
      const strategyName = {
        'websocket': 'WebSocket',
        'tcp': 'TCP',
        'kcp': 'KCP',
        'mock': '模拟'
      }[strategyType] || strategyType;
      
      addLog(`切换到${strategyName}策略...`);
      await connectionManager.switchStrategy(strategyType);
      setConnectionType(strategyType);
      form.setFieldValue('strategyType', strategyType);
      message.success(`已切换到${strategyName}策略`);
      
      // 更新配置
      const currentConfig = configManager.getConfig();
      currentConfig.connection.strategyType = strategyType;
      await configManager.setConfig(currentConfig);
    } catch (error) {
      console.error('切换策略失败:', error);
      message.error('切换策略失败');
      addLog('切换策略失败: ' + error.message);
    }
  };

  // 发送测试消息
  const handleSendTestMessage = async () => {
    try {
      addLog('发送测试消息...');
      const response = await apiService.sendRequest('test_connection', {
        timestamp: Date.now(),
        test: true
      });
      setTestResponse(response);
      addLog('收到响应: ' + JSON.stringify(response));
      message.success('测试消息发送成功');
    } catch (error) {
      console.error('发送测试消息失败:', error);
      message.error('发送测试消息失败');
      setTestResponse({ error: error.message });
      addLog('测试失败: ' + error.message);
    }
  };

  // 运行自测
  const handleRunSelfTest = async () => {
    try {
      setIsRunningSelfTest(true);
      setSelfTestResults(null);
      addLog('开始系统自测...');
      
      const response = await apiService.sendRequest('run-self-test', {});
      setSelfTestResults(response);
      addLog('自测完成: ' + JSON.stringify(response.results));
      message.success('系统自测完成');
    } catch (error) {
      console.error('运行自测失败:', error);
      message.error('运行自测失败');
      setSelfTestResults({ error: error.message });
      addLog('自测失败: ' + error.message);
    } finally {
      setIsRunningSelfTest(false);
    }
  };

  // 根据消息内容返回对应的状态样式
  const getMessageStatus = (message) => {
    if (message.includes('成功') || message.includes('已连接') || message.includes('已建立')) {
      return { type: 'success', color: '#52c41a', icon: <CheckCircleOutlined /> };
    } else if (message.includes('失败') || message.includes('错误') || message.includes('断开') || message.includes('未连接')) {
      return { type: 'error', color: '#ff4d4f', icon: <CloseCircleOutlined /> };
    } else if (message.includes('切换') || message.includes('保存') || message.includes('应用')) {
      return { type: 'info', color: '#1890ff', icon: <InfoCircleOutlined /> };
    }
    return { type: 'default', color: '#262626', icon: <ClockCircleOutlined /> };
  };

  // 日志表格列配置
  const logColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      sorter: (a, b) => a.timestamp.localeCompare(b.timestamp)
    },
    {
      title: '类型',
      key: 'type',
      width: 80,
      render: (_, record) => {
        const status = getMessageStatus(record.message);
        return <span>{status.icon}</span>;
      }
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: {
        showTitle: false
      },
      render: (text) => {
        const status = getMessageStatus(text);
        return (
          <Tooltip title={text}>
            <span style={{ color: status.color, lineHeight: '1.6' }}>{text}</span>
          </Tooltip>
        );
      }
    }
  ];

  // 连接状态统计卡片
  const ConnectionStatusCard = () => (
    <Card 
      title="连接状态" 
      icon={connectionStatus ? <LinkOutlined style={{ color: '#1890ff' }} /> : <DisconnectOutlined style={{ color: '#ff4d4f' }} />}
      size="small"
      className={`enhanced-card ${connectionStatus ? 'connection-status-connected' : 'connection-status-disconnected'}`}
      bodyStyle={{ padding: '16px' }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col span={12}>
          <Statistic 
            title="连接状态" 
            value={connectionStatus} 
            styles={{ 
              content: connectionStatus ? { color: '#1890ff' } : { color: '#ff4d4f' }
            }}
            formatter={(value) => value ? '已连接' : '未连接'}
          />
        </Col>
        <Col span={12}>
          <Statistic 
            title="连接类型" 
            value={connectionType || '未设置'}
            formatter={(value) => {
              const typeName = {
                'websocket': 'WebSocket',
                'tcp': 'TCP',
                'kcp': 'KCP',
                'mock': '模拟连接'
              }[value] || value;
              return typeName;
            }}
          />
        </Col>
        <Col span={24}>
          <Divider orientation="left" plain>操作</Divider>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={handleReconnect}
            disabled={connectionStatus}
            style={{ marginRight: 8 }}
            size="large"
          >
            连接
          </Button>
          <Button 
            danger 
            icon={<DisconnectOutlined />} 
            onClick={handleDisconnect}
            disabled={!connectionStatus}
            size="large"
          >
            断开连接
          </Button>
        </Col>
      </Row>
    </Card>
  );

  // 连接策略切换卡片
  const StrategySwitchCard = () => (
    <Card title="连接策略" icon={<SettingOutlined style={{ color: '#722ed1' }} />} size="small" className="enhanced-card">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Button 
            type={connectionType === 'websocket' ? 'primary' : 'default'}
            onClick={() => handleStrategySwitch('websocket')}
            style={{ width: '48%', marginRight: '4%' }}
            size="large"
            icon={<LinkOutlined />}
          >
            WebSocket连接
          </Button>
          <Button 
            type={connectionType === 'tcp' ? 'primary' : 'default'}
            onClick={() => handleStrategySwitch('tcp')}
            style={{ width: '48%', marginRight: '4%', marginTop: '16px' }}
            size="large"
            icon={<LinkOutlined />}
          >
            TCP连接
          </Button>
          <Button 
            type={connectionType === 'kcp' ? 'primary' : 'default'}
            onClick={() => handleStrategySwitch('kcp')}
            style={{ width: '48%', marginTop: '16px' }}
            size="large"
            icon={<LinkOutlined />}
          >
            KCP连接
          </Button>
          <Button 
            type={connectionType === 'mock' ? 'primary' : 'default'}
            onClick={() => handleStrategySwitch('mock')}
            style={{ width: '100%', marginTop: '16px' }}
            size="large"
            icon={<SettingOutlined />}
          >
            模拟连接
          </Button>
        </Col>
        <Col span={24}>
          <p style={{ color: '#888', fontSize: '12px' }}>
            提示：切换连接策略将断开当前连接并使用新策略重新连接。模拟连接可用于离线开发和测试。
          </p>
        </Col>
      </Row>
    </Card>
  );

  // 测试工具卡片
  const TestToolsCard = () => (
    <Card title="测试工具" icon={<EyeOutlined style={{ color: '#13c2c2' }} />} size="small" className="enhanced-card">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleSendTestMessage}
            disabled={!connectionStatus}
            block
            size="large"
          >
            发送测试消息
          </Button>
        </Col>
        {testResponse && (
          <Col span={24}>
            <Divider orientation="left" plain>测试响应</Divider>
            <Card 
              size="small" 
              className={`enhanced-card ${testResponse.error ? 'test-response-error' : 'test-response-success'}`}
            >
              <pre className="test-response-code">
                {JSON.stringify(testResponse, null, 2)}
              </pre>
            </Card>
          </Col>
        )}
        <Col span={24}>
          <Button 
            type="primary" 
            danger
            icon={<PlayCircleOutlined />} 
            onClick={handleRunSelfTest}
            disabled={isRunningSelfTest}
            block
            size="large"
          >
            {isRunningSelfTest ? '自测中...' : '运行系统自测'}
          </Button>
        </Col>
        {selfTestResults && (
          <Col span={24}>
            <Divider orientation="left" plain>自测结果</Divider>
            <Card 
              size="small" 
              className={`enhanced-card ${selfTestResults.error ? 'test-response-error' : 'test-response-success'}`}
            >
              {selfTestResults.error ? (
                <div className="test-error-message">{selfTestResults.error}</div>
              ) : (
                <div className="self-test-results">
                  <div className="results-summary">
                    <Row gutter={[16, 8]}>
                      <Col span={6}>
                        <div className="summary-item">
                          <span className="summary-label">总测试数:</span>
                          <span className="summary-value">{selfTestResults.results.totalTests}</span>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div className="summary-item">
                          <span className="summary-label">通过:</span>
                          <span className="summary-value success">{selfTestResults.results.passedTests}</span>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div className="summary-item">
                          <span className="summary-label">失败:</span>
                          <span className="summary-value error">{selfTestResults.results.failedTests}</span>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div className="summary-item">
                          <span className="summary-label">测试时长:</span>
                          <span className="summary-value">{selfTestResults.results.duration}ms</span>
                        </div>
                      </Col>
                    </Row>
                  </div>
                  <Divider orientation="left" plain style={{ margin: '16px 0 16px 0' }}>测试详情</Divider>
                  <div className="test-details">
                    {selfTestResults.results.tests.map((test, index) => (
                      <div key={index} className={`test-item ${test.status}`}>
                        <Row gutter={[16, 4]} align="middle">
                          <Col span={12}>
                            <div className="test-name">{test.name}</div>
                          </Col>
                          <Col span={4}>
                            <div className="test-type">{test.type}</div>
                          </Col>
                          <Col span={4}>
                            <div className={`test-status ${test.status}`}>
                              {test.status === 'passed' ? '通过' : '失败'}
                            </div>
                          </Col>
                          <Col span={4}>
                            <div className="test-duration">{test.duration}ms</div>
                          </Col>
                          {test.error && (
                            <Col span={24}>
                              <div className="test-error">{test.error}</div>
                            </Col>
                          )}
                        </Row>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </Col>
        )}
      </Row>
    </Card>
  );

  return (
    <div className="configuration-page">
      <style jsx>{`
        .self-test-results {
          font-family: monospace;
        }
        
        .results-summary {
          margin-bottom: 16px;
        }
        
        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        
        .summary-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .summary-value {
          font-size: 18px;
          font-weight: bold;
        }
        
        .summary-value.success {
          color: #52c41a;
        }
        
        .summary-value.error {
          color: #ff4d4f;
        }
        
        .test-details {
          margin-top: 16px;
        }
        
        .test-item {
          padding: 12px;
          margin-bottom: 8px;
          background: #fafafa;
          border-radius: 4px;
          border-left: 4px solid #d9d9d9;
        }
        
        .test-item.passed {
          border-left-color: #52c41a;
          background: #f6ffed;
        }
        
        .test-item.failed {
          border-left-color: #ff4d4f;
          background: #fff2f0;
        }
        
        .test-name {
          font-weight: bold;
          font-size: 14px;
        }
        
        .test-type {
          font-size: 12px;
          color: #666;
        }
        
        .test-status {
          font-weight: bold;
          font-size: 12px;
        }
        
        .test-status.passed {
          color: #52c41a;
        }
        
        .test-status.failed {
          color: #ff4d4f;
        }
        
        .test-duration {
          font-size: 12px;
          color: #666;
        }
        
        .test-error {
          margin-top: 8px;
          padding: 8px;
          background: #fff2f0;
          border-radius: 4px;
          color: #ff4d4f;
          font-size: 12px;
          word-break: break-word;
        }
        
        .test-error-message {
          color: #ff4d4f;
          padding: 12px;
          background: #fff2f0;
          border-radius: 4px;
          font-size: 14px;
        }
      `}</style>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <ConnectionStatusCard />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StrategySwitchCard />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <TestToolsCard />
        </Col>
      </Row>

      <Divider />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="连接配置" key="config">
          <Card className="enhanced-card">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveConfig}
              initialValues={{
                autoReconnect: true,
                reconnectAttempts: 5,
                reconnectDelay: 1000,
                strategyType: 'websocket',
                messageTimeout: 5000,
                debugMode: false
              }}
            >
              <Row gutter={[16, 16]}>
                <Col span={24} md={12}>
                  <Form.Item name="connectionUrl" label="连接URL" rules={[{ required: true, message: '请输入连接URL' }]}>
                    <Input placeholder="例如: ws://localhost:8080" prefix={<LinkOutlined />} size="large" />
                  </Form.Item>
                </Col>
                <Col span={24} md={12}>
                  <Form.Item name="strategyType" label="连接策略" tooltip="选择与服务器通信的方式">
                    <Select size="large" showSearch optionFilterProp="children">
                      <Select.Option value="websocket">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <LinkOutlined style={{ marginRight: 8 }} />
                          <span>WebSocket</span>
                        </div>
                      </Select.Option>
                      <Select.Option value="tcp">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <LinkOutlined style={{ marginRight: 8 }} />
                          <span>TCP</span>
                        </div>
                      </Select.Option>
                      <Select.Option value="kcp">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <LinkOutlined style={{ marginRight: 8 }} />
                          <span>KCP</span>
                        </div>
                      </Select.Option>
                      <Select.Option value="mock">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <SettingOutlined style={{ marginRight: 8 }} />
                          <span>模拟连接</span>
                        </div>
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={24} sm={12} md={8}>
                  <Form.Item name="autoReconnect" label="自动重连" tooltip="启用后，连接断开时会自动尝试重新连接">
                    <Switch checkedChildren="开" unCheckedChildren="关" />
                  </Form.Item>
                </Col>
                <Col span={24} sm={12} md={8}>
                  <Form.Item name="reconnectAttempts" label="最大重连次数" tooltip="连接断开后尝试重连的最大次数">
                    <Input type="number" min={1} max={20} size="large" />
                  </Form.Item>
                </Col>
                <Col span={24} sm={12} md={8}>
                  <Form.Item name="reconnectDelay" label="重连延迟(ms)" tooltip="两次重连尝试之间的延迟时间">
                    <Input type="number" min={100} max={10000} size="large" />
                  </Form.Item>
                </Col>
                <Col span={24} sm={12} md={12}>
                  <Form.Item name="messageTimeout" label="消息超时(ms)" tooltip="等待服务器响应的最大时间">
                    <Input type="number" min={1000} max={30000} size="large" />
                  </Form.Item>
                </Col>
                <Col span={24} sm={12} md={12}>
                  <Form.Item name="debugMode" label="调试模式" tooltip="启用后会记录详细的调试信息">
                    <Switch checkedChildren="开" unCheckedChildren="关" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block size="large">
                      保存配置
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="连接日志" key="logs">
          <Card className="enhanced-card log-table">
            <Table 
              dataSource={logs} 
              columns={logColumns} 
              pagination={{ 
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50']
              }} 
              rowKey="id"
              size="middle"
              scroll={{ y: 400 }}
              bordered
              rowClassName={(record) => {
                const status = getMessageStatus(record.message);
                return `log-row-${status.type}`;
              }}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>

    </div>
  ); // 样式应移至外部CSS文件或使用styled-components等CSS-in-JS解决方案
};

export default ConfigurationPage;
