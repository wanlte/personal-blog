// rollback-migration.js — 数据库迁移回滚脚本
//
// 用法:
//   node rollback-migration.js                   回滚最近一次迁移
//   node rollback-migration.js --dry-run         预览将回滚的迁移
//   node rollback-migration.js --name 20260508   回滚到指定迁移（按名称前缀匹配）
//   node rollback-migration.js --steps 2         回滚最近 2 次迁移
//
// 工作原理:
//   1. 读取 prisma/migrations/ 目录获取已应用的迁移列表

const config = require('./config');
//   2. 从 _prisma_migrations 表查询数据库中的应用记录
//   3. 逆序执行 down.sql（如果存在）
//   4. 使用 prisma migrate resolve --rolled-back 标记回滚

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, 'migration-locked');
const MIGRATIONS_DIR = path.join(__dirname, 'prisma', 'migrations');
const DRY_RUN = process.argv.includes('--dry-run');

// 解析命令行参数
function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

const TARGET_NAME = getArgValue('--name');
const STEPS = parseInt(getArgValue('--steps') || '1', 10);

// ============ 防并发锁 ============
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const lockedAt = fs.readFileSync(LOCK_FILE, 'utf-8').trim();
    console.error(`❌ 迁移锁被占用（创建于 ${lockedAt}）`);
    process.exit(1);
  }
  fs.writeFileSync(LOCK_FILE, new Date().toISOString());
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
}

// ============ 获取数据库中的迁移记录 ============
function getAppliedMigrations() {
  try {
    const output = execSync('npx prisma migrate status', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(output);

    const applied = [];
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && /^\d{14}_/.test(trimmed)) {
        applied.push(trimmed);
      }
    }
    return applied;
  } catch (err) {
    const text = err.stdout || err.stderr || '';
    console.log(text);
    const applied = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && /^\d{14}_/.test(trimmed)) {
        applied.push(trimmed);
      }
    }
    return applied;
  }
}

// ============ 获取本地迁移目录列表 ============
function getLocalMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{14}_/.test(d.name))
    .map((d) => d.name)
    .sort();
}

// ============ 确定要回滚的迁移 ============
function determineRollbackTargets(applied) {
  if (applied.length === 0) {
    console.log('✅ 没有已应用的迁移，无需回滚');
    return [];
  }

  // 按名称前缀查找目标
  if (TARGET_NAME) {
    const idx = applied.findIndex((m) => m.startsWith(TARGET_NAME));
    if (idx === -1) {
      console.error(`❌ 未找到匹配 "${TARGET_NAME}" 的已应用迁移`);
      process.exit(1);
    }
    // 回滚到该迁移（不含），即回滚 idx 之后的
    return applied.slice(idx + 1).reverse();
  }

  // 按步数回滚最近 N 次
  const count = Math.min(STEPS, applied.length);
  return applied.slice(-count).reverse();
}

// ============ 执行回滚 ============
function rollback(migrationsToRollback) {
  const local = getLocalMigrations();

  for (const migrationName of migrationsToRollback) {
    const dir = path.join(MIGRATIONS_DIR, migrationName);
    const downFile = path.join(dir, 'down.sql');

    console.log(`\n⏪ 回滚: ${migrationName}`);

    if (fs.existsSync(downFile)) {
      if (!DRY_RUN) {
        const sql = fs.readFileSync(downFile, 'utf-8');
        execSync(`npx prisma db execute --stdin`, {
          input: sql,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        console.log('   ✓ down.sql 已执行');
      } else {
        console.log('   [DRY-RUN] 将执行 down.sql');
      }
    } else {
      console.log('   ⚠️  无 down.sql（迁移文件不包含回滚脚本）');
    }

    // 标记为已回滚
    if (!DRY_RUN) {
      execSync(`npx prisma migrate resolve --rolled-back "${migrationName}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
      console.log(`   ✓ 已标记为 rolled-back`);
    } else {
      console.log(`   [DRY-RUN] 将标记为 rolled-back`);
    }
  }
}

// ============ 主流程 ============
function main() {
  console.log('');
  console.log('⏪ 数据库迁移回滚脚本');
  console.log(`   模式: ${DRY_RUN ? 'DRY-RUN (预览)' : '执行回滚'}`);
  console.log('');

  if (!config.database.url) {
    console.error('❌ 未设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  // 安全确认
  if (!DRY_RUN) {
    console.log('⚠️  回滚操作可能导致数据丢失！');
    console.log('💡 建议先备份: pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql\n');
    console.log('   按 Ctrl+C 取消，或继续...\n');
  }

  const applied = getAppliedMigrations();
  const toRollback = determineRollbackTargets(applied);

  if (toRollback.length === 0) {
    return;
  }

  console.log(`\n📋 将回滚 ${toRollback.length} 个迁移：\n`);
  toRollback.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));
  console.log('');

  if (!DRY_RUN) {
    acquireLock();
    try {
      rollback(toRollback);
      console.log('\n✅ 回滚完成');
    } catch (err) {
      console.error(`\n❌ 回滚失败: ${err.message}`);
      process.exit(1);
    } finally {
      releaseLock();
    }
  } else {
    rollback(toRollback);
    console.log('\n💡 运行 "npm run db:rollback" 执行回滚');
  }
}

process.on('SIGINT', () => {
  console.log('\n⚠️  操作已取消');
  releaseLock();
  process.exit(130);
});

process.on('SIGTERM', () => {
  releaseLock();
  process.exit(143);
});

main();
