// utils/encryption.js - 敏感数据加密服务（AES-256-CBC + 密钥轮换）
const CryptoJS = require('crypto-js');
const crypto = require('crypto');

// ============ 加密配置常量 ============
const CONFIG = {
  ALGORITHM: 'AES-256-CBC',
  KEY_SIZE: 32,               // 256 bits = 32 bytes
  IV_SIZE: 16,                // 128 bits = 16 bytes
  PBKDF2_ITERATIONS: 10000,
  PBKDF2_KEY_SIZE: 256 / 32,  // 8 words for CryptoJS
  VERSION_PREFIX: 'v',
  SEPARATOR: ':',
};

// ============ PBKDF2 密钥派生 ============

/**
 * 从密码短语派生 AES 密钥
 * @param {string} passphrase - 原始密码短语
 * @param {string} salt - 盐值
 * @param {number} [iterations=10000] - 迭代次数
 * @returns {CryptoJS.lib.WordArray} 派生密钥
 */
function deriveKey(passphrase, salt, iterations = CONFIG.PBKDF2_ITERATIONS) {
  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: CONFIG.PBKDF2_KEY_SIZE,
    iterations,
    hasher: CryptoJS.algo.SHA256,
  });
}

/**
 * 从环境变量 ENCRYPTION_KEY 派生 AES 密钥（用于存储固定密钥而非密码短语的场景）
 * @param {string} hexKey - 64 字符十六进制密钥（256-bit）
 * @param {string} [ivHex] - 可选的 IV 熵源
 * @returns {{ key: CryptoJS.lib.WordArray, salt: string }}
 */
function keyFromEnv(hexKey, ivHex) {
  const salt = ivHex
    ? CryptoJS.SHA256(ivHex).toString().slice(0, 32)
    : 'blog_encryption_salt_2026';
  const key = deriveKey(hexKey, salt);
  return { key, salt };
}

// ============ AES 加密/解密原语 ============

/**
 * AES-256-CBC 加密
 * @param {string} plaintext - 明文
 * @param {CryptoJS.lib.WordArray} key - AES 密钥
 * @returns {{ ciphertext: string, iv: string }} Base64 编码的密文和 IV
 */
function aesEncrypt(plaintext, key) {
  const iv = CryptoJS.lib.WordArray.random(CONFIG.IV_SIZE);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, { iv });
  return {
    ciphertext: encrypted.toString(), // CryptoJS 格式：OpenSSL 兼容的 Base64
    iv: CryptoJS.enc.Base64.stringify(iv),
  };
}

/**
 * AES-256-CBC 解密
 * @param {string} ciphertext - CryptoJS 格式的密文
 * @param {CryptoJS.lib.WordArray} key - AES 密钥
 * @param {string} ivBase64 - Base64 编码的 IV
 * @returns {string} 明文
 */
function aesDecrypt(ciphertext, key, ivBase64) {
  const iv = CryptoJS.enc.Base64.parse(ivBase64);
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv });
  const result = decrypted.toString(CryptoJS.enc.Utf8);
  if (!result) {
    throw new Error('解密失败：密钥不匹配或数据已损坏');
  }
  return result;
}

// ============ 密钥版本管理 ============

/**
 * 从环境变量解析多版本密钥映射
 * ENCRYPTION_KEY=v2:hexkey    — 当前密钥（格式：版本:64位十六进制）
 * ENCRYPTION_PREVIOUS_KEYS=v1:hexkey1,v0:hexkey0  — 旧密钥（逗号分隔，仅用于解密）
 *
 * @returns {{ [version]: string }} 版本号 → 十六进制密钥 的映射
 */
function parseKeyVersions() {
  const keys = {};

  const current = process.env.ENCRYPTION_KEY || '';
  const match = current.match(/^(v\d+):([0-9a-fA-F]{64})$/);
  if (match) {
    keys[match[1]] = match[2];
  }

  const prevRaw = process.env.ENCRYPTION_PREVIOUS_KEYS || '';
  for (const entry of prevRaw.split(',')) {
    const trimmed = entry.trim();
    const m = trimmed.match(/^(v\d+):([0-9a-fA-F]{64})$/);
    if (m) {
      keys[m[1]] = m[2];
    }
  }

  return keys;
}

// ============ EncryptionService 类 ============

class EncryptionService {
  constructor() {
    const hexKeys = parseKeyVersions();
    this._keyVersions = {};

    // 解析所有密钥为 WordArray（附带固定盐）
    const salt = process.env.ENCRYPTION_IV
      ? CryptoJS.SHA256(process.env.ENCRYPTION_IV).toString().slice(0, 32)
      : 'blog_encryption_salt_2026';

    for (const [version, hexKey] of Object.entries(hexKeys)) {
      this._keyVersions[version] = deriveKey(hexKey, salt);
    }

    // 当前加密版本：取最大版本号
    const versions = Object.keys(this._keyVersions).sort();
    this._currentVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  }

  /**
   * 加密明文
   * @param {string|null|undefined} plaintext - 明文
   * @returns {string|null} 加密后的字符串（格式: v{version}:{iv}:{ciphertext}），或 null
   */
  encrypt(plaintext) {
    if (plaintext == null || plaintext === '') return null;
    if (!this._currentVersion) {
      throw new Error('加密服务未初始化：缺少 ENCRYPTION_KEY 环境变量');
    }

    const key = this._keyVersions[this._currentVersion];
    const { ciphertext, iv } = aesEncrypt(String(plaintext), key);

    return [
      this._currentVersion,
      iv,
      ciphertext,
    ].join(CONFIG.SEPARATOR);
  }

  /**
   * 解密密文
   * @param {string|null|undefined} encryptedText - 加密字符串
   * @returns {string|null} 明文，或 null
   */
  decrypt(encryptedText) {
    if (encryptedText == null || encryptedText === '') return null;
    if (!this.isEncrypted(encryptedText)) return encryptedText;

    const parts = encryptedText.split(CONFIG.SEPARATOR);
    if (parts.length < 3) {
      throw new Error('无效的加密数据格式');
    }

    const [versionTag, iv, ciphertext] = parts;
    const version = versionTag.startsWith(CONFIG.VERSION_PREFIX)
      ? versionTag
      : `${CONFIG.VERSION_PREFIX}${versionTag}`;

    const key = this._keyVersions[version];
    if (!key) {
      throw new Error(
        `无法解密：未知的密钥版本 ${version}。请确认 ENCRYPTION_PREVIOUS_KEYS 包含该版本`
      );
    }

    return aesDecrypt(ciphertext, key, iv);
  }

  /**
   * 判断文本是否为加密格式
   * @param {string} text
   * @returns {boolean}
   */
  isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;
    return /^v\d+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(text);
  }

  /**
   * 检查加密服务是否已初始化
   * @returns {boolean}
   */
  isReady() {
    return this._currentVersion !== null;
  }

  /**
   * 获取当前加密密钥版本
   * @returns {string|null}
   */
  get currentVersion() {
    return this._currentVersion;
  }

  /**
   * 获取所有已知密钥版本列表
   * @returns {string[]}
   */
  get knownVersions() {
    return Object.keys(this._keyVersions).sort();
  }

  /**
   * 轮换密钥：用新密钥重新加密数据
   * @param {string} encryptedText - 用旧版本密钥加密的数据
   * @returns {string} 用当前版本密钥加密的数据
   */
  reEncrypt(encryptedText) {
    const plaintext = this.decrypt(encryptedText);
    return this.encrypt(plaintext);
  }

  /**
   * 安全比较：比较两个加密值（先解密再比较，防止时序攻击）
   * @param {string} encryptedA
   * @param {string} encryptedB
   * @returns {boolean}
   */
  equals(encryptedA, encryptedB) {
    const a = this.decrypt(encryptedA) || '';
    const b = this.decrypt(encryptedB) || '';
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return a === b;
    }
  }
}

// ============ 单例导出 ============
const encryptionService = new EncryptionService();

module.exports = encryptionService;
module.exports.EncryptionService = EncryptionService;
module.exports.deriveKey = deriveKey;
module.exports.keyFromEnv = keyFromEnv;
module.exports.aesEncrypt = aesEncrypt;
module.exports.aesDecrypt = aesDecrypt;
module.exports.parseKeyVersions = parseKeyVersions;
module.exports.CONFIG = CONFIG;
