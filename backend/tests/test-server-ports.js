import http from 'http';

// 从环境变量读取端口配置，或使用默认值
const serverPort = parseInt(process.env.SERVER_PORT) || 8928;
const vitePort = parseInt(process.env.VITE_PORT) || 8781;

// 测试服务器端口
const serverOptions = {
  hostname: 'localhost',
  port: serverPort,
  path: '/api/status',
  method: 'GET'
};

console.log(`正在测试${serverPort}端口...`);
const serverReq = http.request(serverOptions, (res) => {
  console.log(`${serverPort}端口状态码:`, res.statusCode);
  
  res.on('data', (chunk) => {
    console.log(`${serverPort}端口响应数据:`, chunk.toString());
  });
});

serverReq.on('error', (e) => {
  console.log(`${serverPort}端口连接失败:`, e.message);
});

serverReq.end();

// 测试Vite开发服务器端口
setTimeout(() => {
  const viteOptions = {
    hostname: 'localhost',
    port: vitePort,
    path: '/api/status',
    method: 'GET'
  };

  console.log(`正在测试${vitePort}端口...`);
  const viteReq = http.request(viteOptions, (res) => {
    console.log(`${vitePort}端口状态码:`, res.statusCode);
    
    res.on('data', (chunk) => {
      console.log(`${vitePort}端口响应数据:`, chunk.toString());
    });
  });

  viteReq.on('error', (e) => {
    console.log(`${vitePort}端口连接失败:`, e.message);
  });

  viteReq.end();
}, 2000);