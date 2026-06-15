import 'dotenv/config';
import { PrismaClient } from '../generated/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Direct initialization with the SQLite URL config for Prisma v7
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});

const prisma = new PrismaClient({
  adapter,
  log: ['info', 'warn', 'error'],
});

export default prisma;
