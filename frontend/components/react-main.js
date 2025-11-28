// React入口文件 - 直接实现React功能以避免.jsx文件的MIME类型问题

// 确保root元素存在
function ensureRootElementExists() {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    console.log('创建root元素...');
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
    console.log('root元素创建成功');
  }
  return rootElement;
}

// 先确保root元素存在
const rootElement = ensureRootElementExists();

// 添加加载中提示
rootElement.innerHTML = `<div style="padding: 20px; font-family: Arial, sans-serif; color: #666; text-align: center;"><h2>正在加载React应用...</h2></div>`;

// 加载React库的函数
function loadReactLibraries() {
  return new Promise((resolve, reject) => {
    try {
      // 创建React脚本元素
      const reactScript = document.createElement('script');
      reactScript.src = 'https://unpkg.com/react@18/umd/react.development.js';
      reactScript.crossOrigin = 'anonymous';
      
      // 创建ReactDOM脚本元素
      const reactDomScript = document.createElement('script');
      reactDomScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.development.js';
      reactDomScript.crossOrigin = 'anonymous';
      
      // 加载完成后的回调
      let scriptsLoaded = 0;
      const checkAllLoaded = () => {
        scriptsLoaded++;
        if (scriptsLoaded === 2 && typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
          console.log('React库加载成功');
          resolve();
        }
      };
      
      reactScript.onload = checkAllLoaded;
      reactDomScript.onload = checkAllLoaded;
      
      // 错误处理
      reactScript.onerror = () => reject(new Error('React库加载失败'));
      reactDomScript.onerror = () => reject(new Error('ReactDOM库加载失败'));
      
      // 添加到文档
      document.head.appendChild(reactScript);
      document.head.appendChild(reactDomScript);
      
      console.log('正在加载React库...');
    } catch (error) {
      reject(error);
    }
  });
}

// 渲染应用的函数
function renderApp() {
  try {
    console.log('开始渲染React应用...');
    
    // 再次确认root元素存在
    const rootElement = ensureRootElementExists();
    
    // 创建一个简单的欢迎界面
    const welcomeElement = document.createElement('div');
    welcomeElement.style.cssText = `
      padding: 40px;
      font-family: Arial, sans-serif;
      color: #333;
      text-align: center;
      max-width: 600px;
      margin: 0 auto;
      background-color: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    const heading = document.createElement('h1');
    heading.textContent = 'Windows-Android Connect';
    heading.style.color = '#2c3e50';
    heading.style.marginBottom = '20px';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = 'React应用已成功加载！这是一个跨平台设备互联解决方案。';
    paragraph.style.fontSize = '18px';
    paragraph.style.lineHeight = '1.6';
    
    const statusElement = document.createElement('div');
    statusElement.style.marginTop = '30px';
    statusElement.style.padding = '15px';
    statusElement.style.backgroundColor = '#e8f4fc';
    statusElement.style.borderRadius = '4px';
    statusElement.style.color = '#2980b9';
    statusElement.textContent = '应用状态: 准备就绪';
    
    welcomeElement.appendChild(heading);
    welcomeElement.appendChild(paragraph);
    welcomeElement.appendChild(statusElement);
    
    // 清空root元素并添加我们的内容
    rootElement.innerHTML = '';
    rootElement.appendChild(welcomeElement);
    
    console.log('React应用渲染成功');
  } catch (error) {
    console.error('React应用渲染失败:', error);
    const rootElement = ensureRootElementExists();
    rootElement.innerHTML = `<div style="padding: 20px; font-family: Arial, sans-serif; color: #666; text-align: center;"><h2>React应用渲染失败</h2><p>错误详情: ${error}</p></div>`;
  }
}

// 主执行流程
async function main() {
  try {
    console.log('正在初始化React应用...');
    
    // 加载React库
    await loadReactLibraries();
    
    // 渲染应用
    renderApp();
  } catch (error) {
    console.error('应用初始化失败:', error);
    const rootElement = ensureRootElementExists();
    rootElement.innerHTML = `<div style="padding: 20px; font-family: Arial, sans-serif; color: #666; text-align: center;"><h2>应用初始化失败</h2><p>错误详情: ${error}</p></div>`;
  }
}

// 执行主函数
main();