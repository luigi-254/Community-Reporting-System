import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const withoutPassword = (user) => {
  if (!user) return null;
  const { password, ...officer } = user;
  return officer;
};

const officerRepository = {
  async createOfficer(data) {
    const officer = {
      id: uuidv4(),
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      password: data.password,
      role: 'OFFICER',
      isVerified: data.isVerified !== false,
      emailVerified: data.emailVerified !== false,
      phoneVerified: Boolean(data.phoneVerified),
      isActive: data.isActive !== false,
      county: data.county || null,
      subCounty: data.subCounty || null,
      ward: data.ward || null,
      address: data.address || null,
      departmentId: data.departmentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.create({
          data: {
            ...officer,
            role: 'OFFICER',
          },
        }).then(withoutPassword);
      } catch (error) {
        console.warn('[DB] Prisma createOfficer failed, falling back to memory:', error.message);
      }
    }

    memoryStore.users.set(officer.id, officer);
    return withoutPassword(officer);
  },

  async findOfficerByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.findFirst({
          where: { email: normalized, role: 'OFFICER' },
        }).then(withoutPassword);
      } catch (error) {
        console.warn('[DB] Prisma findOfficerByEmail failed, falling back to memory:', error.message);
      }
    }
    return withoutPassword([...memoryStore.users.values()].find(
      (user) => user.role === 'OFFICER' && user.email === normalized
    ));
  },

  async findOfficerById(id) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.findFirst({
          where: { id, role: 'OFFICER' },
        }).then(withoutPassword);
      } catch (error) {
        console.warn('[DB] Prisma findOfficerById failed, falling back to memory:', error.message);
      }
    }
    const user = memoryStore.users.get(id);
    return user?.role === 'OFFICER' ? withoutPassword(user) : null;
  },

  async findOfficers({ isActive, departmentId, search } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.findMany({
          where: {
            role: 'OFFICER',
            ...(isActive !== undefined && { isActive: isActive === true || isActive === 'true' }),
            ...(departmentId && { departmentId }),
            ...(search && {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }),
          },
          orderBy: { name: 'asc' },
        }).then((officers) => officers.map(withoutPassword));
      } catch (error) {
        console.warn('[DB] Prisma findOfficers failed, falling back to memory:', error.message);
      }
    }

    let officers = [...memoryStore.users.values()].filter((user) => user.role === 'OFFICER');
    if (isActive !== undefined) {
      const active = isActive === true || isActive === 'true' || isActive === '1';
      officers = officers.filter((officer) => officer.isActive === active);
    }
    if (departmentId) officers = officers.filter((officer) => officer.departmentId === departmentId);
    if (search) {
      const query = search.toLowerCase().trim();
      officers = officers.filter(
        (officer) => officer.name.toLowerCase().includes(query) || officer.email.includes(query)
      );
    }
    return officers.sort((a, b) => a.name.localeCompare(b.name)).map(withoutPassword);
  },

  async updateOfficer(id, data) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.update({
          where: { id },
          data,
        }).then(withoutPassword);
      } catch (error) {
        console.warn('[DB] Prisma updateOfficer failed, falling back to memory:', error.message);
      }
    }
    const existing = memoryStore.users.get(id);
    if (!existing || existing.role !== 'OFFICER') return null;
    const updated = { ...existing, ...data, role: 'OFFICER', updatedAt: new Date() };
    memoryStore.users.set(id, updated);
    return withoutPassword(updated);
  },
};

export default officerRepository;
