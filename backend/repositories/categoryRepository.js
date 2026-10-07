import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

export const categoryRepository = {
  enrichCategory(category, includeSubcategories = false) {
    if (!category) return null;
    const cat = { ...category };
    if (includeSubcategories) {
      cat.subcategories = Array.from(memoryStore.subcategories.values())
        .filter((s) => s.categoryId === cat.id && s.isActive !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return cat;
  },

  async createCategory(data) {
    const categoryId = uuidv4();
    const newCategory = {
      id: categoryId,
      name: data.name.trim(),
      code: (data.code || data.name).toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_'),
      description: data.description ? data.description.trim() : null,
      icon: data.icon || null,
      isActive: data.isActive !== false,
      departmentId: data.departmentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().category.create({
          data: newCategory,
          include: { subcategories: true },
        });
      } catch (err) {
        console.warn('[DB] Prisma createCategory failed, falling back to memory:', err.message);
      }
    }

    memoryStore.categories.set(categoryId, newCategory);
    return this.enrichCategory(newCategory, true);
  },

  async findCategoryById(id, { includeSubcategories = true } = {}) {
    if (!id) return null;

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().category.findUnique({
          where: { id },
          include: { subcategories: Boolean(includeSubcategories) },
        });
      } catch (err) {
        console.warn('[DB] Prisma findCategoryById failed, falling back to memory:', err.message);
      }
    }

    const cat = memoryStore.categories.get(id);
    return cat ? this.enrichCategory(cat, includeSubcategories) : null;
  },

  async findCategoryByName(name) {
    if (!name) return null;
    const normalized = name.toLowerCase().trim();

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().category.findFirst({
          where: { name: { equals: normalized, mode: 'insensitive' } },
        });
      } catch (err) {
        console.warn('[DB] Prisma findCategoryByName failed, falling back to memory:', err.message);
      }
    }

    for (const cat of memoryStore.categories.values()) {
      if (cat.name.toLowerCase() === normalized) {
        return { ...cat };
      }
    }
    return null;
  },

  async findCategoryByCode(code) {
    if (!code) return null;
    const cleanCode = code.toUpperCase().trim();

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().category.findFirst({
          where: { code: cleanCode },
        });
      } catch (err) {
        console.warn('[DB] Prisma findCategoryByCode failed, falling back to memory:', err.message);
      }
    }

    for (const cat of memoryStore.categories.values()) {
      if (cat.code === cleanCode) {
        return { ...cat };
      }
    }
    return null;
  },

  async findCategories({
    isActive,
    search,
    includeSubcategories = true,
    sortBy = 'name',
    sortOrder = 'asc',
  } = {}) {
    if (checkIsPrisma()) {
      try {
        const where = {};
        if (isActive !== undefined) where.isActive = Boolean(isActive);
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ];
        }

        return await getPrismaClient().category.findMany({
          where,
          include: { subcategories: Boolean(includeSubcategories) },
          orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        });
      } catch (err) {
        console.warn('[DB] Prisma findCategories failed, falling back to memory:', err.message);
      }
    }

    let results = Array.from(memoryStore.categories.values());

    if (isActive !== undefined) {
      const activeBool = Boolean(isActive === true || isActive === 'true' || isActive === '1');
      results = results.filter((c) => c.isActive === activeBool);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    results.sort((a, b) => {
      const valA = a[sortBy] ?? a.name;
      const valB = b[sortBy] ?? b.name;
      const mult = sortOrder.toLowerCase() === 'desc' ? -1 : 1;
      return String(valA).localeCompare(String(valB)) * mult;
    });

    return results.map((c) => this.enrichCategory(c, includeSubcategories));
  },

  async updateCategory(id, updateData) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().category.update({
          where: { id },
          data: { ...updateData, updatedAt: new Date() },
          include: { subcategories: true },
        });
      } catch (err) {
        console.warn('[DB] Prisma updateCategory failed, falling back to memory:', err.message);
      }
    }

    const existing = memoryStore.categories.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    memoryStore.categories.set(id, updated);
    return this.enrichCategory(updated, true);
  },

  async deleteCategory(id) {
    if (checkIsPrisma()) {
      try {
        await getPrismaClient().category.delete({ where: { id } });
        return true;
      } catch (err) {
        console.warn('[DB] Prisma deleteCategory failed, falling back to memory:', err.message);
      }
    }

    // Also remove associated subcategories
    for (const [subId, sub] of memoryStore.subcategories.entries()) {
      if (sub.categoryId === id) {
        memoryStore.subcategories.delete(subId);
      }
    }

    return memoryStore.categories.delete(id);
  },
};

export default categoryRepository;
