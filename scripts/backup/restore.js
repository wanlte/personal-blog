// scripts/backup/restore.js - 恢复脚本
// CLI: node scripts/backup/restore.js --list
//      node scripts/backup/restore.js --file full_2026-01-01T03-00-00.tar.gz.enc [--key custom-key]
// 模块: const { listBackups, restoreBackup, verifyIntegrity } = require('./scripts/backup/restore')

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const os = require('os');
const config = require('../../config');
const logger = require('../../utils/logger');
const cache = require('../../utils/cache');

const BACKUP_DIR = config.backup.dir || path.join(__dirname, '..', '..', 'backups');
const ENCRYPTION_KEY = config.encryption.key || process.env.ENCRYPTION_KEY || '';

// ============== 公开 API ==============

/**
 * 列出所有可用备份（本地 + S3）
 * @returns {Promise<Array<{name: string, size: number, type: string, date: string, source: string}>>}
 */
async function listBackups() {
  const results = [];

  // 本地备份
  if (fs.existsSync(BACKUP_DIR)) {
    for (const f of fs.readdirSync(BACKUP_DIR)) {
      if (!f.endsWith('.tar.gz') && !f.endsWith('.tar.gz.enc')) continue;
      const fp = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fp);
      results.push({
        name: f,
        size: stat.size,
        date: stat.mtime.toISOString(),
        type: f.startsWith('full_') ? 'full' : 'incremental',
        source: 'local',
      });
    }
  }

  // S3 远程备份
  try {
    const s3cfg = config.backup.s3;
    if (s3cfg && s3cfg.endpoint && s3cfg.bucket) {
      const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
      const client = new S3Client({
        endpoint: s3cfg.endpoint,
        region: s3cfg.region || 'us-east-1',
        credentials: { accessKeyId: s3cfg.accessKey, secretAccessKey: s3cfg.secretKey },
        forcePathStyle: true,
      });
      const resp = await client.send(new ListObjectsV2Command({ Bucket: s3cfg.bucket }));
      for (const obj of (resp.Contents || [])) {
        if (!obj.Key.endsWith('.tar.gz') && !obj.Key.endsWith('.tar.gz.enc')) continue;
        // 避免重复（本地已有同名文件）
        if (results.find(r => r.name === obj.Key)) continue;
        results.push({
          name: obj.Key,
          size: obj.Size,
          date: obj.LastModified?.toISOString() || '',
          type: obj.Key.startsWith('full_') ? 'full' : 'incremental',
          source: 's3',
        });
      }
    }
  } catch (_) { /* S3 不可用 */ }

  results.sort((a, b) => new Date(b.date) - new Date(a.date));
  return results;
}

/**
 * 恢复备份
 * @param {string} backupName - 备份文件名
 * @param {{ skipVerify?: boolean, key?: string }} [opts]
 */
async function restoreBackup(backupName, opts = {}) {
  const startTime = Date.now();
  const tmpDir = path.join(os.tmpdir(), `blog_restore_${Date.now()}`);
  const encKey = opts.key || ENCRYPTION_KEY;

  logger.info(`[恢复] 开始恢复: ${backupName}`);

  try {
    ensureDir(tmpDir);

    // 1. 获取备份文件
    let backupPath = path.join(BACKUP_DIR, backupName);

    // 如果本地不存在，尝试从 S3 下载
    if (!fs.existsSync(backupPath)) {
      await downloadFromS3(backupName, backupPath);
    }

    if (!fs.existsSync(backupPath)) {
      throw new Error(`备份文件不存在: ${backupName}`);
    }

    // 2. 解密（如果是 .enc 文件）
    const isEncrypted = backupPath.endsWith('.enc');
    let tarFile = backupPath;
    if (isEncrypted) {
      if (!encKey) throw new Error('需要加密密钥才能解密备份文件');
      tarFile = path.join(tmpDir, backupName.replace('.enc', ''));
      await decryptFile(backupPath, tarFile, encKey);
    }

    // 3. 解压
    await extractTarGz(tarFile, tmpDir);

    // 4. 读取元数据
    let meta = { type: 'unknown' };
    const metaFile = path.join(tmpDir, 'backup.json');
    if (fs.existsSync(metaFile)) {
      meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    }

    // 5. 恢复数据库
    const sqlFile = path.join(tmpDir, 'database.sql');
    if (fs.existsSync(sqlFile)) {
      await restoreDatabase(sqlFile);
      logger.info('[恢复] 数据库恢复完成');
    }

    // 6. 恢复 Redis（需手动处理，这里仅提示）
    const rdbFile = path.join(tmpDir, 'redis.rdb');
    if (fs.existsSync(rdbFile)) {
      logger.info('[恢复] 检测到 Redis RDB 文件，需手动恢复：');
      logger.info(`  1. 停止 redis-server`);
      logger.info(`  2. 复制 ${rdbFile} 到 Redis 数据目录`);
      logger.info(`  3. 启动 redis-server`);
    }

    // 7. 恢复上传文件
    const uploadsDir = path.join(tmpDir, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const targetDir = path.resolve(config.upload.dir || 'uploads');
      ensureDir(targetDir);
      copyDirContents(uploadsDir, targetDir);
      logger.info('[恢复] 上传文件恢复完成');
    }

    // 8. 清理缓存
    await clearAllCache();

    // 9. 验证完整性
    const verifyResult = opts.skipVerify ? { skipped: true } : await verifyIntegrity();

    // 10. 清理
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[恢复] 恢复完成 (${duration}s)`);

    return {
      success: true,
      backupName,
      type: meta.type,
      duration: `${duration}s`,
      verify: verifyResult,
    };
  } catch (err) {
    logger.error(`[恢复] 恢复失败: ${err.message}`, { stack: err.stack });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

/**
 * 验证数据完整性
 */
async function verifyIntegrity() {
  const checks = { database: false, redis: false };
  try {
    await execSync(`psql "${config.database.url}" -c "SELECT 1"`, { timeout: 10000, stdio: 'pipe' });
    checks.database = true;
  } catch (e) {
    checks.database = false;
    checks.dbError = e.message;
  }

  try {
    if (cache.isReady()) {
      await cache.set('__restore_verify__', 'ok', 10);
      const val = await cache.get('__restore_verify__');
      checks.redis = val === 'ok';
    }
  } catch (_) { checks.redis = false; }

  return checks;
}

// ============== 内部函数 ==============

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function decryptFile(inFile, outFile, key) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inFile);
    const iv = Buffer.alloc(16);
    let ivRead = false;

    input.on('readable', function() {
      if (!ivRead) {
        const chunk = input.read(16);
        if (chunk) {
          chunk.copy(iv);
          ivRead = true;
          const derivedKey = crypto.createHash('sha256').update(key).digest();
          const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
          const output = fs.createWriteStream(outFile);
          input.pipe(decipher).pipe(output);
          output.on('finish', resolve);
          output.on('error', reject);
          decipher.on('error', reject);
        }
      }
    });
    input.on('error', reject);
  });
}

function extractTarGz(tarFile, destDir) {
  ensureDir(destDir);
  return new Promise((resolve, reject) => {
    exec(`tar -xzf "${tarFile}" -C "${destDir}"`, (err) => {
      if (err) return reject(new Error(`解压失败: ${err.message}`));

      // tar 解压后可能多一层目录包装，需要展平
      const entries = fs.readdirSync(destDir);
      if (entries.length === 1) {
        const inner = path.join(destDir, entries[0]);
        if (fs.statSync(inner).isDirectory()) {
          // 展平一层
          for (const f of fs.readdirSync(inner)) {
            const src = path.join(inner, f);
            const dst = path.join(destDir, f);
            fs.renameSync(src, dst);
          }
          fs.rmdirSync(inner);
        }
      }
      resolve();
    });
  });
}

async function restoreDatabase(sqlFile) {
  const dbUrl = config.database.url;
  if (!dbUrl) throw new Error('DATABASE_URL 未配置');

  // 从 URL 提取 pg 连接参数
  const url = new URL(dbUrl);
  const env = {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.replace(/^\//, ''),
  };

  return new Promise((resolve, reject) => {
    const child = exec(`psql -f "${sqlFile}"`, {
      env: { ...process.env, ...env, PGPASSWORD: env.PGPASSWORD },
      maxBuffer: 50 * 1024 * 1024,
    });
    child.stdout?.on('data', d => logger.info(`[恢复/psql] ${d.toString().trim()}`));
    child.stderr?.on('data', d => {
      const msg = d.toString().trim();
      if (msg && !msg.includes('NOTICE')) logger.warn(`[恢复/psql] ${msg}`);
    });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`psql 退出码: ${code}`));
    });
    child.on('error', reject);
  });
}

async function clearAllCache() {
  try {
    if (cache.isReady()) {
      await cache.delPattern('cache:*');
      await cache.delPattern('feature:flag:*');
      logger.info('[恢复] 缓存已清理');
    }
  } catch (err) {
    logger.warn(`[恢复] 缓存清理失败: ${err.message}`);
  }
}

function copyDirContents(src, dest) {
  if (!fs.existsSync(src)) return;
  for (const f of fs.readdirSync(src)) {
    const srcPath = path.join(src, f);
    const destPath = path.join(dest, f);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      ensureDir(destPath);
      copyDirContents(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function downloadFromS3(key, localPath) {
  const s3cfg = config.backup.s3;
  if (!s3cfg || !s3cfg.endpoint) return;

  try {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      endpoint: s3cfg.endpoint,
      region: s3cfg.region || 'us-east-1',
      credentials: { accessKeyId: s3cfg.accessKey, secretAccessKey: s3cfg.secretKey },
      forcePathStyle: true,
    });
    const resp = await client.send(new GetObjectCommand({ Bucket: s3cfg.bucket, Key: key }));
    const writeStream = fs.createWriteStream(localPath);
    await new Promise((resolve, reject) => {
      resp.Body.pipe(writeStream);
      resp.Body.on('error', reject);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    logger.info(`[恢复] 从 S3 下载完成: ${key}`);
  } catch (err) {
    logger.warn(`[恢复] S3 下载失败: ${err.message}`);
  }
}

// ============== CLI 入口 ==============
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--list') || args.includes('-l')) {
    listBackups()
      .then(backups => {
        if (backups.length === 0) { console.log('没有可用备份'); process.exit(0); }
        console.log('可用备份:\n');
        backups.forEach((b, i) => {
          const sizeStr = b.size < 1024 * 1024
            ? (b.size / 1024).toFixed(1) + ' KB'
            : (b.size / (1024 * 1024)).toFixed(1) + ' MB';
          console.log(`  [${i + 1}] ${b.name}`);
          console.log(`      类型: ${b.type}  大小: ${sizeStr}  来源: ${b.source}`);
          console.log(`      日期: ${b.date}\n`);
        });
        process.exit(0);
      })
      .catch(e => { console.error(e.message); process.exit(1); });
  } else if (args.includes('--file') || args.includes('-f')) {
    const file = args[args.indexOf('--file' || '-f') + 1] || args[args.indexOf('-f') + 1];
    const opts = {
      skipVerify: args.includes('--skip-verify') || args.includes('--no-verify'),
      key: args.includes('--key') ? args[args.indexOf('--key') + 1] : undefined,
    };
    if (!file) { console.error('用法: node restore.js --file <备份文件名>'); process.exit(1); }
    restoreBackup(file, opts)
      .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
      .catch(e => { console.error(e.message); process.exit(1); });
  } else {
    console.log('用法:');
    console.log('  node scripts/backup/restore.js --list          列出可用备份');
    console.log('  node scripts/backup/restore.js --file <name>   恢复指定备份');
    console.log('  node scripts/backup/restore.js --file <name> --key <key>  使用自定义密钥');
    process.exit(0);
  }
}

module.exports = { listBackups, restoreBackup, verifyIntegrity };
