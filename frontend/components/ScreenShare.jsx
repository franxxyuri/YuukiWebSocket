import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, Spin, message, Typography, Space, Slider, Select, Modal, notification, Tag, Switch } from 'antd';
import { VideoCameraOutlined, VideoCameraAddOutlined, PauseCircleOutlined, PlayCircleOutlined, ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, CompressOutlined, LoadingOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import apiService from '../src/services/api-service';
import ScreenDisplayManager from '../utils/screen-display';

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
  const canvasRef = useRef(null);
  const displayManagerRef = useRef(null);
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

  // 初始化屏幕显示管理器
  const initializeDisplayManager = useCallback(() => {
    if (!displayManagerRef.current && canvasRef.current) {
      displayManagerRef.current = new ScreenDisplayManager(canvasRef.current, {
        maxFPS: 30,
        maxBufferSize: 50,
        enableStats: true,
        onStatsUpdate: (newStats) => {
          setStats(prev => ({
            ...prev,
            fps: newStats.fps,
            latency: Math.round(newStats.latency),
            bitrate: `${(newStats.bitrate / (1024 * 1024)).toFixed(1)} Mbps`
          }));
        },
        onError: (err) => {
          console.error('ScreenDisplayManager error:', err);
          setError(`屏幕显示错误: ${err.message || '未知错误'}`);
          handleStopStream();
        }
      });
    }
    return displayManagerRef.current;
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
      // 初始化显示管理器
      const displayManager = initializeDisplayManager();
      if (!displayManager) {
        throw new Error('无法初始化屏幕显示管理器');
      }

      // 设置显示参数
      displayManager.setQuality(screenQuality);
      displayManager.setPaused(false);
      
      // 调用API服务开始屏幕流
      await apiService.startScreenStreaming(connectedDevice.id, {
        quality: screenQuality,
        fps: 30
      });

      // 注册API消息处理器
      apiService.on('screen_frame', (data) => {
        if (isStreaming && !isPaused && displayManager) {
          try {
            // 处理屏幕帧数据
            const frameData = {
              data: data.frame || data.data,
              timestamp: data.timestamp || Date.now(),
              width: data.width,
              height: data.height
            };
            displayManager.addFrame(frameData);
          } catch (frameError) {
            console.error('Error processing frame:', frameError);
          }
        }
      });

      // 注册状态更新事件
      apiService.on('stream_status', (status) => {
        if (status && status.resolution) {
          setStats(prev => ({
            ...prev,
            resolution: status.resolution
          }));
        }
      });

      setIsStreaming(true);
      
      // 开始渲染循环
      displayManager.start();
      
      // 开始更新统计信息
      startStatsUpdate();
      
      message.success('屏幕共享已开始');
      notification.open({
        message: '屏幕共享已连接',
        description: `已成功连接到${connectedDevice.name}的屏幕`,
        icon: <VideoCameraOutlined style={{ color: '#1890ff' }} />,
      });
    } catch (err) {
      const errorMessage = `启动屏幕共享失败: ${err.message || '未知错误'}`;
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connectedDevice, screenQuality, initializeDisplayManager]);

  // 停止屏幕共享
  const handleStopStream = useCallback(async () => {
    if (!isStreaming) return;

    try {
      // 停止显示管理器
      if (displayManagerRef.current) {
        displayManagerRef.current.stop();
      }

      // 取消注册API事件
      apiService.off('screen_frame');
      apiService.off('stream_status');
      
      // 调用API服务停止屏幕流
      if (connectedDevice) {
        await apiService.stopScreenStreaming(connectedDevice.id);
      }
      
      // 清理定时器
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      
      setIsStreaming(false);
      setIsPaused(false);
      message.success('屏幕共享已停止');
    } catch (err) {
      console.error('Error stopping stream:', err);
      message.error(`停止屏幕共享失败: ${err.message || '未知错误'}`);
    }
  }, [isStreaming, connectedDevice]);

  // 暂停/恢复屏幕共享
  const handlePauseResume = useCallback(() => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // 更新显示管理器状态
    if (displayManagerRef.current) {
      displayManagerRef.current.setPaused(newPausedState);
    }
    
    // 发送暂停/恢复命令到设备
      if (connectedDevice && isStreaming) {
        apiService.sendRequest('stream_control', {
          action: newPausedState ? 'pause' : 'resume',
          deviceId: connectedDevice.id
        });
      }
    
    message.info(newPausedState ? '屏幕共享已暂停' : '屏幕共享已恢复');
  }, [isPaused, connectedDevice, isStreaming]);

  // 切换全屏
  const handleFullscreenToggle = useCallback(() => {
    const container = videoRef.current?.parentElement || canvasRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
        message.error('无法切换到全屏模式');
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
    const newZoom = Math.min(zoomLevel + 10, 200);
    setZoomLevel(newZoom);
    
    if (canvasRef.current) {
      canvasRef.current.style.transform = `scale(${newZoom / 100})`;
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoomLevel - 10, 50);
    setZoomLevel(newZoom);
    
    if (canvasRef.current) {
      canvasRef.current.style.transform = `scale(${newZoom / 100})`;
    }
  }, [zoomLevel]);

  // 切换静音
  const handleMuteToggle = useCallback(() => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    // 发送静音/取消静音命令到设备
      if (connectedDevice && isStreaming) {
        apiService.sendRequest('audio_control', {
          action: newMuteState ? 'mute' : 'unmute',
          deviceId: connectedDevice.id
        });
      }
    
    message.info(newMuteState ? '已开启声音' : '已静音');
  }, [isMuted, connectedDevice, isStreaming]);

  // 切换统计信息显示
  const toggleStats = useCallback(() => {
    setStatsVisible(!statsVisible);
  }, [statsVisible]);

  // 选择分辨率
  const handleQualityChange = useCallback((value) => {
    setScreenQuality(value);
    if (isStreaming && !isPaused && connectedDevice) {
      message.info(`分辨率已切换至 ${value}p`);
      // 发送分辨率变更请求
      apiService.sendRequest('stream_settings', {
        deviceId: connectedDevice.id,
        quality: value,
        action: 'change_quality'
      });
      updateResolution(value);
    }
  }, [isStreaming, isPaused, connectedDevice]);

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

  // 开始更新统计信息
  const startStatsUpdate = useCallback(() => {
    // 清除现有定时器
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    
    // 定期更新统计信息
    statsIntervalRef.current = setInterval(() => {
      if (displayManagerRef.current) {
        const currentStats = displayManagerRef.current.getStats();
        if (currentStats) {
          setStats(prev => ({
            ...prev,
            fps: Math.round(currentStats.fps || 0),
            latency: Math.round(currentStats.latency || 0),
            bitrate: currentStats.bitrate ? 
              `${(currentStats.bitrate / (1024 * 1024)).toFixed(1)} Mbps` : 
              prev.bitrate
          }));
        }
      }
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
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* 使用canvas替代div作为显示容器 */}
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            transform: `scale(${zoomLevel / 100})`,
            transition: 'transform 0.3s ease',
            backgroundColor: '#111',
            objectFit: 'contain'
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
              disabled={!isStreaming}
              style={{ color: 'white', backgroundColor: 'transparent', border: 'none' }}
            />
            <Button 
              icon={isMuted ? <span style={{ fontSize: '16px' }}>🔇</span> : <span style={{ fontSize: '16px' }}>🔊</span>} 
              size="small"
              onClick={handleMuteToggle}
              disabled={!isStreaming}
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
            lineHeight: '1.4',
            zIndex: 10
          }}>
            <div>FPS: {stats.fps}</div>
            <div>分辨率: {stats.resolution}</div>
            <div>延迟: {stats.latency}ms</div>
            <div>比特率: {stats.bitrate}</div>
          </div>
        )}
        
        {/* 状态指示器 */}
        {isPaused && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            zIndex: 5
          }}>
            已暂停
          </div>
        )}
      </div>
    );
  };

  // 监听设备连接断开
  useEffect(() => {
    const handleDeviceDisconnect = () => {
      if (isStreaming) {
        handleStopStream();
        setError('设备连接已断开');
      }
    };
    
    // 监听API断开事件
    apiService.on('connection_lost', handleDeviceDisconnect);
    
    return () => {
      apiService.off('connection_lost', handleDeviceDisconnect);
    };
  }, [isStreaming, handleStopStream]);

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