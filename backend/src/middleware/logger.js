/**
 * 日志中间件
 * 记录所有HTTP请求的日志信息
 */

const logger = (req, res, next) => {
  const start = Date.now();
  const { method, url, headers, ip } = req;

  // 记录请求开始
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${ip}`);

  // 监听响应结束事件
  res.on('finish', () => {
    const { statusCode } = res;
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${ip} - ${statusCode} - ${duration}ms`);
  });

  next();
};

export default logger;
