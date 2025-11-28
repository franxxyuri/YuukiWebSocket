import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, Upload, message, Typography, Table, Modal, Space, Tag, Progress, Empty, Alert, Spin } from 'antd';
import { 
  UploadOutlined, 
  DownloadOutlined, 
  FileOutlined, 
  FileTextOutlined, 
  FileImageOutlined, 
  FileExcelOutlined, 
  FilePdfOutlined, 
  VideoCameraOutlined, 
  SoundOutlined, 
  DeleteOutlined, 
  InfoCircleOutlined, 
  CheckOutlined, 
  ClockCircleOutlined, 
  ReloadOutlined, 
  InboxOutlined 
} from '@ant-design/icons';
import apiService from '../src/services/api-service';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// 文件类型图标映射
const fileTypeIcons = {
  doc: <FileTextOutlined />,
  docx: <FileTextOutlined />,
  txt: <FileTextOutlined />,
  pdf: <FilePdfOutlined />,
  xlsx: <FileExcelOutlined />,
  xls: <FileExcelOutlined />,
  pptx: <FileOutlined />,
  ppt: <FileOutlined />,
  jpg: <FileImageOutlined />,
  jpeg: <FileImageOutlined />,
  png: <FileImageOutlined />,
  gif: <FileImageOutlined />,
  bmp: <FileImageOutlined />,
  mp4: <VideoCameraOutlined />,
  avi: <VideoCameraOutlined />,
  mov: <VideoCameraOutlined />,
  wmv: <VideoCameraOutlined />,
  mp3: <SoundOutlined />,
  wav: <SoundOutlined />,
  flac: <SoundOutlined />,
  aac: <SoundOutlined />,
  zip: <FileOutlined />,
  rar: <FileOutlined />,
  '7z': <FileOutlined />,
  default: <FileOutlined />
};

// 获取文件类型图标
const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  return fileTypeIcons[extension] || fileTypeIcons.default;
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const FileTransfer = ({ connectedDevice }) => {
  // 文件传输状态
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [currentDownload, setCurrentDownload] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [deviceFiles, setDeviceFiles] = useState([]);
  const [loadingDeviceFiles, setLoadingDeviceFiles] = useState(false);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);

  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 监听设备连接变化，更新文件列表
  useEffect(() => {
    if (connectedDevice) {
      fetchDeviceFiles();
    } else {
      setDeviceFiles([]);
      setTransferHistory(prev => 
        prev.map(item => ({
          ...item,
          status: item.status === 'transferring' ? 'failed' : item.status
        }))
      );
      
      // 清理上传/下载状态
      if (currentUpload || currentDownload) {
        handleCancelTransfer();
      }
    }
  }, [connectedDevice]);

  // 监听API服务消息处理文件传输
  useEffect(() => {
    // 监听文件传输进度
    apiService.on('file_transfer_progress', (data) => {
      handleTransferProgress(data);
    });

    // 监听文件传输完成
    apiService.on('file_transfer_complete', (data) => {
      handleTransferComplete(data);
    });

    // 监听文件传输失败
    apiService.on('file_transfer_failed', (data) => {
      handleTransferFailed(data);
    });

    // 监听设备文件列表更新
    apiService.on('device_file_list', (data) => {
      setDeviceFiles(data.files || []);
      setLoadingDeviceFiles(false);
    });

    // 监听API连接断开
    apiService.on('connection_lost', () => {
      handleConnectionLost();
    });

    return () => {
      // 清理事件监听器
      apiService.off('file_transfer_progress');
      apiService.off('file_transfer_complete');
      apiService.off('file_transfer_failed');
      apiService.off('device_file_list');
      apiService.off('connection_lost');
    };
  }, []);

  // 获取设备文件列表
  const fetchDeviceFiles = useCallback(async () => {
    if (!connectedDevice) return;

    setLoadingDeviceFiles(true);
    setError(null);

    try {
      // 发送请求获取设备文件列表
      await apiService.sendRequest('get_device_files', {
        deviceId: connectedDevice.id
      });
    } catch (err) {
      console.error('获取设备文件列表失败:', err);
      setError(`获取设备文件列表失败: ${err.message || '未知错误'}`);
      setShowError(true);
      setLoadingDeviceFiles(false);
    }
  }, [connectedDevice]);

  // 处理文件传输进度
  const handleTransferProgress = useCallback((data) => {
    const { transferId, progress, totalBytes, transferredBytes, type } = data;
    
    if (type === 'upload') {
      setCurrentUpload(prev => {
        if (prev && prev.transferId === transferId) {
          return {
            ...prev,
            progress,
            transferredBytes,
            totalBytes
          };
        }
        return prev;
      });
    } else if (type === 'download') {
      setCurrentDownload(prev => {
        if (prev && prev.transferId === transferId) {
          return {
            ...prev,
            progress,
            transferredBytes,
            totalBytes
          };
        }
        return prev;
      });
    }
  }, []);

  // 处理文件传输完成
  const handleTransferComplete = useCallback((data) => {
    const { transferId, fileName, filePath, fileSize, type, timestamp } = data;
    
    // 创建文件记录
    const fileRecord = {
      id: transferId,
      fileName,
      filePath,
      fileSize,
      type,
      timestamp: timestamp || Date.now(),
      status: 'completed',
      deviceId: connectedDevice?.id,
      deviceName: connectedDevice?.name,
    };

    // 更新历史记录
    setTransferHistory(prev => [fileRecord, ...prev]);
    
    // 清除当前传输状态
    if (type === 'upload') {
      setCurrentUpload(null);
      setUploading(false);
      message.success(`文件上传成功: ${fileName}`);
      // 刷新设备文件列表
      fetchDeviceFiles();
    } else if (type === 'download') {
      setCurrentDownload(null);
      setDownloading(false);
      message.success(`文件下载成功: ${fileName}`);
    }
  }, [connectedDevice, fetchDeviceFiles]);

  // 处理文件传输失败
  const handleTransferFailed = useCallback((data) => {
    const { transferId, fileName, error: errorMsg, type } = data;
    
    const fileRecord = {
      id: transferId,
      fileName,
      status: 'failed',
      error: errorMsg || '传输失败',
      type,
      timestamp: Date.now(),
      deviceId: connectedDevice?.id,
      deviceName: connectedDevice?.name,
    };

    // 更新历史记录
    setTransferHistory(prev => [fileRecord, ...prev]);
    
    // 清除当前传输状态
    if (type === 'upload') {
      setCurrentUpload(null);
      setUploading(false);
      message.error(`文件上传失败: ${fileName} - ${errorMsg || '未知错误'}`);
    } else if (type === 'download') {
      setCurrentDownload(null);
      setDownloading(false);
      message.error(`文件下载失败: ${fileName} - ${errorMsg || '未知错误'}`);
    }
    
    // 设置全局错误
    setError(`文件传输失败: ${errorMsg || '未知错误'}`);
    setShowError(true);
  }, [connectedDevice]);

  // 处理连接断开
  const handleConnectionLost = useCallback(() => {
    // 清理所有传输状态
    if (currentUpload) {
      setCurrentUpload(null);
      setUploading(false);
      addFailedTransfer(currentUpload, 'upload');
    }
    
    if (currentDownload) {
      setCurrentDownload(null);
      setDownloading(false);
      addFailedTransfer(currentDownload, 'download');
    }
    
    setError('设备连接已断开，文件传输已停止');
    setShowError(true);
  }, [currentUpload, currentDownload]);

  // 添加失败的传输记录
  const addFailedTransfer = useCallback((transfer, type) => {
    const fileRecord = {
      id: Date.now().toString(),
      fileName: transfer.fileName,
      fileSize: transfer.totalBytes || 0,
      status: 'failed',
      error: '设备连接断开',
      type,
      timestamp: Date.now(),
      deviceId: connectedDevice?.id,
      deviceName: connectedDevice?.name,
    };
    
    setTransferHistory(prev => [fileRecord, ...prev]);
  }, [connectedDevice]);

  // 处理文件上传
  const handleUpload = useCallback(async (file) => {
    if (!connectedDevice) {
      message.error('请先连接设备');
      return {
        status: 'error',
        error: '请先连接设备',
      };
    }

    // 重置错误状态
    setError(null);
    setShowError(false);

    // 创建新的AbortController用于取消上传
    abortControllerRef.current = new AbortController();

    try {
      // 读取文件内容
      const fileContent = await readFileAsArrayBuffer(file.originFileObj);
      
      // 生成传输ID
      const transferId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 设置当前上传状态
      const uploadData = {
        transferId,
        fileName: file.name,
        fileSize: file.size,
        totalBytes: file.size,
        transferredBytes: 0,
        progress: 0,
        type: file.type,
      };
      
      setCurrentUpload(uploadData);
      setUploading(true);

      // 准备文件元数据
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const fileMetadata = {
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileExtension,
      };

      // 通过API服务发送文件传输请求
      apiService.sendRequest('upload_file', {
        deviceId: connectedDevice.id,
        fileMetadata,
        // 注意：实际应用中，大文件需要分片传输，这里简化处理
      });

      // 模拟返回，阻止默认上传行为
      return false;
    } catch (err) {
      console.error('上传准备失败:', err);
      setError(`文件上传失败: ${err.message || '未知错误'}`);
      setShowError(true);
      setUploading(false);
      message.error('文件上传失败: ' + (err.message || '未知错误'));
      return {
        status: 'error',
        error: err.message || '上传失败',
      };
    }
  }, [connectedDevice]);

  // 处理文件下载
  const handleDownload = useCallback(async (file) => {
    if (!connectedDevice) {
      message.error('请先连接设备');
      return;
    }

    // 重置错误状态
    setError(null);
    setShowError(false);

    try {
      // 创建新的AbortController用于取消下载
      abortControllerRef.current = new AbortController();
      
      // 生成传输ID
      const transferId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 设置当前下载状态
      const downloadData = {
        transferId,
        fileName: file.name,
        fileSize: file.size,
        totalBytes: file.size,
        transferredBytes: 0,
        progress: 0,
      };
      
      setCurrentDownload(downloadData);
      setDownloading(true);

      // 发送下载请求到设备
      apiService.sendRequest('download_file', {
        deviceId: connectedDevice.id,
        transferId,
        fileName: file.name,
        filePath: file.path,
        fileSize: file.size,
      });
    } catch (err) {
      console.error('下载请求失败:', err);
      setError(`文件下载失败: ${err.message || '未知错误'}`);
      setShowError(true);
      setDownloading(false);
      setCurrentDownload(null);
      message.error('文件下载失败: ' + (err.message || '未知错误'));
    }
  }, [connectedDevice]);

  // 取消当前传输
  const handleCancelTransfer = useCallback(() => {
    try {
      // 通知服务器取消传输
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 发送取消传输请求
      if (currentUpload) {
        apiService.sendRequest('cancel_file_transfer', {
          transferId: currentUpload.transferId,
          type: 'upload',
        });
        setCurrentUpload(null);
        setUploading(false);
        message.info('上传已取消');
      }
      
      if (currentDownload) {
        apiService.sendRequest('cancel_file_transfer', {
          transferId: currentDownload.transferId,
          type: 'download',
        });
        setCurrentDownload(null);
        setDownloading(false);
        message.info('下载已取消');
      }
    } catch (err) {
      console.error('取消传输失败:', err);
      message.error('取消传输失败');
    }
  }, [currentUpload, currentDownload]);

  // 清除历史记录
  const handleClearHistory = useCallback(() => {
    Modal.confirm({
      title: '确认清除历史记录',
      content: '确定要清除所有文件传输历史记录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setTransferHistory([]);
        message.success('历史记录已清除');
      }
    });
  }, []);

  // 查看文件详情
  const handleViewDetails = useCallback((file) => {
    setSelectedFile(file);
    setShowDetailsModal(true);
  }, []);

  // 读取文件为ArrayBuffer
  const readFileAsArrayBuffer = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // 渲染文件图标
  const renderFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    return getFileIcon(fileName);
  };

  // 渲染传输状态
  const renderTransferStatus = (status) => {
    switch (status) {
      case 'completed':
        return <Tag color="green">完成</Tag>;
      case 'failed':
        return <Tag color="red">失败</Tag>;
      case 'transferring':
        return <Tag color="processing">传输中</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 渲染传输类型
  const renderTransferType = (type) => {
    switch (type) {
      case 'upload':
        return <Tag color="blue">上传</Tag>;
      case 'download':
        return <Tag color="purple">下载</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 拖拽上传配置
  const draggerProps = {
    name: 'file',
    multiple: false,
    customRequest: ({ onSuccess, onError, file }) => {
      handleUpload(file).then(result => {
        if (result && result.status === 'error') {
          onError(new Error(result.error));
        } else {
          // WebSocket将处理上传结果，这里不做处理
          // onSuccess会被自动调用，但我们通过WebSocket回调来更新状态
        }
      }).catch(err => {
        onError(err);
      });
    },
    beforeUpload: (file) => {
      // 检查文件大小限制 (1GB)
      const isLt1G = file.size / 1024 / 1024 / 1024 < 1;
      if (!isLt1G) {
        message.error('文件大小不能超过1GB');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    onDrop: (e) => {
      // 处理拖拽文件
      if (!connectedDevice) {
        e.preventDefault();
        message.error('请先连接设备');
        return false;
      }
      return true;
    },
    disabled: !connectedDevice || uploading || downloading,
    showUploadList: false,
  };

  // 设备文件列表列配置
  const deviceFileColumns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          {renderFileIcon(text)}
          <Text ellipsis={{ tooltip: text }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size) => formatFileSize(size),
    },
    {
      title: '修改时间',
      dataIndex: 'lastModified',
      key: 'lastModified',
      render: (time) => time ? formatDate(time) : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<DownloadOutlined />} 
          onClick={() => handleDownload(record)}
          disabled={!connectedDevice || downloading || uploading}
        >
          下载
        </Button>
      ),
    },
  ];

  // 传输历史列配置
  const historyColumns = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (text, record) => (
        <Space>
          {renderFileIcon(text)}
          <Text ellipsis={{ tooltip: text }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size) => formatFileSize(size),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: renderTransferType,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderTransferStatus,
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time) => formatDate(time),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<InfoCircleOutlined />} 
          onClick={() => handleViewDetails(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>文件传输</Title>
      
      {!connectedDevice ? (
        <Alert
          message="未连接设备"
          description="请先连接设备再进行文件传输"
          type="warning"
          showIcon
          style={{ marginBottom: '20px' }}
        />
      ) : (
        <>
          {/* 当前传输状态 */}
          {(currentUpload || currentDownload) && (
            <Card title="当前传输" style={{ marginBottom: '20px' }}>
              <div>
                {(currentUpload || currentDownload) && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <Text ellipsis={{ tooltip: (currentUpload?.fileName || currentDownload?.fileName) }}>
                        {renderFileIcon(currentUpload?.fileName || currentDownload?.fileName)}
                        {' '}{currentUpload?.fileName || currentDownload?.fileName}
                      </Text>
                      <Button 
                        danger 
                        type="link" 
                        icon={<DeleteOutlined />} 
                        onClick={handleCancelTransfer}
                      >
                        取消
                      </Button>
                    </div>
                    <Progress 
                      percent={(currentUpload?.progress || currentDownload?.progress) || 0} 
                      status="active"
                      format={() => `
                        ${formatFileSize(currentUpload?.transferredBytes || currentDownload?.transferredBytes || 0)} / 
                        ${formatFileSize(currentUpload?.totalBytes || currentDownload?.totalBytes || 0)}
                      `}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}
          
          {/* 上传区域 */}
          <Card title="上传文件到设备" style={{ marginBottom: '20px' }}>
            <Dragger {...draggerProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个文件上传，最大1GB
              </p>
              {uploading && (
                <div style={{ marginTop: '16px' }}>
                  <Spin tip="正在准备上传..." />
                </div>
              )}
            </Dragger>
          </Card>
          
          {/* 设备文件列表 */}
          <Card 
            title="设备文件" 
            style={{ marginBottom: '20px' }}
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchDeviceFiles}
                loading={loadingDeviceFiles}
                disabled={!connectedDevice}
              >
                刷新
              </Button>
            }
          >
            {loadingDeviceFiles ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin tip="正在加载设备文件..." />
              </div>
            ) : deviceFiles.length === 0 ? (
              <Empty description="设备上没有文件" />
            ) : (
              <Table 
                columns={deviceFileColumns} 
                dataSource={deviceFiles} 
                rowKey="path"
                pagination={{ pageSize: 10 }}
              />
            )}
          </Card>
        </>
      )}
      
      {/* 传输历史 */}
      <Card 
        title="传输历史" 
        style={{ marginBottom: '20px' }}
        extra={
          transferHistory.length > 0 && (
            <Button 
              danger 
              type="link" 
              icon={<DeleteOutlined />} 
              onClick={handleClearHistory}
            >
              清除历史
            </Button>
          )
        }
      >
        {transferHistory.length === 0 ? (
          <Empty description="暂无传输记录" />
        ) : (
          <Table 
            columns={historyColumns} 
            dataSource={transferHistory} 
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
      
      {/* 错误提示 */}
      {showError && error && (
        <Alert
          message="操作错误"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setShowError(false)}
          style={{ marginBottom: '20px' }}
        />
      )}
      
      {/* 文件详情模态框 */}
      <Modal
        title="文件详情"
        open={showDetailsModal}
        onCancel={() => setShowDetailsModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetailsModal(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedFile && (
          <div>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {getFileIcon(selectedFile.fileName || selectedFile)}
              </div>
              <Title level={4}>{selectedFile.fileName || selectedFile}</Title>
            </div>
            <div style={{ lineHeight: '2' }}>
              {selectedFile.fileSize && <div><strong>文件大小：</strong>{formatFileSize(selectedFile.fileSize)}</div>}
              {selectedFile.status && <div><strong>状态：</strong>
                <Tag color={selectedFile.status === 'completed' ? 'green' : 'red'}>
                  {selectedFile.status === 'completed' ? '成功' : selectedFile.status === 'failed' ? '失败' : selectedFile.status}
                </Tag>
              </div>}
              {selectedFile.timestamp && <div><strong>传输时间：</strong>{formatDate(selectedFile.timestamp)}</div>}
              {selectedFile.error && <div><strong>错误信息：</strong>{selectedFile.error}</div>}
              {selectedFile.deviceName && <div><strong>设备名称：</strong>{selectedFile.deviceName}</div>}
              {selectedFile.type && <div><strong>传输类型：</strong>{selectedFile.type === 'upload' ? '上传' : '下载'}</div>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FileTransfer;