let prisma = null;
let isPrismaAvailable = false;

try {
  const prismaModule = await import('@prisma/client');
  if (prismaModule?.PrismaClient) {
    prisma = new prismaModule.PrismaClient();
    isPrismaAvailable = true;
  }
} catch (err) {
  isPrismaAvailable = false;
}

export const getPrismaClient = () => prisma;
export const checkIsPrisma = () => isPrismaAvailable && !!process.env.DATABASE_URL;

export default {
  getPrismaClient,
  checkIsPrisma,
};
