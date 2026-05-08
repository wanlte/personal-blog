// deploy-migration.js — 生产数据库迁移部署脚本
//
// 用法:
//   node deploy-migration.js                执行迁移
//   node deploy-migration.js --dry-run       预览待执行迁移（不实际执行）
//
// 安全机制:
//   - migration-locked 文件防并发
//   - 自动备份提示
//   - 迁移历史日志

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, 'migration-locked');
const LOG_FILE = path.join(__dirname, 'prisma', 'migrations', 'migration-history.log');
const DRY_RUN = process.argv.includes('--dry-run');

// ============ 防并发锁 ============
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const lockedAt = fs.readFileSync(LOCK_FILE, 'utf-8').trim();
    console.error(`❌ 迁移锁被占用（创建于 ${lockedAt}）`);
    console.error('   如确认无并发迁移，手动删除 migration-locked 文件后重试');
    process.exit(1);
  }
  fs.writeFileSync(LOCK_FILE, new Date().toISOString());
  console.log('🔒 已获取迁移锁');
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
    console.log('🔓 已释放迁移锁');
  }
}

// ============ 日志 ============
function logMigration(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`📝 ${message}`);
}

// ============ 获取待执行迁移 ============
function getPendingMigrations() {
  try {
    const output = execSync('npx prisma migrate status', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(output);

    // 解析输出查找待执行的迁移
    const lines = output.split('\n');
    const pending = [];
    let inPending = false;

    for (const line of lines) {
      if (line.includes('Pending migrations') || line.includes('following migration(s)')) {
        inPending = true;
        continue;
      }
      if (inPending && line.trim().startsWith('_') && !line.includes('No pending')) {
        const name = line.trim();
        pending.push(name);
      }
      if (inPending && line.trim() === '') {
        inPending = false;
      }
    }

    return pending;
  } catch (err) {
    // prisma migrate status 在有无迁移时可能返回非零状态码
    const output = err.stdout || err.stderr || '';
    console.log(output);

    if (output.includes('No pending migrations') || output.includes('Database is up to date')) {
      return [];
    }

    const pending = [];
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && /^\d{14}_/.test(trimmed)) {
        pending.push(trimmed);
      }
    }
    return pending;
  }
}

// ============ 主流程 ============
function main() {
  console.log('');
  console.log('🚀 数据库迁移部署脚本');
  console.log(`   模式: ${DRY_RUN ? 'DRY-RUN (预览)' : '执行迁移'}`);
  console.log(`   时间: ${new Date().toISOString()}`);
  console.log('');

  // 检查 DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ 未设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  if (DRY_RUN) {
    // ===== DRY-RUN 模式 =====
    console.log('📋 检查待执行的迁移...');
    const pending = getPendingMigrations();

    if (pending.length === 0) {
      console.log('✅ 数据库已是最新状态，无需迁移');
    } else {
      console.log(`\n⚠️  发现 ${pending.length} 个待执行的迁移：\n`);
      pending.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));
      console.log('\n💡 运行 "npm run db:migrate" 执行迁移');
    }
  } else {
    // ===== 执行模式 =====
    acquireLock();

    try {
      const pending = getPendingMigrations();

      if (pending.length === 0) {
        console.log('✅ 数据库已是最新状态，无需迁移');
        logMigration('检查完成: 无需迁移');
        releaseLock();
        return;
      }

      console.log(`⚠️  即将执行 ${pending.length} 个迁移：\n`);
      pending.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));

      console.log('\n💡 建议先备份数据库:');
      console.log('   pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql\n');

      // 执行迁移
      console.log('▶️  开始执行迁移...');
      logMigration(`开始执行 ${pending.length} 个迁移`);

      execSync('npx prisma migrate deploy', {
        encoding: 'utf-8',
        stdio: 'inherit',
      });

      pending.forEach((m) => logMigration(`已完成: ${m}`));
      logMigration('迁移部署完成 ✓');
      console.log('\n✅ 迁移部署完成');
    } catch (err) {
      logMigration(`❌ 迁移失败: ${err.message}`);
      console.error(`\n❌ 迁移失败: ${err.message}`);
      process.exit(1);
    } finally {
      releaseLock();
    }
  }
}

// ============ 清理信号 ============
process.on('SIGINT', () => {
  console.log('\n⚠️  收到中断信号');
  releaseLock();
  process.exit(130);
});

process.on('SIGTERM', () => {
  releaseLock();
  process.exit(143);
});

main();
