// db/index.js - Prisma Client 单例
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

module.exports = prisma;
