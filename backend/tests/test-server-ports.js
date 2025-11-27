import http from 'http';

// 测试8928端口
const options8828 = {
  hostname: 'localhost',
  port: 8928,
  path: '/api/status',
  method: 'GET'
};

console.log('正在测试8928端口...');
const req8828 = http.request(options8828, (res) => {
  console.log('8928端口状态码:', res.statusCode);
  
  res.on('data', (chunk) => {
    console.log('8928端口响应数据:', chunk.toString());
  });
});

req8828.on('error', (e) => {
  console.log('8928端口连接失败:', e.message);
});

req8828.end();

// 测试8781端口
setTimeout(() => {
  const options8080 = {
    hostname: 'localhost',
    port: 8781,
    path: '/api/status',
    method: 'GET'
  };

  console.log('正在测试8781端口...');
  const req8080 = http.request(options8080, (res) => {
    console.log('8781端口状态码:', res.statusCode);
    
    res.on('data', (chunk) => {
      console.log('8781端口响应数据:', chunk.toString());
    });
  });

  req8080.on('error', (e) => {
    console.log('8781端口连接失败:', e.message);
  });

  req8080.end();
}, 2000);