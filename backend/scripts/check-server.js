import http from 'http';

const options = {
  hostname: 'localhost',
  port: 8928,
  path: '/api/status',
  method: 'GET'
};

console.log('正在检查服务器状态...');
const req = http.request(options, (res) => {
  console.log('状态码:', res.statusCode);
  
  res.on('data', (chunk) => {
    console.log('响应数据:', chunk.toString());
  });
  
  res.on('end', () => {
    console.log('服务器状态检查完成');
  });
});

req.on('error', (e) => {
  console.log('服务器连接失败:', e.message);
});

req.end();