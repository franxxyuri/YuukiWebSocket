import React from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // 更新状态，下次渲染时显示备用UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 可以将错误日志上报给服务器
    console.error('ErrorBoundary捕获到错误:', error, errorInfo);
  }

  handleRetry = () => {
    // 重置状态，重新渲染子组件
    this.setState({ hasError: false, error: null });
    // 刷新页面
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 自定义错误UI
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '80vh',
          padding: '20px'
        }}>
          <Result
            status="error"
            title="页面出错了"
            subTitle={this.state.error?.message || '发生了未知错误'}
            extra={
              <Button type="primary" icon={<ReloadOutlined />} onClick={this.handleRetry}>
                重新加载
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;