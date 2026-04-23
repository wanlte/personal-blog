// prisma/seed.js - 数据库初始化脚本
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始数据库初始化...');

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
