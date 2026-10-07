import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

export const tokenRepository = {
  async createRefreshToken({ token, userId, expiresAt }) {
    const id = uuidv4();
    const record = { id, token, userId, expiresAt, revokedAt: null, createdAt: new Date() };

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().refreshToken.create({
          data: { token, userId, expiresAt },
        });
      } catch (err) {
        console.warn('[DB] Prisma createRefreshToken failed, using memory fallback:', err.message);
      }
    }

    memoryStore.refreshTokens.set(token, record);
    return record;
  },

  async findRefreshToken(token) {
    if (!token) return null;

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().refreshToken.findUnique({
          where: { token },
          include: { user: true },
        });
      } catch (err) {
        console.warn('[DB] Prisma findRefreshToken failed, using memory fallback:', err.message);
      }
    }

    const record = memoryStore.refreshTokens.get(token);
    if (!record) return null;
    const user = memoryStore.users.get(record.userId);
    return { ...record, user: user ? { ...user } : null };
  },

  async revokeRefreshToken(token) {
    if (!token) return;

    if (checkIsPrisma()) {
      try {
        await getPrismaClient().refreshToken.update({
          where: { token },
          data: { revokedAt: new Date() },
        });
        return;
      } catch (err) {
        console.warn('[DB] Prisma revokeRefreshToken failed:', err.message);
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

    if (checkIsPrisma()) {
      try {
        await getPrismaClient().refreshToken.updateMany({
          where: { userId },
          data: { revokedAt: new Date() },
        });
        return;
      } catch (err) {
        console.warn('[DB] Prisma revokeAllUserRefreshTokens failed:', err.message);
      }
    }

    for (const [key, item] of memoryStore.refreshTokens.entries()) {
      if (item.userId === userId) {
        item.revokedAt = new Date();
        memoryStore.refreshTokens.set(key, item);
      }
    }
  },

  // ---------------- VERIFICATION TOKEN OPERATIONS ----------------
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

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().verificationToken.create({
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
        console.warn('[DB] Prisma createVerificationToken failed:', err.message);
      }
    }

    memoryStore.verificationTokens.set(token, record);
    if (code) {
      memoryStore.verificationTokens.set(`${record.identifier}:${code}`, record);
    }
    return record;
  },

  async findVerificationToken({ identifier, token, code }) {
    if (checkIsPrisma()) {
      try {
        if (token) {
          return await getPrismaClient().verificationToken.findUnique({ where: { token } });
        }
        if (identifier && code) {
          return await getPrismaClient().verificationToken.findFirst({
            where: {
              identifier: identifier.toLowerCase().trim(),
              code,
            },
          });
        }
      } catch (err) {
        console.warn('[DB] Prisma findVerificationToken failed:', err.message);
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
    if (checkIsPrisma()) {
      try {
        await getPrismaClient().verificationToken.deleteMany({
          where: {
            OR: [{ id: idOrToken }, { token: idOrToken }],
          },
        });
        return;
      } catch (err) {
        console.warn('[DB] Prisma deleteVerificationToken failed:', err.message);
      }
    }

    for (const [key, item] of memoryStore.verificationTokens.entries()) {
      if (item.id === idOrToken || item.token === idOrToken) {
        memoryStore.verificationTokens.delete(key);
      }
    }
  },

  // ---------------- PASSWORD RESET TOKEN OPERATIONS ----------------
  async createPasswordResetToken({ userId, token, expiresAt }) {
    const id = uuidv4();
    const record = { id, userId, token, expiresAt, createdAt: new Date() };

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().passwordResetToken.create({
          data: { token, userId, expiresAt },
        });
      } catch (err) {
        console.warn('[DB] Prisma createPasswordResetToken failed:', err.message);
      }
    }

    memoryStore.passwordResetTokens.set(token, record);
    return record;
  },

  async findPasswordResetToken(token) {
    if (!token) return null;

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().passwordResetToken.findUnique({
          where: { token },
          include: { user: true },
        });
      } catch (err) {
        console.warn('[DB] Prisma findPasswordResetToken failed:', err.message);
      }
    }

    const record = memoryStore.passwordResetTokens.get(token);
    if (!record) return null;
    const user = memoryStore.users.get(record.userId);
    return { ...record, user: user ? { ...user } : null };
  },

  async deletePasswordResetToken(token) {
    if (!token) return;

    if (checkIsPrisma()) {
      try {
        await getPrismaClient().passwordResetToken.deleteMany({
          where: { token },
        });
        return;
      } catch (err) {
        console.warn('[DB] Prisma deletePasswordResetToken failed:', err.message);
      }
    }

    memoryStore.passwordResetTokens.delete(token);
  },
};

export default tokenRepository;
