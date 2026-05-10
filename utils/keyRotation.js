// utils/keyRotation.js - 加密密钥轮换工具
//
// 用法：
//   node utils/keyRotation.js                 生成新密钥（不应用）
//   node utils/keyRotation.js --rotate         执行密钥轮换
//   node utils/keyRotation.js --re-encrypt     批量重加密数据库记录
//
// 密钥轮换流程：
//   1. 生成新密钥版本（v2, v3, ...）
//   2. 更新 ENCRYPTION_KEY 为新密钥
//   3. 将旧密钥移到 ENCRYPTION_PREVIOUS_KEYS
//   4. 可选：使用新密钥重加密所有现有数据

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const encryption = require('./encryption');

// ============ 密钥生成 ============

/**
 * 生成新的 AES-256 密钥
 * @returns {{ version: string, hexKey: string, iv: string }}
 */
function generateKey() {
  const hexKey = crypto.randomBytes(32).toString('hex');
  const iv = crypto.randomBytes(16).toString('hex');

  // 读取当前密钥版本号
  const currentRaw = process.env.ENCRYPTION_KEY || '';
  const currentMatch = currentRaw.match(/^(v(\d+)):/);
  const nextVersion = currentMatch
    ? `v${parseInt(currentMatch[2], 10) + 1}`
    : 'v1';

  return { version: nextVersion, hexKey, iv };
}

// ============ 环境变量更新 ============

/**
 * 更新 .env.local 文件中的加密密钥（用于轮换）
 * @param {{ version: string, hexKey: string, iv: string }} newKey
 * @param {string} envPath
 */
function updateEnvLocal(newKey, envPath) {
  const filePath = envPath || path.join(__dirname, '..', '.env.local');
  let content = '';

  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    content = '# 本地覆盖配置（自动生成）\n';
  }

  const newEncryptionKey = `${newKey.version}:${newKey.hexKey}`;

  // 读取旧密钥作为 PREVIOUS_KEYS
  const currentRaw = process.env.ENCRYPTION_KEY || '';
  const prevRaw = process.env.ENCRYPTION_PREVIOUS_KEYS || '';

  let updatedPrevious = prevRaw;
  if (currentRaw && !prevRaw.includes(currentRaw.split(':')[0])) {
    updatedPrevious = prevRaw
      ? `${currentRaw},${prevRaw}`
      : currentRaw;
  }

  // 更新或追加 ENCRYPTION_KEY
  const keyRegex = /^ENCRYPTION_KEY=.*$/m;
  if (keyRegex.test(content)) {
    content = content.replace(keyRegex, `ENCRYPTION_KEY=${newEncryptionKey}`);
  } else {
    content += `\nENCRYPTION_KEY=${newEncryptionKey}`;
  }

  // 更新或追加 ENCRYPTION_PREVIOUS_KEYS
  const prevRegex = /^ENCRYPTION_PREVIOUS_KEYS=.*$/m;
  if (prevRegex.test(content)) {
    content = content.replace(prevRegex, `ENCRYPTION_PREVIOUS_KEYS=${updatedPrevious}`);
  } else if (updatedPrevious) {
    content += `\nENCRYPTION_PREVIOUS_KEYS=${updatedPrevious}`;
  }

  // 更新 ENCRYPTION_IV
  const ivRegex = /^ENCRYPTION_IV=.*$/m;
  if (ivRegex.test(content)) {
    content = content.replace(ivRegex, `ENCRYPTION_IV=${newKey.iv}`);
  } else {
    content += `\nENCRYPTION_IV=${newKey.iv}`;
  }

  fs.writeFileSync(filePath, content);
  return filePath;
}

// ============ 批量重加密 ============

/**
 * 批量重加密 User 表中的敏感字段
 * @param {object} prisma - Prisma 客户端实例
 * @returns {{ updated: number, failed: number }}
 */
async function reEncryptUsers(prisma) {
  let updated = 0;
  let failed = 0;

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { idCard: { not: null } },
        { bankCard: { not: null } },
        { secretQuestion: { not: null } },
      ],
    },
  });

  for (const user of users) {
    try {
      const data = {};
      if (user.idCard && encryption.isEncrypted(user.idCard)) {
        data.idCard = encryption.reEncrypt(user.idCard);
      }
      if (user.bankCard && encryption.isEncrypted(user.bankCard)) {
        data.bankCard = encryption.reEncrypt(user.bankCard);
      }
      if (user.secretQuestion && encryption.isEncrypted(user.secretQuestion)) {
        data.secretQuestion = encryption.reEncrypt(user.secretQuestion);
      }

      if (Object.keys(data).length > 0) {
        await prisma.user.update({ where: { id: user.id }, data });
        updated++;
      }
    } catch (err) {
      console.error(`重加密用户 ${user.id} 失败:`, err.message);
      failed++;
    }
  }

  return { updated, failed };
}

/**
 * 批量重加密 ApiKey 表
 * @param {object} prisma - Prisma 客户端实例
 * @returns {{ updated: number, failed: number }}
 */
async function reEncryptApiKeys(prisma) {
  let updated = 0;
  let failed = 0;

  const keys = await prisma.apiKey.findMany();

  for (const key of keys) {
    try {
      if (encryption.isEncrypted(key.apiKey)) {
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { apiKey: encryption.reEncrypt(key.apiKey) },
        });
        updated++;
      }
    } catch (err) {
      console.error(`重加密 ApiKey ${key.id} 失败:`, err.message);
      failed++;
    }
  }

  return { updated, failed };
}

// ============ 日志记录 ============

/**
 * 记录密钥轮换到数据库
 * @param {object} prisma - Prisma 客户端实例
 * @param {{ oldVersion: string, newVersion: string, rotatedBy?: string, notes?: string }} details
 */
async function logRotation(prisma, details) {
  return prisma.keyRotationLog.create({
    data: {
      oldVersion: details.oldVersion,
      newVersion: details.newVersion,
      rotatedBy: details.rotatedBy || 'system',
      notes: details.notes || null,
    },
  });
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);
  const shouldRotate = args.includes('--rotate');
  const shouldReEncrypt = args.includes('--re-encrypt');

  const newKey = generateKey();

  console.log('🔐 密钥轮换工具');
  console.log(`   新版本: ${newKey.version}`);
  console.log(`   新密钥: ${newKey.hexKey}`);
  console.log(`   新 IV:  ${newKey.iv}`);
  console.log();

  if (shouldRotate) {
    const envPath = updateEnvLocal(newKey);
    console.log(`✅ .env.local 已更新: ${envPath}`);
    console.log('⚠️  请重启应用以加载新密钥');
    console.log('💡 如需重加密已有数据，请运行: node utils/keyRotation.js --re-encrypt');
  } else if (shouldReEncrypt) {
    console.log('🔄 开始批量重加密...');
    const prisma = require('../db/index');

    const userResult = await reEncryptUsers(prisma);
    console.log(`   Users: ${userResult.updated} 已更新, ${userResult.failed} 失败`);

    const apiKeyResult = await reEncryptApiKeys(prisma);
    console.log(`   ApiKeys: ${apiKeyResult.updated} 已更新, ${apiKeyResult.failed} 失败`);

    await prisma.$disconnect();
    console.log('✅ 重加密完成');
  } else {
    console.log('💡 使用说明:');
    console.log('   node utils/keyRotation.js             预览新密钥');
    console.log('   node utils/keyRotation.js --rotate     生成并应用新密钥');
    console.log('   node utils/keyRotation.js --re-encrypt 用当前密钥重加密所有数据');
  }
}

// 仅在直接运行时执行 CLI
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateKey,
  updateEnvLocal,
  reEncryptUsers,
  reEncryptApiKeys,
  logRotation,
};
