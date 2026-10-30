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

// Seed Kisii County sub-counties and wards for the in-memory store so that
// ward-scoped access works without a live database.
const kisii = [...memoryStore.counties.values()].find(
  (county) => county.name === 'Kisii'
);
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
  'South Mugirango': ["Boikang'a", 'Tabaka', 'Getenga', 'Moticho', 'Bogetenga', 'Chitago Borabu'],
  'Bomachoge Borabu': ['Boochi Borabu', 'Bombaba Borabu', 'Magenche', 'Bokimonge'],
  Bobasi: [
    'Masige East', 'Masige West', 'Bassi Bogetaorio', 'Bassi Central',
    'Nyacheki', 'Bobasi Chache', 'Bobasi Boitangare', 'Sameta Mokwerero',
  ],
  'Nyaribari Masaba': ['Kiamokama', 'Gesusu', 'Masimba', 'Nyamasibi', 'Ichuni'],
  'Bomachoge Chache': ['Bosoti/Sengera', 'Majoge Basi', 'Boochi/Tendere'],
  'Nyaribari Chache': ['Ibeno', 'Kisii Central', 'Birongo', 'Kiogoro', 'Keumbu', 'Bobaracho'],
  'Kitutu Chache North': ['Marani', 'Kegogi', 'Sensi', 'Monyerero'],
  'Kitutu Chache South': ['Nyatieko', 'Nyakoe', 'Bogeka', 'Kitutu Central', 'Bogusero'],
};

if (kisii) {
  for (const subCountyName of KISII_SUB_COUNTIES) {
    const subCountyId = uuidv4();
    const subCounty = {
      id: subCountyId,
      countyId: kisii.id,
      name: subCountyName,
      code: slug(subCountyName).toUpperCase(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.subCounties.set(subCountyId, subCounty);
    const wards = KISII_WARDS[subCountyName] ?? [];
    for (const wardName of wards) {
      const wardId = uuidv4();
      memoryStore.wards.set(wardId, {
        id: wardId,
        subCountyId,
        name: wardName,
        code: `${slug(subCountyName).toUpperCase()}-${String(wards.indexOf(wardName) + 1).padStart(2, '0')}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

const locationRepository = {
  async findCounties({ search } = {}) {
    if (checkIsPrisma()) {
      try {
        const rows = await getPrismaClient().county.findMany({
          where: {
            isActive: true,
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
          },
          orderBy: { name: 'asc' },
        });
        if (rows && rows.length > 0) return rows;
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
        const county = await getPrismaClient().county.findUnique({
          where: { id },
          include: { subCounties: { where: { isActive: true }, orderBy: { name: 'asc' } } },
        });
        if (county) return county;
      } catch (error) {
        console.warn('[DB] Prisma findCountyById failed, falling back to memory:', error.message);
      }
    }
    return memoryStore.counties.get(id) || null;
  },

  async findSubCounties(countyId) {
    if (checkIsPrisma()) {
      try {
        const rows = await getPrismaClient().subCounty.findMany({
          where: { countyId, isActive: true },
          orderBy: { name: 'asc' },
        });
        if (rows && rows.length > 0) return rows;
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
        const rows = await getPrismaClient().ward.findMany({
          where: { subCountyId, isActive: true },
          orderBy: { name: 'asc' },
        });
        if (rows && rows.length > 0) return rows;
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
        const subCounty = await getPrismaClient().subCounty.findUnique({ where: { id } });
        if (subCounty) return subCounty;
      } catch (error) {
        console.warn('[DB] Prisma findSubCountyById failed, falling back to memory:', error.message);
      }
    }
    return memoryStore.subCounties.get(id) || null;
  },

  async findCountyByName(name) {
    if (!name) return null;
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().county.findFirst({
          where: { name, isActive: true },
        });
      } catch (error) {
        console.warn('[DB] Prisma findCountyByName failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.counties.values()].find(
      (c) => c.isActive && c.name.toLowerCase() === String(name).toLowerCase()
    );
  },

  async findSubCountyByName(countyId, name) {
    if (!countyId || !name) return null;
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().subCounty.findFirst({
          where: { countyId, name, isActive: true },
        });
      } catch (error) {
        console.warn('[DB] Prisma findSubCountyByName failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.subCounties.values()].find(
      (s) => s.isActive && s.countyId === countyId && s.name.toLowerCase() === String(name).toLowerCase()
    );
  },

  async findWardByName(subCountyId, name) {
    if (!subCountyId || !name) return null;
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().ward.findFirst({
          where: { subCountyId, name, isActive: true },
        });
      } catch (error) {
        console.warn('[DB] Prisma findWardByName failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.wards.values()].find(
      (w) => w.isActive && w.subCountyId === subCountyId && w.name.toLowerCase() === String(name).toLowerCase()
    );
  },
};

export { COUNTY_NAMES };
export default locationRepository;
