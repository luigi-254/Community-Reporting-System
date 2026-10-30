import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const officialRepository = {
  async createOfficial(data) {
    const official = {
      id: uuidv4(),
      name: data.name.trim(),
      officialType: data.officialType || 'OTHER',
      positionId: data.positionId || null,
      userId: data.userId || null,
      county: data.county || null,
      subCounty: data.subCounty || null,
      ward: data.ward || null,
      departmentId: data.departmentId || null,
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().official.create({ data: official });
      } catch (error) {
        console.warn('[DB] Prisma createOfficial failed, falling back to memory:', error.message);
      }
    }

    memoryStore.officials.set(official.id, official);
    return official;
  },

  async findOfficials({ officialType, county, subCounty, ward, departmentId, isActive, search } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().official.findMany({
          where: {
            ...(officialType && { officialType }),
            ...(county && { county }),
            ...(subCounty && { subCounty }),
            ...(ward && { ward }),
            ...(departmentId && { departmentId }),
            ...(isActive !== undefined && { isActive: isActive === true || isActive === 'true' }),
            ...(search && {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { county: { contains: search, mode: 'insensitive' } },
                { subCounty: { contains: search, mode: 'insensitive' } },
                { ward: { contains: search, mode: 'insensitive' } },
              ],
            }),
          },
          orderBy: { name: 'asc' },
        });
      } catch (error) {
        console.warn('[DB] Prisma findOfficials failed, falling back to memory:', error.message);
      }
    }

    let officials = [...memoryStore.officials.values()];
    if (officialType) officials = officials.filter((o) => o.officialType === officialType);
    if (county) officials = officials.filter((o) => o.county === county);
    if (subCounty) officials = officials.filter((o) => o.subCounty === subCounty);
    if (ward) officials = officials.filter((o) => o.ward === ward);
    if (departmentId) officials = officials.filter((o) => o.departmentId === departmentId);
    if (isActive !== undefined) {
      const active = isActive === true || isActive === 'true' || isActive === '1';
      officials = officials.filter((o) => o.isActive === active);
    }
    if (search) {
      const query = search.toLowerCase().trim();
      officials = officials.filter((o) =>
        o.name.toLowerCase().includes(query) ||
        (o.county && o.county.toLowerCase().includes(query)) ||
        (o.subCounty && o.subCounty.toLowerCase().includes(query)) ||
        (o.ward && o.ward.toLowerCase().includes(query))
      );
    }
    return officials.sort((a, b) => a.name.localeCompare(b.name));
  },

  async findOfficialById(id) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().official.findUnique({ where: { id } });
      } catch (error) {
        console.warn('[DB] Prisma findOfficialById failed, falling back to memory:', error.message);
      }
    }
    return memoryStore.officials.get(id) || null;
  },

  async updateOfficial(id, data) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().official.update({
          where: { id },
          data: { ...data, updatedAt: new Date() },
        });
      } catch (error) {
        console.warn('[DB] Prisma updateOfficial failed, falling back to memory:', error.message);
      }
    }
    const existing = memoryStore.officials.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    memoryStore.officials.set(id, updated);
    return updated;
  },
};

export default officialRepository;
