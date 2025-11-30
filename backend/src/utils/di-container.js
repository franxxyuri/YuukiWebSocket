/**
 * 依赖注入容器
 * 用于管理组件依赖关系，提高可测试性
 */

class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * 注册服务
   * @param {string} name - 服务名称
   * @param {Function} factory - 服务工厂函数
   * @param {boolean} isSingleton - 是否为单例
   */
  register(name, factory, isSingleton = false) {
    this.services.set(name, { factory, isSingleton });
  }

  /**
   * 获取服务实例
   * @param {string} name - 服务名称
   * @param {Object} dependencies - 额外的依赖项
   * @returns {Object} 服务实例
   */
  get(name, dependencies = {}) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not registered`);
    }

    if (service.isSingleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this, dependencies));
      }
      return this.singletons.get(name);
    }

    return service.factory(this, dependencies);
  }

  /**
   * 清除所有单例实例
   */
  clear() {
    this.singletons.clear();
  }
}

// 创建单例容器
const container = new DIContainer();

export default container;
