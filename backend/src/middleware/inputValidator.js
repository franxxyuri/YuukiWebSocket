/**
 * 输入验证中间件
 * 用于验证请求参数的有效性
 */

// 验证规则定义
const validationRules = {
  // 设备ID验证
  deviceId: (value) => {
    if (!value || typeof value !== 'string') {
      return '设备ID不能为空且必须是字符串';
    }
    if (value.trim().length === 0) {
      return '设备ID不能为空';
    }
    if (value.length > 100) {
      return '设备ID长度不能超过100个字符';
    }
    // 验证设备ID格式（只允许字母、数字、连字符和下划线）
    if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
      return '设备ID只能包含字母、数字、连字符和下划线';
    }
    return null;
  },
  
  // IP地址验证
  ipAddress: (value) => {
    if (!value || typeof value !== 'string') {
      return 'IP地址不能为空且必须是字符串';
    }
    // 验证IPv4地址格式
    const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(value)) {
      return '无效的IPv4地址格式';
    }
    return null;
  },
  
  // 端口号验证
  port: (value) => {
    const port = parseInt(value);
    if (isNaN(port)) {
      return '端口号必须是数字';
    }
    if (port < 1 || port > 65535) {
      return '端口号必须在1-65535之间';
    }
    return null;
  },
  
  // 字符串验证
  string: (value, options = {}) => {
    if (options.required && (!value || typeof value !== 'string')) {
      return options.message || '该字段不能为空且必须是字符串';
    }
    if (value && typeof value === 'string') {
      if (options.minLength && value.length < options.minLength) {
        return `该字段长度不能小于${options.minLength}个字符`;
      }
      if (options.maxLength && value.length > options.maxLength) {
        return `该字段长度不能超过${options.maxLength}个字符`;
      }
      if (options.pattern && !options.pattern.test(value)) {
        return options.patternMessage || '该字段格式不正确';
      }
    }
    return null;
  },
  
  // 数字验证
  number: (value, options = {}) => {
    const num = parseFloat(value);
    if (options.required && isNaN(num)) {
      return options.message || '该字段不能为空且必须是数字';
    }
    if (!isNaN(num)) {
      if (options.min !== undefined && num < options.min) {
        return `该字段不能小于${options.min}`;
      }
      if (options.max !== undefined && num > options.max) {
        return `该字段不能大于${options.max}`;
      }
    }
    return null;
  },
  
  // 布尔值验证
  boolean: (value, options = {}) => {
    if (options.required && typeof value !== 'boolean') {
      return options.message || '该字段必须是布尔值';
    }
    return null;
  },
  
  // 数组验证
  array: (value, options = {}) => {
    if (options.required && (!Array.isArray(value))) {
      return options.message || '该字段不能为空且必须是数组';
    }
    if (Array.isArray(value)) {
      if (options.minLength && value.length < options.minLength) {
        return `该数组长度不能小于${options.minLength}`;
      }
      if (options.maxLength && value.length > options.maxLength) {
        return `该数组长度不能超过${options.maxLength}`;
      }
      if (options.itemType) {
        for (let i = 0; i < value.length; i++) {
          const itemError = options.itemType(value[i]);
          if (itemError) {
            return `数组第${i + 1}项: ${itemError}`;
          }
        }
      }
    }
    return null;
  },
  
  // 对象验证
  object: (value, options = {}) => {
    if (options.required && (!value || typeof value !== 'object' || Array.isArray(value))) {
      return options.message || '该字段不能为空且必须是对象';
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (options.schema) {
        for (const [key, validator] of Object.entries(options.schema)) {
          const fieldError = validator(value[key]);
          if (fieldError) {
            return `${key}: ${fieldError}`;
          }
        }
      }
    }
    return null;
  }
};

// 输入验证中间件工厂函数
const validate = (validationSchema) => {
  return (req, res, next) => {
    const errors = [];
    
    // 合并所有请求数据
    const allData = {
      ...req.params,
      ...req.query,
      ...req.body
    };
    
    // 执行验证
    for (const [field, validator] of Object.entries(validationSchema)) {
      const value = allData[field];
      const error = validator(value);
      
      if (error) {
        errors.push({
          field: field,
          message: error
        });
      }
    }
    
    // 如果有验证错误，返回错误响应
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: '输入验证失败',
          details: errors,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        }
      });
    }
    
    // 验证通过，继续处理请求
    next();
  };
};

export { validationRules, validate };
export default validate;