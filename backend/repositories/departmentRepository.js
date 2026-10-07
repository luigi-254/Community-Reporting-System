import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const departmentRepository = {
  async createDepartment(data) {
    const department = {
      id: uuidv4(),
      name: data.name.trim(),
      code: data.code.toUpperCase().trim(),
      description: data.description?.trim() || null,
      contactEmail: data.contactEmail?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().department.create({ data: department });
      } catch (error) {
        console.warn('[DB] Prisma createDepartment failed, falling back to memory:', error.message);
      }
    }

    memoryStore.departments.set(department.id, department);
    return { ...department };
  },

  async findDepartmentById(id) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().department.findUnique({ where: { id } });
      } catch (error) {
        console.warn('[DB] Prisma findDepartmentById failed, falling back to memory:', error.message);
      }
    }
    return memoryStore.departments.get(id) || null;
  },

  async findDepartmentByName(name) {
    if (!name) return null;
    const normalized = name.trim().toLowerCase();
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().department.findFirst({
          where: { name: { equals: normalized, mode: 'insensitive' } },
        });
      } catch (error) {
        console.warn('[DB] Prisma findDepartmentByName failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.departments.values()].find(
      (department) => department.name.toLowerCase() === normalized
    ) || null;
  },

  async findDepartmentByCode(code) {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().department.findUnique({ where: { code: normalized } });
      } catch (error) {
        console.warn('[DB] Prisma findDepartmentByCode failed, falling back to memory:', error.message);
      }
    }
    return [...memoryStore.departments.values()].find(
      (department) => department.code === normalized
    ) || null;
  },

  async findDepartments({ isActive, search } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().department.findMany({
          where: {
            ...(isActive !== undefined && { isActive: isActive === true || isActive === 'true' }),
            ...(search && {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            }),
          },
          orderBy: { name: 'asc' },
        });
      } catch (error) {
        console.warn('[DB] Prisma findDepartments failed, falling back to memory:', error.message);
      }
    }

    let departments = [...memoryStore.departments.values()];
    if (isActive !== undefined) {
      const active = isActive === true || isActive === 'true' || isActive === '1';
      departments = departments.filter((department) => department.isActive === active);
    }
    if (search) {
      const query = search.toLowerCase().trim();
      departments = departments.filter(
        (department) =>
          department.name.toLowerCase().includes(query) ||
          department.code.toLowerCase().includes(query)
      );
    }
    return departments.sort((a, b) => a.name.localeCompare(b.name));
  },

  async updateDepartment(id, data) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().department.update({
          where: { id },
          data: { ...data, updatedAt: new Date() },
        });
      } catch (error) {
        console.warn('[DB] Prisma updateDepartment failed, falling back to memory:', error.message);
      }
    }
    const existing = memoryStore.departments.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    memoryStore.departments.set(id, updated);
    return { ...updated };
  },

  async deleteDepartment(id) {
    if (checkIsPrisma()) {
      try {
        await getPrismaClient().department.delete({ where: { id } });
        return true;
      } catch (error) {
        console.warn('[DB] Prisma deleteDepartment failed, falling back to memory:', error.message);
      }
    }
    return memoryStore.departments.delete(id);
  },
};

export default departmentRepository;
