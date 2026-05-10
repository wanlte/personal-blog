// scripts/backup/backup.js - 备份脚本（全量 + 增量）
// CLI: node scripts/backup/backup.js --type full|incremental [--no-encrypt] [--no-upload]
// 模块: const { fullBackup, incrementalBackup } = require('./scripts/backup/backup')

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const os = require('os');
const config = require('../../config');
const logger = require('../../utils/logger');
const { sendEmail } = require('../../utils/email');

const BACKUP_DIR = config.backup.dir || path.join(__dirname, '..', '..', 'backups');
const KEEP_DAILY = config.backup.keepDaily || 7;
const KEEP_WEEKLY = config.backup.keepWeekly || 4;
const ENCRYPTION_KEY = config.encryption.key || process.env.ENCRYPTION_KEY || '';

// ============== S3 客户端（可选） ==============
let s3Client = null;
function getS3Client() {
  if (s3Client !== null) return s3Client;
  const s3cfg = config.backup.s3;
  if (!s3cfg || !s3cfg.endpoint || !s3cfg.bucket) { s3Client = false; return null; }
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    const { Upload } = require('@aws-sdk/lib-storage');
    s3Client = {
      client: new S3Client({
        endpoint: s3cfg.endpoint,
        region: s3cfg.region || 'us-east-1',
        credentials: {
          accessKeyId: s3cfg.accessKey,
          secretAccessKey: s3cfg.secretKey,
        },
        forcePathStyle: true,
      }),
      Upload,
    };
    return s3Client;
  } catch (e) {
    logger.warn('[备份] @aws-sdk/client-s3 未安装，远程上传不可用');
    s3Client = false;
    return null;
  }
}

// ============== 公开 API ==============

/**
 * 全量备份：DB + Redis + 媒体文件 + 配置文件
 * @param {{ encrypt?: boolean, upload?: boolean }} [opts]
 * @returns {Promise<{file: string, size: number, checksum: string}>}
 */
async function fullBackup(opts = {}) {
  const encrypt = opts.encrypt !== false;
  const upload = opts.upload !== false;
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = `full_${timestamp}`;
  const tmpDir = path.join(os.tmpdir(), `blog_backup_${name}`);

  logger.info(`[备份] 开始全量备份: ${name}`);

  try {
    ensureDir(BACKUP_DIR);
    ensureDir(tmpDir);

    // 1. PostgreSQL 导出
    await dumpDatabase(path.join(tmpDir, 'database.sql'));

    // 2. Redis 快照
    await saveRedis(path.join(tmpDir, 'redis.rdb'));

    // 3. 上传文件
    await copyUploads(path.join(tmpDir, 'uploads'));

    // 4. 配置文件
    const configDir = path.join(tmpDir, 'config');
    ensureDir(configDir);
    const rootDir = path.join(__dirname, '..', '..');
    copyIfExists(path.join(rootDir, '.env'), path.join(configDir, '.env'));
    copyIfExists(path.join(rootDir, 'config'), path.join(configDir, 'config'));
    copyIfExists(path.join(rootDir, 'prisma', 'schema.prisma'), path.join(configDir, 'schema.prisma'));
    writeBackupMeta(path.join(tmpDir, 'backup.json'), { type: 'full', name, timestamp: new Date().toISOString() });

    // 5. 压缩
    const tarFile = path.join(BACKUP_DIR, `${name}.tar.gz`);
    await createTarGz(tmpDir, tarFile);

    // 6. 加密
    let finalFile = tarFile;
    if (encrypt && ENCRYPTION_KEY) {
      const encFile = tarFile + '.enc';
      await encryptFile(tarFile, encFile);
      fs.unlinkSync(tarFile);
      finalFile = encFile;
    }

    // 7. 校验
    const stat = fs.statSync(finalFile);
    const checksum = await sha256File(finalFile);

    // 8. 上传到远程
    if (upload) {
      await uploadToS3(finalFile, path.basename(finalFile));
    }

    // 9. 清理临时目录
    fs.rmSync(tmpDir, { recursive: true, force: true });

    // 10. 轮换清理
    const deleted = rotateBackups('full', KEEP_WEEKLY);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[备份] 全量备份完成: ${path.basename(finalFile)} (${formatSize(stat.size)}, ${duration}s)`);

    return { file: path.basename(finalFile), size: stat.size, checksum, duration: `${duration}s`, deleted };
  } catch (err) {
    logger.error(`[备份] 全量备份失败: ${err.message}`, { stack: err.stack });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

/**
 * 增量备份：仅 DB（自定义格式）
 */
async function incrementalBackup(opts = {}) {
  const encrypt = opts.encrypt !== false;
  const upload = opts.upload !== false;
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = `incr_${timestamp}`;
  const tmpDir = path.join(os.tmpdir(), `blog_backup_${name}`);

  logger.info(`[备份] 开始增量备份: ${name}`);

  try {
    ensureDir(BACKUP_DIR);
    ensureDir(tmpDir);

    await dumpDatabase(path.join(tmpDir, 'database.sql'));
    writeBackupMeta(path.join(tmpDir, 'backup.json'), { type: 'incremental', name, timestamp: new Date().toISOString() });

    const tarFile = path.join(BACKUP_DIR, `${name}.tar.gz`);
    await createTarGz(tmpDir, tarFile);

    let finalFile = tarFile;
    if (encrypt && ENCRYPTION_KEY) {
      const encFile = tarFile + '.enc';
      await encryptFile(tarFile, encFile);
      fs.unlinkSync(tarFile);
      finalFile = encFile;
    }

    if (upload) {
      await uploadToS3(finalFile, path.basename(finalFile));
    }

    const stat = fs.statSync(finalFile);
    const checksum = await sha256File(finalFile);
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const deleted = rotateBackups('incr', KEEP_DAILY);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[备份] 增量备份完成: ${path.basename(finalFile)} (${formatSize(stat.size)}, ${duration}s)`);

    return { file: path.basename(finalFile), size: stat.size, checksum, duration: `${duration}s`, deleted };
  } catch (err) {
    logger.error(`[备份] 增量备份失败: ${err.message}`, { stack: err.stack });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

// ============== 内部函数 ==============

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(src, dest) {
  try {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      ensureDir(dest);
      for (const f of fs.readdirSync(src)) {
        copyIfExists(path.join(src, f), path.join(dest, f));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  } catch (_) { /* skip inaccessible files */ }
}

function writeBackupMeta(file, meta) {
  fs.writeFileSync(file, JSON.stringify({ ...meta, hostname: os.hostname() }, null, 2));
}

async function dumpDatabase(outFile) {
  const dbUrl = config.database.url;
  if (!dbUrl) throw new Error('DATABASE_URL 未配置');

  return new Promise((resolve, reject) => {
    exec(`pg_dump "${dbUrl}" > "${outFile}"`, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr || err.message;
        reject(new Error(`pg_dump 失败: ${msg}`));
        return;
      }
      if (!fs.existsSync(outFile) || fs.statSync(outFile).size === 0) {
        reject(new Error('pg_dump 输出为空'));
        return;
      }
      resolve();
    });
  });
}

async function saveRedis(outFile) {
  try {
    const redisUrl = config.redis?.url;
    if (!redisUrl || config.redis?.skip) {
      logger.info('[备份] Redis 已禁用，跳过快照');
      return;
    }
    // 触发 BGSAVE
    execSync(`redis-cli -u "${redisUrl}" BGSAVE`, { timeout: 10000, stdio: 'pipe' });

    // 尝试复制 RDB 文件
    const dirResult = execSync(`redis-cli -u "${redisUrl}" CONFIG GET dir`, { timeout: 5000, stdio: 'pipe' }).toString();
    const lines = dirResult.trim().split('\n');
    const redisDir = lines.length >= 2 ? lines[1] : '/data';

    const rdbPath = path.join(redisDir, 'dump.rdb');
    if (fs.existsSync(rdbPath)) {
      fs.copyFileSync(rdbPath, outFile);
      logger.info('[备份] Redis RDB 快照已保存');
    }
  } catch (err) {
    logger.warn(`[备份] Redis 快照失败: ${err.message}`);
  }
}

async function copyUploads(destDir) {
  const uploadDir = config.upload.dir || 'uploads';
  const src = path.resolve(uploadDir);
  ensureDir(destDir);
  copyIfExists(src, destDir);
}

function createTarGz(srcDir, outFile) {
  return new Promise((resolve, reject) => {
    exec(`tar -czf "${outFile}" -C "${path.dirname(srcDir)}" "${path.basename(srcDir)}"`, (err) => {
      if (err) return reject(new Error(`tar 压缩失败: ${err.message}`));
      resolve();
    });
  });
}

function encryptFile(inFile, outFile) {
  return new Promise((resolve, reject) => {
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const input = fs.createReadStream(inFile);
    const output = fs.createWriteStream(outFile);

    // 写入 IV 到文件头部
    output.write(iv);

    input.pipe(cipher).pipe(output);
    output.on('finish', resolve);
    output.on('error', reject);
    input.on('error', reject);
    cipher.on('error', reject);
  });
}

async function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', d => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function uploadToS3(file, key) {
  const s3 = getS3Client();
  if (!s3) return;

  try {
    const fileStream = fs.createReadStream(file);
    const upload = new s3.Upload({
      client: s3.client,
      params: {
        Bucket: config.backup.s3.bucket,
        Key: key,
        Body: fileStream,
      },
    });
    await upload.done();
    logger.info(`[备份] 已上传到 S3: ${key}`);
  } catch (err) {
    logger.error(`[备份] S3 上传失败: ${err.message}`);
  }
}

function rotateBackups(prefix, keep) {
  let deleted = 0;
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(prefix) && (f.endsWith('.tar.gz') || f.endsWith('.tar.gz.enc')))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    for (let i = keep; i < files.length; i++) {
      fs.unlinkSync(path.join(BACKUP_DIR, files[i].name));
      deleted++;
    }
  } catch (_) { /* ignore */ }
  return deleted;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============== CLI 入口 ==============
if (require.main === module) {
  const args = process.argv.slice(2);
  const type = args.includes('--type') ? args[args.indexOf('--type') + 1] : 'full';
  const opts = {
    encrypt: !args.includes('--no-encrypt'),
    upload: !args.includes('--no-upload'),
  };

  const fn = type === 'incremental' ? incrementalBackup : fullBackup;
  fn(opts)
    .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { fullBackup, incrementalBackup };
