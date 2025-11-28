// 直接在main.js中实现React应用的基本功能
console.log('main.js加载成功');

// 检查是否有React环境
if (window.React) {
  console.log('React已加载');
  
  // 尝试渲染一个简单的组件
  try {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      // 如果React已加载，创建一个简单的组件
      const App = () => {
        return React.createElement('div', null, 
          React.createElement('h1', null, 'Hello from React!'),
          React.createElement('p', null, 'MIME类型问题已解决!')
        );
      };
      
      // 渲染组件
      ReactDOM.render(
        React.createElement(App, null),
        rootElement
      );
      console.log('React组件渲染成功');
    } else {
      console.log('未找到root元素');
      // 如果没有root元素，创建一个
      const div = document.createElement('div');
      div.id = 'root';
      document.body.appendChild(div);
      console.log('已创建root元素');
    }
  } catch (err) {
    console.error('渲染React组件失败:', err);
  }
} else {
  console.log('React未加载，显示简单内容');
  // 如果没有React，显示简单内容
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <h1>Hello World!</h1>
      <p>main.js成功加载，MIME类型问题已解决</p>
      <p>当前时间: ${new Date().toLocaleString()}</p>
    `;
  }
}