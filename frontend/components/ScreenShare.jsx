import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, Spin, message, Typography, Space, Slider, Select, Modal, notification, Tag, Switch } from 'antd';
import { VideoCameraOutlined, VideoCameraAddOutlined, PauseCircleOutlined, PlayCircleOutlined, ZoomInOutlined, ZoomOutOutlined, MaximizeOutlined, MinimizeOutlined, LoadingOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import websocketService from '../../src/services/websocket-service';

const { Title, Text } = Typography;
const { Option } = Select;

const ScreenShare = ({ connectedDevice }) => {
  // 屏幕共享状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screenQuality, setScreenQuality] = useState(720);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({
    fps: 0,
    resolution: '1920x1080',
    latency: 0,
    bitrate: '0 Mbps'
  });
  const [statsVisible, setStatsVisible] = useState(false);
  const [connectionModalVisible, setConnectionModalVisible] = useState(false);
  
  const videoRef = useRef(null);
  const streamIntervalRef = useRef(null);
  const statsIntervalRef = useRef(null);

  // 监听设备连接变化
  useEffect(() => {
    if (!connectedDevice && isStreaming) {
      handleStopStream();
      message.error('设备连接已断开，屏幕共享已停止');
    }
  }, [connectedDevice]);

  // 清理函数
  useEffect(() => {
    return () => {
      handleStopStream();
    };
  }, []);

  // 开始屏幕共享
  const handleStartStream = useCallback(async () => {
    if (!connectedDevice) {
      setConnectionModalVisible(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // 调用WebSocket服务开始屏幕流
      await websocketService.startScreenStreaming(connectedDevice.id, {
        quality: screenQuality,
        fps: 30
      });

      setIsStreaming(true);
      
      // 模拟屏幕流数据
      simulateStream();
      
      // 开始更新统计信息
      startStatsUpdate();
      
      message.success('屏幕共享已开始');
      notification.open({
        message: '屏幕共享已连接',
        description: `已成功连接到${connectedDevice.name}的屏幕`,
        icon: <VideoCameraOutlined style={{ color: '#1890ff' }} />,
      });
    } catch (err) {
      setError(`启动屏幕共享失败: ${err.message || '未知错误'}`);
      message.error(`启动屏幕共享失败: ${err.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  }, [connectedDevice, screenQuality]);

  // 停止屏幕共享
  const handleStopStream = useCallback(async () => {
    if (!isStreaming) return;

    try {
      // 调用WebSocket服务停止屏幕流
      if (connectedDevice) {
        await websocketService.stopScreenStreaming(connectedDevice.id);
      }
      
      // 清理模拟流
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      
      // 清理统计信息更新
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      
      setIsStreaming(false);
      setIsPaused(false);
      message.success('屏幕共享已停止');
    } catch (err) {
      message.error(`停止屏幕共享失败: ${err.message || '未知错误'}`);
    }
  }, [isStreaming, connectedDevice]);

  // 暂停/恢复屏幕共享
  const handlePauseResume = useCallback(() => {
    setIsPaused(!isPaused);
    message.info(isPaused ? '屏幕共享已恢复' : '屏幕共享已暂停');
  }, [isPaused]);

  // 切换全屏
  const handleFullscreenToggle = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 调整缩放级别
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  }, []);

  // 切换静音
  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
    message.info(isMuted ? '已开启声音' : '已静音');
  }, [isMuted]);

  // 切换统计信息显示
  const toggleStats = useCallback(() => {
    setStatsVisible(!statsVisible);
  }, [statsVisible]);

  // 选择分辨率
  const handleQualityChange = useCallback((value) => {
    setScreenQuality(value);
    if (isStreaming) {
      message.info(`分辨率已切换至 ${value}p`);
      // 在实际应用中，这里会调用服务更新分辨率
      updateResolution(value);
    }
  }, [isStreaming]);

  // 更新分辨率
  const updateResolution = useCallback((quality) => {
    const resolutions = {
      360: '640x360',
      720: '1280x720',
      1080: '1920x1080'
    };
    setStats(prev => ({
      ...prev,
      resolution: resolutions[quality] || '1920x1080'
    }));
  }, []);

  // 模拟屏幕流
  const simulateStream = useCallback(() => {
    // 这里模拟屏幕流数据，实际应用中会从WebSocket接收真实的屏幕帧
    if (videoRef.current) {
      // 使用一个简单的占位符来表示视频帧
      videoRef.current.style.background = `linear-gradient(45deg, #667eea 0%, #764ba2 100%)`;
      videoRef.current.style.display = 'flex';
      videoRef.current.style.alignItems = 'center';
      videoRef.current.style.justifyContent = 'center';
      videoRef.current.style.color = 'white';
      videoRef.current.style.fontSize = '24px';
      videoRef.current.innerHTML = `
        <div style="text-align: center;">
          <VideoCameraOutlined style="fontSize: 64px; margin-bottom: 16px;" />
          <div>${connectedDevice.name} 屏幕</div>
          <div style="marginTop: 8px; font-size: 14px;">${isPaused ? '已暂停' : '正在播放'}</div>
          <div style="marginTop: 4px; font-size: 12px;">分辨率: ${stats.resolution}</div>
        </div>
      `;
    }

    // 模拟流更新
    streamIntervalRef.current = setInterval(() => {
      if (videoRef.current && !isPaused) {
        // 在实际应用中，这里会更新真实的视频帧
        // 为了演示效果，我们定期改变背景色
        const hue = Math.floor(Math.random() * 360);
        videoRef.current.style.background = `hsl(${hue}, 70%, 60%)`;
      }
    }, 1000);
  }, [connectedDevice.name, isPaused, stats.resolution]);

  // 开始更新统计信息
  const startStatsUpdate = useCallback(() => {
    // 模拟统计信息更新
    statsIntervalRef.current = setInterval(() => {
      const newFps = Math.floor(Math.random() * 10) + 25; // 模拟25-35fps
      const newLatency = Math.floor(Math.random() * 50) + 20; // 模拟20-70ms延迟
      const newBitrate = (Math.random() * 5 + 2).toFixed(1); // 模拟2-7Mbps
      
      setStats(prev => ({
        ...prev,
        fps: newFps,
        latency: newLatency,
        bitrate: `${newBitrate} Mbps`
      }));
    }, 2000);
  }, []);

  // 渲染视频容器
  const renderVideoContainer = () => {
    return (
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        backgroundColor: '#000', 
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minHeight: '400px'
      }}>
        <div 
          ref={videoRef}
          style={{ 
            width: '100%', 
            height: '400px', 
            transform: `scale(${zoomLevel / 100})`,
            transition: 'transform 0.3s ease',
            backgroundColor: '#111'
          }}
        />
        
        {/* 视频控制覆盖层 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          padding: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button 
              icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />} 
              size="small"
              onClick={handlePauseResume}
              style={{ color: 'white', backgroundColor: 'transparent', border: 'none' }}
            />
            <Button 
              icon={isMuted ? <span style={{ fontSize: '16px' }}>🔇</span> : <span style={{ fontSize: '16px' }}>🔊</span>} 
              size="small"
              onClick={handleMuteToggle}
              style={{ color: 'white', backgroundColor: 'transparent', border: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button 
              icon={<ZoomOutOutlined />} 
              size="small"
              onClick={handleZoomOut}
              style={{ color: 'white', backgroundColor: 'transparent', border: 'none' }}
            />
            <Text style={{ color: 'white', minWidth: '50px', textAlign: 'center' }}>{zoomLevel}%</Text>
            <Button 
              icon={<ZoomInOutlined />} 
              size="small"
              onClick={handleZoomIn}
              style={{ color: 'white', backgroundColor: 'transparent', border: 'none' }}
            />
            <Button 
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
              size="small"
              onClick={handleFullscreenToggle}
              style={{ color: 'white', backgroundColor: 'transparent', border: 'none' }}
            />
          </div>
        </div>
        
        {/* 统计信息覆盖层 */}
        {statsVisible && (
          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            lineHeight: '1.4'
          }}>
            <div>FPS: {stats.fps}</div>
            <div>分辨率: {stats.resolution}</div>
            <div>延迟: {stats.latency}ms</div>
            <div>比特率: {stats.bitrate}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Title level={3}>屏幕共享</Title>
          {connectedDevice ? (
            <Text type="secondary">已连接设备: {connectedDevice.name}</Text>
          ) : (
            <Text type="danger">未连接设备</Text>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Button 
            type="primary" 
            icon={isStreaming ? <PauseCircleOutlined /> : <VideoCameraAddOutlined />}
            onClick={isStreaming ? handleStopStream : handleStartStream}
            loading={isLoading}
            danger={isStreaming}
            style={{ marginRight: '8px' }}
          >
            {isStreaming ? '停止共享' : '开始共享'}
          </Button>
          
          <Button 
            onClick={toggleStats}
            icon={<Text code>i</Text>}
            type="default"
          >
            {statsVisible ? '隐藏统计' : '显示统计'}
          </Button>
        </div>

        {error && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '10px', 
            backgroundColor: '#fff2f0', 
            border: '1px solid #ffccc7', 
            borderRadius: '4px',
            color: '#ff4d4f'
          }}>
            {error}
          </div>
        )}

        {/* 视频播放区域 */}
        {isStreaming ? (
          renderVideoContainer()
        ) : (
          <Card title="屏幕预览" bordered={false} style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#999' }}>
              <VideoCameraOutlined style={{ fontSize: '64px', marginBottom: '16px', color: '#d9d9d9' }} />
              <p>点击「开始共享」按钮查看设备屏幕</p>
              {!connectedDevice && (
                <p style={{ marginTop: '8px', color: '#ff4d4f' }}>请先连接设备再开始屏幕共享</p>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* 设置区域 */}
      <div>
        <Title level={4}>共享设置</Title>
        <Card bordered={false}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
            <div>
              <Text>视频质量: </Text>
              <Select 
                value={screenQuality} 
                style={{ width: 120 }} 
                onChange={handleQualityChange}
                disabled={isStreaming && !isPaused}
              >
                <Option value={360}>360p</Option>
                <Option value={720}>720p</Option>
                <Option value={1080}>1080p</Option>
              </Select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch 
                checked={statsVisible} 
                onChange={toggleStats}
                checkedChildren="显示" 
                unCheckedChildren="隐藏" 
              />
              <Text>实时统计信息</Text>
            </div>
          </div>
          
          {isStreaming && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
              <Title level={5}>连接状态</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                <Tag color="blue">FPS: {stats.fps}</Tag>
                <Tag color="green">分辨率: {stats.resolution}</Tag>
                <Tag color="purple">延迟: {stats.latency}ms</Tag>
                <Tag color="orange">比特率: {stats.bitrate}</Tag>
                <Tag color={stats.latency < 50 ? "green" : stats.latency < 100 ? "orange" : "red"}>
                  {stats.latency < 50 ? "流畅" : stats.latency < 100 ? "一般" : "卡顿"}
                </Tag>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 未连接设备提示弹窗 */}
      <Modal
        title="连接设备"
        open={connectionModalVisible}
        onCancel={() => setConnectionModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setConnectionModalVisible(false)}>关闭</Button>
        ]}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <VideoCameraOutlined style={{ fontSize: '64px', marginBottom: '16px', color: '#1890ff' }} />
          <Title level={4}>请先连接设备</Title>
          <Text>在开始屏幕共享前，您需要先连接到一个Android设备。</Text>
        </div>
      </Modal>
    </div>
  );
};

export default ScreenShare;