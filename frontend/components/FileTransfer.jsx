import React, { useState, useCallback } from 'react';
import { Upload, Button, List, Progress, message, Space, Typography, Card, Tag, Modal } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, FileOutlined, FolderOutlined, InboxOutlined, LoadingOutlined } from '@ant-design/icons';
import websocketService from '../../src/services/websocket-service';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const FileTransfer = ({ connectedDevice }) => {
  // 文件传输状态
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [selectedTab, setSelectedTab] = useState('upload');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);

  // 模拟设备文件列表
  const [deviceFiles, setDeviceFiles] = useState([
    { id: '1', name: '文档.pdf', size: '2.5MB', type: 'pdf', modified: '2024-01-15 10:30' },
    { id: '2', name: '照片.jpg', size: '1.8MB', type: 'jpg', modified: '2024-01-14 15:20' },
    { id: '3', name: '视频.mp4', size: '25.6MB', type: 'mp4', modified: '2024-01-13 09:45' },
    { id: '4', name: '项目文件夹', size: '', type: 'folder', modified: '2024-01-12 14:10' },
    { id: '5', name: '笔记.txt', size: '0.3MB', type: 'txt', modified: '2024-01-11 11:05' },
  ]);

  // 处理文件上传
  const handleUpload = useCallback(async (file) => {
    if (!connectedDevice) {
      message.error('请先连接设备');
      return false;
    }

    setUploading(true);
    setCurrentFile(file.name);
    setUploadProgress(0);
    
    // 模拟上传进度
    const uploadInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 99) {
          clearInterval(uploadInterval);
          return 99;
        }
        return prev + Math.random() * 10;
      });
    }, 300);

    try {
      // 调用WebSocket服务发送文件
      await websocketService.sendFile(
        file.name,
        connectedDevice.id,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }
      );
      
      // 模拟实际传输时间
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(uploadInterval);
      setUploadProgress(100);
      setUploadHistory(prev => [
        {
          id: Date.now(),
          name: file.name,
          size: formatFileSize(file.size),
          status: 'success',
          time: new Date().toLocaleString(),
          fileType: getFileType(file.name)
        },
        ...prev
      ]);
      message.success(`${file.name} 上传成功`);
    } catch (error) {
      clearInterval(uploadInterval);
      message.error(`${file.name} 上传失败: ${error.message || '未知错误'}`);
      setUploadHistory(prev => [
        {
          id: Date.now(),
          name: file.name,
          size: formatFileSize(file.size),
          status: 'error',
          time: new Date().toLocaleString(),
          fileType: getFileType(file.name)
        },
        ...prev
      ]);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  }, [connectedDevice]);

  // 处理文件下载
  const handleDownload = useCallback(async (file) => {
    if (!connectedDevice) {
      message.error('请先连接设备');
      return;
    }

    setDownloading(true);
    setCurrentFile(file.name);
    setDownloadProgress(0);
    
    // 模拟下载进度
    const downloadInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 99) {
          clearInterval(downloadInterval);
          return 99;
        }
        return prev + Math.random() * 8;
      });
    }, 250);

    try {
      // 调用WebSocket服务接收文件
      await websocketService.receiveFile({
        fileName: file.name,
        fileSize: file.size || 1024 * 1024, // 模拟大小
        fileId: file.id
      });
      
      // 模拟实际传输时间
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      clearInterval(downloadInterval);
      setDownloadProgress(100);
      setDownloadHistory(prev => [
        {
          id: Date.now(),
          name: file.name,
          size: file.size || '1MB',
          status: 'success',
          time: new Date().toLocaleString(),
          fileType: file.type
        },
        ...prev
      ]);
      message.success(`${file.name} 下载成功`);
    } catch (error) {
      clearInterval(downloadInterval);
      message.error(`${file.name} 下载失败: ${error.message || '未知错误'}`);
      setDownloadHistory(prev => [
        {
          id: Date.now(),
          name: file.name,
          size: file.size || '1MB',
          status: 'error',
          time: new Date().toLocaleString(),
          fileType: file.type
        },
        ...prev
      ]);
    } finally {
      setDownloading(false);
      setTimeout(() => setDownloadProgress(0), 500);
    }
  }, [connectedDevice]);

  // 删除历史记录
  const handleDeleteHistory = useCallback((id, type) => {
    if (type === 'upload') {
      setUploadHistory(prev => prev.filter(item => item.id !== id));
    } else {
      setDownloadHistory(prev => prev.filter(item => item.id !== id));
    }
  }, []);

  // 查看文件详情
  const handleViewFile = useCallback((file) => {
    setCurrentFile(file);
    setModalVisible(true);
  }, []);

  // 辅助函数：格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 辅助函数：获取文件类型
  const getFileType = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['txt'].includes(ext)) return 'text';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    return 'file';
  };

  // 辅助函数：获取文件图标
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'folder': return <FolderOutlined />;
      case 'image': return <FileOutlined style={{ color: '#1890ff' }} />;
      case 'video': return <FileOutlined style={{ color: '#ff7875' }} />;
      case 'audio': return <FileOutlined style={{ color: '#52c41a' }} />;
      case 'word': return <FileOutlined style={{ color: '#fadb14' }} />;
      case 'excel': return <FileOutlined style={{ color: '#13c2c2' }} />;
      case 'pdf': return <FileOutlined style={{ color: '#f5222d' }} />;
      case 'text': return <FileOutlined style={{ color: '#fa8c16' }} />;
      case 'archive': return <FileOutlined style={{ color: '#722ed1' }} />;
      default: return <FileOutlined />;
    }
  };

  // 上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    customRequest: ({ file, onSuccess }) => {
      handleUpload(file).then(() => {
        onSuccess?.();
      });
    },
    beforeUpload: (file) => {
      // 设置一个较大的文件大小限制，例如 2GB
      const isLt2G = file.size / 1024 / 1024 / 1024 < 2;
      if (!isLt2G) {
        message.error('文件大小不能超过 2GB!');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    showUploadList: false,
    disabled: !connectedDevice || uploading
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Title level={3}>文件传输</Title>
          {connectedDevice && (
            <Text type="secondary">已连接设备: {connectedDevice.name}</Text>
          )}
        </div>
        
        <div className="tab-container" style={{ marginBottom: '20px' }}>
          <Button 
            type={selectedTab === 'upload' ? 'primary' : 'default'}
            onClick={() => setSelectedTab('upload')}
            style={{ marginRight: '8px' }}
          >
            <UploadOutlined /> 上传文件
          </Button>
          <Button 
            type={selectedTab === 'download' ? 'primary' : 'default'}
            onClick={() => setSelectedTab('download')}
            disabled={!connectedDevice}
          >
            <DownloadOutlined /> 下载文件
          </Button>
        </div>

        {selectedTab === 'upload' ? (
          <>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个文件上传，最大文件大小为 2GB
              </p>
            </Dragger>
            
            {uploading && (
              <div style={{ marginTop: '20px' }}>
                <Progress 
                  percent={uploadProgress} 
                  status="active" 
                  format={() => `${currentFile} - ${Math.round(uploadProgress)}%`}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {connectedDevice ? (
              <div>
                <Card title="设备文件列表" bordered={false} style={{ marginBottom: '20px' }}>
                  <List
                    itemLayout="horizontal"
                    dataSource={deviceFiles}
                    renderItem={file => (
                      <List.Item
                        actions={[
                          <Button
                            key="download"
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(file)}
                            disabled={downloading}
                          >
                            下载
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<div style={{ fontSize: '24px' }}>{getFileIcon(file.type)}</div>}
                          title={file.type === 'folder' ? (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <FolderOutlined style={{ marginRight: '8px' }} />
                              <span>{file.name}</span>
                            </div>
                          ) : file.name}
                          description={
                            <div>
                              <Text type="secondary">
                                {file.size || '文件夹'}
                                {' · '}
                                {file.modified}
                              </Text>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
                
                {downloading && (
                  <div style={{ marginTop: '20px' }}>
                    <Progress 
                      percent={downloadProgress} 
                      status="active" 
                      format={() => `${currentFile} - ${Math.round(downloadProgress)}%`}
                    />
                  </div>
                )}
              </div>
            ) : (
              <Card title="设备文件列表" bordered={false}>
                <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                  <Text>请先连接设备以查看文件列表</Text>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      <div>
        <Title level={4}>传输历史</Title>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card title="上传历史" bordered={false}>
            {uploadHistory.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={uploadHistory}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button
                        key="delete"
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteHistory(item.id, 'upload')}
                      />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<div style={{ fontSize: '20px' }}>{getFileIcon(item.fileType)}</div>}
                      title={<a onClick={() => handleViewFile(item)}>{item.name}</a>}
                      description={
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <Tag color={item.status === 'success' ? 'green' : 'red'}>
                              {item.status === 'success' ? '成功' : '失败'}
                            </Tag>
                            <Text type="secondary" style={{ marginLeft: '10px' }}>
                              {item.size}
                            </Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {item.time}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                <Text>暂无上传历史</Text>
              </div>
            )}
          </Card>

          <Card title="下载历史" bordered={false}>
            {downloadHistory.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={downloadHistory}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button
                        key="delete"
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteHistory(item.id, 'download')}
                      />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<div style={{ fontSize: '20px' }}>{getFileIcon(item.fileType)}</div>}
                      title={<a onClick={() => handleViewFile(item)}>{item.name}</a>}
                      description={
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <Tag color={item.status === 'success' ? 'green' : 'red'}>
                              {item.status === 'success' ? '成功' : '失败'}
                            </Tag>
                            <Text type="secondary" style={{ marginLeft: '10px' }}>
                              {item.size}
                            </Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {item.time}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                <Text>暂无下载历史</Text>
              </div>
            )}
          </Card>
        </Space>
      </div>

      {/* 文件详情弹窗 */}
      <Modal
        title="文件详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>
        ]}
      >
        {currentFile && (
          <div>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {getFileIcon(getFileType(currentFile.name || currentFile))}
              </div>
              <Title level={4}>{currentFile.name || currentFile}</Title>
            </div>
            <div style={{ lineHeight: '2' }}>
              {currentFile.size && <div><strong>文件大小：</strong>{currentFile.size}</div>}
              {currentFile.status && <div><strong>状态：</strong>
                <Tag color={currentFile.status === 'success' ? 'green' : 'red'}>
                  {currentFile.status === 'success' ? '成功' : '失败'}
                </Tag>
              </div>}
              {currentFile.time && <div><strong>传输时间：</strong>{currentFile.time}</div>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FileTransfer;