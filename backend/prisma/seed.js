import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { COUNTY_NAMES, NAIROBI_SUBCOUNTIES } from '../repositories/locationRepository.js';

// Authoritative Kisii sub-county names (docs/mtaa-fix-planning/05-database-schema.md §4.1).
// Ward names supplied by the project owner (Kisii County PCA document).
const KISII_SUB_COUNTIES = [
  'Bonchari',
  'South Mugirango',
  'Bomachoge Borabu',
  'Bobasi',
  'Nyaribari Masaba',
  'Bomachoge Chache',
  'Nyaribari Chache',
  'Kitutu Chache North',
  'Kitutu Chache South',
];

const KISII_WARDS = {
  Bonchari: ['Riana', 'Bomorenda', 'Bogiakumu', 'Bomariba'],
  'South Mugirango': ['Boikang\'a', 'Tabaka', 'Getenga', 'Moticho', 'Bogetenga', 'Chitago Borabu'],
  'Bomachoge Borabu': ['Boochi Borabu', 'Bombaba Borabu', 'Magenche', 'Bokimonge'],
  Bobasi: ['Masige East', 'Masige West', 'Bassi Bogetaorio', 'Bassi Central', 'Nyacheki', 'Bobasi Chache', 'Bobasi Boitangare', 'Sameta Mokwerero'],
  'Nyaribari Masaba': ['Kiamokama', 'Gesusu', 'Masimba', 'Nyamasibi', 'Ichuni'],
  'Bomachoge Chache': ['Bosoti/Sengera', 'Majoge Basi', 'Boochi/Tendere'],
  'Nyaribari Chache': ['Ibeno', 'Kisii Central', 'Birongo', 'Kiogoro', 'Keumbu', 'Bobaracho'],
  'Kitutu Chache North': ['Marani', 'Kegogi', 'Sensi', 'Monyerero'],
  'Kitutu Chache South': ['Nyatieko', 'Nyakoe', 'Bogeka', 'Kitutu Central', 'Bogusero'],
};

// Departments named in docs/mtaa-fix-planning/05-database-schema.md §4.3 and 01-prd.md §4.1.
const DEPARTMENTS = [
  { code: 'INFRA', name: 'Infrastructure, Roads & Public Works' },
  { code: 'WATER', name: 'Water, Environment, Natural Resources, Energy & Climate Change' },
  { code: 'PUBLIC_SERVICE', name: 'Public Service, County Administration & Participatory Development' },
  { code: 'TRADE', name: 'Trade, Tourism, Industry & Marketing' },
  { code: 'YOUTH', name: 'Youth, Sports, Culture, Arts & Social Services' },
  { code: 'DISASTER', name: 'Disaster Management' },
  { code: 'ENFORCEMENT', name: 'Enforcement' },
];

// The 7 required categories (docs/mtaa-fix-planning/01-prd.md §4.1).
// Sub-issues are intentionally NOT seeded: the master-prompt taxonomy has not been supplied.
const CATEGORIES = [
  { code: 'ROADS', name: 'Roads, Traffic & Mobility', departmentCode: 'INFRA' },
  { code: 'WATER', name: 'Water & Sewerage', departmentCode: 'WATER' },
  { code: 'DRAINAGE', name: 'Drainage & Flood Control', departmentCode: 'INFRA' },
  { code: 'WASTE', name: 'Solid Waste & Environment', departmentCode: 'WATER' },
  { code: 'LIGHTING', name: 'Street Lighting & Power', departmentCode: 'INFRA' },
  { code: 'FACILITIES', name: 'Public Facilities, Markets & Parks', departmentCode: null },
  { code: 'SAFETY', name: 'Public Safety & Hazards', departmentCode: 'DISASTER' },
];

const SUBCATEGORY_SEED = {
  ROADS: [
    'Pothole',
    'Multiple potholes',
    'Damaged or eroded road surface',
    'Muddy or slippery road',
    'Blocked or impassable road',
    'Road damaged by flooding',
    'Damaged bridge or culvert',
    'Missing or damaged road sign',
    'Faded or unclear road markings',
    'Damaged sidewalk or footpath',
    'Blocked pedestrian walkway',
    'Dangerous junction or crossing',
    'Broken or missing traffic light',
    'Malfunctioning traffic light',
    'Missing pedestrian crossing',
    'Damaged speed bump',
    'Missing or damaged guardrail',
    'Road obstruction',
    'Illegal parking causing obstruction',
    'Other (describe)',
  ],
  WATER: [
    'No water / water outage',
    'Frequent water interruptions',
    'Burst water pipe',
    'Leaking water pipe',
    'Water wastage / uncontrolled water flow',
    'Contaminated or dirty water',
    'Bad-smelling water',
    'Low water pressure',
    'Broken public water tap or kiosk',
    'Damaged water storage facility',
    'Broken water meter',
    'Missing water meter',
    'Blocked or overflowing sewer',
    'Open sewage',
    'Sewage leakage',
    'Sewage entering road/property',
    'Bad sewage smell',
    'Damaged sewer manhole',
    'Other (describe)',
  ],
  DRAINAGE: [
    'Blocked roadside drain',
    'Blocked stormwater drain',
    'Active flooding',
    'Flash flooding',
    'Collapsed or eroded drain',
    'Open or uncovered drainage trench',
    'Damaged drainage channel',
    'Standing or stagnant water',
    'Blocked stormwater culvert',
    'Damaged or collapsed culvert',
    'Drain overflowing',
    'Drain filled with garbage',
    'Soil or silt blocking drainage',
    'Water flowing onto road',
    'Water flowing onto private/public property',
    'Missing drainage system',
    'Other (describe)',
  ],
  WASTE: [
    'Uncollected garbage',
    'Illegal dumping',
    'Unmanaged dumpsite',
    'Overflowing garbage bins',
    'Damaged or missing public bin',
    'Garbage blocking road',
    'Garbage blocking drain',
    'Open burning of waste',
    'Water or river pollution',
    'Sewage/environmental pollution',
    'Air pollution or excessive smoke',
    'Excessive dust',
    'Noise pollution',
    'Chemical or hazardous waste',
    'Plastic waste accumulation',
    'Dead animal / animal waste in public area',
    'Illegal dumping near residential area',
    'Polluted public space',
    'Other (describe)',
  ],
  LIGHTING: [
    'Broken streetlight',
    'Flickering streetlight',
    'Streetlight not working',
    'Missing streetlight',
    'Damaged streetlight pole',
    'Fallen or leaning power pole',
    'Exposed electrical wires',
    'Dangling electrical cables',
    'Damaged electrical infrastructure',
    'Electrical sparks / visible electrical fault',
    'Dark or poorly lit public area',
    'Streetlight obstructed by vegetation',
    'Other (describe)',
  ],
  FACILITIES: [
    'Damaged or dirty public toilet',
    'Lack of public toilet',
    'Damaged market stall or structure',
    'Poor sanitation at market',
    'Poor sanitation at health facility',
    'Damaged community hall or centre',
    'Damaged school/public learning facility',
    'Broken benches',
    'Damaged fences or gates',
    'Damaged playground',
    'Damaged sports facility',
    'Unsafe playground equipment',
    'Garbage accumulation in public space',
    'Vandalized public property',
    'Damaged public building',
    'Leaking public building',
    'Damaged roof or ceiling',
    'Broken doors or windows',
    'Poor lighting in public facility',
    'Overgrown vegetation in public facility',
    'Poor accessibility for persons with disabilities',
    'Abandoned public facility',
    'Other (describe)',
  ],
  SAFETY: [
    'Open or missing manhole cover',
    'Dangerous or collapsing building',
    'Fire hazard',
    'Blocked emergency access route',
    'Unsafe construction site',
    'Construction debris blocking public area',
    'Abandoned hazardous structure',
    'Fallen tree blocking road',
    'Dangerous tree / risk of falling',
    'Exposed hole or excavation',
    'Unprotected construction excavation',
    'Dangerous debris on road',
    'Damaged public safety barrier',
    'Unsafe public area',
    'Hazardous materials in public area',
    'Animal hazard in public area',
    'Risk of landslide or soil collapse',
    'Collapsed wall or fence',
    'Other (describe)',
  ],
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  for (const [index, name] of COUNTY_NAMES.entries()) {
    const code = `KE-${String(index + 1).padStart(2, '0')}`;
    const county = await prisma.county.upsert({
      where: { code },
      update: { name, isActive: true },
      create: {
        code,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      },
    });

    if (name === 'Nairobi City') {
      for (const subCountyName of NAIROBI_SUBCOUNTIES) {
        const subCounty = await prisma.subCounty.upsert({
          where: { countyId_name: { countyId: county.id, name: subCountyName } },
          update: { isActive: true },
          create: { countyId: county.id, name: subCountyName, isActive: true },
        });
        await prisma.ward.upsert({
          where: { subCountyId_name: { subCountyId: subCounty.id, name: `${subCountyName} Central` } },
          update: { isActive: true },
          create: { subCountyId: subCounty.id, name: `${subCountyName} Central`, isActive: true },
        });
      }
    }

    if (name === 'Kisii') {
      for (const subCountyName of KISII_SUB_COUNTIES) {
        const subCounty = await prisma.subCounty.upsert({
          where: { countyId_name: { countyId: county.id, name: subCountyName } },
          update: { isActive: true },
          create: { countyId: county.id, name: subCountyName, isActive: true },
        });
        for (const wardName of KISII_WARDS[subCountyName] ?? []) {
          await prisma.ward.upsert({
            where: { subCountyId_name: { subCountyId: subCounty.id, name: wardName } },
            update: { isActive: true },
            create: { subCountyId: subCounty.id, name: wardName, isActive: true },
          });
        }
      }
      console.log('Kisii seed completed (9 sub-counties, 45 wards).');
    }
  }
  console.log('Location seed completed.');

  const departmentByCode = new Map();
  for (const dept of DEPARTMENTS) {
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, isActive: true },
      create: { code: dept.code, name: dept.name, isActive: true },
    });
    departmentByCode.set(dept.code, record);
  }
  console.log(`Department seed completed (${DEPARTMENTS.length}).`);

  let subcategoryCount = 0;
  for (const [index, category] of CATEGORIES.entries()) {
    const department = category.departmentCode
      ? departmentByCode.get(category.departmentCode)
      : null;
    const record = await prisma.category.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        displayOrder: index,
        isActive: true,
        departmentId: department?.id ?? null,
      },
      create: {
        code: category.code,
        name: category.name,
        displayOrder: index,
        isActive: true,
        departmentId: department?.id ?? null,
      },
    });
    for (const [order, name] of (SUBCATEGORY_SEED[category.code] ?? []).entries()) {
      await prisma.subcategory.upsert({
        where: { categoryId_name: { categoryId: record.id, name } },
        update: { displayOrder: order, isActive: true, isOther: name.startsWith('Other') },
        create: {
          categoryId: record.id,
          name,
          displayOrder: order,
          isActive: true,
          isOther: name.startsWith('Other'),
        },
      });
      subcategoryCount += 1;
    }
  }
  console.log(`Category seed completed (${CATEGORIES.length}).`);
  console.log(`Subcategory seed completed (${subcategoryCount}).`);
  console.log(
    'Seeding complete. Officials (Governor/CECM/Chief Officer/MP/MCA) are not seeded yet.'
  );
} finally {
  await prisma.$disconnect();
}
