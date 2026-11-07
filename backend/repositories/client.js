import 'dotenv/config';

let prisma = null;
let isPrismaAvailable = false;

try {
  const [prismaModule, adapterModule] = await Promise.all([
    import('@prisma/client'),
    import('@prisma/adapter-pg'),
  ]);
  if (prismaModule?.PrismaClient) {
    // Prefer explicit connection config (avoids URL-encoding issues with
    // special characters in passwords, e.g. '?' in Supabase pooler passwords).
    // Fall back to DATABASE_URL for backward compatibility.
    let adapterConfig = null;
    if (
      process.env.PGHOST &&
      process.env.PGUSER &&
      process.env.PGPASSWORD &&
      process.env.PGDATABASE
    ) {
      adapterConfig = {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 300_000,
      };
    } else if (process.env.DATABASE_URL) {
      adapterConfig = {
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 300_000,
      };
    }

    if (adapterConfig) {
      const adapter = new adapterModule.PrismaPg(adapterConfig);
      prisma = new prismaModule.PrismaClient({ adapter });

      // Validate that the live database is actually reachable. If it is not,
      // disable Prisma entirely so the application falls back to the in-memory
      // store consistently instead of entering a half-connected state where
      // checkIsPrisma() is true but every query fails (which previously caused
      // auth failures: a user created in memoryStore could not be found via
      // Prisma).
      try {
        await prisma.$connect();
        await prisma.$disconnect();
      } catch (connectErr) {
        console.warn(
          '[DB] Prisma database is unreachable; falling back to the memory store:',
          connectErr.message,
        );
        prisma = null;
      }
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
