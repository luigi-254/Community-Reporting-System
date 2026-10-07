import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

export const subcategoryRepository = {
  enrichSubcategory(subcategory, includeCategory = true) {
    if (!subcategory) return null;
    const sub = { ...subcategory };
    if (includeCategory && sub.categoryId) {
      const parent = memoryStore.categories.get(sub.categoryId);
      if (parent) {
        sub.category = {
          id: parent.id,
          name: parent.name,
          code: parent.code,
          icon: parent.icon,
        };
      }
    }
    return sub;
  },

  async createSubcategory(data) {
    const subcategoryId = uuidv4();
    const newSubcategory = {
      id: subcategoryId,
      categoryId: data.categoryId,
      name: data.name.trim(),
      code: (data.code || data.name).toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_'),
      description: data.description ? data.description.trim() : null,
      defaultPriority: data.defaultPriority || 'MEDIUM',
      slaHours: typeof data.slaHours === 'number' ? data.slaHours : 48,
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().subcategory.create({
          data: newSubcategory,
          include: { category: true },
        });
      } catch (err) {
        console.warn('[DB] Prisma createSubcategory failed, falling back to memory:', err.message);
      }
    }

    memoryStore.subcategories.set(subcategoryId, newSubcategory);
    return this.enrichSubcategory(newSubcategory, true);
  },

  async findSubcategoryById(id, { includeCategory = true } = {}) {
    if (!id) return null;

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().subcategory.findUnique({
          where: { id },
          include: { category: Boolean(includeCategory) },
        });
      } catch (err) {
        console.warn('[DB] Prisma findSubcategoryById failed, falling back to memory:', err.message);
      }
    }

    const sub = memoryStore.subcategories.get(id);
    return sub ? this.enrichSubcategory(sub, includeCategory) : null;
  },

  async findSubcategories({
    categoryId,
    isActive,
    search,
    includeCategory = true,
    sortBy = 'name',
    sortOrder = 'asc',
  } = {}) {
    if (checkIsPrisma()) {
      try {
        const where = {};
        if (categoryId) where.categoryId = categoryId;
        if (isActive !== undefined) where.isActive = Boolean(isActive);
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ];
        }

        return await getPrismaClient().subcategory.findMany({
          where,
          include: { category: Boolean(includeCategory) },
          orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        });
      } catch (err) {
        console.warn('[DB] Prisma findSubcategories failed, falling back to memory:', err.message);
      }
    }

    let results = Array.from(memoryStore.subcategories.values());

    if (categoryId) {
      results = results.filter((s) => s.categoryId === categoryId);
    }

    if (isActive !== undefined) {
      const activeBool = Boolean(isActive === true || isActive === 'true' || isActive === '1');
      results = results.filter((s) => s.isActive === activeBool);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    results.sort((a, b) => {
      const valA = a[sortBy] ?? a.name;
      const valB = b[sortBy] ?? b.name;
      const mult = sortOrder.toLowerCase() === 'desc' ? -1 : 1;
      return String(valA).localeCompare(String(valB)) * mult;
    });

    return results.map((s) => this.enrichSubcategory(s, includeCategory));
  },

  async updateSubcategory(id, updateData) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().subcategory.update({
          where: { id },
          data: { ...updateData, updatedAt: new Date() },
          include: { category: true },
        });
      } catch (err) {
        console.warn('[DB] Prisma updateSubcategory failed, falling back to memory:', err.message);
      }
    }

    const existing = memoryStore.subcategories.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    memoryStore.subcategories.set(id, updated);
    return this.enrichSubcategory(updated, true);
  },

  async deleteSubcategory(id) {
    if (checkIsPrisma()) {
      try {
        await getPrismaClient().subcategory.delete({ where: { id } });
        return true;
      } catch (err) {
        console.warn('[DB] Prisma deleteSubcategory failed, falling back to memory:', err.message);
      }
    }

    return memoryStore.subcategories.delete(id);
  },
};

export default subcategoryRepository;
