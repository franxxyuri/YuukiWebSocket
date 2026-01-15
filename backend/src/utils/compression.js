/**
 * 数据压缩工具
 * 提供消息和文件的压缩/解压缩功能
 */

import zlib from 'zlib';
import { promisify } from 'util';
import logger from './logger.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

class Compression {
  constructor(options = {}) {
    this.compressionLevel = options.compressionLevel || 6; // 1-9, 默认 6
    this.minSizeToCompress = options.minSizeToCompress || 1024; // 1KB
    this.algorithm = options.algorithm || 'gzip'; // gzip 或 deflate
    
    this.stats = {
      compressed: 0,
      decompressed: 0,
      bytesIn: 0,
      bytesOut: 0,
      compressionRatio: 0
    };
    
    logger.info('压缩工具已初始化', {
      algorithm: this.algorithm,
      compressionLevel: this.compressionLevel
    });
  }

  /**
   * 压缩数据
   * @param {Buffer|string} data - 要压缩的数据
   * @returns {Promise<Buffer>} 压缩后的数据
   */
  async compress(data) {
    try {
      // 转换为 Buffer
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      // 检查是否需要压缩
      if (buffer.length < this.minSizeToCompress) {
        logger.debug('数据太小，跳过压缩', { size: buffer.length });
        return buffer;
      }
      
      const startTime = Date.now();
      let compressed;
      
      // 根据算法选择压缩方法
      if (this.algorithm === 'gzip') {
        compressed = await gzip(buffer, {
          level: this.compressionLevel
        });
      } else {
        compressed = await deflate(buffer, {
          level: this.compressionLevel
        });
      }
      
      const duration = Date.now() - startTime;
      const ratio = ((1 - compressed.length / buffer.length) * 100).toFixed(2);
      
      // 更新统计
      this.stats.compressed++;
      this.stats.bytesIn += buffer.length;
      this.stats.bytesOut += compressed.length;
      this.updateCompressionRatio();
      
      logger.debug('数据压缩完成', {
        originalSize: buffer.length,
        compressedSize: compressed.length,
        ratio: `${ratio}%`,
        duration: `${duration}ms`
      });
      
      return compressed;
    } catch (error) {
      logger.error('数据压缩失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 解压缩数据
   * @param {Buffer} data - 要解压缩的数据
   * @returns {Promise<Buffer>} 解压缩后的数据
   */
  async decompress(data) {
    try {
      const startTime = Date.now();
      let decompressed;
      
      // 根据算法选择解压方法
      if (this.algorithm === 'gzip') {
        decompressed = await gunzip(data);
      } else {
        decompressed = await inflate(data);
      }
      
      const duration = Date.now() - startTime;
      
      // 更新统计
      this.stats.decompressed++;
      
      logger.debug('数据解压完成', {
        compressedSize: data.length,
        decompressedSize: decompressed.length,
        duration: `${duration}ms`
      });
      
      return decompressed;
    } catch (error) {
      logger.error('数据解压失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 压缩 JSON 对象
   * @param {Object} obj - 要压缩的对象
   * @returns {Promise<Buffer>} 压缩后的数据
   */
  async compressJSON(obj) {
    const json = JSON.stringify(obj);
    return this.compress(json);
  }

  /**
   * 解压缩 JSON 对象
   * @param {Buffer} data - 压缩的数据
   * @returns {Promise<Object>} 解压后的对象
   */
  async decompressJSON(data) {
    const decompressed = await this.decompress(data);
    return JSON.parse(decompressed.toString());
  }

  /**
   * 压缩消息（自动判断是否需要压缩）
   * @param {Object} message - 消息对象
   * @returns {Promise<Object>} 处理后的消息
   */
  async compressMessage(message) {
    const json = JSON.stringify(message);
    const size = Buffer.byteLength(json);
    
    // 如果消息太小，不压缩
    if (size < this.minSizeToCompress) {
      return {
        compressed: false,
        data: message
      };
    }
    
    // 压缩消息
    const compressed = await this.compress(json);
    
    return {
      compressed: true,
      data: compressed.toString('base64'),
      originalSize: size,
      compressedSize: compressed.length
    };
  }

  /**
   * 解压缩消息
   * @param {Object} envelope - 消息信封
   * @returns {Promise<Object>} 原始消息
   */
  async decompressMessage(envelope) {
    if (!envelope.compressed) {
      return envelope.data;
    }
    
    const buffer = Buffer.from(envelope.data, 'base64');
    const decompressed = await this.decompress(buffer);
    return JSON.parse(decompressed.toString());
  }

  /**
   * 更新压缩比率
   */
  updateCompressionRatio() {
    if (this.stats.bytesIn > 0) {
      this.stats.compressionRatio = (
        (1 - this.stats.bytesOut / this.stats.bytesIn) * 100
      ).toFixed(2);
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      compressionRatio: `${this.stats.compressionRatio}%`,
      averageCompressionSize: this.stats.compressed > 0
        ? Math.round(this.stats.bytesOut / this.stats.compressed)
        : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      compressed: 0,
      decompressed: 0,
      bytesIn: 0,
      bytesOut: 0,
      compressionRatio: 0
    };
    logger.info('压缩统计已重置');
  }

  /**
   * 估算压缩后的大小
   * @param {number} originalSize - 原始大小
   * @returns {number} 估算的压缩后大小
   */
  estimateCompressedSize(originalSize) {
    if (this.stats.compressionRatio > 0) {
      const ratio = parseFloat(this.stats.compressionRatio) / 100;
      return Math.round(originalSize * (1 - ratio));
    }
    // 默认估算 50% 压缩率
    return Math.round(originalSize * 0.5);
  }
}

// 创建默认实例
const compression = new Compression();

export { Compression };
export default compression;
