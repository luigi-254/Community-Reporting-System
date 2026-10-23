let prisma = null;
let isPrismaAvailable = false;

try {
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  prisma = new PrismaClient({ adapter });
  isPrismaAvailable = true;
} catch (err) {
  isPrismaAvailable = false;
}

export const getPrismaClient = () => prisma;
export const checkIsPrisma = () => isPrismaAvailable && !!process.env.DATABASE_URL;

export default {
  getPrismaClient,
  checkIsPrisma,
};
