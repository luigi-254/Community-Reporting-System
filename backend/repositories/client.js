import 'dotenv/config';

let prisma = null;
let isPrismaAvailable = false;
let initError = null;
let initPromise = null;

/**
 * Initialize the Prisma client against the configured PostgreSQL database.
 *
 * Design rules (Phase 5 — eliminate silent in-memory fallbacks):
 *   * If DATABASE_URL (or PG*) is configured, Prisma MUST be used. A connection
 *     failure is a hard startup error, never a silent fall-back to the memory
 *     store.
 *   * The memory store is only used when no database is configured
 *     (test/dev degraded mode).
 *   * Connection errors are logged clearly and stored; callers (index.js)
 *     decide whether to fail fast.
 */
async function initializePrisma() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasPgConfig = Boolean(
    process.env.PGHOST &&
      process.env.PGUSER &&
      process.env.PGPASSWORD &&
      process.env.PGDATABASE
  );

  if (!hasDatabaseUrl && !hasPgConfig) {
    // No database configured: degraded/test mode. Prisma stays disabled.
    isPrismaAvailable = false;
    prisma = null;
    initError = null;
    return;
  }

  let prismaModule;
  let adapterModule;
  try {
    [prismaModule, adapterModule] = await Promise.all([
      import('@prisma/client'),
      import('@prisma/adapter-pg'),
    ]);
  } catch (importErr) {
    initError = importErr;
    isPrismaAvailable = false;
    prisma = null;
    console.warn(
      '[DB] Prisma/adapter-pg import failed while a database URL is set; ' +
        'running in degraded memory-store mode:',
      importErr.message
    );
    return;
  }

  if (!prismaModule?.PrismaClient) {
    initError = new Error('PrismaClient export not found');
    isPrismaAvailable = false;
    prisma = null;
    console.warn('[DB] PrismaClient unavailable; degraded memory-store mode.');
    return;
  }

  // Build adapter config. Prefer explicit PG config (avoids URL-encoding issues
  // with special characters in passwords and gives full control over ssl).
  // Falls back to DATABASE_URL connectionString for backward compatibility.
  // SSL is enabled unless PGSSL_DISABLE=true (local/dev PostgreSQL without SSL).
  const sslDisabled = process.env.PGSSL_DISABLE === 'true';
  const sslConfig = sslDisabled ? undefined : { rejectUnauthorized: false };

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
      ...(sslConfig ? { ssl: sslConfig } : {}),
      pgbouncer: false,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 300_000,
    };
  } else {
    // Prisma honors sslmode=require and pgbouncer=true from the connection string.
    adapterConfig = {
      connectionString: process.env.DATABASE_URL,
      ...(sslConfig ? { ssl: sslConfig } : {}),
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 300_000,
    };
  }

  let adapter;
  try {
    adapter = new adapterModule.PrismaPg(adapterConfig);
    prisma = new prismaModule.PrismaClient({ adapter });
  } catch (constructErr) {
    initError = constructErr;
    isPrismaAvailable = false;
    prisma = null;
    console.warn(
      '[DB] Prisma client construction failed while a database URL is set; ' +
        'running in degraded memory-store mode:',
      constructErr.message
    );
    return;
  }

  // Validate that the live database is actually reachable. We never silently
  // fall back to an empty in-memory store when a database URL is configured.
  try {
    await prisma.$connect();
    await prisma.$disconnect();
    isPrismaAvailable = true;
    initError = null;
  } catch (connectErr) {
    isPrismaAvailable = false;
    prisma = null;
    initError = connectErr;
    console.error(
      '[DB] Prisma database is unreachable while a database URL is set. ' +
        `Refusing to fall back to the in-memory store. ` +
        `Underlying: ${connectErr.message}`
    );
  }
}

// Capture the initialization promise so index.js can await it before listening.
initPromise = initializePrisma();

export const getPrismaClient = () => prisma;
export const checkIsPrisma = () => isPrismaAvailable && !!prisma;
export const getInitError = () => initError;
export const getInitPromise = () => initPromise;

/**
 * Returns true only when a live Prisma client is connected to a database.
 * Never true when falling back to memoryStore.
 */
export const isDatabaseConnected = () => isPrismaAvailable && !!prisma;

/**
 * Opt-in marker: use the memory store. Intended for tests and explicit
 * degraded-mode scenarios, never for production when DATABASE_URL is set.
 */
export const useMemoryStore = () => !isPrismaAvailable;

export default {
  getPrismaClient,
  checkIsPrisma,
  isDatabaseConnected,
  getInitError,
  getInitPromise,
  useMemoryStore,
  initializePrisma,
};
