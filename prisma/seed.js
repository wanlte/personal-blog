// prisma/seed.js - 数据库初始化脚本
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('开始数据库初始化...');

  // 创建超级管理员账号
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@blog.local',
        isAdmin: true,
        role: 'super_admin',
      },
    });
    console.log('✅ 创建超级管理员账号: admin / admin123');
  } else {
    console.log('⚠️  管理员账号已存在，跳过');
  }

  // 创建测试文章
  const article = await prisma.article.create({
    data: {
      title: '我的第一篇文章',
      content: '这是正文内容，写点东西吧',
      summary: '这是文章摘要',
      status: 'published',
    },
  });
  console.log(`✅ 创建测试文章成功，ID: ${article.id}`);

  // 创建订阅方案
  const plans = [
    {
      name: '月度会员',
      price: 9.9,
      durationDays: 30,
      features: ['adFree', 'highQuality', 'earlyAccess']
    },
    {
      name: '年度会员',
      price: 99,
      durationDays: 365,
      features: ['adFree', 'highQuality', 'earlyAccess', 'exclusiveContent', 'prioritySupport']
    },
    {
      name: '永久会员',
      price: 299,
      durationDays: 36500, // 约100年
      features: ['adFree', 'highQuality', 'earlyAccess', 'exclusiveContent', 'prioritySupport', 'lifetimeUpdates']
    }
  ];

  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { name: plan.name }
    });

    if (!existing) {
      await prisma.subscriptionPlan.create({ data: plan });
      console.log(`✅ 创建订阅方案: ${plan.name}`);
    }
  }

  console.log('✅ 数据库初始化完成');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
