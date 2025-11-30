/**
 * WebSocket服务单元测试
 * 测试WebSocket服务的核心功能
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// 导入测试工具
import { MockWebSocket, MockWebSocketServer, MockClientManager, MockMessageHandlers, MockRequest } from '../src/utils/mock-components.js';

// 导入服务类
import WebSocketService from '../src/websocket/index.js';

describe('WebSocketService', () => {
  let websocketService;
  let mockClientManager;
  let mockMessageHandlers;
  let mockWebSocketServer;
  let mockServer;

  beforeEach(() => {
    // 创建模拟组件
    mockClientManager = new MockClientManager();
    mockMessageHandlers = new MockMessageHandlers();
    mockWebSocketServer = new MockWebSocketServer({});
    
    // 创建模拟HTTP服务器
    mockServer = {
      on: () => {},
      listen: () => {},
      close: () => {}
    };
    
    // 创建WebSocket服务实例
    websocketService = new WebSocketService({
      clientManager: mockClientManager,
      messageHandlers: mockMessageHandlers,
      WebSocketServerImpl: class MockWSS {
        constructor() {
          return mockWebSocketServer;
        }
      }
    });
  });

  afterEach(() => {
    // 清理资源
    websocketService = null;
    mockClientManager = null;
    mockMessageHandlers = null;
    mockWebSocketServer = null;
    mockServer = null;
  });

  it('should initialize correctly', () => {
    assert.doesNotThrow(() => {
      websocketService.init(mockServer);
    });
    
    // 验证WebSocket服务器已创建
    assert.ok(websocketService.wss);
    assert.equal(websocketService.server, mockServer);
  });

  it('should handle new connections', (done) => {
    // 初始化服务
    websocketService.init(mockServer);
    
    // 创建模拟WebSocket连接和请求
    const mockWs = new MockWebSocket();
    const mockReq = new MockRequest({
      remoteAddress: '127.0.0.1'
    });
    
    // 监听连接事件
    mockWs.onopen = () => {
      done();
    };
    
    // 模拟新连接
    mockWebSocketServer.simulateConnection(mockWs, mockReq);
    
    // 验证客户端已添加
    assert.equal(mockClientManager.getClientCount(), 1);
  });

  it('should handle client messages', async () => {
    // 初始化服务
    websocketService.init(mockServer);
    
    // 创建模拟WebSocket连接和请求
    const mockWs = new MockWebSocket();
    const mockReq = new MockRequest({
      remoteAddress: '127.0.0.1'
    });
    
    // 模拟新连接
    mockWebSocketServer.simulateConnection(mockWs, mockReq);
    
    // 获取第一个客户端ID
    const clientId = Array.from(mockClientManager.getClients().keys())[0];
    
    // 模拟消息
    const testMessage = {
      type: 'device_info',
      deviceInfo: {
        platform: 'android',
        deviceName: 'Test Device'
      }
    };
    
    // 发送消息
    mockWs.simulateMessage(JSON.stringify(testMessage));
    
    // 等待消息处理
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 验证消息已处理（由于MockWebSocket同时调用onmessage和事件监听器，可能会处理两次）
    assert.ok(mockMessageHandlers.handledMessages.length >= 1);
    
    // 检查是否有任何一个处理的消息类型正确
    const hasCorrectMessage = mockMessageHandlers.handledMessages.some(msg => msg.message.type === 'device_info');
    assert.ok(hasCorrectMessage, '没有正确处理device_info消息');
  });

  it('should get clients correctly', () => {
    // 初始化服务
    websocketService.init(mockServer);
    
    // 创建模拟WebSocket连接和请求
    const mockWs = new MockWebSocket();
    const mockReq = new MockRequest({
      remoteAddress: '127.0.0.1'
    });
    
    // 模拟新连接
    mockWebSocketServer.simulateConnection(mockWs, mockReq);
    
    // 验证获取客户端功能
    const clients = websocketService.getClients();
    assert.equal(clients.size, 1);
  });

  it('should get Android device correctly', () => {
    // 初始化服务
    websocketService.init(mockServer);
    
    // 创建模拟WebSocket连接和请求
    const mockWs = new MockWebSocket();
    const mockReq = new MockRequest({
      remoteAddress: '127.0.0.1'
    });
    
    // 模拟新连接
    mockWebSocketServer.simulateConnection(mockWs, mockReq);
    
    // 获取客户端ID
    const clientId = Array.from(mockClientManager.getClients().keys())[0];
    
    // 更新客户端为Android设备
    mockClientManager.updateClient(clientId, {
      platform: 'android',
      deviceName: 'Test Android Device'
    });
    
    // 验证获取Android设备功能
    const androidDevice = websocketService.getAndroidDevice();
    assert.ok(androidDevice);
    assert.equal(androidDevice.info.deviceName, 'Test Android Device');
  });

  it('should handle client disconnection', () => {
    // 初始化服务
    websocketService.init(mockServer);
    
    // 创建模拟WebSocket连接和请求
    const mockWs = new MockWebSocket();
    const mockReq = new MockRequest({
      remoteAddress: '127.0.0.1'
    });
    
    // 模拟新连接
    mockWebSocketServer.simulateConnection(mockWs, mockReq);
    
    // 验证客户端已添加
    assert.equal(mockClientManager.getClientCount(), 1);
    
    // 模拟客户端断开连接
    mockWs.close(1000, 'Normal closure');
    
    // 验证客户端已移除
    assert.equal(mockClientManager.getClientCount(), 0);
  });
});
