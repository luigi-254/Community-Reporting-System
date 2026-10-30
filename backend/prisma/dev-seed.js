import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * DEVELOPMENT-ONLY test account seeding script.
 *
 * SECURITY: This script refuses to run if NODE_ENV is 'production'.
 * It creates synthetic test identities only — never real public officeholders.
 * All passwords are hashed with bcrypt (10 salt rounds), matching the auth
 * implementation. Public registration always forces CITIZEN role, so privileged
 * accounts can only be created through this controlled seed process.
 *
 * Idempotent: uses upsert by email, so repeated execution does not create
 * duplicate accounts.
 */

const SALT_ROUNDS = 10;
const TEST_PASSWORD = 'TestPassword123!';

// Synthetic test identities — clearly labelled, not real public officials.
const TEST_ACCOUNTS = [
  // ============ CITIZEN EXPERIENCE (Citizen Dashboard) ============
  {
    name: 'Alice Wanjiku',
    email: 'citizen.alice@example.com',
    role: 'CITIZEN',
    countyName: 'Kisii',
    subCountyName: 'Bobasi',
    wardName: 'Bassi Central',
    departmentCode: null,
    description: 'Citizen with multiple submitted reports in Bassi Central Ward',
  },
  {
    name: 'Bob Otieno',
    email: 'citizen.bob@example.com',
    role: 'CITIZEN',
    countyName: 'Kisii',
    subCountyName: 'Nyaribari Masaba',
    wardName: 'Kiamokama',
    departmentCode: null,
    description: 'Citizen with fewer reports in Kiamokama Ward',
  },

  // ============ PLATFORM ADMIN (Admin Dashboard) ============
  {
    name: 'Platform Admin',
    email: 'admin.platform@example.com',
    role: 'SUPER_ADMIN',
    countyName: 'Kisii',
    subCountyName: null,
    wardName: null,
    departmentCode: null,
    description: 'Platform super administrator with system-wide access',
  },

  // ============ GOVERNMENT EXPERIENCE (Government Dashboard) ============
  {
    name: 'Governor Kisii County',
    email: 'governor.kisii@example.com',
    role: 'GOVERNOR',
    countyName: 'Kisii',
    subCountyName: null,
    wardName: null,
    departmentCode: null,
    description: 'County-wide oversight — all of Kisii County',
  },
  {
    name: 'CECM Infrastructure',
    email: 'cecm.infrastructure@example.com',
    role: 'CECM',
    countyName: 'Kisii',
    subCountyName: null,
    wardName: null,
    departmentCode: 'INFRA',
    description: 'County Executive Committee Member — Infrastructure department',
  },
  {
    name: 'Chief Officer Infrastructure',
    email: 'chief.officer.infra@example.com',
    role: 'CHIEF_OFFICER',
    countyName: 'Kisii',
    subCountyName: null,
    wardName: null,
    departmentCode: 'INFRA',
    description: 'Chief Officer — Infrastructure, Roads & Public Works department',
  },
  {
    name: 'Technical Head Infrastructure',
    email: 'tech.head.infra@example.com',
    role: 'TECHNICAL_HEAD',
    countyName: 'Kisii',
    subCountyName: null,
    wardName: null,
    departmentCode: 'INFRA',
    description: 'Technical Head — Infrastructure department technical oversight',
  },
  {
    name: 'Technical Supervisor',
    email: 'tech.supervisor.infra@example.com',
    role: 'TECHNICAL_SUPERVISOR',
    countyName: 'Kisii',
    subCountyName: 'Bobasi',
    wardName: 'Bassi Central',
    departmentCode: 'INFRA',
    description: 'Technical Supervisor — supervises field teams in Bassi Central Ward',
  },
  {
    name: 'Sub-County Administrator Bobasi',
    email: 'subcounty.admin.bobasi@example.com',
    role: 'SUBCOUNTY_ADMIN',
    countyName: 'Kisii',
    subCountyName: 'Bobasi',
    wardName: null,
    departmentCode: null,
    description: 'Sub-County Administrator — Bobasi Sub-County administrative follow-up',
  },
  {
    name: 'Ward Administrator Bassi Central',
    email: 'ward.admin.bassicentral@example.com',
    role: 'WARD_ADMIN',
    countyName: 'Kisii',
    subCountyName: 'Bobasi',
    wardName: 'Bassi Central',
    departmentCode: null,
    description: 'Ward Administrator — Bassi Central Ward local monitoring',
  },
  {
    name: 'Field Officer 1',
    email: 'field.officer.1@example.com',
    role: 'FIELD_OFFICER',
    countyName: 'Kisii',
    subCountyName: 'Bobasi',
    wardName: 'Bassi Central',
    departmentCode: 'INFRA',
    description: 'Field Officer — handles assigned field reports in Bassi Central Ward',
  },
  {
    name: 'Disaster Manager',
    email: 'disaster.manager@example.com',
    role: 'DISASTER_MANAGER',
    countyName: 'Kisii',
    subCountyName: null,
    wardName: null,
    departmentCode: 'DISASTER',
    description: 'Disaster Management — county-wide hazard and emergency oversight',
  },
  {
    name: 'Enforcement Officer',
    email: 'enforcement.officer@example.com',
    role: 'ENFORCEMENT_OFFICER',
    countyName: 'Kisii',
    subCountyName: null,
    wardName: null,
    departmentCode: 'ENFORCEMENT',
    description: 'County Enforcement — enforcement-related cases county-wide',
  },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // ================================================================
  // STEP 1: PRODUCTION GUARD — never run this in production
  // ================================================================
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'REFUSING to run dev-seed.js in production. Set NODE_ENV=development or unset NODE_ENV.'
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  console.log('══════════════════════════════════════════════════════════════════');
  console.log('MTAA FIX — Development Test Account Seeder');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('');

  // ================================================================
  // STEP 2: Look up Kisii County geographic data (must already be seeded)
  // ================================================================
  const kisiiCounty = await prisma.county.findUnique({
    where: { name: 'Kisii' },
  });
  if (!kisiiCounty) {
    throw new Error(
      'Kisii County not found in database. Run `npm run db:seed` first to seed locations.'
    );
  }
  console.log(`✓ Found Kisii County (id: ${kisiiCounty.id})`);

  const bobasiSubCounty = await prisma.subCounty.findFirst({
    where: { countyId: kisiiCounty.id, name: 'Bobasi' },
  });
  if (!bobasiSubCounty) {
    throw new Error(
      'Bobasi Sub-County not found. Run `npm run db:seed` first.'
    );
  }
  console.log(`✓ Found Bobasi Sub-County (id: ${bobasiSubCounty.id})`);

  const nyaribariMasabaSubCounty = await prisma.subCounty.findFirst({
    where: { countyId: kisiiCounty.id, name: 'Nyaribari Masaba' },
  });
  if (!nyaribariMasabaSubCounty) {
    throw new Error(
      'Nyaribari Masaba Sub-County not found. Run `npm run db:seed` first.'
    );
  }
  console.log(`✓ Found Nyaribari Masaba Sub-County (id: ${nyaribariMasabaSubCounty.id})`);

  const bassiCentralWard = await prisma.ward.findFirst({
    where: { subCountyId: bobasiSubCounty.id, name: 'Bassi Central' },
  });
  if (!bassiCentralWard) {
    throw new Error(
      'Bassi Central Ward not found. Run `npm run db:seed` first.'
    );
  }
  console.log(`✓ Found Bassi Central Ward (id: ${bassiCentralWard.id})`);

  const kiamokamaWard = await prisma.ward.findFirst({
    where: { subCountyId: nyaribariMasabaSubCounty.id, name: 'Kiamokama' },
  });
  if (!kiamokamaWard) {
    throw new Error(
      'Kiamokama Ward not found. Run `npm run db:seed` first.'
    );
  }
  console.log(`✓ Found Kiamokama Ward (id: ${kiamokamaWard.id})`);

  // ================================================================
  // STEP 3: Look up departments
  // ================================================================
  const infraDept = await prisma.department.findUnique({
    where: { code: 'INFRA' },
  });
  if (!infraDept) {
    throw new Error(
      'Infrastructure department not found. Run `npm run db:seed` first.'
    );
  }
  console.log(`✓ Found Infrastructure department (id: ${infraDept.id})`);

  const waterDept = await prisma.department.findUnique({
    where: { code: 'WATER' },
  });
  if (!waterDept) {
    throw new Error(
      'Water department not found. Run `npm run db:seed` first.'
    );
  }
  console.log(`✓ Found Water department (id: ${waterDept.id})`);

  const disasterDept = await prisma.department.findUnique({
    where: { code: 'DISASTER' },
  });
  if (!disasterDept) {
    throw new Error(
      'Disaster Management department not found. Run `npm run db:seed` first.'
    );
  }
  console.log(`✓ Found Disaster Management department (id: ${disasterDept.id})`);

  const enforcementDept = await prisma.department.findUnique({
    where: { code: 'ENFORCEMENT' },
  });
  if (!enforcementDept) {
    throw new Error(
      'Enforcement department not found. Run `npm run db:seed` first.'
    );
  }
  console.log(`✓ Found Enforcement department (id: ${enforcementDept.id})`);

  // ================================================================
  // STEP 4: Create/update test accounts (idempotent — upsert by email)
  // ================================================================
  console.log('');
  console.log('Creating test accounts...');

  const createdUsers = [];

  for (const acc of TEST_ACCOUNTS) {
    // Resolve jurisdiction FKs
    let countyId = null;
    let subCountyId = null;
    let wardId = null;
    let departmentId = null;

    if (acc.countyName) {
      const county = await prisma.county.findUnique({
        where: { name: acc.countyName },
      });
      countyId = county?.id;
    }
    if (acc.subCountyName && countyId) {
      const sc = await prisma.subCounty.findFirst({
        where: { countyId, name: acc.subCountyName },
      });
      subCountyId = sc?.id;
    }
    if (acc.wardName && subCountyId) {
      const w = await prisma.ward.findFirst({
        where: { subCountyId, name: acc.wardName },
      });
      wardId = w?.id;
    }
    if (acc.departmentCode) {
      const dept = await prisma.department.findUnique({
        where: { code: acc.departmentCode },
      });
      departmentId = dept?.id;
    }

    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        role: acc.role,
        countyId,
        subCountyId,
        wardId,
        departmentId,
        isActive: true,
        isVerified: true,
        emailVerified: true,
        phoneVerified: false,
        password: hashedPassword,
      },
      create: {
        name: acc.name,
        email: acc.email,
        password: hashedPassword,
        role: acc.role,
        isVerified: true,
        emailVerified: true,
        phoneVerified: false,
        isActive: true,
        countyId,
        subCountyId,
        wardId,
        departmentId,
      },
    });

    createdUsers.push({
      ...acc,
      id: user.id,
      countyId,
      subCountyId,
      wardId,
      departmentId,
    });
    console.log(
      `  ✓ ${acc.role.padEnd(22)} ${acc.email.padEnd(38)} (${acc.name})`
    );
  }

  // ================================================================
  // STEP 5: Create related test records (reports and assignments)
  // ================================================================
  console.log('');
  console.log('Creating related test records...');

  // Find the citizen users and field officer for report creation
  const alice = createdUsers.find((u) => u.email === 'citizen.alice@example.com');
  const bob = createdUsers.find((u) => u.email === 'citizen.bob@example.com');
  const fieldOfficer = createdUsers.find(
    (u) => u.email === 'field.officer.1@example.com'
  );
  const techSupervisor = createdUsers.find(
    (u) => u.email === 'tech.supervisor.infra@example.com'
  );

  // ---- Citizen Alice: 3 reports in Bassi Central Ward ----
  if (alice && bassiCentralWard && bobasiSubCounty && kisiiCounty) {
    const report1 = await prisma.report.create({
      data: {
        title: 'Pothole on Bassi Central Road near Market',
        description:
          'Large pothole on the main road through Bassi Central Ward, near the market entrance. Vehicles are being damaged and pedestrians are at risk.',
        category: 'Roads, Traffic & Mobility',
        subCategory: 'Pothole',
        priority: 'HIGH',
        status: 'RESOLVED',
        location: 'Bassi Central Road, near Market entrance, Bassi Central Ward',
        county: 'Kisii',
        subCounty: 'Bobasi',
        ward: 'Bassi Central',
        countyId: kisiiCounty.id,
        subCountyId: bobasiSubCounty.id,
        wardId: bassiCentralWard.id,
        departmentId: infraDept.id,
        reporterId: alice.id,
        assignedOfficerId: fieldOfficer?.id,
        latitude: -0.6815,
        longitude: 34.7723,
        mediaUrls: [],
        isAnonymous: false,
        resolutionNotes: 'Pothole filled with asphalt overlay and compacted.',
        resolutionMediaUrls: [],
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        resolutionStatus: 'ACCEPTED',
        citizenFeedback: 'The repair is holding well. Thank you for the quick response.',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`  ✓ Report: "${report1.title}" (RESOLVED, accepted by citizen)`);

    await prisma.reportStatusHistory.create({
      data: {
        reportId: report1.id,
        fromStatus: 'SUBMITTED',
        toStatus: 'UNDER_REVIEW',
        notes: 'Report received and assigned for review',
        actorId: fieldOfficer?.id,
      },
    });
    await prisma.reportStatusHistory.create({
      data: {
        reportId: report1.id,
        fromStatus: 'UNDER_REVIEW',
        toStatus: 'ASSIGNED',
        notes: 'Assigned to field officer for inspection',
        actorId: techSupervisor?.id,
      },
    });
    await prisma.reportStatusHistory.create({
      data: {
        reportId: report1.id,
        fromStatus: 'ASSIGNED',
        toStatus: 'IN_PROGRESS',
        notes: 'Field officer began repair work',
        actorId: fieldOfficer?.id,
      },
    });
    await prisma.reportStatusHistory.create({
      data: {
        reportId: report1.id,
        fromStatus: 'IN_PROGRESS',
        toStatus: 'RESOLVED',
        notes: 'Pothole repaired and verified',
        actorId: fieldOfficer?.id,
      },
    });

    await prisma.assignment.create({
      data: {
        reportId: report1.id,
        officerId: fieldOfficer?.id,
        assignedById: techSupervisor?.id,
        reason: 'Pothole repair in Bassi Central Ward — field assignment',
      },
    });
  }

  if (alice && bassiCentralWard && bobasiSubCounty && kisiiCounty && waterDept) {
    const report2 = await prisma.report.create({
      data: {
        title: 'Blocked stormwater drain near Primary School',
        description:
          'Stormwater drain is blocked with garbage and silt, causing flooding during rains. Water is flowing onto the road near the primary school.',
        category: 'Drainage & Flood Control',
        subCategory: 'Blocked stormwater drain',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        location: 'Stormwater drain near Bassi Central Primary School',
        county: 'Kisii',
        subCounty: 'Bobasi',
        ward: 'Bassi Central',
        countyId: kisiiCounty.id,
        subCountyId: bobasiSubCounty.id,
        wardId: bassiCentralWard.id,
        departmentId: waterDept.id,
        reporterId: alice.id,
        assignedOfficerId: fieldOfficer?.id,
        latitude: -0.6830,
        longitude: 34.7710,
        mediaUrls: [],
        isAnonymous: false,
      },
    });
    console.log(`  ✓ Report: "${report2.title}" (IN_PROGRESS)`);

    await prisma.assignment.create({
      data: {
        reportId: report2.id,
        officerId: fieldOfficer?.id,
        assignedById: techSupervisor?.id,
        reason: 'Drain cleaning assignment — Bassi Central Ward',
      },
    });
  }

  if (alice && bassiCentralWard && bobasiSubCounty && kisiiCounty && infraDept) {
    const report3 = await prisma.report.create({
      data: {
        title: 'Faded road markings at Bassi Central Junction',
        description:
          'Road markings at the main junction in Bassi Central Ward have faded, causing confusion for drivers.',
        category: 'Roads, Traffic & Mobility',
        subCategory: 'Faded or unclear road markings',
        priority: 'LOW',
        status: 'SUBMITTED',
        location: 'Bassi Central Junction, Bassi Central Ward',
        county: 'Kisii',
        subCounty: 'Bobasi',
        ward: 'Bassi Central',
        countyId: kisiiCounty.id,
        subCountyId: bobasiSubCounty.id,
        wardId: bassiCentralWard.id,
        departmentId: infraDept.id,
        reporterId: alice.id,
        assignedOfficerId: null,
        latitude: -0.6820,
        longitude: 34.7730,
        mediaUrls: [],
        isAnonymous: false,
      },
    });
    console.log(`  ✓ Report: "${report3.title}" (SUBMITTED, unassigned)`);
  }

  // ---- Citizen Bob: 1 report in Kiamokama Ward ----
  if (bob && kiamokamaWard && nyaribariMasabaSubCounty && kisiiCounty && disasterDept) {
    const report4 = await prisma.report.create({
      data: {
        title: 'Dangerous tree branch overhanging road',
        description:
          'Large tree branch is hanging dangerously over the road in Kiamokama Ward. Risk of falling on passing vehicles.',
        category: 'Public Safety & Hazards',
        subCategory: 'Dangerous tree / risk of falling',
        priority: 'URGENT',
        status: 'ASSIGNED',
        location: 'Kiamokama Ward main road, near shopping center',
        county: 'Kisii',
        subCounty: 'Nyaribari Masaba',
        ward: 'Kiamokama',
        countyId: kisiiCounty.id,
        subCountyId: nyaribariMasabaSubCounty.id,
        wardId: kiamokamaWard.id,
        departmentId: disasterDept.id,
        reporterId: bob.id,
        assignedOfficerId: fieldOfficer?.id,
        latitude: -0.6900,
        longitude: 34.7600,
        mediaUrls: [],
        isAnonymous: false,
      },
    });
    console.log(`  ✓ Report: "${report4.title}" (ASSIGNED)`);

    await prisma.assignment.create({
      data: {
        reportId: report4.id,
        officerId: fieldOfficer?.id,
        assignedById: techSupervisor?.id,
        reason: 'Dangerous tree branch — urgent field response',
      },
    });
  }

  console.log('');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('Dev seed complete.');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Test Accounts (all use password: TestPassword123!)');
  console.log('──────────────────────────────────────────────────────────────');
  for (const acc of createdUsers) {
    const loginApp =
      acc.role === 'CITIZEN'
        ? 'Citizen Dashboard (/dashboard)'
        : acc.role === 'ADMIN' || acc.role === 'SUPER_ADMIN'
        ? 'Platform Admin (/)'
        : 'Government Dashboard (/government)';
    console.log(`  ${acc.email.padEnd(40)} | ${acc.role.padEnd(22)} | ${loginApp}`);
  }
  console.log('');
  console.log('Jurisdictions:');
  console.log('──────────────────────────────────────────────────────────────');
  for (const acc of createdUsers) {
    if (acc.role === 'CITIZEN') continue;
    const parts = [];
    if (acc.countyId) parts.push(`county:${acc.countyId.slice(-6)}`);
    if (acc.subCountyId) parts.push(`subCounty:${acc.subCountyId.slice(-6)}`);
    if (acc.wardId) parts.push(`ward:${acc.wardId.slice(-6)}`);
    if (acc.departmentId) parts.push(`dept:${acc.departmentId.slice(-6)}`);
    console.log(`  ${acc.email.padEnd(40)} | ${parts.join(', ')}`);
  }
  console.log('');
  console.log('To start all three applications:');
  console.log('  cd backend && npm run dev          (port 5000)');
  console.log('  cd citizen-frontend && npm run dev (port 3002)');
  console.log('  cd government-frontend && npm run dev (port 3001)');
  console.log('  cd admin-dashboard && npm run dev  (port 3000)');
  console.log('');
}

main()
  .then(() => {
    console.log('Dev seed completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Dev seed failed:', error.message);
    process.exit(1);
  });
