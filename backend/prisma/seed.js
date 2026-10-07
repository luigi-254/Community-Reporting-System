import { PrismaClient } from '@prisma/client';
import { COUNTY_NAMES, NAIROBI_SUBCOUNTIES } from '../repositories/locationRepository.js';

const prisma = new PrismaClient();

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
  }
  console.log('Location seed completed.');
} finally {
  await prisma.$disconnect();
}
