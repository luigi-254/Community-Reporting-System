import { v4 as uuidv4 } from 'uuid';

let prisma = null;
let isPrismaAvailable = false;

try {
  const prismaModule = await import('@prisma/client');
  if (prismaModule?.PrismaClient) {
    prisma = new prismaModule.PrismaClient();
    isPrismaAvailable = true;
  }
} catch (err) {
  // Prisma client not yet generated or DB not connected
  isPrismaAvailable = false;
}

// In-memory fallback stores when Prisma is not yet connected
const memoryStore = {
  users: new Map(),
  refreshTokens: new Map(),
  verificationTokens: new Map(),
  passwordResetTokens: new Map(),
  reports: new Map(),
};

export const db = {
  get isPrisma() {
    return isPrismaAvailable && !!process.env.DATABASE_URL;
  },

  get rawPrisma() {
    return prisma;
  },
  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();

    if (this.isPrisma) {
      try {
        return await prisma.user.findUnique({ where: { email: normalized } });
      } catch (err) {
        console.warn('[DB] Prisma query failed, using memory store fallback:', err.message);
      }
    }

    for (const user of memoryStore.users.values()) {
      if (user.email && user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  },

  async findUserByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.trim();

    if (this.isPrisma) {
      try {
        return await prisma.user.findUnique({ where: { phone: cleanPhone } });
      } catch (err) {
        console.warn('[DB] Prisma query failed, using memory store fallback:', err.message);
      }
    }

    for (const user of memoryStore.users.values()) {
      if (user.phone && user.phone === cleanPhone) {
        return { ...user };
      }
    }
    return null;
  },

  async findUserByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();
    if (clean.includes('@')) {
      return await this.findUserByEmail(clean);
    }
    const byPhone = await this.findUserByPhone(clean);
    if (byPhone) return byPhone;
    return await this.findUserByEmail(clean);
  },

  async findUserById(id) {
    if (!id) return null;

    if (this.isPrisma) {
      try {
        return await prisma.user.findUnique({ where: { id } });
      } catch (err) {
        console.warn('[DB] Prisma query failed, using memory store fallback:', err.message);
      }
    }

    const user = memoryStore.users.get(id);
    return user ? { ...user } : null;
  },

  async createUser(data) {
    const userId = uuidv4();
    const newUser = {
      id: userId,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone ? data.phone.trim() : null,
      password: data.password,
      role: data.role || 'CITIZEN',
      isVerified: Boolean(data.isVerified),
      emailVerified: Boolean(data.emailVerified),
      phoneVerified: Boolean(data.phoneVerified),
      isActive: data.isActive !== false,
      county: data.county || null,
      subCounty: data.subCounty || null,
      ward: data.ward || null,
      address: data.address || null,
      avatarUrl: data.avatarUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.isPrisma) {
      try {
        return await prisma.user.create({
          data: {
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            password: newUser.password,
            role: newUser.role,
            isVerified: newUser.isVerified,
            emailVerified: newUser.emailVerified,
            phoneVerified: newUser.phoneVerified,
            county: newUser.county,
            subCounty: newUser.subCounty,
            ward: newUser.ward,
            address: newUser.address,
            avatarUrl: newUser.avatarUrl,
          },
        });
      } catch (err) {
        console.warn('[DB] Prisma create user failed, saving to memory fallback:', err.message);
      }
    }

    memoryStore.users.set(userId, newUser);
    return { ...newUser };
  },

  async updateUser(id, updateData) {
    if (this.isPrisma) {
      try {
        return await prisma.user.update({
          where: { id },
          data: { ...updateData, updatedAt: new Date() },
        });
      } catch (err) {
        console.warn('[DB] Prisma update user failed, using memory fallback:', err.message);
      }
    }

    const existing = memoryStore.users.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    memoryStore.users.set(id, updated);
    return { ...updated };
  },

  async createRefreshToken({ token, userId, expiresAt }) {
    const id = uuidv4();
    const record = { id, token, userId, expiresAt, revokedAt: null, createdAt: new Date() };

    if (this.isPrisma) {
      try {
        return await prisma.refreshToken.create({
          data: { token, userId, expiresAt },
        });
      } catch (err) {
        console.warn('[DB] Prisma save refresh token failed, using memory fallback:', err.message);
      }
    }

    memoryStore.refreshTokens.set(token, record);
    return record;
  },

  async findRefreshToken(token) {
    if (!token) return null;

    if (this.isPrisma) {
      try {
        return await prisma.refreshToken.findUnique({
          where: { token },
          include: { user: true },
        });
      } catch (err) {
        console.warn('[DB] Prisma find refresh token failed, using memory fallback:', err.message);
      }
    }

    const record = memoryStore.refreshTokens.get(token);
    if (!record) return null;
    const user = memoryStore.users.get(record.userId);
    return { ...record, user: user ? { ...user } : null };
  },

  async revokeRefreshToken(token) {
    if (!token) return;

    if (this.isPrisma) {
      try {
        await prisma.refreshToken.update({
          where: { token },
          data: { revokedAt: new Date() },
        });
        return;
      } catch (err) {
        console.warn('[DB] Prisma revoke refresh token failed:', err.message);
      }
    }

    const record = memoryStore.refreshTokens.get(token);
    if (record) {
      record.revokedAt = new Date();
      memoryStore.refreshTokens.set(token, record);
    }
  },

  async revokeAllUserRefreshTokens(userId) {
    if (!userId) return;

    if (this.isPrisma) {
      try {
        await prisma.refreshToken.updateMany({
          where: { userId },
          data: { revokedAt: new Date() },
        });
        return;
      } catch (err) {
        console.warn('[DB] Prisma revoke tokens failed:', err.message);
      }
    }

    for (const [key, item] of memoryStore.refreshTokens.entries()) {
      if (item.userId === userId) {
        item.revokedAt = new Date();
        memoryStore.refreshTokens.set(key, item);
      }
    }
  },

  async createVerificationToken({ identifier, code, token, type, userId, expiresAt }) {
    const id = uuidv4();
    const record = {
      id,
      identifier: identifier.toLowerCase().trim(),
      code: code || null,
      token,
      type: type || 'EMAIL',
      userId: userId || null,
      expiresAt,
      createdAt: new Date(),
    };

    if (this.isPrisma) {
      try {
        return await prisma.verificationToken.create({
          data: {
            token: record.token,
            code: record.code,
            identifier: record.identifier,
            type: record.type,
            userId: record.userId,
            expiresAt: record.expiresAt,
          },
        });
      } catch (err) {
        console.warn('[DB] Prisma create verification token failed:', err.message);
      }
    }

    memoryStore.verificationTokens.set(token, record);
    if (code) {
      memoryStore.verificationTokens.set(`${record.identifier}:${code}`, record);
    }
    return record;
  },

  async findVerificationToken({ identifier, token, code }) {
    if (this.isPrisma) {
      try {
        if (token) {
          return await prisma.verificationToken.findUnique({ where: { token } });
        }
        if (identifier && code) {
          return await prisma.verificationToken.findFirst({
            where: {
              identifier: identifier.toLowerCase().trim(),
              code,
            },
          });
        }
      } catch (err) {
        console.warn('[DB] Prisma find verification token failed:', err.message);
      }
    }

    if (token && memoryStore.verificationTokens.has(token)) {
      return memoryStore.verificationTokens.get(token);
    }

    if (identifier && code) {
      const key = `${identifier.toLowerCase().trim()}:${code}`;
      if (memoryStore.verificationTokens.has(key)) {
        return memoryStore.verificationTokens.get(key);
      }
    }

    for (const item of memoryStore.verificationTokens.values()) {
      if (token && item.token === token) return item;
      if (
        identifier &&
        code &&
        item.identifier === identifier.toLowerCase().trim() &&
        item.code === code
      ) {
        return item;
      }
    }

    return null;
  },

  async deleteVerificationToken(idOrToken) {
    if (this.isPrisma) {
      try {
        await prisma.verificationToken.deleteMany({
          where: {
            OR: [{ id: idOrToken }, { token: idOrToken }],
          },
        });
        return;
      } catch (err) {
        console.warn('[DB] Prisma delete verification token failed:', err.message);
      }
    }

    for (const [key, item] of memoryStore.verificationTokens.entries()) {
      if (item.id === idOrToken || item.token === idOrToken) {
        memoryStore.verificationTokens.delete(key);
      }
    }
  },

  async createPasswordResetToken({ userId, token, expiresAt }) {
    const id = uuidv4();
    const record = { id, userId, token, expiresAt, createdAt: new Date() };

    if (this.isPrisma) {
      try {
        return await prisma.passwordResetToken.create({
          data: { token, userId, expiresAt },
        });
      } catch (err) {
        console.warn('[DB] Prisma create reset token failed:', err.message);
      }
    }

    memoryStore.passwordResetTokens.set(token, record);
    return record;
  },

  async findPasswordResetToken(token) {
    if (!token) return null;

    if (this.isPrisma) {
      try {
        return await prisma.passwordResetToken.findUnique({
          where: { token },
          include: { user: true },
        });
      } catch (err) {
        console.warn('[DB] Prisma find reset token failed:', err.message);
      }
    }

    const record = memoryStore.passwordResetTokens.get(token);
    if (!record) return null;
    const user = memoryStore.users.get(record.userId);
    return { ...record, user: user ? { ...user } : null };
  },

  async deletePasswordResetToken(token) {
    if (!token) return;

    if (this.isPrisma) {
      try {
        await prisma.passwordResetToken.deleteMany({
          where: { token },
        });
        return;
      } catch (err) {
        console.warn('[DB] Prisma delete reset token failed:', err.message);
      }
    }

    memoryStore.passwordResetTokens.delete(token);
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

    if (this.isPrisma) {
      try {
        return await prisma.report.create({
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
        console.warn('[DB] Prisma create report failed, falling back to memory:', err.message);
      }
    }

    memoryStore.reports.set(reportId, newReport);
    return this.enrichReport(newReport);
  },

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

  async findReportById(id) {
    if (!id) return null;

    if (this.isPrisma) {
      try {
        return await prisma.report.findUnique({
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
        console.warn('[DB] Prisma find report failed, falling back to memory:', err.message);
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

    if (this.isPrisma) {
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
          prisma.report.count({ where }),
          prisma.report.findMany({
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
        console.warn('[DB] Prisma find reports failed, falling back to memory:', err.message);
      }
    }

    // Memory Store implementation
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

    // Sort
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
    if (this.isPrisma) {
      try {
        return await prisma.report.update({
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
        console.warn('[DB] Prisma update report failed, falling back to memory:', err.message);
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
    if (this.isPrisma) {
      try {
        await prisma.report.delete({ where: { id } });
        return true;
      } catch (err) {
        console.warn('[DB] Prisma delete report failed, falling back to memory:', err.message);
      }
    }

    return memoryStore.reports.delete(id);
  },
};

export default db;
