import 'dotenv/config';

let prisma = null;
let isPrismaAvailable = false;

try {
  const [prismaModule, adapterModule] = await Promise.all([
    import('@prisma/client'),
    import('@prisma/adapter-pg'),
  ]);
  if (prismaModule?.PrismaClient) {
    if (process.env.DATABASE_URL) {
      const adapter = new adapterModule.PrismaPg({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 300_000,
      });
      prisma = new prismaModule.PrismaClient({ adapter });
    }
    isPrismaAvailable = true;
  }
} catch (err) {
  isPrismaAvailable = false;
  if (process.env.DATABASE_URL) {
    console.error('Unable to initialize Prisma; using the memory store:', err);
  }
}

export const getPrismaClient = () => prisma;
export const checkIsPrisma = () => isPrismaAvailable && !!prisma && !!process.env.DATABASE_URL;

export default {
  getPrismaClient,
  checkIsPrisma,
};
