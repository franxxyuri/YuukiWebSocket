/**
 * 统一错误处理中间件
 * 捕获并处理所有应用错误，提供友好的错误响应
 */

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // 日志记录
  console.error('错误详情:', {
    message: error.message,
    statusCode: error.statusCode || 500,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // 默认错误状态码
  const statusCode = error.statusCode || 500;

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      message: error.message || '服务器内部错误',
      statusCode: statusCode,
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  // 开发环境下包含堆栈信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
    errorResponse.error.details = error;
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 错误处理
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`路径 ${req.originalUrl} 未找到`, 404);
  next(error);
};

/**
 * 异步错误包装器
 * 用于包装异步路由处理器，自动捕获错误
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * WebSocket 错误处理
 */
const handleWebSocketError = (ws, error) => {
  console.error('WebSocket错误:', {
    message: error.message,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // 发送错误消息给客户端
  if (ws && ws.readyState === 1) { // WebSocket.OPEN
    try {
      ws.send(JSON.stringify({
        type: 'error',
        error: {
          message: error.message || '服务器错误',
          timestamp: new Date().toISOString()
        }
      }));
    } catch (sendError) {
      console.error('发送错误消息失败:', sendError);
    }
  }
};

/**
 * 进程级错误处理
 */
const setupProcessErrorHandlers = () => {
  // 未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    console.error('堆栈:', error.stack);
    
    // 给予时间记录日志后退出
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // 未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    console.error('Promise:', promise);
  });

  // 进程退出
  process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，准备关闭服务器...');
    // 这里可以添加清理逻辑
  });

  process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，准备关闭服务器...');
    // 这里可以添加清理逻辑
    process.exit(0);
  });
};

export default errorHandler;
export {
  AppError,
  notFoundHandler,
  asyncHandler,
  handleWebSocketError,
  setupProcessErrorHandlers
};
