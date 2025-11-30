/**
 * 错误处理中间件
 * 统一处理所有HTTP请求的错误
 */

const errorHandler = (err, req, res, next) => {
  // 记录详细错误日志
  console.error(`[${new Date().toISOString()}] 错误:`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    statusCode: err.statusCode || 500,
    message: err.message || '服务器内部错误',
    stack: err.stack,
    headers: req.headers,
    body: req.body
  });

  // 确定错误状态码
  const statusCode = err.statusCode || 500;

  // 确定错误信息
  const message = err.message || '服务器内部错误';

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      code: statusCode,
      message: message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // 开发环境下添加详细错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
