import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const COUNTY_NAMES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta',
  'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru',
  'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
  'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot',
  'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi',
  'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho',
  'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya',
  'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi City',
];

const slug = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

for (const [index, name] of COUNTY_NAMES.entries()) {
  const id = String(index + 1).padStart(2, '0');
  memoryStore.counties.set(id, {
    id,
    code: `KE-${id}`,
    name,
    slug: slug(name),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const nairobi = [...memoryStore.counties.values()].find((county) => county.name === 'Nairobi City');
export const NAIROBI_SUBCOUNTIES = [
  'Dagoretti North', 'Dagoretti South', 'Embakasi Central', 'Embakasi East',
  'Embakasi North', 'Embakasi South', 'Embakasi West', 'Kamukunji',
  'Kasarani', 'Kibra', 'Langata', 'Mathare', 'Roysambu', 'Ruaraka',
  'Starehe', 'Westlands',
];

for (const name of NAIROBI_SUBCOUNTIES) {
  const subCountyId = uuidv4();
  const subCounty = {
    id: subCountyId,
    countyId: nairobi.id,
    name,
    code: slug(name).toUpperCase(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.subCounties.set(subCountyId, subCounty);
  const wardId = uuidv4();
  memoryStore.wards.set(wardId, {
    id: wardId,
    subCountyId,
    name: `${subCounty.name} Central`,
    code: `${subCounty.code}-01`,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const locationRepository = {
  async findCounties({ search } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().county.findMany({
          where: {
            isActive: true,
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
          },
          orderBy: { name: 'asc' },
        });
      } catch (error) {
        console.warn('[DB] Prisma findCounties failed, falling back to memory:', error.message);
      }
    }

    let counties = [...memoryStore.counties.values()];
    if (search) {
      const query = search.toLowerCase().trim();
      counties = counties.filter((county) => county.name.toLowerCase().includes(query));
    }
    return counties.filter((county) => county.isActive).sort((a, b) => a.name.localeCompare(b.name));
  },

  async findCountyById(id) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().county.findUnique({
          where: { id },
          include: { subCounties: { where: { isActive: true }, orderBy: { name: 'asc' } } },
        });
      } catch (error) {
        console.warn('[DB] Prisma findCountyById failed, falling back to memory:', error.message);
      }
    }
    return memoryStore.counties.get(id) || null;
  },

  async findSubCounties(countyId) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().subCounty.findMany({
          where: { countyId, isActive: true },
          orderBy: { name: 'asc' },
        });
      } catch (error) {
        console.warn('[DB] Prisma findSubCounties failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.subCounties.values()]
      .filter((subCounty) => subCounty.countyId === countyId && subCounty.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async findWards(subCountyId) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().ward.findMany({
          where: { subCountyId, isActive: true },
          orderBy: { name: 'asc' },
        });
      } catch (error) {
        console.warn('[DB] Prisma findWards failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.wards.values()]
      .filter((ward) => ward.subCountyId === subCountyId && ward.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async findSubCountyById(id) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().subCounty.findUnique({ where: { id } });
      } catch (error) {
        console.warn('[DB] Prisma findSubCountyById failed, falling back to memory:', error.message);
      }
    }
    return memoryStore.subCounties.get(id) || null;
  },
};

export { COUNTY_NAMES };
export default locationRepository;
