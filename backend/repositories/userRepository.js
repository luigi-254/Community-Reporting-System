import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient, checkIsPrisma } from './client.js';
import { memoryStore } from './memoryStore.js';

export const userRepository = {
  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.findUnique({ where: { email: normalized } });
      } catch (err) {
        console.warn('[DB] Prisma findUserByEmail failed, using memory store:', err.message);
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

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.findUnique({ where: { phone: cleanPhone } });
      } catch (err) {
        console.warn('[DB] Prisma findUserByPhone failed, using memory store:', err.message);
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

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.findUnique({ where: { id } });
      } catch (err) {
        console.warn('[DB] Prisma findUserById failed, using memory store:', err.message);
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

    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.create({
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
        console.warn('[DB] Prisma createUser failed, using memory store:', err.message);
      }
    }

    memoryStore.users.set(userId, newUser);
    return { ...newUser };
  },

  async updateUser(id, updateData) {
    if (checkIsPrisma()) {
      try {
        return await getPrismaClient().user.update({
          where: { id },
          data: { ...updateData, updatedAt: new Date() },
        });
      } catch (err) {
        console.warn('[DB] Prisma updateUser failed, using memory store:', err.message);
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
};

export default userRepository;
