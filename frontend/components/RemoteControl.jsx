import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, Typography, message, Space, Divider, Switch, Modal, Input, Row, Col, Tag } from 'antd';
import { 
  AndroidOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  ArrowLeftOutlined, 
  ArrowRightOutlined, 
  MenuOutlined, 
  HomeOutlined, 
  LeftOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  SoundOutlined,
  AudioMutedOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  EditOutlined,
  LaptopOutlined,
  AlertOutlined,
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import websocketService from '../src/services/websocket-service';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RemoteControl = ({ connectedDevice }) => {
  // 远程控制状态
  const [isControlEnabled, setIsControlEnabled] = useState(false);
  const [isConnectionActive, setIsConnectionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [screenRotation, setScreenRotation] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isKeyboardInputEnabled, setIsKeyboardInputEnabled] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [isDeviceLocked, setIsDeviceLocked] = useState(false);
  const [controlMode, setControlMode] = useState('touch'); // 'touch' or 'buttons'
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  
  const screenRef = useRef(null);
  const touchStartRef = useRef(null);
  const lastTouchTimeRef = useRef(0);
  const longPressTimeoutRef = useRef(null);

  // 监听设备连接变化
  useEffect(() => {
    if (!connectedDevice && isControlEnabled) {
      handleDisableControl();
      message.error('设备连接已断开，远程控制已禁用');
    }
  }, [connectedDevice]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  // 启用远程控制
  const handleEnableControl = useCallback(async () => {
    if (!connectedDevice) {
      message.error('请先连接设备');
      return;
    }

    setIsLoading(true);
    setIsControlEnabled(true);
    
    try {
      // 调用WebSocket服务启用远程控制
      await websocketService.enableRemoteControl(connectedDevice.id);
      
      // 模拟连接建立
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsConnectionActive(true);
      message.success('远程控制已启用');
    } catch (error) {
      message.error(`启用远程控制失败: ${error.message || '未知错误'}`);
      setIsControlEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, [connectedDevice]);

  // 禁用远程控制
  const handleDisableControl = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // 调用WebSocket服务禁用远程控制
      if (connectedDevice) {
        await websocketService.sendRequest('disable_remote_control', {
          deviceId: connectedDevice.id
        });
      }
      
      setIsConnectionActive(false);
      message.success('远程控制已禁用');
    } catch (error) {
      message.error(`禁用远程控制失败: ${error.message || '未知错误'}`);
    } finally {
      setIsControlEnabled(false);
      setIsLoading(false);
    }
  }, [connectedDevice]);

  // 处理屏幕点击
  const handleScreenClick = useCallback((event) => {
    if (!isControlEnabled || !screenRef.current) return;
    
    const rect = screenRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 计算相对坐标
    const relativeX = (x / rect.width) * 100;
    const relativeY = (y / rect.height) * 100;
    
    // 发送点击事件
    sendControlEvent('click', { x: relativeX, y: relativeY });
  }, [isControlEnabled]);

  // 处理触摸开始
  const handleTouchStart = useCallback((event) => {
    if (!isControlEnabled || !screenRef.current) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    const rect = screenRef.current.getBoundingClientRect();
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const relativeX = (x / rect.width) * 100;
    const relativeY = (y / rect.height) * 100;
    
    touchStartRef.current = { x: relativeX, y: relativeY };
    lastTouchTimeRef.current = Date.now();
    
    // 设置长按检测
    longPressTimeoutRef.current = setTimeout(() => {
      sendControlEvent('long_press', { x: relativeX, y: relativeY });
      message.info('长按事件已发送');
    }, 500);
  }, [isControlEnabled]);

  // 处理触摸移动
  const handleTouchMove = useCallback((event) => {
    if (!isControlEnabled || !touchStartRef.current || !screenRef.current) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    const rect = screenRef.current.getBoundingClientRect();
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const relativeX = (x / rect.width) * 100;
    const relativeY = (y / rect.height) * 100;
    
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    
    // 计算移动距离
    const deltaX = relativeX - startX;
    const deltaY = relativeY - startY;
    
    // 如果移动距离足够大，取消长按检测并发送滑动事件
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      
      sendControlEvent('swipe', {
        startX,
        startY,
        endX: relativeX,
        endY: relativeY,
        deltaX,
        deltaY
      });
      
      // 更新起始位置以支持连续滑动
      touchStartRef.current = { x: relativeX, y: relativeY };
    }
  }, [isControlEnabled]);

  // 处理触摸结束
  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    // 检测是否为点击（短时间内触摸开始和结束）
    const touchDuration = Date.now() - lastTouchTimeRef.current;
    if (touchDuration < 200 && touchStartRef.current) {
      sendControlEvent('tap', touchStartRef.current);
    }
    
    touchStartRef.current = null;
  }, []);

  // 发送控制事件
  const sendControlEvent = useCallback((eventType, eventData) => {
    if (!isControlEnabled || !connectedDevice) return;
    
    try {
      websocketService.sendControlEvent(eventType, {
        deviceId: connectedDevice.id,
        eventData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send control event:', error);
    }
  }, [isControlEnabled, connectedDevice]);

  // 处理功能按钮按下
  const handleFunctionKey = useCallback((keyType) => {
    if (!isControlEnabled || !connectedDevice) {
      message.error('请先启用远程控制');
      return;
    }
    
    const keyMap = {
      'back': 'BACK',
      'home': 'HOME',
      'recent': 'RECENT',
      'menu': 'MENU',
      'volume_up': 'VOLUME_UP',
      'volume_down': 'VOLUME_DOWN',
      'volume_mute': 'VOLUME_MUTE',
      'play': 'PLAY',
      'pause': 'PAUSE'
    };
    
    const keyCode = keyMap[keyType];
    if (!keyCode) return;
    
    sendControlEvent('key_press', { keyCode });
    message.success(`发送了 ${keyType} 按键事件`);
  }, [isControlEnabled, connectedDevice, sendControlEvent]);

  // 处理方向键
  const handleDirectionKey = useCallback((direction) => {
    if (!isControlEnabled || !connectedDevice) return;
    
    sendControlEvent('direction', { direction });
    message.info(`发送了 ${direction} 方向事件`);
  }, [isControlEnabled, connectedDevice, sendControlEvent]);

  // 发送键盘输入
  const handleSendKeyboardInput = useCallback(() => {
    if (!isControlEnabled || !connectedDevice || !keyboardInput.trim()) {
      message.warning('请输入要发送的文本');
      return;
    }
    
    sendControlEvent('keyboard', { text: keyboardInput });
    message.success(`已发送文本: ${keyboardInput}`);
    setKeyboardInput('');
  }, [isControlEnabled, connectedDevice, keyboardInput, sendControlEvent]);

  // 旋转屏幕
  const handleRotateScreen = useCallback((direction) => {
    const rotation = direction === 'left' ? -90 : 90;
    setScreenRotation(prev => (prev + rotation) % 360);
    sendControlEvent('rotate', { rotation });
    message.success(`屏幕已${direction === 'left' ? '逆时针' : '顺时针'}旋转`);
  }, [sendControlEvent]);

  // 缩放屏幕
  const handleZoom = useCallback((action) => {
    const newZoomLevel = action === 'in' 
      ? Math.min(zoomLevel + 10, 200)
      : Math.max(zoomLevel - 10, 50);
      
    setZoomLevel(newZoomLevel);
    sendControlEvent('zoom', { action, level: newZoomLevel });
  }, [zoomLevel, sendControlEvent]);

  // 锁定/解锁设备
  const handleLockUnlockDevice = useCallback(() => {
    const newLockedState = !isDeviceLocked;
    setIsDeviceLocked(newLockedState);
    sendControlEvent('device_lock', { locked: newLockedState });
    message.success(`设备已${newLockedState ? '锁定' : '解锁'}`);
  }, [isDeviceLocked, sendControlEvent]);

  // 刷新屏幕
  const handleRefreshScreen = useCallback(() => {
    sendControlEvent('refresh', {});
    message.success('屏幕已刷新');
  }, [sendControlEvent]);

  // 渲染虚拟屏幕
  const renderVirtualScreen = useCallback(() => {
    const screenStyle = {
      transform: `rotate(${screenRotation}deg) scale(${zoomLevel / 100})`,
      transition: 'transform 0.3s ease',
      width: '360px',
      height: '640px',
      backgroundColor: '#111',
      borderRadius: '24px',
      border: '16px solid #333',
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    };

    return (
      <div 
        ref={screenRef}
        style={screenStyle}
        onClick={handleScreenClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div style={{ textAlign: 'center', color: 'white' }}>
          {!isControlEnabled ? (
            <div>
              <AndroidOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
              <Text>点击启用远程控制以查看设备屏幕</Text>
            </div>
          ) : (
            <div>
              <AndroidOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
              <Text>{connectedDevice?.name || '设备'} 屏幕</Text>
              <div style={{ marginTop: '16px', fontSize: '14px', color: '#aaa' }}>
                点击或滑动此区域来控制设备
              </div>
              {isConnectionActive && (
                <Tag color="success" style={{ marginTop: '16px' }}>控制已激活</Tag>
              )}
            </div>
          )}
        </div>
        
        {/* 设备按钮模拟 */}
        <div style={{
          position: 'absolute',
          bottom: '100px',
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}>
          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222', border: '1px solid #444' }}></div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222', border: '1px solid #444' }}></div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222', border: '1px solid #444' }}></div>
          </div>
        </div>
      </div>
    );
  }, [connectedDevice, isControlEnabled, isConnectionActive, screenRotation, zoomLevel, handleScreenClick, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // 渲染功能按钮区域
  const renderFunctionButtons = useCallback(() => {
    return (
      <Card title="功能按钮" style={{ marginBottom: '16px' }}>
        <Row gutter={[8, 8]}>
          <Col span={6}>
            <Button 
              icon={<LeftOutlined />} 
              onClick={() => handleFunctionKey('back')}
              size="large"
              block
              tooltip="返回键"
              disabled={!isControlEnabled}
            >
              返回
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<HomeOutlined />} 
              onClick={() => handleFunctionKey('home')}
              size="large"
              block
              tooltip="主页键"
              disabled={!isControlEnabled}
            >
              主页
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<MenuOutlined />} 
              onClick={() => handleFunctionKey('recent')}
              size="large"
              block
              tooltip="最近应用"
              disabled={!isControlEnabled}
            >
              最近
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<MenuOutlined />} 
              onClick={() => handleFunctionKey('menu')}
              size="large"
              block
              tooltip="菜单键"
              disabled={!isControlEnabled}
            >
              菜单
            </Button>
          </Col>
        </Row>
      </Card>
    );
  }, [isControlEnabled, handleFunctionKey]);

  // 渲染媒体控制区域
  const renderMediaControls = useCallback(() => {
    return (
      <Card title="媒体控制" style={{ marginBottom: '16px' }}>
        <Row gutter={[8, 8]}>
          <Col span={6}>
            <Button 
              icon={<PlayCircleOutlined />} 
              onClick={() => handleFunctionKey('play')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              播放
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<PauseCircleOutlined />} 
              onClick={() => handleFunctionKey('pause')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              暂停
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<SoundOutlined />} 
              onClick={() => handleFunctionKey('volume_up')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              音量+
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<AudioMutedOutlined />} 
              onClick={() => handleFunctionKey('volume_down')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              音量-
            </Button>
          </Col>
        </Row>
      </Card>
    );
  }, [isControlEnabled, handleFunctionKey]);

  // 渲染方向控制区域
  const renderDirectionalPad = useCallback(() => {
    return (
      <Card title="方向控制" style={{ marginBottom: '16px' }}>
        <Row gutter={[0, 8]} justify="center">
          <Col span={8} offset={8}>
            <Button 
              icon={<ArrowUpOutlined />} 
              onClick={() => handleDirectionKey('up')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              上
            </Button>
          </Col>
        </Row>
        <Row gutter={[8, 0]} justify="center">
          <Col span={8}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => handleDirectionKey('left')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              左
            </Button>
          </Col>
          <Col span={8}>
            <Button 
              icon={<ArrowRightOutlined />} 
              onClick={() => handleDirectionKey('right')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              右
            </Button>
          </Col>
        </Row>
        <Row gutter={[0, 0]} justify="center">
          <Col span={8} offset={8}>
            <Button 
              icon={<ArrowDownOutlined />} 
              onClick={() => handleDirectionKey('down')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              下
            </Button>
          </Col>
        </Row>
      </Card>
    );
  }, [isControlEnabled, handleDirectionKey]);

  // 渲染设置区域
  const renderSettings = useCallback(() => {
    return (
      <Card title="远程控制设置">
        <Row gutter={[16, 16]} align="middle">
          <Col span={14}>
            <Text>启用远程控制</Text>
          </Col>
          <Col span={10}>
            <Switch 
              checked={isControlEnabled} 
              onChange={(checked) => checked ? handleEnableControl() : handleDisableControl()}
              loading={isLoading}
              disabled={!connectedDevice}
            />
          </Col>
        </Row>
        <Divider />
        <Row gutter={[16, 16]} align="middle">
          <Col span={14}>
            <Text>键盘输入模式</Text>
          </Col>
          <Col span={10}>
            <Switch 
              checked={isKeyboardInputEnabled} 
              onChange={setIsKeyboardInputEnabled}
              disabled={!isControlEnabled}
            />
          </Col>
        </Row>
        <Divider />
        <Row gutter={[16, 16]} align="middle">
          <Col span={14}>
            <Text>设备锁定状态</Text>
          </Col>
          <Col span={10}>
            <Button 
              type={isDeviceLocked ? "primary" : "default"}
              onClick={handleLockUnlockDevice}
              disabled={!isControlEnabled}
              icon={isDeviceLocked ? <LockOutlined /> : <UnlockOutlined />}
            >
              {isDeviceLocked ? '锁定设备' : '解锁设备'}
            </Button>
          </Col>
        </Row>
      </Card>
    );
  }, [isControlEnabled, isLoading, isKeyboardInputEnabled, isDeviceLocked, connectedDevice, handleEnableControl, handleDisableControl, handleLockUnlockDevice]);

  // 渲染键盘输入区域
  const renderKeyboardInput = useCallback(() => {
    if (!isKeyboardInputEnabled) return null;
    
    return (
      <Card title="键盘输入" style={{ marginBottom: '16px' }}>
        <TextArea 
          rows={4} 
          value={keyboardInput}
          onChange={(e) => setKeyboardInput(e.target.value)}
          placeholder="输入要发送到设备的文本..."
          style={{ marginBottom: '16px' }}
          autoSize={{ minRows: 2, maxRows: 6 }}
        />
        <Button 
          type="primary" 
          icon={<EditOutlined />} 
          onClick={handleSendKeyboardInput}
          disabled={!isControlEnabled || !keyboardInput.trim()}
        >
          发送文本
        </Button>
      </Card>
    );
  }, [isKeyboardInputEnabled, keyboardInput, isControlEnabled, handleSendKeyboardInput]);

  // 渲染屏幕控制区域
  const renderScreenControls = useCallback(() => {
    return (
      <Card title="屏幕控制" style={{ marginBottom: '16px' }}>
        <Row gutter={[8, 8]}>
          <Col span={6}>
            <Button 
              icon={<RotateLeftOutlined />} 
              onClick={() => handleRotateScreen('left')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              左旋
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<RotateRightOutlined />} 
              onClick={() => handleRotateScreen('right')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              右旋
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<ZoomInOutlined />} 
              onClick={() => handleZoom('in')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              放大
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              icon={<ZoomOutOutlined />} 
              onClick={() => handleZoom('out')}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              缩小
            </Button>
          </Col>
        </Row>
        <Row gutter={[8, 8]} style={{ marginTop: '8px' }}>
          <Col span={24}>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={handleRefreshScreen}
              size="large"
              block
              disabled={!isControlEnabled}
            >
              刷新屏幕
            </Button>
          </Col>
        </Row>
      </Card>
    );
  }, [isControlEnabled, handleRotateScreen, handleZoom, handleRefreshScreen]);

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Title level={3}>远程控制</Title>
          {connectedDevice ? (
            <Text type="secondary">控制设备: {connectedDevice.name}</Text>
          ) : (
            <Text type="danger">未连接设备</Text>
          )}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {renderVirtualScreen()}
          {isControlEnabled && (
            <div style={{ marginTop: '16px', color: '#1890ff' }}>
              <Text>远程控制已激活，点击或滑动屏幕进行操作</Text>
            </div>
          )}
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            {renderFunctionButtons()}
            {renderMediaControls()}
            {renderDirectionalPad()}
            {renderKeyboardInput()}
          </Col>
          <Col xs={24} lg={12}>
            {renderScreenControls()}
            {renderSettings()}
          </Col>
        </Row>

        {/* 控制状态提示 */}
        {isControlEnabled && (
          <Card 
            style={{ marginTop: '20px', borderColor: '#1890ff' }}
            extra={<Tag color="success">已激活</Tag>}
          >
            <Row gutter={[16, 0]} align="middle">
              <Col span={20}>
                <Text type="secondary">
                  远程控制已启用，您可以通过点击、滑动屏幕或使用控制按钮来操作设备。
                  所有操作都将实时传输到已连接的Android设备。
                </Text>
              </Col>
              <Col span={4}>
                <Button 
                  danger
                  icon={<LaptopOutlined />}
                  onClick={handleDisableControl}
                >
                  禁用控制
                </Button>
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RemoteControl;