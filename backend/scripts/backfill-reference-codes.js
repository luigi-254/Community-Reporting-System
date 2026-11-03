import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Backfill script: generate MTAA Fix reference codes (MT + 2 letters + 3 digits)
 * for all existing reports that are missing one.
 *
 * Usage:
 *   node scripts/backfill-reference-codes.js
 *
 * Requires DATABASE_URL in .env. Safe to re-run — only updates reports where
 * referenceCode is NULL.
 */

const REF_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const REF_DIGITS = '0123456789';

function generateReferenceCode() {
  let code = 'MT';
  for (let i = 0; i < 2; i++) {
    code += REF_LETTERS[Math.floor(Math.random() * REF_LETTERS.length)];
  }
  for (let i = 0; i < 3; i++) {
    code += REF_DIGITS[Math.floor(Math.random() * REF_DIGITS.length)];
  }
  return code;
}

async function generateUniqueReferenceCode(prisma, usedCodes) {
  let attempts = 0;
  const maxAttempts = 100;
  while (attempts < maxAttempts) {
    const code = generateReferenceCode();
    if (usedCodes.has(code)) {
      attempts++;
      continue;
    }
    // Verify against the database in case of concurrent writes
    const existing = await prisma.report.findUnique({
      where: { referenceCode: code },
    });
    if (!existing) {
      usedCodes.add(code);
      return code;
    }
    attempts++;
  }
  throw new Error('Failed to generate unique reference code after 100 attempts');
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    // Fetch all reports missing a referenceCode
    const reports = await prisma.report.findMany({
      where: { referenceCode: null },
      select: { id: true },
    });

    if (reports.length === 0) {
      console.log('✓ No reports missing referenceCode. Nothing to backfill.');
      return;
    }

    console.log(`Found ${reports.length} report(s) missing referenceCode. Backfilling...`);

    const usedCodes = new Set();

    // Also load existing referenceCodes to avoid collisions
    const existing = await prisma.report.findMany({
      where: { referenceCode: { not: null } },
      select: { referenceCode: true },
    });
    for (const r of existing) {
      if (r.referenceCode) usedCodes.add(r.referenceCode);
    }

    let updated = 0;
    for (const report of reports) {
      const code = await generateUniqueReferenceCode(prisma, usedCodes);
      await prisma.report.update({
        where: { id: report.id },
        data: { referenceCode: code },
      });
      usedCodes.add(code);
      updated++;
      console.log(`  ✓ ${report.id} → ${code}`);
    }

    console.log(`\n✓ Backfill complete. Updated ${updated} report(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
