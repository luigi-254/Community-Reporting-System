import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

export const reportRepository = {
  enrichReport(report) {
    if (!report) return null;
    const rep = { ...report };
    if (rep.reporterId) {
      const reporter = memoryStore.users.get(rep.reporterId);
      if (reporter) {
        const { password, ...safeReporter } = reporter;
        rep.reporter = rep.isAnonymous
          ? { id: safeReporter.id, name: 'Anonymous Citizen', role: 'CITIZEN' }
          : safeReporter;
      }
    }
    if (rep.assignedOfficerId) {
      const officer = memoryStore.users.get(rep.assignedOfficerId);
      if (officer) {
        const { password, ...safeOfficer } = officer;
        rep.assignedOfficer = safeOfficer;
      }
    }
    return rep;
  },

  async createReport(data) {
    const reportId = uuidv4();
    const newReport = {
      id: reportId,
      title: data.title,
      description: data.description,
      category: data.category,
      subCategory: data.subCategory || null,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'SUBMITTED',
      location: data.location || null,
      county: data.county || null,
      subCounty: data.subCounty || null,
      ward: data.ward || null,
      latitude: typeof data.latitude === 'number' ? data.latitude : null,
      longitude: typeof data.longitude === 'number' ? data.longitude : null,
      mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls : [],
      isAnonymous: Boolean(data.isAnonymous),
      reporterId: data.reporterId,
      assignedOfficerId: data.assignedOfficerId || null,
      departmentId: data.departmentId || null,
      resolutionNotes: data.resolutionNotes || null,
      resolutionMediaUrls: Array.isArray(data.resolutionMediaUrls) ? data.resolutionMediaUrls : [],
      resolvedAt: data.resolvedAt || null,
      resolutionStatus: data.resolutionStatus || null,
      citizenFeedback: data.citizenFeedback || null,
      rejectionReason: data.rejectionReason || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().report.create({
          data: newReport,
          include: {
            reporter: {
              select: { id: true, name: true, email: true, phone: true, role: true, ward: true },
            },
            assignedOfficer: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });
      } catch (err) {
        console.warn('[DB] Prisma createReport failed, falling back to memory:', err.message);
      }
    }

    memoryStore.reports.set(reportId, newReport);
    return this.enrichReport(newReport);
  },

  async findReportById(id) {
    if (!id) return null;

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().report.findUnique({
          where: { id },
          include: {
            reporter: {
              select: { id: true, name: true, email: true, phone: true, role: true, ward: true },
            },
            assignedOfficer: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });
      } catch (err) {
        console.warn('[DB] Prisma findReportById failed, falling back to memory:', err.message);
      }
    }

    const report = memoryStore.reports.get(id);
    return report ? this.enrichReport(report) : null;
  },

  async findReports({
    reporterId,
    assignedOfficerId,
    status,
    priority,
    category,
    subCategory,
    ward,
    county,
    subCounty,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    if (checkIsPrisma()) {
      try {
        const where = {};
        if (reporterId) where.reporterId = reporterId;
        if (assignedOfficerId) where.assignedOfficerId = assignedOfficerId;
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (category) where.category = category;
        if (subCategory) where.subCategory = subCategory;
        if (ward) where.ward = { contains: ward, mode: 'insensitive' };
        if (county) where.county = { contains: county, mode: 'insensitive' };
        if (subCounty) where.subCounty = { contains: subCounty, mode: 'insensitive' };
        if (startDate || endDate) {
          where.createdAt = {};
          if (startDate) where.createdAt.gte = new Date(startDate);
          if (endDate) where.createdAt.lte = new Date(endDate);
        }
        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
            { ward: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [total, items] = await Promise.all([
          getPrismaClient().report.count({ where }),
          getPrismaClient().report.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
            include: {
              reporter: {
                select: { id: true, name: true, email: true, phone: true, role: true, ward: true },
              },
              assignedOfficer: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          }),
        ]);

        return {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          reports: items,
        };
      } catch (err) {
        console.warn('[DB] Prisma findReports failed, falling back to memory:', err.message);
      }
    }

    // Memory store fallback
    let results = Array.from(memoryStore.reports.values());

    if (reporterId) {
      results = results.filter((r) => r.reporterId === reporterId);
    }
    if (assignedOfficerId) {
      results = results.filter((r) => r.assignedOfficerId === assignedOfficerId);
    }
    if (status) {
      const s = status.toUpperCase();
      results = results.filter((r) => r.status === s);
    }
    if (priority) {
      const p = priority.toUpperCase();
      results = results.filter((r) => r.priority === p);
    }
    if (category) {
      results = results.filter((r) => r.category.toLowerCase() === category.toLowerCase());
    }
    if (subCategory) {
      results = results.filter(
        (r) => r.subCategory && r.subCategory.toLowerCase() === subCategory.toLowerCase()
      );
    }
    if (ward) {
      results = results.filter((r) => r.ward && r.ward.toLowerCase().includes(ward.toLowerCase()));
    }
    if (county) {
      results = results.filter((r) => r.county && r.county.toLowerCase().includes(county.toLowerCase()));
    }
    if (subCounty) {
      results = results.filter(
        (r) => r.subCounty && r.subCounty.toLowerCase().includes(subCounty.toLowerCase())
      );
    }
    if (startDate) {
      const start = new Date(startDate).getTime();
      results = results.filter((r) => new Date(r.createdAt).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      results = results.filter((r) => new Date(r.createdAt).getTime() <= end);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.location && r.location.toLowerCase().includes(q)) ||
          (r.category && r.category.toLowerCase().includes(q)) ||
          (r.ward && r.ward.toLowerCase().includes(q))
      );
    }

    results.sort((a, b) => {
      const valA = a[sortBy] ?? a.createdAt;
      const valB = b[sortBy] ?? b.createdAt;
      const orderMultiplier = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
      if (valA instanceof Date && valB instanceof Date) {
        return (valA.getTime() - valB.getTime()) * orderMultiplier;
      }
      return String(valA).localeCompare(String(valB)) * orderMultiplier;
    });

    const total = results.length;
    const paginated = results.slice(skip, skip + limitNum).map((r) => this.enrichReport(r));

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      reports: paginated,
    };
  },

  async updateReport(id, updateData) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().report.update({
          where: { id },
          data: { ...updateData, updatedAt: new Date() },
          include: {
            reporter: {
              select: { id: true, name: true, email: true, phone: true, role: true, ward: true },
            },
            assignedOfficer: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });
      } catch (err) {
        console.warn('[DB] Prisma updateReport failed, falling back to memory:', err.message);
      }
    }

    const existing = memoryStore.reports.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    memoryStore.reports.set(id, updated);
    return this.enrichReport(updated);
  },

  async deleteReport(id) {
    if (checkIsPrisma()) {
      try {
        await getPrismaClient().report.delete({ where: { id } });
        return true;
      } catch (err) {
        console.warn('[DB] Prisma deleteReport failed, falling back to memory:', err.message);
      }
    }

    return memoryStore.reports.delete(id);
  },
};

export default reportRepository;
