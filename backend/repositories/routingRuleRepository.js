import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

const routingRuleRepository = {
  async createRoutingRule(data) {
    const rule = {
      id: uuidv4(), name: data.name.trim(), category: data.category || null,
      subCategory: data.subCategory || null, county: data.county || null,
      departmentId: data.departmentId || null, officerId: data.officerId || null,
      priority: data.priority || null, isActive: data.isActive !== false,
      createdAt: new Date(), updatedAt: new Date(),
    };
    if (checkIsPrisma()) {
      try { return await getPrismaClient().routingRule.create({ data: rule }); }
      catch (error) { console.warn('[DB] Prisma createRoutingRule failed, falling back to memory:', error.message); }
    }
    memoryStore.routingRules.set(rule.id, rule);
    return { ...rule };
  },
  async findRoutingRules({ isActive } = {}) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().routingRule.findMany({
          where: isActive === undefined ? {} : { isActive: isActive === true || isActive === 'true' },
          orderBy: { createdAt: 'desc' },
        });
      } catch (error) { console.warn('[DB] Prisma findRoutingRules failed, falling back to memory:', error.message); }
    }
    return [...memoryStore.routingRules.values()]
      .filter((rule) => isActive === undefined || rule.isActive === true || (isActive === 'true' && rule.isActive))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async findRoutingRuleById(id) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().routingRule.findUnique({ where: { id } }); }
      catch (error) { console.warn('[DB] Prisma findRoutingRuleById failed, falling back to memory:', error.message); }
    }
    return memoryStore.routingRules.get(id) || null;
  },
  async updateRoutingRule(id, data) {
    if (checkIsPrisma()) {
      try { return await getPrismaClient().routingRule.update({ where: { id }, data }); }
      catch (error) { console.warn('[DB] Prisma updateRoutingRule failed, falling back to memory:', error.message); }
    }
    const existing = memoryStore.routingRules.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    memoryStore.routingRules.set(id, updated);
    return { ...updated };
  },
  async deleteRoutingRule(id) {
    if (checkIsPrisma()) {
      try { await getPrismaClient().routingRule.delete({ where: { id } }); return true; }
      catch (error) { console.warn('[DB] Prisma deleteRoutingRule failed, falling back to memory:', error.message); }
    }
    return memoryStore.routingRules.delete(id);
  },
};

export default routingRuleRepository;
